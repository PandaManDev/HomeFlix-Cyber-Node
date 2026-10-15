const { app, BrowserWindow, shell, ipcMain, protocol, net, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const os = require('node:os');
const express = require('express');
const DiscordRPC = require('discord-rpc');

const DISCORD_CLIENT_ID = '1559626336795107379';

// A privileged streaming scheme lets Chromium play converted files without exposing arbitrary disk paths.
protocol.registerSchemesAsPrivileged([{ scheme: 'homeflix-media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
const transcodedMedia = new Map();
const activeTranscodes = new Map();
const remoteStreamSources = new Map();
const localMediaPaths = new Map();
const SUPPORTED_MEDIA_EXTENSIONS = new Set(['.mp4','.m4v','.mkv','.webm','.mov','.avi','.mpg','.mpeg','.m2ts','.ts','.ogv','.3gp','.wmv','.flv']);
let pendingOpenFiles = [];
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();
app.on('second-instance', (_event, argv) => {
  const files = argv.filter(arg => typeof arg === 'string' && !arg.startsWith('--') && SUPPORTED_MEDIA_EXTENSIONS.has(path.extname(arg).toLowerCase()) && fs.existsSync(arg));
  if (mainWindow && !mainWindow.isDestroyed()) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  if (files.length) queueOpenFiles(files);
});
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (SUPPORTED_MEDIA_EXTENSIONS.has(path.extname(filePath).toLowerCase())) queueOpenFiles([filePath]);
});
function queueOpenFiles(files) {
  const valid = files.filter(file => SUPPORTED_MEDIA_EXTENSIONS.has(path.extname(file).toLowerCase()) && fs.existsSync(file) && fs.statSync(file).isFile());
  if (!valid.length) return;
  pendingOpenFiles.push(...valid);
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.isLoading() === false) flushOpenFiles();
}
function flushOpenFiles() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoading()) return;
  const files = pendingOpenFiles.splice(0);
  for (const file of files) mainWindow.webContents.executeJavaScript(`window.homeflixOpenFileFromOS && window.homeflixOpenFileFromOS(${JSON.stringify(file)})`).catch(error => console.warn('Could not open selected media:', error.message));
}

const sharedMediaFiles = new Map();
let sharedMediaFolders = [];

const APP_ID = 'com.homeflix.cybernode';
const WEB_URL = 'https://homeflix-cyber-node.vercel.app/';
const REMOTE_PORT = Number(process.env.HOMEFLIX_REMOTE_PORT || 47831);
const pin = String(crypto.randomInt(100000, 1000000));
const tokens = new Map();
const pairingAttempts = new Map();
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
let mainWindow;
let remoteServer;
let discordClient;
let discordReady = false;
let discordRetryTimer;
let lastDiscordUpdate = 0;
let lastDiscordKey = '';
let remoteStatus = { title: 'HomeFlix', playing: false, currentTime: 0, duration: 0, volume: 1 };

function getLanAddress() {
  const interfaces = os.networkInterfaces();
  for (const list of Object.values(interfaces)) {
    for (const item of list || []) {
      if (item.family === 'IPv4' && !item.internal) return item.address;
    }
  }
  return '127.0.0.1';
}
function getRemoteInfo() {
  const host = getLanAddress();
  return { url: `http://${host}:${REMOTE_PORT}/`, host, port: REMOTE_PORT, pin };
}

function startRemoteServer() {
  const serverApp = express();
  serverApp.use((req, res, next) => {
    const origin = String(req.headers.origin || '');
    if (origin === 'https://localhost' || origin === 'capacitor://localhost') {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  serverApp.use(express.json({ limit: '32kb' }));
  const allowedDiscordOrigins = new Set(['https://homeflix-cyber-node.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:3000']);
  serverApp.options('/api/discord-presence/:mode?', (req, res) => {
    const origin = req.headers.origin;
    if (allowedDiscordOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      res.setHeader('Access-Control-Max-Age', '600');
      return res.sendStatus(204);
    }
    return res.sendStatus(403);
  });
  serverApp.get('/api/discord-presence/status', (req, res) => {
    const origin = req.headers.origin;
    if (!allowedDiscordOrigins.has(origin)) return res.sendStatus(403);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ ok: true, companion: true, discordReady });
  });
  serverApp.post('/api/discord-presence/auto', (req, res) => {
    const origin = req.headers.origin;
    if (!allowedDiscordOrigins.has(origin)) return res.status(403).json({ error: 'Origin not allowed' });
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Cache-Control', 'no-store');
    const presence = req.body?.presence;
    if (!presence || typeof presence !== 'object') return res.status(400).json({ error: 'Presence is required' });
    if (presence.clear) clearDiscordPresence();
    else updateDiscordPresence({
      title: cleanPresenceText(presence.title, 'HomeFlix Cyber Node'),
      playing: Boolean(presence.playing),
      currentTime: Math.max(0, Number(presence.currentTime) || 0),
      duration: Math.max(0, Number(presence.duration) || 0)
    });
    return res.json({ ok: true, discordReady });
  });
  serverApp.post('/api/discord-presence', (req, res) => {
    const origin = req.headers.origin;
    if (!allowedDiscordOrigins.has(origin)) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (String(req.body?.pin || '') !== pin) return res.status(401).json({ error: 'Incorrect pairing PIN' });
    if (req.body?.action === 'ping') return res.json({ ok: true, connected: discordReady });
    const presence = req.body?.presence;
    if (!presence || typeof presence !== 'object') return res.status(400).json({ error: 'Presence is required' });
    if (presence.clear) clearDiscordPresence();
    else updateDiscordPresence({
      title: cleanPresenceText(presence.title, 'HomeFlix Cyber Node'),
      playing: Boolean(presence.playing),
      currentTime: Math.max(0, Number(presence.currentTime) || 0),
      duration: Math.max(0, Number(presence.duration) || 0)
    });
    return res.json({ ok: true, discordReady });
  });
  serverApp.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'remote.html')));
  serverApp.get('/api/info', (_req, res) => res.json({ app: 'HomeFlix Cyber Node', name: os.hostname() }));
  serverApp.post('/api/pair', (req, res) => {
    const ip = String(req.ip || req.socket?.remoteAddress || 'unknown');
    const now = Date.now();
    const attempt = pairingAttempts.get(ip) || { count: 0, resetAt: now + 10 * 60 * 1000 };
    if (now > attempt.resetAt) { attempt.count = 0; attempt.resetAt = now + 10 * 60 * 1000; }
    if (attempt.count >= 10) return res.status(429).json({ error: 'Too many pairing attempts. Wait 10 minutes and try again.' });
    if (String(req.body?.pin || '') !== pin) {
      attempt.count += 1;
      pairingAttempts.set(ip, attempt);
      return res.status(401).json({ error: 'Incorrect pairing PIN' });
    }
    pairingAttempts.delete(ip);
    const token = crypto.randomBytes(32).toString('hex');
    tokens.set(token, now + TOKEN_TTL_MS);
    res.json({ token, status: remoteStatus });
  });
  serverApp.use('/api', (req, res, next) => {
    // Video elements cannot attach Authorization headers, so allow query tokens only on media GETs.
    const headerToken = String(req.headers.authorization || '').replace(/^Bearer\\s+/i, '');
    const mediaQueryToken = req.method === 'GET' && /^\\/media\\//.test(req.path) ? String(req.query.token || '') : '';
    const token = headerToken || mediaQueryToken;
    const expiresAt = token ? tokens.get(token) : null;
    if (!expiresAt || expiresAt < Date.now()) {
      if (token) tokens.delete(token);
      return res.status(401).json({ error: 'Pair this phone with the desktop PIN first.' });
    }
    next();
  });
  // Shared media library: folders are chosen locally on the desktop; only indexed video files are exposed to paired devices.
  const sharedVideoExtensions = new Set(['.mkv','.mp4','.m4v','.webm','.mov','.avi','.mpg','.mpeg','.ts','.m2ts','.ogv','.3gp','.wmv','.flv']);
  function refreshSharedMediaIndex() {
    sharedMediaFiles.clear();
    const seen = new Set();
    const walk = (folder, depth = 0) => {
      if (depth > 8) return;
      let entries;
      try { entries = fs.readdirSync(folder, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.resolve(folder, entry.name);
        if (entry.isDirectory()) { walk(fullPath, depth + 1); continue; }
        if (!entry.isFile() || !sharedVideoExtensions.has(path.extname(entry.name).toLowerCase()) || seen.has(fullPath)) continue;
        seen.add(fullPath);
        const id = crypto.createHash('sha256').update(fullPath).digest('hex').slice(0, 24);
        try {
          const stat = fs.statSync(fullPath);
          sharedMediaFiles.set(id, { id, path: fullPath, name: entry.name, size: stat.size, modified: stat.mtimeMs });
        } catch {}
      }
    };
    for (const folder of sharedMediaFolders) walk(folder);
    return [...sharedMediaFiles.values()].map(({ id, name, size, modified }) => ({ id, name, size, modified }));
  }
  serverApp.get('/library', (_req, res) => res.sendFile(path.join(__dirname, 'media.html')));
  serverApp.get('/api/library', (_req, res) => res.json({ folders: sharedMediaFolders.length, files: refreshSharedMediaIndex() }));
  serverApp.post('/api/library/select', async (_req, res) => {
    if (!mainWindow || mainWindow.isDestroyed()) return res.status(503).json({ error: 'Open HomeFlix on the desktop first.' });
    try {
      const picked = await dialog.showOpenDialog(mainWindow, { title: 'Choose folders to share with HomeFlix devices', properties: ['openDirectory', 'multiSelections'] });
      if (picked.canceled || !picked.filePaths.length) return res.json({ canceled: true, files: refreshSharedMediaIndex() });
      sharedMediaFolders = [...new Set([...sharedMediaFolders, ...picked.filePaths.map(p => path.resolve(p))])];
      return res.json({ canceled: false, folders: sharedMediaFolders.length, files: refreshSharedMediaIndex() });
    } catch (error) { return res.status(500).json({ error: error.message || 'Could not choose media folders.' }); }
  });
  serverApp.post('/api/library/clear', (_req, res) => {
    sharedMediaFolders = [];
    sharedMediaFiles.clear();
    return res.json({ ok: true, files: [] });
  });
  serverApp.get('/api/media/:id', (req, res) => {
    const item = sharedMediaFiles.get(String(req.params.id || ''));
    if (!item) return res.status(404).json({ error: 'Media item not found. Refresh the library and try again.' });
    try {
      if (!fs.existsSync(item.path) || !fs.statSync(item.path).isFile()) return res.status(404).json({ error: 'The media file is no longer available.' });
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Accept-Ranges', 'bytes');
      return res.sendFile(item.path, { acceptRanges: true, cacheControl: false, dotfiles: 'deny' }, error => {
        if (error && !res.headersSent) res.status(error.statusCode || 500).end();
      });
    } catch { return res.status(404).json({ error: 'The media file is no longer available.' }); }
  });
  serverApp.get('/api/status', (_req, res) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('homeflix:remote-command', { action: 'status' });
      setTimeout(() => res.json(remoteStatus), 120);
    } else {
      res.json(remoteStatus);
    }
  });
  serverApp.post('/api/command', async (req, res) => {
    const allowed = new Set(['toggle', 'play', 'pause', 'seek', 'volume', 'mute', 'next', 'previous', 'fullscreen', 'status']);
    const action = String(req.body?.action || '');
    if (!allowed.has(action)) return res.status(400).json({ error: 'Unsupported command' });
    if (!mainWindow || mainWindow.isDestroyed()) return res.status(503).json({ error: 'HomeFlix desktop is not available.' });
    const rawValue = Number(req.body?.value);
    const safeValue = Number.isFinite(rawValue) ? Math.max(-86400, Math.min(86400, rawValue)) : 0;
    const script = `(() => {
      const video = document.querySelector('#cyber-video, video');
      const action = ${JSON.stringify(action)};
      const value = ${JSON.stringify(safeValue)};
      if (action === 'status') {
        if (video) window.homeflixDesktop?.sendRemoteStatus?.({
          title: (document.querySelector('#current-title, [data-media-title], .player-title')?.textContent || document.title || 'HomeFlix').trim().slice(0,128),
          playing: !video.paused && !video.ended,
          currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          volume: video.muted ? 0 : video.volume
        });
        return;
      }
      if (!video) throw new Error('No video is currently loaded in HomeFlix.');
      switch (action) {
        case 'toggle': video.paused ? video.play() : video.pause(); break;
        case 'play': video.play(); break;
        case 'pause': video.pause(); break;
        case 'seek': video.currentTime = Math.max(0, Math.min(Number.isFinite(video.duration) ? video.duration : Infinity, video.currentTime + value)); break;
        case 'volume': video.volume = Math.max(0, Math.min(1, value)); video.muted = false; break;
        case 'mute': video.muted = !video.muted; break;
        case 'fullscreen': (video.requestFullscreen ? video.requestFullscreen() : document.documentElement.requestFullscreen?.()); break;
        case 'next': {
          const button = [...document.querySelectorAll('button')].find(b => /next|skip/i.test((b.getAttribute('aria-label') || '') + ' ' + (b.title || '') + ' ' + b.innerText));
          if (button) button.click(); else throw new Error('No Next control was found in the current player.');
          break;
        }
        case 'previous': {
          const button = [...document.querySelectorAll('button')].find(b => /previous|back/i.test((b.getAttribute('aria-label') || '') + ' ' + (b.title || '') + ' ' + b.innerText));
          if (button) button.click(); else video.currentTime = 0;
          break;
        }
      }
    })()`;
    try {
      await mainWindow.webContents.executeJavaScript(script, true);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message || 'Could not control the current player.' });
    }
  });
  remoteServer = serverApp.listen(REMOTE_PORT, '0.0.0.0', () => {
    console.log(`HomeFlix phone remote listening on port ${REMOTE_PORT}`);
  });
  remoteServer.on('error', error => console.error('Remote server failed:', error.message));
}


function cleanPresenceText(value, fallback, max = 128) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return (text || fallback).slice(0, max);
}

function scheduleDiscordReconnect() {
  if (discordRetryTimer || app.isQuitting) return;
  discordRetryTimer = setTimeout(() => {
    discordRetryTimer = null;
    startDiscordRPC();
  }, 10000);
}

async function startDiscordRPC() {
  if (discordClient && discordReady) return;
  try {
    DiscordRPC.register(DISCORD_CLIENT_ID);
    discordClient = new DiscordRPC.Client({ transport: 'ipc' });
    discordClient.on('ready', () => {
      discordReady = true;
      console.log('HomeFlix Discord Rich Presence connected.');
      if (remoteStatus.title && remoteStatus.title !== 'HomeFlix') updateDiscordPresence(remoteStatus, true);
    });
    discordClient.on('disconnected', () => {
      discordReady = false;
      console.log('Discord desktop client disconnected; retrying Rich Presence connection.');
      discordClient = null;
      scheduleDiscordReconnect();
    });
    discordClient.on('error', error => console.warn('Discord Rich Presence:', error.message));
    await discordClient.login({ clientId: DISCORD_CLIENT_ID });
  } catch (error) {
    discordReady = false;
    discordClient = null;
    console.warn('Discord Rich Presence unavailable. Make sure the Discord desktop app is running:', error.message);
    scheduleDiscordReconnect();
  }
}

function updateDiscordPresence(presence, force = false) {
  if (!presence || typeof presence !== 'object') return;
  const title = cleanPresenceText(presence.title, 'HomeFlix Cyber Node');
  const playing = Boolean(presence.playing);
  const currentTime = Math.max(0, Number(presence.currentTime) || 0);
  const duration = Math.max(0, Number(presence.duration) || 0);
  remoteStatus = { ...remoteStatus, title, playing, currentTime, duration };
  if (!discordReady || !discordClient) return;
  const now = Date.now();
  const key = [title, playing, Math.floor(currentTime / 15), Math.floor(duration)].join('|');
  if (!force && (key === lastDiscordKey || now - lastDiscordUpdate < 12000)) return;
  lastDiscordKey = key;
  lastDiscordUpdate = now;
  const activity = {
    details: cleanPresenceText(title, 'HomeFlix Cyber Node'),
    state: playing ? 'Watching on HomeFlix' : 'Paused in HomeFlix',
    largeImageKey: 'homeflix',
    largeImageText: 'HomeFlix Cyber Node',
    instance: false
  };
  if (playing) activity.startTimestamp = new Date(now - currentTime * 1000);
  if (duration > 0 && playing) activity.endTimestamp = new Date(now + Math.max(0, duration - currentTime) * 1000);
  discordClient.setActivity(activity).catch(error => console.warn('Could not update Discord Rich Presence:', error.message));
}

function clearDiscordPresence() {
  if (discordReady && discordClient) discordClient.clearActivity().catch(() => {});
  lastDiscordKey = '';
}


function installDiscordPageBridge() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.executeJavaScript(`(() => {
    if (window.__homeflixDiscordBridgeInstalled) return;
    window.__homeflixDiscordBridgeInstalled = true;
    const send = (clear = false) => {
      const api = window.homeflixDesktop;
      if (!api || typeof api.sendDiscordPresence !== 'function') return;
      const video = document.querySelector('#cyber-video, video');
      const titleNode = document.querySelector('#current-title, [data-media-title], .player-title');
      const title = (titleNode && titleNode.textContent || document.title || 'HomeFlix Cyber Node').trim();
      if (clear || !video || !video.currentSrc) {
        api.sendDiscordPresence({ clear: true });
        return;
      }
      api.sendDiscordPresence({
        title: title.slice(0, 128),
        playing: !video.paused && !video.ended,
        currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
        duration: Number.isFinite(video.duration) ? video.duration : 0
      });
    };
    const attach = () => {
      const video = document.querySelector('#cyber-video, video');
      if (!video || video.__homeflixDiscordEvents) return;
      video.__homeflixDiscordEvents = true;
      ['play', 'playing', 'pause', 'timeupdate', 'loadedmetadata', 'seeked'].forEach(eventName => video.addEventListener(eventName, () => send()));
      video.addEventListener('ended', () => send(true));
      send();
    };
    attach();
    new MutationObserver(attach).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) send(); });
  })()`).catch(error => console.warn('Could not attach HomeFlix Discord page bridge:', error.message));
}

function installRemotePairingPanel() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.executeJavaScript(`(async () => {
    if (document.getElementById('homeflix-phone-remote-card')) return;
    const info = await window.homeflixDesktop?.getRemoteInfo?.();
    if (!info) return;
    const card = document.createElement('aside');
    card.id = 'homeflix-phone-remote-card';
    card.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483000;width:min(340px,calc(100vw - 36px));padding:16px;border:1px solid #3f3f46;border-radius:16px;background:#09090bef;color:#fff;font:14px system-ui;box-shadow:0 12px 40px #0009;backdrop-filter:blur(14px)';
    const title = document.createElement('div'); title.textContent = 'HomeFlix Phone Remote'; title.style.cssText = 'font-weight:800;font-size:16px;margin-bottom:8px;color:#f87171';
    const note = document.createElement('div'); note.textContent = 'Connect your phone to the same Wi-Fi, then open this address:'; note.style.cssText = 'color:#d4d4d8;font-size:12px;margin-bottom:8px';
    const address = document.createElement('a'); address.href = info.url; address.textContent = info.url; address.style.cssText = 'display:block;color:#fff;font-weight:700;overflow-wrap:anywhere;margin-bottom:10px';
    const pinLabel = document.createElement('div'); pinLabel.textContent = 'PAIRING PIN'; pinLabel.style.cssText = 'color:#a1a1aa;font-size:10px;letter-spacing:.18em;margin-bottom:3px';
    const pin = document.createElement('div'); pin.textContent = info.pin; pin.style.cssText = 'font-size:30px;letter-spacing:.25em;font-weight:900;margin-bottom:8px';
    const hint = document.createElement('div'); hint.textContent = 'Keep this PIN private. Remote control is available to paired phones on your network.'; hint.style.cssText = 'color:#a1a1aa;font-size:11px;line-height:1.4';
    const close = document.createElement('button'); close.textContent = 'Hide'; close.style.cssText = 'position:absolute;right:12px;top:12px;background:#27272a;color:#fff;border:0;border-radius:8px;padding:5px 9px;cursor:pointer'; close.onclick = () => card.remove();
    card.append(title,note,address,pinLabel,pin,hint,close); document.body.appendChild(card);
  })()`).catch(error => console.warn('Could not show HomeFlix phone remote pairing:', error.message));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 920, minWidth: 900, minHeight: 620,
    title: 'HomeFlix Cyber Node',
    icon: path.join(__dirname, '..', 'build', 'homeflix-icon.png'),
    backgroundColor: '#080808',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith(WEB_URL) || url.startsWith('file://');
    if (!allowed) { event.preventDefault(); shell.openExternal(url); }
  });
  mainWindow.webContents.on('did-finish-load', () => { installDiscordPageBridge(); installRemotePairingPanel(); flushOpenFiles(); });
  mainWindow.loadURL(WEB_URL);
  mainWindow.webContents.on('did-fail-load', (_event, code, description, validatedURL, isMainFrame) => {
    if (isMainFrame && !validatedURL.startsWith('file://') && code !== -3) {
      console.warn('HomeFlix website could not load:', description, 'Trying packaged fallback.');
      mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}
app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  app.setAppUserModelId(APP_ID);
  const startupFiles = process.argv.slice(1).filter(arg => typeof arg === 'string' && !arg.startsWith('--') && SUPPORTED_MEDIA_EXTENSIONS.has(path.extname(arg).toLowerCase()) && fs.existsSync(arg));
  if (startupFiles.length) pendingOpenFiles.push(...startupFiles);
  protocol.handle('homeflix-media', request => {
    const mediaUrl = new URL(request.url);
    const token = mediaUrl.pathname.startsWith('/') ? mediaUrl.pathname.slice(1) : mediaUrl.pathname;
    if (mediaUrl.hostname === 'local') {
      const filePath = localMediaPaths.get(token);
      if (!filePath || !fs.existsSync(filePath)) return new Response('Media not found', { status: 404 });
      return net.fetch(pathToFileURL(filePath).toString(), { headers: request.headers });
    }
    if (mediaUrl.hostname === 'converted') {
      const filePath = transcodedMedia.get(token);
      if (!filePath || !fs.existsSync(filePath)) return new Response('Media not found', { status: 404 });
      return net.fetch(pathToFileURL(filePath).toString());
    }
    if (mediaUrl.hostname !== 'stream') return new Response('Media not found', { status: 404 });
    const sourceUrl = remoteStreamSources.get(token);
    if (!sourceUrl) return new Response('Stream not found', { status: 404 });
    let ffmpegPath;
    try { ffmpegPath = require('ffmpeg-static'); } catch (_) {}
    if (ffmpegPath && ffmpegPath.includes('app.asar')) ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) return new Response('The built-in video converter is missing', { status: 500 });
    const args = [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-rw_timeout', '30000000',
      '-user_agent', 'Mozilla/5.0 HomeFlixCyberNode',
      '-i', sourceUrl, '-map', '0:v:0', '-map', '0:a:0?',
      '-sn', '-dn', '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
      '-f', 'mp4', '-movflags', 'frag_keyframe+empty_moov+default_base_moof', 'pipe:1'
    ];
    let child;
    try { child = spawn(ffmpegPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (error) { return new Response('Could not start stream converter: ' + error.message, { status: 500 }); }
    const body = new ReadableStream({
      start(controller) {
        let sentBytes = 0;
        let settled = false;
        child.stdout.on('data', chunk => {
          sentBytes += chunk.length;
          try { controller.enqueue(new Uint8Array(chunk)); } catch (_) {}
        });
        child.stderr.on('data', chunk => {
          // Keep stderr drained so FFmpeg cannot block; diagnostics stay out of the media response.
        });
        child.once('error', error => {
          if (settled) return;
          settled = true;
          try { controller.error(error); } catch (_) {}
        });
        child.once('close', code => {
          if (settled) return;
          settled = true;
          if (code === 0 && sentBytes > 0) {
            try { controller.close(); } catch (_) {}
          } else {
            try { controller.error(new Error('The stream ended or FFmpeg could not read this URL.')); } catch (_) {}
          }
        });
      },
      cancel() { try { child.kill('SIGKILL'); } catch (_) {} }
    });
    return new Response(body, { status: 200, headers: {
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'none'
    }});
  });
  ipcMain.handle('homeflix:remote-info', () => getRemoteInfo());
  ipcMain.handle('homeflix:register-open-file', (_event, filePath) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error('The selected media file could not be found.');
    if (!SUPPORTED_MEDIA_EXTENSIONS.has(path.extname(filePath).toLowerCase())) throw new Error('This file type is not supported by HomeFlix.');
    const token = crypto.randomBytes(24).toString('hex');
    localMediaPaths.set(token, filePath);
    return 'homeflix-media://local/' + token;
  });
  ipcMain.handle('homeflix:open-local-media', async (_event, filePath) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
      throw new Error('A valid local media file path is required.');
    }
    const fs = require('node:fs');
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error('The selected media file could not be found.');
    }
    return shell.openPath(filePath);
  });
  ipcMain.handle('homeflix:transcode-remote-media', async (_event, sourceUrl) => {
    if (typeof sourceUrl !== 'string' || sourceUrl.length > 8192) throw new Error('A valid video or stream URL is required.');
    let parsed;
    try { parsed = new URL(sourceUrl); } catch (_) { throw new Error('That video URL is invalid.'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS video/stream URLs can be played.');
    let ffmpegPath;
    try { ffmpegPath = require('ffmpeg-static'); } catch (_) {}
    if (ffmpegPath && ffmpegPath.includes('app.asar')) ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) throw new Error('The built-in stream converter is missing. Reinstall HomeFlix Cyber Node using the latest installer.');
    const crypto = require('node:crypto');
    const token = crypto.randomBytes(24).toString('hex');
    remoteStreamSources.set(token, sourceUrl);
    return 'homeflix-media://stream/' + token;
  });
  ipcMain.handle('homeflix:transcode-local-media', async (_event, filePath) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) throw new Error('A valid local media file path is required.');
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error('The selected media file could not be found.');
    let ffmpegPath;
    try { ffmpegPath = require('ffmpeg-static'); } catch (_) {}
    if (ffmpegPath && ffmpegPath.includes('app.asar')) ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) throw new Error('The built-in video converter is missing. Reinstall HomeFlix Cyber Node using the latest installer.');
    const crypto = require('node:crypto');
    const token = crypto.randomBytes(24).toString('hex');
    const outputDir = path.join(app.getPath('temp'), 'homeflix-cyber-node', 'converted');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, token + '.mp4');
    if (activeTranscodes.has(filePath)) return activeTranscodes.get(filePath);
    const job = new Promise((resolve, reject) => {
      const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', filePath, '-map', '0:v:0', '-map', '0:a:0?', '-sn', '-dn', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outputPath];
      const child = spawn(ffmpegPath, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
      let errorOutput = '';
      child.stderr.on('data', chunk => { errorOutput = (errorOutput + chunk.toString()).slice(-4000); });
      child.once('error', error => reject(new Error('Could not start the video converter: ' + error.message)));
      child.once('close', code => {
        if (code !== 0 || !fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
          try { fs.rmSync(outputPath, { force: true }); } catch (_) {}
          reject(new Error('This video could not be converted for HomeFlix playback. ' + (errorOutput.trim() || 'The file may be damaged or use an unsupported codec.')));
          return;
        }
        transcodedMedia.set(token, outputPath);
        resolve('homeflix-media://converted/' + token);
      });
    }).finally(() => activeTranscodes.delete(filePath));
    activeTranscodes.set(filePath, job);
    return job;
  });
  ipcMain.on('homeflix:discord-presence', (_event, presence) => {
    if (presence && presence.clear) clearDiscordPresence();
    else updateDiscordPresence(presence);
  });
  startDiscordRPC();
  ipcMain.on('homeflix:remote-status', (_event, status) => { if (status && typeof status === 'object') remoteStatus = { ...remoteStatus, ...status }; });
  startRemoteServer();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => {
  app.isQuitting = true;
  if (discordRetryTimer) clearTimeout(discordRetryTimer);
  clearDiscordPresence();
  for (const filePath of transcodedMedia.values()) { try { fs.rmSync(filePath, { force: true }); } catch (_) {} }
  transcodedMedia.clear();
  remoteStreamSources.clear();
  localMediaPaths.clear();
  if (discordClient) { try { discordClient.destroy(); } catch (_) {} }
  if (remoteServer) remoteServer.close();
});
