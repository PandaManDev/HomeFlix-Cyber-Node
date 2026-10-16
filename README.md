# HomeFlix Cyber Node

**Your personal media library, organized in one convenient place.** HomeFlix Cyber Node is a Windows personal media player built with Electron. It combines local video playback, media-library tools, a cyber-themed interface, desktop playback helpers, and companion controls for your phone.

## Highlights

- **Personal media library:** Open and organize videos stored on your computer.
- **Wide video-file selection:** Supports common formats including MP4, M4V, MKV, WebM, MOV, AVI, MPG/MPEG, M2TS/TS, OGV, 3GP, WMV, and FLV.
- **Desktop playback assistance:** The Electron desktop build bundles FFmpeg for conversion-assisted playback when Chromium cannot decode a supported input.
- **Continue watching and My List:** Save playback progress and favorites in local browser/Electron storage.
- **Profiles and backups:** Keep per-profile viewing data on the current device and export or import it as JSON.
- **Cyber Mode:** Customize interface accents and toggle CRT scanlines.
- **Phone remote:** Pair a phone on the same trusted Wi-Fi network to control desktop playback.
- **Shared library:** Browse selected desktop media folders from a paired phone or tablet.
- **Windows desktop app:** Install HomeFlix using a Windows setup installer.
- **Phone remote app:** Use the mobile-friendly remote page in your phone browser to control HomeFlix on your Windows PC. Add it to your phone's home screen for an app-like experience—no Android APK or separate mobile build is required.

## Get HomeFlix Cyber Node

Download the latest available builds and check project releases/workflows here:

- [GitHub repository](https://github.com/PandaManDev/HomeFlix-Cyber-Node-App)
- [GitHub Actions build workflows](https://github.com/PandaManDev/HomeFlix-Cyber-Node-App/actions)
- [HomeFlix Cyber Node Download Center](https://homeflix-cyber-node.pandaman420.workers.dev/)

Build artifacts are available only when the corresponding workflow has completed successfully. Do not assume an installer exists for a workflow that is still running or has failed.

## Requirements

- Windows 10 or later for the desktop installer.
- A current Node.js LTS release and npm for building the Windows installer from source.
- For phone remote/library features, the desktop and phone must be on the same trusted private Wi-Fi network.

## Build from source

Clone the repository and install dependencies:

```bash
git clone https://github.com/PandaManDev/HomeFlix-Cyber-Node-App.git
cd HomeFlix-Cyber-Node-App
npm install
```

Start the desktop app during development:

```bash
npm start
```

### Build a Windows installer

```bash
npm run dist
```

The NSIS setup installer is written to `release/`. The installer supports choosing an installation directory and creating Start Menu and desktop shortcuts.

### Icons

The build commands generate application icons before packaging by running `npm run make-icon`.

## Important notes

- HomeFlix is a personal media player; your media files are not included in installer builds.
- Favorites and viewing progress are stored locally and are not automatically synchronized across devices. Export a backup before clearing browser data.
- MKV is a container, not a codec. Playback depends on the codecs inside the file and on the installed playback runtime.
- FFmpeg conversion runs on the desktop. Local conversion uses temporary disk space; the original local video is not modified.
- Phone remote and shared-library access are intended for a trusted local network. **Do not expose port 47831 to the public internet.**
- A phone remote controls the desktop player; it does not stream the desktop's video to the phone. The shared library can stream selected files over the local network, but mobile browser codec support varies.
- Pushing source code to GitHub does not automatically update an already-installed desktop app. Build and install a new package to use updated desktop code.

---

## Cloudflare deployment

This repository includes `wrangler.jsonc` configured to publish the static website from `www/`, keeping Electron, scripts, and installed dependencies out of the Cloudflare asset upload.

In Cloudflare's build settings, use:

- **Build command:** leave empty
- **Deploy command:** `npx wrangler deploy`

The current website entry point is `index.html` at the repository root. Before deploying after website edits, sync it to the Cloudflare asset directory:

```bash
cp index.html www/index.html
mkdir -p www/build
cp build/homeflix-icon.svg www/build/homeflix-icon.svg
npx wrangler deploy
```

For local deployments, run `npm run deploy:cloudflare` after syncing the files above. Wrangler must be authenticated to the intended Cloudflare account.

## Video format support

The library's file pickers now explicitly include MKV and additional common video extensions (MP4, M4V, WebM, MOV, AVI, MPG/MPEG, TS/M2TS, OGV, 3GP, WMV, and FLV). Files with missing or generic MIME types are also detected by extension.

**Playback note:** MKV is a container format, not a codec. The built-in Chromium player can play only the codecs supported by the installed browser runtime. Some MKV files will play directly; others (for example, files with unsupported HEVC, DTS, or other codecs) need a desktop playback engine such as mpv or VLC. The app now reports a clearer message when the browser cannot decode a file; this change does not bundle mpv/VLC or guarantee playback of every MKV codec.


## MKV files and stream URLs (desktop app)

The Electron desktop build includes FFmpeg for media formats Chromium cannot play directly. MKV is a container format, so playback depends on the codecs inside it.

- **Local MKV files:** HomeFlix accepts MKV files. If Chromium cannot decode one, the desktop app converts it to an H.264/AAC MP4 in the operating system's temporary directory and plays the converted copy.
- **Direct MKV stream URLs:** URLs whose path or query value ends in `.mkv` are routed through FFmpeg immediately in the desktop app. FFmpeg converts the incoming stream to fragmented H.264/AAC MP4 as it arrives, so HomeFlix does not need to download the entire stream first.
- **Other direct video URLs:** If Chromium cannot play a direct HTTP(S) stream, HomeFlix attempts the same live FFmpeg conversion.
- Use a direct video or stream URL, not just a webpage containing a player. URLs requiring login cookies, DRM, or a specialized extractor may not work. The remote server must allow FFmpeg to access the stream.
- Conversion runs on your desktop computer; video is not uploaded to a HomeFlix server. Local-file conversion uses temporary disk space; live stream conversion is incremental.
- The original local video is not modified.
- Automatic FFmpeg conversion is available in the Electron desktop app, not the hosted Vercel website, because browsers cannot access arbitrary local filesystem paths.
- If conversion fails, the file or stream may be damaged, require authorization, or use a codec/protocol not supported by the packaged FFmpeg build.

### Build the Windows installer

Install a current Node.js LTS release, then run:

```bash
npm install
npm run dist
```

The Windows NSIS installer is written to `release/`. The FFmpeg binary is unpacked from Electron's ASAR archive so it can be launched by the desktop app. A fresh installer must be built and installed for these changes to be available; pushing the source to GitHub does not update an already-installed copy of the desktop app automatically.


## Cyber Node Personal Media Hub

The Cyber Node Tools panel adds browser-local quality-of-life features to the website and Electron app:

- **Profiles:** Keep per-profile favorites and viewing progress on the current device.
- **Continue watching:** Automatically record playback position and mark media watched near completion.
- **My List:** Add or remove the currently playing item from a profile's favorites.
- **Cyber Mode:** Change the interface accent and toggle CRT scanlines.
- **Surprise me:** Jump to a random visible library card.
- **Backup and restore:** Export or import profile data, favorites, and progress as JSON.
- **Diagnostics:** Check whether a video element is present and whether the browser reports a network connection.

Open **✦ NODE TOOLS** in the lower-right corner. Data is stored locally in the browser/Electron web storage; it is not automatically synced between devices. Export a backup before clearing browser data. The media itself is never included in the backup. The existing player and MKV/stream URL conversion pipeline remain in place.


## Phone remote control

HomeFlix Cyber Node's desktop build includes a phone-friendly remote web app served by the desktop itself.

1. Start HomeFlix Cyber Node on the desktop and keep it open.
2. Open **Settings** in the desktop app and find the **Remote** address and six-digit pairing PIN.
3. Connect your phone to the same trusted private Wi-Fi network.
4. Type the full local address shown in Settings (usually `http://DESKTOP-IP:47831/`) into your phone browser.
5. Enter the six-digit PIN to pair. You can then control play/pause, previous/next, seek by 10 seconds or scrub the timeline, volume, mute, and fullscreen.
6. Bookmark the remote page or use your mobile browser's **Add to Home Screen** option if available.

The phone remote is served by the installed desktop app, so the computer must be on and HomeFlix must be running. If the page will not load, allow HomeFlix through Windows Firewall on **Private networks** and check that both devices are on the same Wi-Fi. Pairing attempts are rate-limited; session tokens expire after 30 days. Do not expose port 47831 to the public internet or use the remote on an untrusted network. The phone remote controls the desktop player; it does not stream the desktop's video to the phone.


## Shared media library (desktop to phone/tablet)

The Electron desktop app now exposes a paired-device library at `http://DESKTOP-IP:47831/library` on the same trusted local network.

1. Start HomeFlix on the desktop and pair the phone using the existing six-digit PIN on the Phone Remote page.
2. In the phone browser, open the same desktop address with `/library` at the end.
3. Choose **Choose desktop folders**. A folder picker opens on the desktop; select the folders containing your videos.
4. Tap **Refresh** on the phone, then choose **Play on this device** on a listed video.

The desktop keeps the folder index in memory and streams files directly over the LAN with HTTP range support. The computer and HomeFlix must remain running. Folder selection is performed on the desktop, and the paired phone can only request items from the indexed list. Clear the app's in-memory shared-folder selection by restarting HomeFlix; do not forward port 47831 to the public internet.

**Format note:** this first shared-library version streams the original file bytes. Whether a video plays on the phone depends on that phone browser's codecs; MKV/HEVC/DTS are not guaranteed to play in mobile browsers. Use H.264/AAC MP4 for broad compatibility. The desktop's existing FFmpeg conversion pipeline remains available for desktop playback; mobile transcoding is not yet implemented.


