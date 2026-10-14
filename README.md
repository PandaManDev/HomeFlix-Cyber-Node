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

