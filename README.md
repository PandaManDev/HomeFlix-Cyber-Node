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


## Automatic playback for unsupported codecs and direct video URLs (desktop app)

The Electron desktop build includes FFmpeg and can automatically convert a local video or a direct HTTP(S) video URL when Chromium cannot decode it. On a playback error, HomeFlix converts the media to an H.264/AAC MP4 in the operating system's temporary directory and plays that converted copy inside the HomeFlix player. This covers many MKV files using codecs such as HEVC or audio codecs that Chromium does not support, plus direct remote media URLs whose codec or browser playback is incompatible.

- Conversion runs on the desktop computer; remote streams are read by the packaged FFmpeg process and the converted copy is stored temporarily. The video is not uploaded to a HomeFlix server.
- For URLs, use a direct video or stream URL (for example, a media file URL), not just a webpage containing a player. URLs requiring login cookies, DRM, or a specialized extractor may not work. Some live streams may not finish conversion.
- Large videos can take several minutes to convert and require temporary disk space roughly comparable to the converted file.
- The original video is not modified.
- This automatic conversion is available in the Electron desktop app, not the hosted Vercel website, because browsers cannot access arbitrary local filesystem paths.
- If conversion fails, the file may be damaged or use a codec not supported by the packaged FFmpeg build.

### Build the Windows installer

Install a current Node.js LTS release, then run:

```bash
npm install
npm run dist
```

The Windows NSIS installer is written to `release/`. The FFmpeg binary is unpacked from Electron's ASAR archive so it can be launched by the desktop app. A fresh installer must be built and installed for these changes to be available; pushing the source to GitHub does not update an already-installed copy of the desktop app automatically.
