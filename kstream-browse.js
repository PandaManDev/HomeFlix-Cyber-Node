/* HomeFlix KStream browsing panel.
 * Uses public KStream pages only; does not scrape streams or alter the personal library.
 */
(() => {
  'use strict';
  const KSTREAM_HOME = 'https://kdesa.stream/';
  const entries = [
    {
      title: 'Spider-Man: Brand New Day',
      meta: 'Movie · 2026',
      url: 'https://kdesa.stream/media/tmdb-movie-969681-spider-man-brand-new-day',
      poster: 'https://image.tmdb.org/t/p/w500/bjiS5ipwxb9JFy3XRRN4OAilSeX.jpg'
    },
    {
      title: 'Supernatural',
      meta: 'Show · 2005 · S1 E1',
      url: 'https://kdesa.stream/media/tmdb-tv-1622-supernatural/6904/163114',
      poster: 'https://image.tmdb.org/t/p/w500/8iixmfGx5EIFPdpNvB2JvI3VIqX.jpg'
    }
  ];

  function el(tag, attrs = {}, text = '') {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') node.className = value;
      else if (key === 'textContent') node.textContent = value;
      else node.setAttribute(key, value);
    });
    if (text) node.textContent = text;
    return node;
  }

  function makePanel() {
    if (document.getElementById('homeflix-kstream-panel')) return;
    const panel = el('section', {
      id: 'homeflix-kstream-panel',
      className: 'lg:col-span-12 rounded-2xl overflow-hidden bg-[#111] border border-white/10 shadow-2xl'
    });
    const header = el('div', { className: 'p-5 md:p-7 bg-gradient-to-r from-[#061b22] via-[#101719] to-[#111] border-b border-white/10' });
    const top = el('div', { className: 'flex flex-col md:flex-row md:items-center md:justify-between gap-4' });
    const intro = el('div');
    intro.append(
      el('p', { className: 'text-cyan-400 font-bold text-xs tracking-[.3em] uppercase mb-2' }, 'External catalog'),
      el('h2', { className: 'text-2xl md:text-3xl font-bold text-white' }, 'Browse KStream'),
      el('p', { className: 'text-sm text-zinc-400 mt-2' }, 'Explore KStream from HomeFlix. This panel does not change your personal library.')
    );
    const actions = el('div', { className: 'flex flex-wrap gap-2' });
    const openLink = el('a', {
      href: KSTREAM_HOME, target: '_blank', rel: 'noopener noreferrer',
      className: 'inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition'
    });
    openLink.append(el('i', { className: 'fa-solid fa-arrow-up-right-from-square mr-2', 'aria-hidden': 'true' }), document.createTextNode('Open KStream'));
    const toggle = el('button', {
      type: 'button',
      className: 'px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm transition',
      'aria-expanded': 'true'
    });
    toggle.append(el('i', { className: 'fa-solid fa-chevron-up mr-2', 'aria-hidden': 'true' }), document.createTextNode('Hide browser'));
    actions.append(openLink, toggle);
    top.append(intro, actions);
    header.append(top);

    const body = el('div', { id: 'homeflix-kstream-body', className: 'p-4 md:p-6 space-y-5' });
    const note = el('p', { className: 'text-xs text-zinc-500' },
      'If the embedded site is blocked by its security settings, use “Open KStream” to browse it in a separate tab. The sample titles below are the public listings visible during setup, not a complete catalog.');
    const search = el('input', {
      type: 'search', id: 'homeflix-kstream-search',
      placeholder: 'Filter the sample titles…',
      'aria-label': 'Filter KStream sample titles',
      className: 'w-full rounded-xl bg-black/40 border border-white/15 py-3 px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-500'
    });
    const cards = el('div', { id: 'homeflix-kstream-cards', className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4' });
    entries.forEach(entry => {
      const card = el('a', {
        href: entry.url, target: '_blank', rel: 'noopener noreferrer',
        className: 'homeflix-kstream-card flex gap-3 rounded-xl bg-black/30 border border-white/10 hover:border-cyan-500/60 p-3 transition',
        'data-title': entry.title.toLowerCase()
      });
      const imgWrap = el('div', { className: 'w-20 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900' });
      const posterFallback = () => {
        img.remove();
        imgWrap.replaceChildren();
        imgWrap.className = 'w-20 shrink-0 aspect-[2/3] rounded-lg overflow-hidden flex items-end p-2 bg-gradient-to-br from-cyan-950 via-zinc-900 to-black border border-white/10';
        imgWrap.append(el('span', { className: 'text-xs leading-snug font-bold text-white break-words' }, entry.title));
      };
      const img = el('img', { src: entry.poster, alt: entry.title + ' poster', loading: 'lazy', referrerpolicy: 'no-referrer', className: 'w-full h-full object-cover' });
      img.addEventListener('error', posterFallback, { once: true });
      imgWrap.append(img);
      const details = el('div', { className: 'min-w-0 self-center' });
      details.append(
        el('h3', { className: 'text-sm font-semibold text-white' }, entry.title),
        el('p', { className: 'text-xs text-zinc-400 mt-1' }, entry.meta),
        el('p', { className: 'text-xs text-cyan-400 mt-3' }, 'Open details ↗')
      );
      card.append(imgWrap, details);
      cards.append(card);
    });
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      cards.querySelectorAll('.homeflix-kstream-card').forEach(card => {
        card.classList.toggle('hidden', !card.dataset.title.includes(query));
      });
    });

    const browserWrap = el('div', { className: 'rounded-xl overflow-hidden border border-white/10 bg-black' });
    const browserLabel = el('div', { className: 'flex items-center justify-between gap-3 px-4 py-3 bg-white/5 border-b border-white/10' });
    browserLabel.append(
      el('span', { className: 'text-sm font-semibold text-white' }, 'KStream website'),
      el('span', { className: 'text-xs text-zinc-500' }, 'Public site · external content')
    );
    const frame = el('iframe', {
      src: KSTREAM_HOME,
      title: 'KStream public website',
      loading: 'lazy',
      referrerpolicy: 'no-referrer',
      className: 'w-full bg-[#090b10]',
      style: 'height: min(72vh, 760px); min-height: 420px; border: 0; color-scheme: dark;'
    });
    frame.addEventListener('load', () => {
      // Cross-origin content cannot be inspected here. The separate-tab link is the fallback.
      const status = document.getElementById('homeflix-kstream-frame-status');
      if (status) status.textContent = 'If the page looks blank or blocked, open KStream in a separate tab.';
      clearTimeout(frameTimer);
    });
    const frameStatus = el('p', { id: 'homeflix-kstream-frame-status', className: 'px-4 py-3 text-xs text-zinc-400' },
      'Loading KStream. If the website stays blank, it may block embedding; use Open KStream to view it directly.');
    const frameFallback = el('div', { className: 'hidden p-8 text-center bg-[#090b10] border-t border-white/10', id: 'homeflix-kstream-frame-fallback' });
    frameFallback.append(
      el('p', { className: 'text-white font-semibold mb-2' }, 'KStream cannot be displayed here'),
      el('p', { className: 'text-sm text-zinc-400 mb-4' }, 'The source website may block embedded viewing. Open it directly in your browser instead.'),
      el('a', { href: KSTREAM_HOME, target: '_blank', rel: 'noopener noreferrer', className: 'inline-flex px-4 py-2 rounded-lg bg-cyan-500 text-black font-semibold' }, 'Open KStream')
    );
    const frameTimer = setTimeout(() => {
      if (!frameStatus.isConnected) return;
      frameStatus.textContent = 'The embedded page may be blocked or still loading. You can open KStream directly.';
    }, 7000);
    browserWrap.append(browserLabel, frame, frameStatus, frameFallback);
    body.append(note, search, cards, browserWrap);
    panel.append(header, body);

    toggle.addEventListener('click', () => {
      const hidden = !body.classList.contains('hidden');
      body.classList.toggle('hidden', hidden);
      toggle.setAttribute('aria-expanded', String(!hidden));
      toggle.replaceChildren();
      toggle.append(el('i', { className: (hidden ? 'fa-solid fa-chevron-down mr-2' : 'fa-solid fa-chevron-up mr-2'), 'aria-hidden': 'true' }),
        document.createTextNode(hidden ? 'Show browser' : 'Hide browser'));
    });
    const main = document.querySelector('main');
    const dashboard = document.getElementById('library-dashboard');
    if (main && dashboard) main.insertBefore(panel, dashboard);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', makePanel, { once: true });
  else makePanel();
})();
