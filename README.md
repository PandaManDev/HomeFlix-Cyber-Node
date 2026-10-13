# HomeFlix Cyber Node

HomeFlix is a personal media player and Netflix-inspired library dashboard. Web version: https://homeflix-cyber-node.vercel.app/

## Features

- Netflix-inspired media library with Recently Added, search, genre filters, grid/list views, Favorites, My List, and Continue Watching.
- Import local video files and folders, drag-and-drop queue, and direct stream URLs.
- Automatic video-frame covers where browser and remote-host CORS rules permit.
- Saved progress, duration, favorites, watchlist, and theme preferences in the current browser profile.
- Playback speeds, fullscreen, volume, keyboard shortcuts, and custom SRT/VTT subtitle files.
- Netflix Red, Cyber Neon, and Midnight Blue themes.
- Electron desktop app for Windows and Linux. Windows NSIS installer plus Linux AppImage and Debian (.deb) packages, with platform-specific app icons.
- Phone remote service for the installed desktop app on the same trusted Wi-Fi network.

## Browser limitations

Browsers cannot preserve permission to play local files after refresh. Re-import local files to play them again; matching filenames, sizes and modification times can restore their saved metadata. A remote host must allow CORS-compatible frame extraction for automatic covers. The hosted static website cannot run a local network server, so the phone remote is provided by the Windows desktop app.

## Build Windows installer

Requires Node.js 20+ and npm.

```bash
npm install
npm run dist
```

The installer is created at `release/HomeFlix-Cyber-Node-Setup-5.0.0.exe`.

To launch the desktop app without packaging, run `npm start`.

## Build Linux packages

Requires Node.js 20+ and npm. On Linux (recommended) or a compatible CI runner, run:

```bash
npm install
npm run dist:linux
```

The x64 AppImage and Debian package are written to `release/`. The AppImage is portable on most mainstream Linux distributions; the `.deb` package is intended for Debian, Ubuntu, Linux Mint, and compatible systems. Run the AppImage with execute permission, for example `chmod +x release/*.AppImage` and then `./release/*.AppImage`.

### Linux uninstaller

The standalone `tools/uninstall-homeflix-linux.sh` script is included with the Linux release downloads. Download it, then run:

```bash
chmod +x uninstall-homeflix-linux.sh
./uninstall-homeflix-linux.sh
```

It offers to remove the Debian package (using administrator permission when needed), clears matching per-user desktop shortcuts, and asks separately before deleting HomeFlix settings/cache. Personal settings are kept by default. Portable AppImage files are not deleted automatically; remove the downloaded file yourself when finished.

GitHub Actions builds both Linux packages and publishes the Linux uninstaller script as a workflow artifact and release download after a successful build.

The app loads the production website first and falls back to the packaged `index.html` if the website cannot be reached. The phone remote listens on TCP port 47831 by default. Keep this port on a trusted private network; do not expose it to the public internet.

## Download the installer

A GitHub Actions workflow builds the installer on a Windows runner and uploads it as the `HomeFlix-Cyber-Node-Windows-Installer` artifact. Open the workflow run in GitHub Actions and download the artifact after a successful build.
