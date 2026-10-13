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

## Linux uninstaller app

The Linux release includes a standalone graphical uninstaller executable named **`HomeFlix-Linux-Uninstaller`**, built for Linux x64. Download it from the [GitHub Releases page](https://github.com/PandaManDev/HomeFlix-Cyber-Node-Windows/releases), save it, and run:

```bash
chmod +x HomeFlix-Linux-Uninstaller
./HomeFlix-Linux-Uninstaller
```

The app opens a window with an **Uninstall HomeFlix** button. It requests administrator approval through `pkexec` to remove the installed Debian package, cleans up matching user desktop shortcuts, and asks whether to keep or delete HomeFlix settings/cache. It does not delete your media files or downloaded portable AppImage. If your desktop does not provide `pkexec`, the app explains the manual terminal command to use.

The graphical executable is built and uploaded alongside the Linux AppImage, `.deb`, and shell-script fallback by the Linux GitHub Actions workflow. The workflow artifact is available for 14 days; the release assets remain available from GitHub Releases after a successful build. If the binary is not yet listed in Releases, open the repository's Actions tab and wait for the Linux build workflow to complete successfully.

A command-line fallback is also available at `tools/uninstall-homeflix-linux.sh`. Download it and run:

```bash
chmod +x uninstall-homeflix-linux.sh
./uninstall-homeflix-linux.sh
```

## Download the installer

A GitHub Actions workflow builds the installer on a Windows runner and uploads it as the `HomeFlix-Cyber-Node-Windows-Installer` artifact. Open the workflow run in GitHub Actions and download the artifact after a successful build.
