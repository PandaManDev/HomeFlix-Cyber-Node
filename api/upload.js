// Vercel serverless function: securely save small media files into this GitHub repo.
// Required Vercel environment variables:
// GITHUB_TOKEN (fine-grained token with Contents: Read and write on this repository)
// GITHUB_OWNER, GITHUB_REPO, HOMEFLIX_UPLOAD_KEY
const MAX_BYTES = 2.5 * 1024 * 1024;
const ALLOWED = /\.(mp4|m4v|webm|mov|mp3|m4a|aac|wav|ogg|flac|jpg|jpeg|png|webp|gif|avif|bmp)$/i;

function reply(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-homeflix-upload-key");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return reply(res, 405, { error: "Use POST for uploads." });

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, HOMEFLIX_UPLOAD_KEY } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !HOMEFLIX_UPLOAD_KEY) {
    return reply(res, 503, { error: "Upload storage is not configured yet. Set the required Vercel environment variables." });
  }
  if (req.headers["x-homeflix-upload-key"] !== HOMEFLIX_UPLOAD_KEY) {
    return reply(res, 401, { error: "Invalid upload access key." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);
    if (!body || typeof body !== "object") return reply(res, 400, { error: "Invalid upload body." });

    const name = String(body.name || "").split(/[\\/]/).pop().replace(/[^a-zA-Z0-9._() -]/g, "_").trim();
    const content = String(body.content || "");
    const size = Number(body.size);
    if (!name || name.startsWith(".") || !ALLOWED.test(name)) {
      return reply(res, 400, { error: "Unsupported file type. Allowed: common video, audio, image and GIF formats." });
    }
    if (!Number.isFinite(size) || size < 1 || size > MAX_BYTES) {
      return reply(res, 413, { error: "Files must be 2.5 MB or smaller. Use dedicated media storage for large videos." });
    }
    if (!content || !/^[A-Za-z0-9+/]+={0,2}$/.test(content)) {
      return reply(res, 400, { error: "Invalid file data." });
    }
    const actualSize = Buffer.from(content, "base64").length;
    if (actualSize !== size || actualSize > MAX_BYTES) {
      return reply(res, 400, { error: "File size validation failed." });
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = "public/media/" + stamp + "-" + name;
    const endpoint = "https://api.github.com/repos/" + encodeURIComponent(GITHUB_OWNER) + "/" + encodeURIComponent(GITHUB_REPO) + "/contents/" + path.split("/").map(encodeURIComponent).join("/");
    const gh = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Authorization": "Bearer " + GITHUB_TOKEN,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "HomeFlix-Media-Uploader"
      },
      body: JSON.stringify({
        message: "Add HomeFlix media: " + name,
        content,
        branch: process.env.GITHUB_BRANCH || "main"
      })
    });
    const data = await gh.json().catch(() => ({}));
    if (!gh.ok) {
      return reply(res, 502, { error: data.message || "GitHub could not save this file. Check token, repository permissions, and branch settings." });
    }
    return reply(res, 201, {
      ok: true,
      path,
      url: data.content && data.content.html_url ? data.content.html_url : null,
      message: "Saved to the GitHub repository. If the repo is public, the media is public too."
    });
  } catch (error) {
    return reply(res, 500, { error: "Upload failed. Check server logs and Vercel environment settings." });
  }
};
