/* HomeFlix KStream browsing panel.
 * Public title links only. KStream may block iframe embedding, so open it externally.
 * This panel never mutates the user's personal library.
 */
(() => {
  'use strict';
  const HOME = 'https://kdesa.stream/';
  const entries = [
    { title: 'Spider-Man: Brand New Day', meta: 'Movie · 2026 · Featured', url: 'https://kdesa.stream/media/tmdb-movie-969681-spider-man-brand-new-day', poster: 'https://image.tmdb.org/t/p/w500/bjiS5ipwxb9JFy3XRRN4OAilSeX.jpg' },
    { title: 'The Odyssey', meta: 'Movie · 2026 · Featured pick', url: HOME, poster: '' },
    { title: 'Resident Evil', meta: 'Movie · 2026 · Featured pick', url: HOME, poster: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Resident_Evil_2026_Poster_Film.webp' },
    { title: 'Insidious: Out of the Further', meta: 'Movie · 2026 · Featured pick', url: HOME, poster: '' },
    { title: 'Matchbox the Movie', meta: 'Movie · 2026 · Featured pick', url: HOME, poster: '' },
    { title: 'Fall 2: Deadpoint', meta: 'Movie · 2026 · Featured pick', url: HOME, poster: '' },
    { title: 'The Fix', meta: 'Movie · 2026 · Featured pick', url: HOME, poster: '' },
    { title: 'Runner', meta: 'Movie · 2026 · Featured pick', url: HOME, poster: '' },
    { title: 'Animals', meta: 'Movie · 2026 · Featured pick', url: HOME, poster: '' },
    { title: 'Resident Dead', meta: 'Movie · 2026 · Featured pick', url: HOME, poster: '' },
    { title: 'Supernatural', meta: 'Show · 2005', url: 'https://kdesa.stream/media/tmdb-tv-1622-supernatural/6904/163114', poster: 'https://image.tmdb.org/t/p/w500/fg3MNPPng5PEV2Em8oiWfo1SN60.jpg' },
    { title: 'Avengers: Endgame', meta: 'Movie · 2019 · Featured pick', url: HOME, poster: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg' },
    { title: 'Spider-Man: Across the Spider-Verse', meta: 'Movie · 2023 · Featured pick', url: HOME, poster: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg' },
    { title: 'Dune: Part Two', meta: 'Movie · 2024 · Featured pick', url: HOME, poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg' },
    { title: 'Inside Out 2', meta: 'Movie · 2024 · Featured pick', url: HOME, poster: '' }
  ];
  function el(tag, attrs = {}, text = '') {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') node.className = value;
      else node.setAttribute(key, value);
    });
    if (text) node.textContent = text;
    return node;
  }
  function makePanel() {
    if (document.getElementById('homeflix-kstream-panel')) return;
    const panel = el('section', { id: 'homeflix-kstream-panel', className: 'lg:col-span-12 rounded-2xl overflow-hidden bg-[#111] border border-white/10 shadow-2xl' });
    const header = el('div', { className: 'p-5 md:p-7 bg-gradient-to-r from-[#061b22] via-[#101719] to-[#111] border-b border-white/10' });
    const top = el('div', { className: 'flex flex-col md:flex-row md:items-center md:justify-between gap-4' });
    const intro = el('div');
    intro.append(
      el('p', { className: 'text-cyan-400 font-bold text-xs tracking-[.3em] uppercase mb-2' }, 'External catalog'),
      el('h2', { className: 'text-2xl md:text-3xl font-bold text-white' }, 'Browse KStream'),
      el('p', { className: 'text-sm text-zinc-400 mt-2' }, 'Open KStream from HomeFlix without changing your personal library.')
    );
    const open = el('a', { href: HOME, target: '_blank', rel: 'noopener noreferrer', className: 'inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition' }, 'Open KStream in browser ↗');
    top.append(intro, open);
    header.append(top);
    const body = el('div', { className: 'p-4 md:p-6 space-y-5' });
    const note = el('div', { className: 'rounded-xl border border-white/10 bg-[#090b10] p-4 md:p-5' });
    note.append(
      el('p', { className: 'text-white font-semibold mb-1' }, 'Why the website is not embedded'),
      el('p', { className: 'text-sm text-zinc-400 leading-relaxed' }, 'KStream can block display inside other apps. HomeFlix no longer shows a blank white frame; use Open KStream to browse the source directly. These are sample shortcuts, not a complete or automatically synced catalog.')
    );
    const search = el('input', { type: 'search', id: 'homeflix-kstream-search', placeholder: 'Filter sample titles…', 'aria-label': 'Filter KStream sample titles', className: 'w-full rounded-xl bg-black/40 border border-white/15 py-3 px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-500' });
    const cards = el('div', { id: 'homeflix-kstream-cards', className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4' });
    entries.forEach(entry => {
      const card = el('a', { href: entry.url, target: '_blank', rel: 'noopener noreferrer', className: 'homeflix-kstream-card flex gap-3 rounded-xl bg-black/30 border border-white/10 hover:border-cyan-500/60 p-3 transition', 'data-title': entry.title.toLowerCase() });
      const wrap = el('div', { className: 'w-20 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-gradient-to-br from-cyan-950 via-zinc-900 to-black border border-white/10 flex items-end p-2' });
      const fallback = el('span', { className: 'text-xs leading-snug font-bold text-white break-words' }, entry.title);
      const img = el('img', { src: entry.poster, alt: entry.title + ' poster', loading: 'lazy', referrerpolicy: 'no-referrer', className: 'w-full h-full object-cover' });
      img.addEventListener('error', () => { img.remove(); wrap.replaceChildren(fallback); }, { once: true });
      img.addEventListener('load', () => { wrap.className = 'w-20 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900'; }, { once: true });
      wrap.append(img);
      const details = el('div', { className: 'min-w-0 self-center' });
      details.append(el('h3', { className: 'text-sm font-semibold text-white' }, entry.title), el('p', { className: 'text-xs text-zinc-400 mt-1' }, entry.meta), el('p', { className: 'text-xs text-cyan-400 mt-3' }, 'Open on KStream ↗'));
      card.append(wrap, details);
      cards.append(card);
    });
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      cards.querySelectorAll('.homeflix-kstream-card').forEach(card => card.classList.toggle('hidden', !card.dataset.title.includes(q)));
    });
    body.append(note, search, cards);
    panel.append(header, body);
    const main = document.querySelector('main');
    const dashboard = document.getElementById('library-dashboard');
    if (main && dashboard) main.insertBefore(panel, dashboard);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', makePanel, { once: true });
  else makePanel();
})();
