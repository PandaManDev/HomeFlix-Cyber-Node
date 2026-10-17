const { autoUpdater } = require('electron-updater');

let promptOpen = false;
let downloadStarted = false;
let checkTimer = null;

function setupAutoUpdates({ app, dialog, BrowserWindow }) {
  // The updater is intended for packaged Windows installers, not local development runs.
  if (!app.isPackaged || process.platform !== 'win32') return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('error', error => {
    console.warn('HomeFlix update check failed:', error?.message || error);
  });

  autoUpdater.on('update-available', async info => {
    if (promptOpen || downloadStarted) return;
    promptOpen = true;
    try {
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'HomeFlix update available',
        message: `HomeFlix Cyber Node ${info.version} is available.`,
        detail: 'Would you like to download the update now? You can keep using HomeFlix while it downloads.',
        buttons: ['Download update', 'Remind me later'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      });
      if (result.response === 0) {
        downloadStarted = true;
        await autoUpdater.downloadUpdate();
      }
    } catch (error) {
      console.warn('Could not start HomeFlix update download:', error?.message || error);
      downloadStarted = false;
    } finally {
      promptOpen = false;
    }
  });

  autoUpdater.on('update-not-available', info => {
    console.info('HomeFlix is up to date:', info?.version || app.getVersion());
  });

  autoUpdater.on('download-progress', progress => {
    console.info(`HomeFlix update download: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', async info => {
    try {
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'HomeFlix update ready',
        message: `HomeFlix Cyber Node ${info.version} has been downloaded.`,
        detail: 'Restart HomeFlix now to finish installing the update, or choose Later to install it when you next close the app.',
        buttons: ['Restart and install', 'Later'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      });
      if (result.response === 0) {
        isInstallingUpdate = true;
        autoUpdater.quitAndInstall(false, true);
      }
    } catch (error) {
      console.warn('Could not show HomeFlix update-ready prompt:', error?.message || error);
    }
  });

  const checkForUpdates = async () => {
    if (isInstallingUpdate || !app.isPackaged) return;
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.warn('HomeFlix update check failed:', error?.message || error);
    }
  };

  // Give the app time to open before showing an update prompt. Retry every six hours.
  checkTimer = setTimeout(() => {
    checkForUpdates();
    checkTimer = setInterval(checkForUpdates, 6 * 60 * 60 * 1000);
  }, 10000);
  app.on('before-quit', () => {
    if (checkTimer) {
      clearTimeout(checkTimer);
      clearInterval(checkTimer);
      checkTimer = null;
    }
  });
}

let isInstallingUpdate = false;

module.exports = { setupAutoUpdates };
