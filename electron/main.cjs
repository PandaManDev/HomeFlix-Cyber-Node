const { app, BrowserWindow, shell, ipcMain, protocol, net, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');


const DiscordRPC = require('discord-rpc');
const { setupAutoUpdates } = require('./updater.cjs');

const DISCORD_CLIENT_ID = '1559626336795107379';

// Hardware acceleration is an Electron/Chromium startup option. Persist it separately
// from the web library and apply changes on the next app launch.
const hardwareSettingsPath = path.join(app.getPath('userData'), 'app-settings.json');
function readHardwareAccelerationSetting() {
  try {
    const saved = JSON.parse(fs.readFileSync(hardwareSettingsPath, 'utf8'));
    return saved.hardwareAcceleration !== false;
  } catch { return true; }
}
let hardwareAccelerationEnabled = readHardwareAccelerationSetting();
if (!hardwareAccelerationEnabled) app.disableHardwareAcceleration();

// A privileged streaming scheme lets Chromium play converted files without exposing arbitrary disk paths.
protocol.registerSchemesAsPrivileged([{ scheme: 'homeflix-media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
const transcodedMedia = new Map();
const activeTranscodes = new Map();
const remoteStreamSources = new Map();
const localMediaPaths = new Map();
const SUPPORTED_MEDIA_EXTENSIONS = new Set(['.mp4','.m4v','.mkv','.webm','.mov','.avi','.mpg','.mpeg','.m2ts','.ts','.ogv','.3gp','.wmv','.flv','.jpg','.jpeg','.png','.gif','.webp','.bmp','.avif','.svg']);
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    // Native Electron fullscreen does not depend on browser user-gesture permissions.
    mainWindow.setFullScreen(true);
    if (mainWindow.webContents.isLoading() === false) flushOpenFiles();
  }
}
function flushOpenFiles() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoading()) return;
  const files = pendingOpenFiles.splice(0);
  if (files.length) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    // Files opened during app startup must get the same fullscreen behavior as files
    // opened while HomeFlix is already running.
    mainWindow.setFullScreen(true);
  }
  for (const file of files) {
    mainWindow.webContents.executeJavaScript(`window.homeflixOpenFileFromOS && window.homeflixOpenFileFromOS(${JSON.stringify(file)})`)
      .catch(error => console.warn('Could not open selected media:', error.message));
  }
}

const APP_ID = 'com.homeflix.cybernode';
const WEB_URL = 'https://homeflix-cyber-node.vercel.app/';
let mainWindow;
let isQuitting = false;
let discordClient;
let discordReady = false;
let discordRetryTimer;
let lastDiscordUpdate = 0;
let lastDiscordKey = '';
let remoteStatus = { title: 'HomeFlix', playing: false, currentTime: 0, duration: 0, volume: 1 };

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

function readAppSettings() {
  try { return JSON.parse(fs.readFileSync(hardwareSettingsPath, 'utf8')); } catch { return {}; }
}
function writeAppSettings(patch) {
  const next = { ...readAppSettings(), ...patch };
  fs.mkdirSync(path.dirname(hardwareSettingsPath), { recursive: true });
  fs.writeFileSync(hardwareSettingsPath, JSON.stringify(next, null, 2), 'utf8');
  return next;
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
  mainWindow.webContents.on('did-finish-load', () => { installDiscordPageBridge(); flushOpenFiles(); });
  mainWindow.loadURL(WEB_URL);
  mainWindow.webContents.on('did-fail-load', (_event, code, description, validatedURL, isMainFrame) => {
    if (isMainFrame && !validatedURL.startsWith('file://') && code !== -3) {
      console.warn('HomeFlix website could not load:', description, 'Trying packaged fallback.');
      mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
    }
  });
  mainWindow.on('close', () => {
    isQuitting = true;
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}
app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  app.setAppUserModelId(APP_ID);
  setupAutoUpdates({ app, dialog, BrowserWindow });
  // Disable legacy launch-at-login settings from older HomeFlix installs.
  try { app.setLoginItemSettings({ openAtLogin: false, openAsHidden: false, args: [] }); } catch (error) { console.warn('Could not disable HomeFlix launch-at-login:', error.message); }
  writeAppSettings({ backgroundMode: false, launchAtLogin: false });
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
  ipcMain.handle('homeflix:get-background-services', () => ({ backgroundMode: false, launchAtLogin: false, remoteControl: false, discordPresence: !!discordClient, trayAvailable: false }));
  ipcMain.handle('homeflix:set-background-mode', (_event, _enabled) => {
    writeAppSettings({ backgroundMode: false });
    return { enabled: false, restartRequired: false };
  });
  ipcMain.handle('homeflix:set-launch-at-login', (_event, _enabled) => {
    try { app.setLoginItemSettings({ openAtLogin: false, openAsHidden: false, args: [] }); } catch (_) {}
    writeAppSettings({ launchAtLogin: false });
    return { enabled: false };
  });
  ipcMain.handle('homeflix:get-hardware-acceleration', () => ({ enabled: hardwareAccelerationEnabled }));
  ipcMain.handle('homeflix:set-hardware-acceleration', (_event, enabled) => {
    if (typeof enabled !== 'boolean') throw new Error('Hardware acceleration setting must be on or off.');
    hardwareAccelerationEnabled = enabled;
    fs.mkdirSync(path.dirname(hardwareSettingsPath), { recursive: true });
    fs.writeFileSync(hardwareSettingsPath, JSON.stringify({ hardwareAcceleration: enabled }, null, 2), 'utf8');
    return { enabled, restartRequired: true };
  });
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
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => {
  isQuitting = true;
  app.isQuitting = true;
  if (discordRetryTimer) clearTimeout(discordRetryTimer);
  clearDiscordPresence();
  for (const filePath of transcodedMedia.values()) { try { fs.rmSync(filePath, { force: true }); } catch (_) {} }
  transcodedMedia.clear();
  remoteStreamSources.clear();
  localMediaPaths.clear();
  if (discordClient) { try { discordClient.destroy(); } catch (_) {} }
});