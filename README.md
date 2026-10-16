# HomeFlix Cyber Node

A personal media library and desktop video player for Windows, with a Netflix-inspired interface and phone remote controls.

## Download

**Windows 10 or later:** get the latest **HomeFlix Cyber Node Setup (.exe)** from [GitHub Releases](https://github.com/PandaManDev/HomeFlix-Cyber-Node/releases).

1. Open the Releases page.
2. Choose the latest release.
3. Download the `HomeFlix-Cyber-Node-Setup-*.exe` installer asset.
4. Run the installer and follow the setup prompts.

Use the installer attached to a published release. If a release has no installer asset, check back after its build finishes.

## Features

- **Personal media library** — open video files and scan folders on your PC.
- **Common video formats** — MP4, M4V, MKV, WebM, MOV, AVI, MPG/MPEG, M2TS/TS, OGV, 3GP, WMV, and FLV.
- **Continue Watching and My List** — keep playback progress and favorites.
- **Profiles and backups** — organize viewing data by profile and export or import it as JSON.
- **Cyber Mode and themes** — customize the interface and toggle CRT scanlines.
- **Desktop playback assistance** — packaged FFmpeg can convert some files or streams that Chromium cannot play directly.
- **Phone remote** — control desktop playback from a phone on the same trusted private Wi-Fi network.
- **Shared media library** — access selected desktop folders from a paired phone or tablet.

## Phone remote

1. Open HomeFlix on your Windows PC.
2. Open **Settings** and find the remote address and six-digit pairing PIN.
3. Connect your phone to the same trusted private Wi-Fi network.
4. Open the displayed address in your phone browser and enter the PIN.
5. Use the remote controls. Bookmark the page or add it to your phone's home screen for quick access.

To use the shared library, pair your phone first, then open the same desktop address with `/library` at the end. Choose **Choose desktop folders** on the PC to select media folders.

Keep HomeFlix running and the PC awake while using these features. If needed, allow HomeFlix through Windows Firewall on **Private networks**. **Never expose port 47831 to the public internet or use the remote on an untrusted network.** The remote controls the desktop player; it does not stream the desktop's current video to your phone.

## Playback notes

- Your personal media files are not included with HomeFlix.
- MKV is a container format, not a codec. Playback depends on the codecs inside the file and the playback runtime.
- The desktop app can use FFmpeg to convert some unsupported local files or direct media streams. Local conversion uses temporary disk space and does not change the original file.
- Direct stream URLs must point to media, not merely to a webpage with an embedded player. DRM-protected streams, streams requiring login cookies, and some specialized formats may not work.
- Mobile browser codec support varies, especially for MKV, HEVC, and DTS.
- Favorites and playback progress are stored locally and are not automatically synchronized between devices. Export a backup before clearing app or browser data.

## Help and updates

- [Latest releases and installer downloads](https://github.com/PandaManDev/HomeFlix-Cyber-Node/releases)
- [Report an issue](https://github.com/PandaManDev/HomeFlix-Cyber-Node/issues)

Installing a new release updates the desktop application; simply visiting the repository does not update an installed copy. Backups contain profile data, favorites, and progress—not video files or passwords.
