# KStream catalog proof of concept

This standalone script checks only the public HTML homepage at `https://kdesa.stream/` and prints a JSON report of same-origin link candidates.

## Run

From the HomeFlix repository root, with Node.js 18 or newer:

```sh
node scripts/kstream-catalog-poc.cjs
```

Optional homepage override (must still be the HTTPS homepage on `kdesa.stream`):

```sh
KSTREAM_BASE_URL=https://kdesa.stream/ node scripts/kstream-catalog-poc.cjs
```

## Scope and limitations

- Checks `robots.txt` when reachable and stops if it disallows the homepage.
- Uses a ten-second timeout, a 2 MiB response cap, and no automatic redirects.
- Accepts only HTTPS URLs on `kdesa.stream`.
- Reports same-origin links as **candidates**, not confirmed movie/TV entries.
- Does not execute JavaScript, probe private API endpoints, collect playback/stream URLs, authenticate, or bypass access controls or anti-bot checks.
- The homepage may only contain a JavaScript application shell. Zero candidates means the static HTML did not expose links; it does not mean the catalog is empty.

This is a diagnostic prototype only. It is not connected to the HomeFlix interface or persistent library and has not been verified against the site's client-rendered catalog.
