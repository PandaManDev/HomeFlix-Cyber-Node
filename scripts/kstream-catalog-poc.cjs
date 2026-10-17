#!/usr/bin/env node
'use strict';

// Conservative proof of concept: inspect only KStream's public HTML shell.
// This intentionally does not execute site JavaScript, discover private APIs,
// extract video/stream URLs, or work around robots.txt, login, or anti-bot blocks.

const BASE_URL = process.env.KSTREAM_BASE_URL || 'https://kdesa.stream/';
const ALLOWED_HOST = 'kdesa.stream';
const USER_AGENT = 'HomeFlixCatalogPrototype/0.1 (+public metadata inspection)';

function safeUrl(value, base) {
  try {
    const url = new URL(value, base);
    if (url.protocol !== 'https:' || url.hostname !== ALLOWED_HOST || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTags(value) {
  return decodeEntities(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ').trim());
}

function attrs(tag) {
  const out = {};
  const re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = re.exec(tag))) out[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  return out;
}

function robotsAllows(robotsText, pathName) {
  // Apply the first matching wildcard/default user-agent group conservatively.
  const groups = [];
  let current = null;
  for (const raw of robotsText.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line || !line.includes(':')) continue;
    const split = line.indexOf(':');
    const key = line.slice(0, split).trim().toLowerCase();
    const value = line.slice(split + 1).trim();
    if (key === 'user-agent') {
      if (!current || current.hasRules) {
        current = { agents: [], rules: [], hasRules: false };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && current) {
      current.hasRules = true;
      if (value) current.rules.push({ allow: key === 'allow', path: value });
    }
  }

  const matching = groups.filter(g => g.agents.includes('*') || g.agents.some(a => USER_AGENT.toLowerCase().includes(a)));
  if (!matching.length) return true;
  const rules = matching.flatMap(g => g.rules).filter(r => pathName.startsWith(r.path));
  if (!rules.length) return true;
  rules.sort((a, b) => b.path.length - a.path.length);
  return rules[0].allow;
}

async function fetchText(url, maxBytes = 2 * 1024 * 1024) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,text/plain;q=0.8' }
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      const target = location && safeUrl(location, url);
      if (!target) throw new Error('Site redirected outside the allowed HTTPS host; stopped.');
      throw new Error('Site redirected; prototype stops rather than following redirects automatically.');
    }
    if (!response.ok) throw new Error('HTTP ' + response.status + ' from ' + new URL(url).host);
    const type = response.headers.get('content-type') || '';
    if (!/text\/html|text\/plain|application\/json/i.test(type)) throw new Error('Unexpected content type: ' + type);
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error('Response exceeded the 2 MiB safety limit.');
      }
      chunks.push(value);
    }
    return { text: new TextDecoder().decode(Buffer.concat(chunks)), status: response.status, contentType: type };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const start = safeUrl(BASE_URL, 'https://kdesa.stream/');
  if (!start || start.pathname !== '/' || start.search || start.hash) {
    throw new Error('KSTREAM_BASE_URL must be the HTTPS homepage on kdesa.stream.');
  }

  const robotsUrl = new URL('/robots.txt', start);
  const robotsResponse = await fetchText(robotsUrl).catch(error => ({ text: '', error }));
  const robotsText = robotsResponse.text || '';
  const allowed = robotsResponse.error ? true : robotsAllows(robotsText, '/');
  if (!allowed) {
    console.log(JSON.stringify({
      source: start.origin,
      checkedAt: new Date().toISOString(),
      status: 'stopped_by_robots_txt',
      candidates: [],
      notes: ['robots.txt disallows crawling the homepage; no page was fetched.']
    }, null, 2));
    return;
  }

  const page = await fetchText(start);
  const html = page.text;
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? stripTags(titleMatch[1]) : '';
  const jsRequired = /enable javascript|javascript is required|requires javascript/i.test(stripTags(html));
  const candidates = [];
  const seen = new Set();
  const anchorRe = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  let anchor;
  while ((anchor = anchorRe.exec(html)) && candidates.length < 100) {
    const openTag = anchor[0].match(/^<a\b[^>]*>/i)?.[0] || '';
    const a = attrs(openTag);
    const href = a.href && safeUrl(a.href, start);
    const label = stripTags(anchor[0]).slice(0, 160);
    if (!href || !label || href.pathname === '/' || seen.has(href.href)) continue;
    if (/^(privacy|terms|contact|login|sign.?in|sign.?up|account|settings|about)$/i.test(label)) continue;
    seen.add(href.href);
    const imageTag = anchor[0].match(/<img\b[^>]*>/i)?.[0];
    const imageAttrs = imageTag ? attrs(imageTag) : {};
    const imageUrl = imageAttrs.src && safeUrl(imageAttrs.src, start);
    candidates.push({
      title: label,
      pageUrl: href.href,
      ...(imageUrl ? { posterUrl: imageUrl.href } : {}),
      source: 'public-html-link',
      verifiedMediaType: false
    });
  }

  const jsonLdBlocks = [];
  const jsonLdRe = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ld;
  while ((ld = jsonLdRe.exec(html)) && jsonLdBlocks.length < 20) {
    try { jsonLdBlocks.push(JSON.parse(ld[1])); } catch { /* malformed public markup is ignored */ }
  }

  console.log(JSON.stringify({
    source: start.origin,
    checkedAt: new Date().toISOString(),
    httpStatus: page.status,
    contentType: page.contentType,
    pageTitle,
    javascriptRequiredSignal: jsRequired,
    publicLinkCandidates: candidates.length,
    candidates,
    structuredDataBlocks: jsonLdBlocks.length,
    notes: [
      'Candidates are public same-origin HTML links, not confirmed movies or TV shows.',
      'No media stream URLs are collected. No JavaScript bundles, private endpoints, logins, or anti-bot controls are probed.',
      ...(jsRequired ? ['The homepage appears to require JavaScript; an empty candidate list does not mean the catalog is empty.'] : []),
      ...(robotsResponse.error ? ['robots.txt could not be read (' + robotsResponse.error.message + '); only the homepage was checked.'] : [])
    ]
  }, null, 2));
}

main().catch(error => {
  console.error('KStream catalog prototype stopped:', error.message);
  process.exitCode = 1;
});
