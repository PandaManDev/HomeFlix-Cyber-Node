# HomeFlix Cyber Node

## Cloudflare deployment

This repository includes `wrangler.jsonc` configured to publish the static website from `www/`, keeping Electron, Android, scripts, and installed dependencies out of the Cloudflare asset upload.

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
