# HomeFlix Cyber Node

HomeFlix is a personal media player and Netflix-inspired library dashboard. Web version: https://homeflix-cyber-node.vercel.app/

## Features

- Netflix-inspired media library with Recently Added, search, genre filters, grid/list views, Favorites, My List, and Continue Watching.
- Import local video files and folders, drag-and-drop queue, and direct stream URLs.
- Automatic video-frame covers where browser and remote-host CORS rules permit.
- Saved progress, duration, favorites, watchlist, and theme preferences in the current browser profile.
- Playback speeds, fullscreen, volume, keyboard shortcuts, and custom SRT/VTT subtitle files.
- Netflix Red, Cyber Neon, and Midnight Blue themes.
- Windows Electron desktop wrapper, NSIS setup installer, app icon generation, desktop and Start Menu shortcuts.
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

The app loads the production website first and falls back to the packaged `index.html` if the website cannot be reached. The phone remote listens on TCP port 47831 by default. Keep this port on a trusted private network; do not expose it to the public internet.

## Download the installer

A GitHub Actions workflow builds the installer on a Windows runner and uploads it as the `HomeFlix-Cyber-Node-Windows-Installer` artifact. Open the workflow run in GitHub Actions and download the artifact after a successful build.
