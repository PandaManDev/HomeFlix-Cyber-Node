const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('node:path');
const os = require('node:os');
const express = require('express');

const APP_ID = 'com.homeflix.cybernode';
const WEB_URL = 'https://homeflix-cyber-node.vercel.app/';
const REMOTE_PORT = Number(process.env.HOMEFLIX_REMOTE_PORT || 47831);
const pin = String(Math.floor(100000 + Math.random() * 900000));
const tokens = new Set();
let mainWindow;
let remoteServer;
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
  serverApp.use(express.json({ limit: '32kb' }));
  serverApp.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'remote.html')));
  serverApp.get('/api/info', (_req, res) => res.json({ app: 'HomeFlix Cyber Node', name: os.hostname() }));
  serverApp.post('/api/pair', (req, res) => {
    if (String(req.body?.pin || '') !== pin) return res.status(401).json({ error: 'Incorrect pairing PIN' });
    const token = require('node:crypto').randomBytes(24).toString('hex');
    tokens.add(token);
    res.json({ token, status: remoteStatus });
  });
  serverApp.use('/api', (req, res, next) => {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token || !tokens.has(token)) return res.status(401).json({ error: 'Pair this phone with the desktop PIN first.' });
    next();
  });
  serverApp.get('/api/status', (_req, res) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('homeflix:remote-command', { action: 'status' });
      setTimeout(() => res.json(remoteStatus), 120);
    } else {
      res.json(remoteStatus);
    }
  });
  serverApp.post('/api/command', (req, res) => {
    const allowed = new Set(['toggle', 'play', 'pause', 'seek', 'volume', 'mute', 'next', 'previous', 'fullscreen', 'status']);
    const action = String(req.body?.action || '');
    if (!allowed.has(action)) return res.status(400).json({ error: 'Unsupported command' });
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('homeflix:remote-command', { action, value: req.body?.value });
    res.json({ ok: true });
  });
  remoteServer = serverApp.listen(REMOTE_PORT, '0.0.0.0', () => {
    console.log(`HomeFlix phone remote listening on port ${REMOTE_PORT}`);
  });
  remoteServer.on('error', error => console.error('Remote server failed:', error.message));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 920, minWidth: 900, minHeight: 620,
    title: 'HomeFlix Cyber Node',
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
  app.setAppUserModelId(APP_ID);
  ipcMain.handle('homeflix:remote-info', () => getRemoteInfo());
  ipcMain.on('homeflix:remote-status', (_event, status) => { if (status && typeof status === 'object') remoteStatus = { ...remoteStatus, ...status }; });
  startRemoteServer();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (remoteServer) remoteServer.close(); });
