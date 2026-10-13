# HomeFlix Cyber Node

HomeFlix is a local-first browser media interface for video, audio, images, and GIFs.

## Optional: save uploaded media into this GitHub repository

The site includes an opt-in **Save to server** control. It calls `/api/upload`, a Vercel serverless function that commits supported small media files into `public/media/` using the GitHub Contents API. The GitHub token is only used on the server and must never be placed in browser code.

### Vercel setup

In **Vercel → Project → Settings → Environment Variables**, add:

- `GITHUB_TOKEN`: a fine-grained GitHub token limited to this repository, with **Contents: Read and write** permission.
- `GITHUB_OWNER`: `PandaManDev`
- `GITHUB_REPO`: `https-homeflix-cyber-node.vercel.app-`
- `HOMEFLIX_UPLOAD_KEY`: HfX_9vQ2mL7xR4pK8wT6nB3yZ5cJ1sD0aGfUeNqYhPz
- `GITHUB_BRANCH`: optional; defaults to `main` (set this to the actual production branch if different).

Redeploy the Vercel project after adding the variables. Keep the token secret. Rotate the upload key if it is shared too widely.

### Important limits and privacy

- Uploads are restricted to **2.5 MB per file** because this endpoint sends base64 data through a serverless request. It is intended for small images/GIFs or short audio clips, not movie libraries.
- A GitHub repository is not a media streaming service. Each upload adds a Git commit, increases repository size, and may trigger a new Vercel deployment.
- If this repository is public, files committed to `public/media/` are public. Do not upload private or copyrighted media unless you have the rights to store and publish it.
- For full-length movies, large videos, or a real household streaming library, use dedicated object storage or a self-hosted media server instead of Git history.
- The upload key is a basic access gate, not user accounts, rate limiting, or a full abuse-prevention system. Share it carefully.

## Local browser playback

Files selected in the browser play locally and are not automatically uploaded. Use the explicit **Save to server** action when the Vercel upload endpoint is configured.
