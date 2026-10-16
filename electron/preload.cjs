const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('homeflixDesktop', Object.freeze({
  isDesktop: true,
  getHardwareAcceleration: () => ipcRenderer.invoke('homeflix:get-hardware-acceleration'),
  setHardwareAcceleration: enabled => ipcRenderer.invoke('homeflix:set-hardware-acceleration', enabled),
  getRemoteInfo: () => ipcRenderer.invoke('homeflix:remote-info'),
  openLocalMedia: filePath => ipcRenderer.invoke('homeflix:open-local-media', filePath),
  registerOpenFile: filePath => ipcRenderer.invoke('homeflix:register-open-file', filePath),
  transcodeLocalMedia: filePath => ipcRenderer.invoke('homeflix:transcode-local-media', filePath),
  transcodeRemoteMedia: sourceUrl => ipcRenderer.invoke('homeflix:transcode-remote-media', sourceUrl),
  sendRemoteStatus: status => ipcRenderer.send('homeflix:remote-status', status),
  sendDiscordPresence: presence => ipcRenderer.send('homeflix:discord-presence', presence),
  onRemoteCommand: callback => {
    if (typeof callback !== 'function') return;
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('homeflix:remote-command', listener);
    return () => ipcRenderer.removeListener('homeflix:remote-command', listener);
  }
}));
