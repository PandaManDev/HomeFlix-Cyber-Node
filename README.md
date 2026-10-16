# HomeFlix Cyber Node

**Your personal media library, organized in one convenient place.**

HomeFlix Cyber Node is a Windows desktop media player built with Electron. It combines local video playback, a Netflix-inspired library, playback progress, favorites, profiles, and phone remote controls.

## Features

- **Personal media library:** Add individual media files or scan folders on your PC.
- **Broad file selection:** Includes MP4, M4V, MKV, WebM, MOV, AVI, MPG/MPEG, TS/M2TS, OGV, 3GP, WMV, and FLV.
- **Continue Watching and My List:** Save playback progress and favorites locally.
- **Profiles and backups:** Separate viewing data by profile and export or import it as JSON.
- **Themes and Cyber Mode:** Choose an appearance and toggle CRT scanlines.
- **Desktop playback support:** The Electron build includes FFmpeg-assisted conversion for certain formats Chromium cannot play directly.
- **Phone remote:** Control desktop playback from a phone on the same trusted private Wi-Fi network.
- **Shared media library:** Browse selected desktop folders from a paired phone or tablet.

## Download HomeFlix

HomeFlix is distributed as a **Windows setup installer (.exe)**. Find the latest available installer in the repository's [GitHub Releases](https://github.com/PandaManDev/HomeFlix-Cyber-Node/releases).

Only download a release asset that is present on the release page. Build artifacts are available after the corresponding workflow completes successfully.

## Requirements

- Windows 10 or later for the desktop installer.
- A current Node.js LTS release and npm to build from source.
- For phone remote and shared-library features, connect the desktop and phone to the same trusted private Wi-Fi network.

## Project structure

- `index.html` — desktop app interface.
- `renderer.js` — library, playback controls, settings, and photo viewer behavior.
- `electron/main.cjs` — Electron main process and Windows desktop integration.
- `mobile/index.html` and `mobile/remote.js` — phone remote and shared-library interface.
- `build/` — app icons and related build assets.

## Run and build from source

Clone the repository and install dependencies:

```bash
git clone https://github.com/PandaManDev/HomeFlix-Cyber-Node.git
cd HomeFlix-Cyber-Node
npm install
```

Start the app in development:

```bash
npm start
```

Build the Windows installer:

```bash
npm run dist
```

The NSIS setup installer is written to `release/`. The installer can provide Start Menu and desktop shortcuts. Build commands generate the application icons as part of packaging.

## Media playback notes

- Your personal media files are not included in the installer.
- Favorites and viewing progress are stored locally and are not automatically synchronized between devices. Export a backup before clearing app or browser data.
- MKV is a container, not a codec. Playback depends on the codecs inside the file and the installed playback runtime.
- In the desktop app, FFmpeg may convert unsupported local files or direct streams to a compatible format. Conversion uses temporary disk space for local files and does not modify the original.
- Direct stream URLs should point to media, not a webpage containing a player. Streams requiring DRM, login cookies, or specialized extraction may not work.
- FFmpeg conversion for local files depends on the desktop app; a hosted website cannot access arbitrary files on your computer.

## Phone remote and shared library

1. Start HomeFlix Cyber Node on your Windows PC.
2. Open the app's **Settings** and locate the remote address and six-digit pairing PIN.
3. Connect your phone to the same trusted private Wi-Fi network.
4. Open the displayed local address in the phone browser and enter the PIN.
5. Use the remote to control desktop playback. You can bookmark the page or add it to your phone's home screen.

For the shared library, pair your phone first, then open the desktop address with `/library` at the end and choose **Choose desktop folders** on the PC.

The computer and HomeFlix must remain running for these features to work. Allow HomeFlix through Windows Firewall on **Private networks** if necessary. **Do not expose port 47831 to the public internet or use the remote on an untrusted network.** The remote controls the desktop player; it does not stream the desktop's current video to the phone. Shared-library playback depends on the phone browser's codec support.

## Important

- Pushing source code to GitHub does not update an already-installed desktop app. Build and install a new version to use desktop code changes.
- Backups contain profile data, favorites, and progress—not media files or passwords.
