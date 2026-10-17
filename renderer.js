const LIBRARY_STORAGE_KEY = 'homeflix-library-v1';
        function loadLibraryMetadata() {
            try { return JSON.parse(localStorage.getItem('homeflix-library-v1') || '{}'); } catch (_) { return {}; }
        }
        function libraryKey(item) { return item.id || (item.type === 'url' ? item.url : item.title + '|' + (item.size || '')); }
        function persistLibrary() {
            const data = {};
            state.playlist.forEach(item => {
                const key = libraryKey(item);
                data[key] = { title:item.title, url:item.type === 'url' ? item.url : '', type:item.type, size:item.size || '', thumbnail:item.type === 'url' ? (item.thumbnail || '') : '', genre:item.genre || inferGenre(item.title), addedAt:item.addedAt || Date.now(), duration:item.duration || 0, progress:item.progress || 0, favorite:!!item.favorite, watchlist:!!item.watchlist };
            });
            // Retain prior progress for local files even though browser security requires re-importing the files after reload.
            Object.keys(state.savedLibrary || {}).forEach(k => { if (!data[k]) data[k]=state.savedLibrary[k]; });
            state.savedLibrary=data;
            try { localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(data)); } catch (e) { showToast('Library storage is full. Some covers may not be saved.'); }
        }
        function inferGenre(title) {
            const t=(title||'').toLowerCase();
            if (/horror|scary|haunt|ghost|zombie|nightmare/.test(t)) return 'Horror';
            if (/comedy|funny|laugh/.test(t)) return 'Comedy';
            if (/documentary|behind.the.scenes|making.of/.test(t)) return 'Documentary';
            if (/anime|animation|cartoon/.test(t)) return 'Animation';
            if (/sci.?fi|space|alien|robot|future|cyber/.test(t)) return 'Sci-Fi';
            if (/action|fight|war|battle|mission/.test(t)) return 'Action';
            if (/drama|story|life/.test(t)) return 'Drama';
            return 'Other';
        }
        function escapeLibraryText(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
        function syncLibraryMetadata(item) {
            if (!item) return;
            const existing=state.playlist.find(other=>other!==item && libraryKey(other)===libraryKey(item));
            if (existing) {
                item.favorite=!!(item.favorite||existing.favorite);
                item.watchlist=!!(item.watchlist||existing.watchlist);
                item.progress=Math.max(Number(item.progress)||0,Number(existing.progress)||0);
                item.duration=Number(item.duration)||Number(existing.duration)||0;
                item.addedAt=Math.min(Number(item.addedAt)||Date.now(),Number(existing.addedAt)||Date.now());
            }
            const saved=state.savedLibrary[libraryKey(item)] || {};
            item.genre=item.genre || saved.genre || inferGenre(item.title);
            item.addedAt=item.addedAt || saved.addedAt || Date.now();
            item.duration=item.duration || saved.duration || 0;
            if (!item.duration) item.duration=saved.duration || 0;
            if (!item.progress) item.progress=saved.progress || 0;
            if (!item.favorite) item.favorite=!!saved.favorite;
            if (!item.watchlist) item.watchlist=!!saved.watchlist;
            if (!item.thumbnail && saved.thumbnail) item.thumbnail=saved.thumbnail;
        }
        function setLibraryView(view) {
            state.libraryView=view;
            document.getElementById('grid-view-btn').className='px-3 py-2 rounded-lg text-sm '+(view==='grid'?'bg-red-600 text-white':'text-zinc-400 hover:text-white');
            document.getElementById('list-view-btn').className='px-3 py-2 rounded-lg text-sm '+(view==='list'?'bg-red-600 text-white':'text-zinc-400 hover:text-white');
            renderLibrary();
        }
        function setLibraryFilter(filter) {
            state.libraryFilter=filter;
            for (const [id,value] of [['filter-all-btn','all'],['filter-favorites-btn','favorites'],['filter-watchlist-btn','watchlist']]) {
                const el=document.getElementById(id);
                el.className='px-3 py-2 rounded-full text-xs '+(filter===value?'bg-white text-black font-semibold':'bg-white/10 text-zinc-300');
            }
            renderLibrary();
        }
        function applyLibraryTheme(theme) {
            document.body.classList.remove('netflix-skin','cyber-skin','midnight-skin');
            if (theme==='cyber') { document.body.classList.add('cyber-skin'); document.body.classList.remove('crt-off'); }
            else if (theme==='midnight') document.body.classList.add('midnight-skin');
            else document.body.classList.add('netflix-skin');
        }

        let discordProfileRefreshTimer = null;
        async function openLibrarySettings() {
            const modal = document.getElementById('library-settings-modal');
            const themeSelect = document.getElementById('library-theme');
            const hardwareToggle = document.getElementById('hardware-acceleration');
            const hardwareStatus = document.getElementById('hardware-acceleration-status');
            if (!modal || !themeSelect) return;
            themeSelect.value = state.libraryTheme || localStorage.getItem('homeflix-theme') || 'netflix';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            if (hardwareToggle && hardwareStatus) {
                const desktop = window.homeflixDesktop;
                hardwareToggle.disabled = !(desktop?.isDesktop && typeof desktop.getHardwareAcceleration === 'function');
                if (hardwareToggle.disabled) {
                    hardwareToggle.checked = true;
                    hardwareStatus.textContent = 'Hardware acceleration controls are available in the installed Windows app.';
                } else {
                    hardwareStatus.textContent = 'Loading hardware acceleration setting…';
                    try {
                        const setting = await desktop.getHardwareAcceleration();
                        hardwareToggle.checked = !!setting?.enabled;
                        hardwareStatus.textContent = hardwareToggle.checked
                            ? 'Enabled. Restart HomeFlix after changing this option.'
                            : 'Disabled. Restart HomeFlix after changing this option.';
                    } catch (error) {
                        hardwareStatus.textContent = 'Could not read this setting: ' + (error?.message || 'desktop setting unavailable');
                    }
                }
            }
        }
        function closeLibrarySettings() {
            const modal = document.getElementById('library-settings-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        async function saveLibrarySettings() {
            const themeSelect = document.getElementById('library-theme');
            if (!themeSelect) return;
            const chosenTheme = themeSelect.value || 'netflix';
            try {
                localStorage.setItem('homeflix-theme', chosenTheme);
                state.libraryTheme = chosenTheme;
                applyLibraryTheme(chosenTheme);
            } catch (error) {
                showToast('Could not save appearance settings: ' + (error?.message || 'storage unavailable'));
                return;
            }
            const hardwareToggle = document.getElementById('hardware-acceleration');
            let hardwareRestartNeeded = false;
            const desktop = window.homeflixDesktop;
            if (hardwareToggle && !hardwareToggle.disabled && desktop?.isDesktop && typeof desktop.setHardwareAcceleration === 'function') {
                try {
                    const result = await desktop.setHardwareAcceleration(!!hardwareToggle.checked);
                    hardwareRestartNeeded = !!result?.restartRequired;
                } catch (error) {
                    showToast('Appearance saved, but hardware acceleration failed: ' + (error?.message || 'unknown error'));
                    return;
                }
            }
            closeLibrarySettings();
            showToast(hardwareRestartNeeded
                ? 'Settings saved. Restart HomeFlix to apply hardware acceleration changes.'
                : 'Settings saved successfully.');
        }
        function showRemoteInfo() {
            const msg=window.homeflixDesktop ? 'Use the remote address shown by the HomeFlix desktop app and enter its pairing PIN on your phone. Keep both devices on the same trusted Wi-Fi.' : 'Install and open the Windows desktop build to enable a phone remote on your local Wi-Fi. The hosted website alone cannot accept incoming phone commands.';
            showToast(msg);
        }
        function toggleLibraryFlag(index, flag) {
            const item=state.playlist[index]; if (!item) return;
            item[flag]=!item[flag]; persistLibrary(); renderLibrary(); renderPlaylist();
            showToast(item[flag] ? (flag==='favorite'?'Added to Favorites':'Added to My List') : (flag==='favorite'?'Removed from Favorites':'Removed from My List'));
        }
        function libraryCard(item, index, compact=false) {
            const title=escapeLibraryText(item.title);
            const genre=escapeLibraryText(item.genre || inferGenre(item.title));
            const duration=item.duration ? formatTime(item.duration) : (item.size || 'Video');
            const progress=Math.max(0,Math.min(100,item.duration ? (item.progress/item.duration)*100 : 0));
            const cover=item.thumbnail ? '<img src="'+item.thumbnail+'" alt="" loading="lazy">' : '<div class="library-poster-fallback"><i class="fa-solid fa-film"></i></div>';
            return '<article class="library-card '+(state.libraryView==='list'&&!compact?'flex items-center':'')+'">'+
                '<div class="library-poster" onclick="openLibraryItem('+index+')" role="button" tabindex="0" aria-label="Play '+title+'">'+cover+'<div class="library-poster-overlay"><button class="w-12 h-12 rounded-full bg-red-600 text-white shadow-lg" onclick="event.stopPropagation();openLibraryItem('+index+')"><i class="fa-solid fa-play"></i></button></div></div>'+
                '<div class="library-card-body p-3 flex-1 min-w-0"><div class="flex items-start justify-between gap-2"><div class="min-w-0"><h4 class="library-card-title" title="'+title+'">'+title+'</h4><p class="library-card-meta">'+genre+' · '+escapeLibraryText(duration)+'</p></div><div class="flex gap-1 shrink-0"><button class="library-action '+(item.favorite?'active':'')+'" onclick="toggleLibraryFlag('+index+',\'favorite\')" title="Favorite"><i class="fa-solid fa-heart text-xs"></i></button><button class="library-action '+(item.watchlist?'active':'')+'" onclick="toggleLibraryFlag('+index+',\'watchlist\')" title="Add to My List"><i class="fa-solid fa-bookmark text-xs"></i></button></div></div>'+
                (item.duration ? '<div class="library-progress mt-3"><span style="width:'+progress+'%"></span></div>' : '')+'</div></article>';
        }
        function renderLibrary() {
            if (!document.getElementById('library-grid')) return;
            state.playlist.forEach(syncLibraryMetadata);
            const query=state.librarySearch || '';
            const matches=state.playlist.map((item,index)=>({item,index})).filter(({item})=>{
                const text=(item.title+' '+(item.genre||'')+' '+(item.type||'')).toLowerCase();
                return (!query || text.includes(query)) && (state.libraryGenre==='all' || (item.genre||inferGenre(item.title))===state.libraryGenre) && (state.libraryFilter==='all' || (state.libraryFilter==='favorites'?item.favorite:item.watchlist));
            });
            const sortMode=document.getElementById('library-sort')?.value||'recent';
            matches.sort((a,b)=>{
                if(sortMode==='title')return a.item.title.localeCompare(b.item.title,undefined,{sensitivity:'base'});
                if(sortMode==='title-desc')return b.item.title.localeCompare(a.item.title,undefined,{sensitivity:'base'});
                if(sortMode==='duration')return (Number(b.item.duration)||0)-(Number(a.item.duration)||0);
                if(sortMode==='progress')return ((Number(b.item.progress)||0)/(Number(b.item.duration)||1))-((Number(a.item.progress)||0)/(Number(a.item.duration)||1));
                return (b.item.addedAt||0)-(a.item.addedAt||0);
            });
            const recent=matches;
            const grid=document.getElementById('library-grid');
            grid.classList.toggle('list-mode',state.libraryView==='list');
            grid.className=(state.libraryView==='list'?'list-mode flex flex-col gap-3':'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4');
            grid.innerHTML=recent.map(({item,index})=>libraryCard(item,index)).join('');
            document.getElementById('library-results-title').textContent=state.libraryFilter==='favorites'?'Favorites':state.libraryFilter==='watchlist'?'My List':'Recently Added';
            const sortLabels={recent:'recently added',title:'title A–Z','title-desc':'title Z–A',duration:'longest first',progress:'watch progress'};
            document.getElementById('library-results-meta').textContent=matches.length+' video'+(matches.length===1?'':'s')+' · sorted by '+(sortLabels[sortMode]||sortLabels.recent);
            document.getElementById('library-empty').classList.toggle('hidden',matches.length>0);
            const continuing=state.playlist.map((item,index)=>({item,index})).filter(x=>x.item.progress>0 && x.item.duration && x.item.progress<x.item.duration-20).sort((a,b)=>(b.item.progress/b.item.duration)-(a.item.progress/a.item.duration)).slice(0,5);
            const section=document.getElementById('continue-section');
            section.classList.toggle('hidden',continuing.length===0);
            document.getElementById('continue-grid').innerHTML=continuing.map(({item,index})=>libraryCard(item,index,true)).join('');
            persistLibrary();
        }

        // Global Application State
        const state = {
            playlist: [],
            currentIndex: 0,
            isPlaying: false,
            isLooping: false,
            isCRTActive: true,
            subtitles: [],
            audioContext: null,
            audioSource: null,
            gainNode: null,
            analyser: null,
            visualizerAnimationFrame: null,
            libraryFilter: 'all',
            libraryView: 'grid',
            librarySearch: '',
            libraryGenre: 'all',
            libraryTheme: localStorage.getItem('homeflix-theme') || 'netflix',
            savedLibrary: loadLibraryMetadata()
        };

        // DOM Elements
        const video = document.getElementById('cyber-video');
        const playBtn = document.getElementById('play-btn');
        const playIcon = document.getElementById('play-icon');
        const centerPlayAnim = document.getElementById('center-play-anim');
        const centerPlayIcon = document.getElementById('center-play-icon');
        const volumeSlider = document.getElementById('volume-slider');
        const volumeLabel = document.getElementById('volume-label');
        const muteBtn = document.getElementById('mute-btn');
        const muteIcon = document.getElementById('mute-icon');
        const videoProgress = document.getElementById('video-progress');
        const timelineTooltip = document.getElementById('timeline-tooltip');
        const currentTimeEl = document.getElementById('current-time');
        const durationEl = document.getElementById('duration');
        const emptyStateOverlay = document.getElementById('empty-state-overlay');
        const currentTitleEl = document.getElementById('current-title');
        const currentMetaEl = document.getElementById('current-meta');
        const subtitleDisplay = document.getElementById('subtitle-display');
        const queueCountEl = document.getElementById('queue-count');
        const queueDurationTotalEl = document.getElementById('queue-duration-total');
        const playlistItemsEl = document.getElementById('playlist-items');

        const savedDiscordWebPin = localStorage.getItem('homeflix-discord-web-pin') || '';
        const discordPinInput = document.getElementById('discord-web-pin');
        if (discordPinInput) discordPinInput.value = savedDiscordWebPin;
        if (savedDiscordWebPin && !window.homeflixDesktop) setDiscordWebStatus('Saved pairing PIN. Checking the desktop bridge when playback starts.');

        // Initialize Web Audio API for 300% Boost & Visualizer
        function resumeAudioEngine() {
            const ctx = state.audioContext;
            if (!ctx) return;
            // Fullscreen/focus transitions can suspend Web Audio without pausing the video.
            if (ctx.state === 'suspended') {
                ctx.resume().catch((err) => console.debug('Audio context resume deferred:', err));
            }
        }

        // If Chromium suspends Web Audio while media is actively playing, try to
        // recover the existing graph instead of rebuilding it (which can silence media).
        function recoverAudioIfPlaying() {
            if (video && !video.paused && !video.ended) resumeAudioEngine();
        }

        // Keep the Web Audio graph alive across fullscreen changes and recover its
        // suspended state after the browser finishes changing the presentation mode.
        function recoverAudioAfterDisplayChange() {
            resumeAudioEngine();
            [80, 250, 700].forEach((delay) => {
                window.setTimeout(() => {
                    if (!document.hidden) resumeAudioEngine();
                }, delay);
            });
        }

        // A user gesture is the most reliable place for browsers to resume Web Audio.
        ['pointerdown', 'keydown', 'touchstart'].forEach((eventName) => {
            window.addEventListener(eventName, resumeAudioEngine, { passive: true });
        });
        video.addEventListener('play', resumeAudioEngine);
        video.addEventListener('playing', resumeAudioEngine);
        video.addEventListener('volumechange', () => {
            if (video.muted) return;
            resumeAudioEngine();
        });

        function initAudioEngine() {
            if (state.audioContext) {
                resumeAudioEngine();
                return;
            }
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                state.audioContext = new AudioContext({ latencyHint: 'playback' });
                state.audioContext.addEventListener('statechange', recoverAudioIfPlaying);
                state.audioSource = state.audioContext.createMediaElementSource(video);
                state.gainNode = state.audioContext.createGain();
                state.analyser = state.audioContext.createAnalyser();
                state.analyser.fftSize = 64;
                state.analyser.smoothingTimeConstant = 0.8;

                // Keep a single, stable audio graph; do not recreate it on fullscreen/focus changes.
                state.audioSource.connect(state.gainNode);
                state.gainNode.connect(state.analyser);
                state.analyser.connect(state.audioContext.destination);
                state.gainNode.gain.value = parseFloat(volumeSlider.value);
                resumeAudioEngine();
            } catch (e) {
                console.warn('Web Audio API initialization note:', e);
                // Native media playback remains available if Web Audio cannot initialize.
            }
        }

        // Restore audio after browser/OS focus and fullscreen transitions without restarting playback.
        ['focus', 'pageshow'].forEach((eventName) => {
            window.addEventListener(eventName, resumeAudioEngine);
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) resumeAudioEngine();
        });
        document.addEventListener('fullscreenchange', recoverAudioAfterDisplayChange);
        document.addEventListener('webkitfullscreenchange', recoverAudioAfterDisplayChange);

        // File Selector & Drag and Drop Setup
        const fileSelector = document.getElementById('file-selector');
        const playlistFileInput = document.getElementById('playlist-file-input');
        const folderSelector = document.getElementById('folder-selector');
        const playlistDropzone = document.getElementById('playlist-dropzone');

        fileSelector.addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
        playlistFileInput.addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
        folderSelector.addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
        playlistDropzone.addEventListener('click', () => playlistFileInput.click());

        // Global Drag and Drop over player container
        const playerContainer = document.getElementById('player-container');
        playerContainer.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
        playerContainer.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });

        playlistDropzone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
        playlistDropzone.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });

        function handleFiles(files) {
            let addedCount = 0;
            const existingKeys=new Set(state.playlist.map(libraryKey));
            for (const file of files) {
                const videoExtensions = /\.(mp4|m4v|mkv|webm|mov|avi|mpg|mpeg|ts|m2ts|ogv|3gp|wmv|flv)$/i;
                const imageExtensions = /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i;
                const isVideo = (file.type && file.type.startsWith('video/')) || videoExtensions.test(file.name || '');
                const isImage = (file.type && file.type.startsWith('image/')) || imageExtensions.test(file.name || '');
                if (isVideo || isImage) {
                    const blobUrl = URL.createObjectURL(file);
                    const item = {
                        title: file.name,
                        localPath: window.homeflixDesktop && typeof file.path === 'string' ? file.path : null,
                        url: blobUrl,
                        type: isImage ? 'image' : 'local',
                        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                        thumbnail: isImage ? blobUrl : '',
                        id: 'local-' + file.name + '-' + file.size + '-' + file.lastModified,
                        genre: isImage ? 'Photos' : inferGenre(file.name),
                        addedAt: Date.now(),
                        duration: 0,
                        progress: 0,
                        favorite: false,
                        watchlist: false
                    };
                    const key=libraryKey(item);
                    if (existingKeys.has(key)) { URL.revokeObjectURL(blobUrl); continue; }
                    existingKeys.add(key);
                    syncLibraryMetadata(item);
                    state.playlist.push(item);
                    addedCount++;
                    if (isVideo) generateVideoThumbnail(item);
                }
            }
            if (addedCount > 0) {
                renderPlaylist();
                renderLibrary();
                showToast(`Added ${addedCount} media file(s) to your library.`);
                if (state.playlist.length === addedCount) {
                    selectQueueItem(0);
                }
            } else {
                showToast('No supported video or photo files detected.');
            }
        }

        // Grab a frame from the video and use it as playlist cover art.
        // Local files work reliably; remote URLs may block canvas access via CORS.
        function generateVideoThumbnail(item) {
            if (!item || !item.url || item.thumbnail) return;
            const preview = document.createElement('video');
            preview.preload = 'metadata';
            preview.muted = true;
            preview.playsInline = true;
            let finished = false;
            const cleanup = () => {
                preview.removeAttribute('src');
                preview.load();
            };
            const fail = () => {
                if (finished) return;
                finished = true;
                cleanup();
            };
            preview.addEventListener('error', fail, { once: true });
            preview.addEventListener('loadedmetadata', () => {
                try {
                    const target = Number.isFinite(preview.duration) && preview.duration > 1
                        ? Math.min(1, preview.duration / 2)
                        : 0;
                    if (target === 0) {
                        captureFrame();
                    } else {
                        preview.addEventListener('seeked', captureFrame, { once: true });
                        preview.currentTime = target;
                    }
                } catch (_) {
                    fail();
                }
            }, { once: true });
            function captureFrame() {
                if (finished) return;
                try {
                    if (!preview.videoWidth || !preview.videoHeight) return fail();
                    const canvas = document.createElement('canvas');
                    const maxWidth = 320;
                    const scale = Math.min(1, maxWidth / preview.videoWidth);
                    canvas.width = Math.max(1, Math.round(preview.videoWidth * scale));
                    canvas.height = Math.max(1, Math.round(preview.videoHeight * scale));
                    canvas.getContext('2d').drawImage(preview, 0, 0, canvas.width, canvas.height);
                    item.thumbnail = canvas.toDataURL('image/jpeg', 0.78);
                    finished = true;
                    cleanup();
                    renderPlaylist();
                } catch (_) {
                    // A remote host without permissive CORS cannot be used to extract a frame.
                    fail();
                }
            }
            preview.src = item.url;
            preview.load();
        }

        function renderPlaylist() {
            queueCountEl.textContent = state.playlist.length;
            if (state.playlist.length === 0) {
                playlistItemsEl.innerHTML = `
                    <div class="text-center py-12 text-slate-500 font-mono text-xs">
                        <i class="fa-solid fa-folder-open text-2xl mb-2 text-slate-600"></i>
                        <p>Queue is empty.<br>Import media or add a stream URL to begin.</p>
                    </div>
                `;
                emptyStateOverlay.classList.remove('hidden');
                return;
            }

            let html = '';
            state.playlist.forEach((item, index) => {
                const isActive = index === state.currentIndex;
                html += `
                    <div onclick="selectQueueItem(${index})" class="group/item flex items-center justify-between p-3 rounded-lg border transition cursor-pointer ${isActive ? 'bg-cyan-950/40 border-cyan-500/60 neon-glow-cyan' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'}">
                        <div class="flex items-center space-x-3 overflow-hidden">
                            <div class="w-12 h-9 rounded bg-black/60 border ${isActive ? 'border-cyan-400' : 'border-slate-700'} overflow-hidden flex items-center justify-center shrink-0">
                                ${item.thumbnail
                                    ? `<img src="${item.thumbnail}" alt="" class="w-full h-full object-cover" loading="lazy">`
                                    : `<span class="font-mono text-xs ${isActive ? 'text-cyan-300' : 'text-slate-400'}">${isActive ? '<i class="fa-solid fa-play text-[10px]"></i>' : (index + 1)}</span>`}
                            </div>
                            <div class="overflow-hidden">
                                <h4 class="font-orbitron font-semibold text-xs ${isActive ? 'text-cyan-300' : 'text-slate-200'} truncate">${item.title}</h4>
                                <span class="font-mono text-[10px] text-slate-400">${item.size || 'Remote Stream'}</span>
                            </div>
                        </div>
                        <button onclick="event.stopPropagation(); removeFromQueue(${index})" class="text-slate-500 hover:text-red-400 p-1.5 opacity-0 group-hover/item:opacity-100 transition" title="Remove">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                `;
            });
            playlistItemsEl.innerHTML = html;
        }

        function isMkvStreamUrl(source) {
            try {
                const parsed = new URL(source);
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
                const pathname = decodeURIComponent(parsed.pathname).toLowerCase();
                if (pathname.endsWith('.mkv')) return true;
                return [...parsed.searchParams.values()].some(value => decodeURIComponent(value).toLowerCase().endsWith('.mkv'));
            } catch (_) {
                return false;
            }
        }

        async function selectQueueItem(index) {
            if (index < 0 || index >= state.playlist.length) return;
            state.currentIndex = index;
            const item = state.playlist[index];
            if (item.type === 'image') {
                openImageViewer(item);
                currentTitleEl.textContent = item.title;
                currentMetaEl.textContent = 'Photo · opened in HomeFlix viewer';
                renderPlaylist();
                renderLibrary();
                return;
            }
            syncLibraryMetadata(item);
            syncDiscordPresence();
            currentTitleEl.textContent = item.title;
            currentMetaEl.textContent = `Node Source: ${item.type.toUpperCase()} | Index #${index + 1}`;

            emptyStateOverlay.classList.add('hidden');
            renderPlaylist();
            renderLibrary();

            // MKV is a container, not a browser-playable codec. In the desktop app,
            // send direct MKV stream URLs to FFmpeg immediately instead of waiting for Chromium to fail.
            const desktop = window.homeflixDesktop;
            const isMkvStream = item.type === 'url' && isMkvStreamUrl(item.url);
            const isMkvLocalFile = item.type === 'local' && /\\.mkv$/i.test(item.title || '') && Boolean(item.localPath);
            const canConvertMkv = desktop && (
                (isMkvStream && typeof desktop.transcodeRemoteMedia === 'function') ||
                (isMkvLocalFile && typeof desktop.transcodeLocalMedia === 'function')
            );
            if ((isMkvStream || isMkvLocalFile) && canConvertMkv) {
                item.transcodeAttempted = true;
                showToast(isMkvStream
                    ? 'Opening MKV stream through HomeFlix’s live converter…'
                    : 'Preparing MKV file for HomeFlix playback…');
                try {
                    const convertedUrl = isMkvLocalFile
                        ? await desktop.transcodeLocalMedia(item.localPath)
                        : await desktop.transcodeRemoteMedia(item.url);
                    if (state.playlist[state.currentIndex] !== item) return;
                    item.transcodedUrl = convertedUrl;
                    video.src = convertedUrl;
                    video.load();
                    await video.play().catch(() => {});
                    state.isPlaying = !video.paused;
                    updatePlayIcons();
                    showToast(isMkvStream ? 'MKV stream opened in HomeFlix.' : 'MKV file opened in HomeFlix.');
                    return;
                } catch (error) {
                    if (state.playlist[state.currentIndex] !== item) return;
                    console.warn('MKV conversion failed; trying native playback:', error);
                    showToast('MKV conversion failed; trying direct playback…');
                }
            }

            video.src = item.url;
            video.load();

            // Resume audio context if suspended
            if (state.audioContext && state.audioContext.state === 'suspended') {
                state.audioContext.resume();
            }

            video.play().then(() => {
                state.isPlaying = true;
                updatePlayIcons();
            }).catch(err => {
                console.warn('Autoplay prevented:', err);
                state.isPlaying = false;
                updatePlayIcons();
            });
        }

        // Handles files opened from Windows File Explorer through HomeFlix's file association.
        window.homeflixOpenFileFromOS = async function(filePath) {
            try {
                const desktop = window.homeflixDesktop;
                if (!desktop || typeof desktop.registerOpenFile !== 'function') return;
                const playableUrl = await desktop.registerOpenFile(filePath);
                const title = String(filePath).split(/[\\/]/).pop() || 'Local video';
                const isImage = /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i.test(title);
                const item = { title, url: playableUrl, type: isImage ? 'image' : 'local', localPath: filePath, size: 'Local file', thumbnail: isImage ? playableUrl : '', id: 'os-file-' + filePath, genre: isImage ? 'Photos' : inferGenre(title), addedAt: Date.now(), duration: 0, progress: 0, favorite: false, watchlist: false };
                const existing = state.playlist.findIndex(entry => entry.id === item.id);
                if (existing >= 0) { state.playlist[existing] = item; await openLibraryItem(existing); }
                else { state.playlist.push(item); await openLibraryItem(state.playlist.length - 1); }
                const player = document.getElementById('player-container');
                if (player && !document.fullscreenElement && player.requestFullscreen) await player.requestFullscreen().catch(() => {});
                showToast('Opened from your computer: ' + title);
            } catch (error) {
                console.error('Could not open file from Windows:', error);
                showToast(error.message || 'Could not open that file in HomeFlix.');
            }
        };

        function releaseLocalUrl(item) {
            if (item && typeof item.url === 'string' && item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
        }

        function removeFromQueue(index) {
            const removedItem = state.playlist[index];
            releaseLocalUrl(removedItem);
            state.playlist.splice(index, 1);
            if (index < state.currentIndex) state.currentIndex--;
            if (state.currentIndex >= state.playlist.length) {
                state.currentIndex = Math.max(0, state.playlist.length - 1);
            }
            renderPlaylist();
            if (state.playlist.length === 0) {
                video.pause();
                video.src = '';
                currentTitleEl.textContent = 'No Active Node Stream';
                currentMetaEl.textContent = 'Ready for queue ingestion...';
                state.isPlaying = false;
                updatePlayIcons();
            } else if (state.currentIndex === index || video.src === '') {
                selectQueueItem(state.currentIndex);
            }
        }

        function clearQueue() {
            state.playlist.forEach(releaseLocalUrl);
            state.playlist = [];
            state.currentIndex = 0;
            video.pause();
            video.src = '';
            syncDiscordPresence(true);
            currentTitleEl.textContent = 'No Active Node Stream';
            currentMetaEl.textContent = 'Ready for queue ingestion...';
            state.isPlaying = false;
            updatePlayIcons();
            renderPlaylist();
            showToast('Queue cleared.');
        }

        function playNext() {
            if (state.playlist.length === 0) return;
            let nextIdx = state.currentIndex + 1;
            if (nextIdx >= state.playlist.length) {
                if (state.isLooping) {
                    nextIdx = 0;
                } else {
                    showToast('Reached end of playlist queue.');
                    return;
                }
            }
            selectQueueItem(nextIdx);
        }

        // URL Modal helpers
        const urlModal = document.getElementById('url-modal');
        function promptAddURL() { urlModal.classList.remove('hidden'); }
        function closeUrlModal() { urlModal.classList.add('hidden'); }
        function confirmAddURL() {
            const titleInput = document.getElementById('url-title-input').value.trim();
            const sourceInput = document.getElementById('url-source-input').value.trim();
            if (!sourceInput) {
                showToast('Please enter a valid video stream URL.');
                return;
            }
            const urlItem = {
                title: titleInput || 'External Cyber Stream',
                url: sourceInput,
                type: 'url',
                size: 'Stream',
                thumbnail: '',
                id: 'url-' + sourceInput,
                genre: inferGenre(titleInput || sourceInput),
                addedAt: Date.now(), duration: 0, progress: 0, favorite: false, watchlist: false
            };
            syncLibraryMetadata(urlItem);
            state.playlist.push(urlItem);
            generateVideoThumbnail(urlItem);
            renderLibrary();
            document.getElementById('url-title-input').value = '';
            document.getElementById('url-source-input').value = '';
            closeUrlModal();
            renderPlaylist();
            showToast('Stream URL added to queue.');
            if (state.playlist.length === 1) {
                selectQueueItem(0);
            }
        }

        // Video Controls & Timeline Scrubbing
        const DISCORD_WEB_BRIDGE_URL = 'http://127.0.0.1:47831/api/discord-presence';
        let lastWebDiscordSentAt = 0;
        let lastWebDiscordKey = '';
        function setDiscordWebStatus(message, connected = false) {
            const el = document.getElementById('discord-web-status');
            if (el) { el.textContent = message; el.className = 'text-xs mt-3 ' + (connected ? 'text-emerald-300' : 'text-zinc-400'); }
        }
        async function detectDiscordBridge() {
            if (window.homeflixDesktop) {
                setDiscordWebStatus('HomeFlix desktop app detected. Discord Rich Presence connects automatically when Discord is running.', true);
                return true;
            }
            try {
                const response = await fetch(DISCORD_WEB_BRIDGE_URL + '/status', { method: 'GET', cache: 'no-store' });
                if (!response.ok) throw new Error('bridge unavailable');
                const result = await response.json();
                setDiscordWebStatus(result.discordReady
                    ? 'Discord detected — Rich Presence is ready. Play a video to show it on your profile.'
                    : 'HomeFlix desktop app detected, waiting for Discord desktop to connect.', !!result.discordReady);
                return true;
            } catch (_) {
                setDiscordWebStatus('Browser could not reach the local companion. Click “Connect web player” and allow Local Network access if prompted.', false);
                return false;
            }
        }
        async function connectWebDiscordBridge() {
            const button = document.getElementById('discord-web-connect');
            if (button) { button.disabled = true; button.textContent = 'Connecting…'; }
            setDiscordWebStatus('Requesting a connection to the HomeFlix companion…');
            try {
                const connected = await detectDiscordBridge();
                if (connected) {
                    syncDiscordPresence(false, true);
                    if (button) button.textContent = 'Reconnect web player';
                } else if (button) {
                    button.textContent = 'Try connecting again';
                }
            } finally {
                if (button) button.disabled = false;
            }
        }
        async function sendWebDiscordPresence(presence, force = false) {
            const key = presence.clear ? 'clear' : [presence.title, presence.playing, Math.floor((presence.currentTime || 0) / 15), Math.floor(presence.duration || 0)].join('|');
            const now = Date.now();
            if (!force && key === lastWebDiscordKey && now - lastWebDiscordSentAt < 12000) return;
            if (!force && now - lastWebDiscordSentAt < 12000 && key !== 'clear') return;
            lastWebDiscordKey = key;
            lastWebDiscordSentAt = now;
            try {
                const response = await fetch(DISCORD_WEB_BRIDGE_URL + '/auto', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ presence })
                });
                if (!response.ok) {
                    setDiscordWebStatus('Waiting for the HomeFlix desktop companion and Discord desktop app…');
                    return;
                }
                const result = await response.json();
                setDiscordWebStatus(result.discordReady
                    ? 'Connected automatically — Discord shows your HomeFlix playback.'
                    : 'HomeFlix found, waiting for Discord desktop to connect.', !!result.discordReady);
            } catch (_) {
                setDiscordWebStatus('Waiting for the HomeFlix desktop companion and Discord desktop app…');
            }
        }
        setInterval(detectDiscordBridge, 5000);
        detectDiscordBridge();
        function syncDiscordPresence(clear = false, force = false) {
            const item = state.playlist[state.currentIndex];
            const presence = clear || state.playlist.length === 0 || !video.currentSrc
                ? { clear: true }
                : {
                    title: item?.title || currentTitleEl.textContent || 'HomeFlix',
                    playing: !video.paused && !video.ended,
                    currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
                    duration: Number.isFinite(video.duration) ? video.duration : 0
                };
            if (window.homeflixDesktop && typeof window.homeflixDesktop.sendDiscordPresence === 'function') {
                window.homeflixDesktop.sendDiscordPresence(presence);
            } else {
                sendWebDiscordPresence(presence, force || clear);
            }
        }

        video.addEventListener('click', togglePlay);
        video.addEventListener('play', () => { state.isPlaying = true; updatePlayIcons(); syncDiscordPresence(); });
        video.addEventListener('pause', () => { state.isPlaying = false; updatePlayIcons(); syncDiscordPresence(); });
        video.addEventListener('ended', () => { syncDiscordPresence(true); let autoNext = false; try { autoNext = JSON.parse(localStorage.getItem('homeflix-advanced-settings-v1') || '{}').autoplayNext === true; } catch {} if (autoNext) playNext(); });

        let lastProgressSave = 0;
        video.addEventListener('timeupdate', () => {
            syncDiscordPresence();
            if (!isNaN(video.duration)) {
                const activeItem = state.playlist[state.currentIndex];
                if (activeItem) {
                    activeItem.progress=video.currentTime; activeItem.duration=video.duration;
                    if (Date.now() - lastProgressSave > 5000) { lastProgressSave=Date.now(); persistLibrary(); renderLibrary(); }
                }

                const percent = (video.currentTime / video.duration) * 100;
                videoProgress.value = percent;
                currentTimeEl.textContent = formatTime(video.currentTime);
                durationEl.textContent = formatTime(video.duration);
                checkSubtitles(video.currentTime);
            }
        });

        video.addEventListener('loadedmetadata', () => {
            syncDiscordPresence();
            durationEl.textContent = formatTime(video.duration);
            const activeItem=state.playlist[state.currentIndex];
            if(activeItem){ activeItem.duration=video.duration; if(activeItem.progress>5 && activeItem.progress<video.duration-10){ const resumeAt=activeItem.progress; video.currentTime=resumeAt; showToast('Resuming from '+formatTime(resumeAt)); } persistLibrary(); renderLibrary(); }
        });

        video.addEventListener('error', async () => {
            if (!video.currentSrc) return;
            const code = video.error ? video.error.code : 0;
            const activeItem = state.playlist[state.currentIndex];
            const desktopConverter = window.homeflixDesktop &&
                typeof window.homeflixDesktop.transcodeLocalMedia === 'function' &&
                typeof window.homeflixDesktop.transcodeRemoteMedia === 'function';
            const isLocalFile = activeItem && activeItem.type === 'local' && activeItem.localPath && desktopConverter;
            const isRemoteUrl = activeItem && activeItem.type === 'url' && (() => {
                try {
                    const parsedUrl = new URL(activeItem.url);
                    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
                } catch (_) {
                    return false;
                }
            })() && desktopConverter;
            const reason = code === 2
                ? 'Network error while loading this video. The host may block browser playback.'
                : code === 3
                    ? 'This video codec is not supported by the built-in browser player.'
                    : code === 4
                        ? 'The video source was rejected. The format or codec may not be supported.'
                        : 'This video could not be played. The file or stream may use an unsupported format.';

            // In desktop mode, FFmpeg can convert local files and direct HTTP(S) media streams.
            if ((isLocalFile || isRemoteUrl) && !activeItem.transcodeAttempted) {
                activeItem.transcodeAttempted = true;
                showToast(isRemoteUrl
                    ? 'Opening this stream through HomeFlix’s live converter…'
                    : 'Preparing this video for HomeFlix playback… This can take a few minutes for large files.');
                try {
                    const convertedUrl = isLocalFile
                        ? await window.homeflixDesktop.transcodeLocalMedia(activeItem.localPath)
                        : await window.homeflixDesktop.transcodeRemoteMedia(activeItem.url);
                    if (state.playlist[state.currentIndex] !== activeItem) return;
                    activeItem.transcodedUrl = convertedUrl;
                    video.src = convertedUrl;
                    video.load();
                    await video.play().catch(() => {});
                    showToast('Converted video is ready. Playing inside HomeFlix.');
                    return;
                } catch (error) {
                    showToast('Could not convert this video: ' + (error && error.message ? error.message : 'Unknown conversion error'));
                    return;
                }
            }
            const desktopHint = isRemoteUrl
                ? ' Use a direct video or stream URL; website pages requiring login, cookies, DRM, or a special extractor may not work.'
                : isLocalFile
                    ? ' HomeFlix already tried converting it, but conversion failed.'
                    : ' Automatic conversion requires the HomeFlix desktop app.';
            showToast(reason + desktopHint);
        });

        window.addEventListener('beforeunload', () => {
            state.playlist.forEach(releaseLocalUrl);
        });

        videoProgress.addEventListener('input', (e) => {
            if (!isNaN(video.duration)) {
                const time = (e.target.value / 100) * video.duration;
                video.currentTime = time;
            }
        });

        // Timeline Hover Preview Tooltip calculation
        videoProgress.addEventListener('mousemove', (e) => {
            if (isNaN(video.duration)) return;
            const rect = videoProgress.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const hoverTime = pos * video.duration;
            
            timelineTooltip.style.left = `${e.clientX - rect.left}px`;
            timelineTooltip.textContent = formatTime(hoverTime);
            timelineTooltip.classList.remove('hidden');
        });

        videoProgress.addEventListener('mouseleave', () => {
            timelineTooltip.classList.add('hidden');
        });

        function togglePlay() {
            initAudioEngine();
            if (state.playlist.length === 0) {
                promptAddURL();
                return;
            }
            if (video.paused) {
                const playAttempt = video.play();
                if (playAttempt && typeof playAttempt.catch === 'function') {
                    playAttempt.catch(error => {
                        console.warn('HomeFlix could not start playback:', error);
                        showToast('Playback could not start. Check the file format or try another video.');
                    });
                }
                showCenterAnim('play');
            } else {
                video.pause();
                showCenterAnim('pause');
            }
        }

        function updatePlayIcons() {
            if (state.isPlaying) {
                playIcon.className = 'fa-solid fa-pause';
            } else {
                playIcon.className = 'fa-solid fa-play';
            }
        }

        function showCenterAnim(type) {
            centerPlayIcon.className = type === 'play' ? 'fa-solid fa-play ml-1' : 'fa-solid fa-pause';
            centerPlayAnim.classList.remove('opacity-0');
            setTimeout(() => {
                centerPlayAnim.classList.add('opacity-0');
            }, 600);
        }

        function skipTime(seconds) {
            if (!isNaN(video.duration)) {
                video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
                showToast(`Skipped ${seconds > 0 ? '+' : ''}${seconds}s`);
            }
        }

        // Volume & 300% Boost
        volumeSlider.addEventListener('input', (e) => {
            initAudioEngine();
            const val = parseFloat(e.target.value);
            if (state.gainNode) {
                state.gainNode.gain.value = val;
            } else {
                video.volume = Math.min(1, val);
            }
            volumeLabel.textContent = `${Math.round(val * 100)}%`;
            if (val === 0) {
                muteIcon.className = 'fa-solid fa-volume-xmark text-red-400';
            } else if (val > 1) {
                muteIcon.className = 'fa-solid fa-volume-high text-pink-400';
            } else {
                muteIcon.className = 'fa-solid fa-volume-high';
            }
        });

        let previousVolume = 1;
        function toggleMute() {
            initAudioEngine();
            if (video.muted || (state.gainNode && state.gainNode.gain.value === 0)) {
                video.muted = false;
                if (state.gainNode) state.gainNode.gain.value = previousVolume;
                volumeSlider.value = previousVolume;
                volumeLabel.textContent = `${Math.round(previousVolume * 100)}%`;
                muteIcon.className = previousVolume > 1 ? 'fa-solid fa-volume-high text-pink-400' : 'fa-solid fa-volume-high';
            } else {
                previousVolume = parseFloat(volumeSlider.value);
                video.muted = true;
                if (state.gainNode) state.gainNode.gain.value = 0;
                volumeSlider.value = 0;
                volumeLabel.textContent = '0%';
                muteIcon.className = 'fa-solid fa-volume-xmark text-red-400';
            }
        }

        function changeSpeed(val) {
            video.playbackRate = parseFloat(val);
            showToast(`Playback speed set to ${val}x`);
        }

        function setSubtitleSize(size) {
            const allowed = ['small','medium','large','xlarge'];
            const selected = allowed.includes(size) ? size : 'medium';
            const sizes = {small:'0.8rem',medium:'1rem',large:'1.35rem',xlarge:'1.7rem'};
            const display = document.getElementById('subtitle-display');
            if (display) { display.style.fontSize = sizes[selected]; display.dataset.size = selected; }
            try { localStorage.setItem('homeflix.subtitleSize', selected); } catch {}
            showToast('Subtitle size: ' + selected);
        }
        try { setSubtitleSize(localStorage.getItem('homeflix.subtitleSize') || 'medium'); } catch { setSubtitleSize('medium'); }
        const subtitleSizeSelect = document.getElementById('subtitle-size-select');
        try { if (subtitleSizeSelect) subtitleSizeSelect.value = localStorage.getItem('homeflix.subtitleSize') || 'medium'; } catch {}

        function toggleLoop() {
            state.isLooping = !state.isLooping;
            const btn = document.getElementById('loop-btn');
            if (state.isLooping) {
                btn.className = 'px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500 text-cyan-300 transition';
                showToast('Queue looping enabled');
            } else {
                btn.className = 'px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-cyan-300 transition';
                showToast('Queue looping disabled');
            }
        }

        // Selecting a library item starts playback and opens the player fullscreen in the same user gesture.
        function openLibraryItem(index) {
            const item = state.playlist[index];
            if (item && item.type === 'image') {
                selectQueueItem(index);
                return;
            }
            const player = document.getElementById('player-container');
            const playback = selectQueueItem(index);
            if (player && !document.fullscreenElement && typeof player.requestFullscreen === 'function') {
                player.requestFullscreen().catch(err => console.warn('Automatic player fullscreen was blocked:', err));
            }
            return playback;
        }

        async function toggleFullscreen() {
            const container = document.getElementById('player-container');
            if (!container) {
                showToast('The player is not available yet.');
                return;
            }
            try {
                if (!document.fullscreenElement) {
                    if (typeof container.requestFullscreen !== 'function') throw new Error('Fullscreen is not supported in this window.');
                    await container.requestFullscreen();
                } else if (document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            } catch (err) {
                console.warn('Fullscreen error:', err);
                showToast('Fullscreen could not be changed. Try again after clicking the player.');
            }
        }

        async function toggleAppFullscreen() {
            try {
                if (!document.fullscreenElement) {
                    if (typeof document.documentElement.requestFullscreen !== 'function') throw new Error('Fullscreen is not supported in this window.');
                    await document.documentElement.requestFullscreen();
                } else if (document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            } catch (err) {
                console.warn('App fullscreen error:', err);
                showToast('App fullscreen could not be changed. Try again.');
            }
        }

        // Subtitles parser (.srt / .vtt)
        const subSelector = document.getElementById('sub-selector');
        subSelector.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                parseSubtitles(evt.target.result);
                showToast(`Subtitles loaded: ${file.name}`);
            };
            reader.readAsText(file);
        });

        function parseSubtitles(data) {
            state.subtitles = [];
            const lines = data.split(/\r?\n/);
            let currentSub = null;

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (line.includes('-->')) {
                    const parts = line.split('-->');
                    currentSub = {
                        start: parseTimestamp(parts[0].trim()),
                        end: parseTimestamp(parts[1].trim()),
                        text: ''
                    };
                    i++;
                    let textLines = [];
                    while (i < lines.length && lines[i].trim() !== '') {
                        textLines.push(lines[i].trim());
                        i++;
                    }
                    currentSub.text = textLines.join('<br>');
                    state.subtitles.push(currentSub);
                }
            }
        }

        function parseTimestamp(timeStr) {
            const parts = timeStr.split(':');
            let seconds = 0;
            if (parts.length === 3) {
                seconds += parseInt(parts[0]) * 3600;
                seconds += parseInt(parts[1]) * 60;
                seconds += parseFloat(parts[2].replace(',', '.'));
            } else if (parts.length === 2) {
                seconds += parseInt(parts[0]) * 60;
                seconds += parseFloat(parts[1].replace(',', '.'));
            }
            return seconds;
        }

        function checkSubtitles(currentTime) {
            if (state.subtitles.length === 0) return;
            const active = state.subtitles.find(s => currentTime >= s.start && currentTime <= s.end);
            if (active) {
                subtitleDisplay.innerHTML = active.text;
                subtitleDisplay.classList.remove('hidden');
            } else {
                subtitleDisplay.classList.add('hidden');
            }
        }

        // Audio Visualizer Canvas Render Loop
        const audioCanvas = document.getElementById('audio-visualizer-canvas');
        const audioCtx2D = audioCanvas.getContext('2d');
        const miniCanvas = document.getElementById('mini-visualizer');
        const miniCtx2D = miniCanvas.getContext('2d');

        let lastVisualizerFrame = 0;
        let visualizerData = null;

        // Expose handlers once during initialization so every inline UI control can call them.
        // Keeping this outside renderVisualizer prevents the UI from depending on animation frames.
        // Publish every handler used by inline controls explicitly. This keeps controls
        // callable from the HTML even if renderer packaging changes the script scope.
        Object.assign(window, {
            openLibraryItem, openLibrarySettings, closeLibrarySettings, saveLibrarySettings,
            setLibraryView, setLibraryFilter, showRemoteInfo, connectWebDiscordBridge,
            togglePlay, skipTime, toggleMute, changeSpeed, toggleFullscreen, toggleAppFullscreen,
            promptAddURL, closeUrlModal, confirmAddURL, clearQueue, toggleLoop, playNext,
            selectQueueItem, removeFromQueue, toggleShortcutsModal, toggleCRT, showToast,
            toggleLibraryFlag, openImageViewer, togglePhotoViewerFullscreen, closePhotoViewer,
            setSubtitleSize
        });

        // Make otherwise-silent renderer exceptions visible so a broken handler can be
        // diagnosed from the app instead of leaving a button that appears to do nothing.
        window.addEventListener('error', (event) => {
            console.error('HomeFlix renderer error:', event.error || event.message);
            const message = event.error && event.error.message ? event.error.message : event.message;
            if (typeof showToast === 'function' && message) {
                showToast('A HomeFlix control failed: ' + String(message).slice(0, 140));
            }
        });
        window.addEventListener('unhandledrejection', (event) => {
            console.error('HomeFlix action failed:', event.reason);
            const message = event.reason && event.reason.message ? event.reason.message : String(event.reason || 'Unknown error');
            if (typeof showToast === 'function') {
                showToast('HomeFlix action failed: ' + message.slice(0, 140));
            }
        });

        function renderVisualizer(timestamp = 0) {
            requestAnimationFrame(renderVisualizer);
            // Limit decorative canvas work to ~24 FPS so fullscreen/layout changes
            // cannot starve the media playback pipeline on slower machines.
            if (timestamp - lastVisualizerFrame < 42) return;
            lastVisualizerFrame = timestamp;

            audioCtx2D.clearRect(0, 0, audioCanvas.width, audioCanvas.height);
            miniCtx2D.clearRect(0, 0, miniCanvas.width, miniCanvas.height);

            if (!state.analyser || !state.isPlaying) {
                drawFlatLine(audioCtx2D, audioCanvas.width, audioCanvas.height);
                drawFlatLine(miniCtx2D, miniCanvas.width, miniCanvas.height);
                return;
            }

            const bufferLength = state.analyser.frequencyBinCount;
            if (!visualizerData || visualizerData.length !== bufferLength) {
                visualizerData = new Uint8Array(bufferLength);
            }
            state.analyser.getByteFrequencyData(visualizerData);
            drawBars(audioCtx2D, audioCanvas.width, audioCanvas.height, visualizerData, bufferLength);
            drawBars(miniCtx2D, miniCanvas.width, miniCanvas.height, visualizerData, bufferLength);
        }

        function drawFlatLine(ctx, w, h) {
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();
        }

        function drawBars(ctx, w, h, dataArray, bufferLength) {
            const barWidth = (w / bufferLength) * 2.2;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * h;

                // Gradient cyber color
                const gradient = ctx.createLinearGradient(0, h, 0, 0);
                gradient.addColorStop(0, '#06b6d4');
                gradient.addColorStop(0.5, '#10b981');
                gradient.addColorStop(1, '#ec4899');

                ctx.fillStyle = gradient;
                ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);

                x += barWidth + 1;
            }
        }

        // Library imports share the same queue/playback engine as the original player.
        document.getElementById('library-file-selector').addEventListener('change', e => { handleFiles(e.target.files); e.target.value=''; });
        document.getElementById('library-folder-selector').addEventListener('change', e => { handleFiles(e.target.files); e.target.value=''; });
        document.getElementById('library-rescan').addEventListener('click', () => document.getElementById('library-folder-selector').click());
        document.getElementById('library-search').addEventListener('input', e => { state.librarySearch=e.target.value.toLowerCase().trim(); renderLibrary(); });
        document.getElementById('library-genre').addEventListener('change', e => { state.libraryGenre=e.target.value; renderLibrary(); });
        document.getElementById('library-sort').addEventListener('change', () => renderLibrary());
        document.getElementById('library-export-list').addEventListener('click', () => {
            const exportItems=state.playlist.map(item=>({
                title:item.title, genre:item.genre||inferGenre(item.title), type:item.type||'local',
                duration:Number(item.duration)||0, progress:Number(item.progress)||0,
                favorite:!!item.favorite, watchlist:!!item.watchlist, addedAt:item.addedAt||null
            }));
            const payload={app:'HomeFlix Cyber Node',version:1,exportedAt:new Date().toISOString(),items:exportItems};
            const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
            const url=URL.createObjectURL(blob);
            const link=document.createElement('a');
            link.href=url;link.download='homeflix-library-'+new Date().toISOString().slice(0,10)+'.json';
            document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
            showToast('Library list exported. Video files are not included.');
        });
        document.getElementById('library-theme').value = state.libraryTheme;
        applyLibraryTheme(state.libraryTheme);
        renderLibrary();
        if (window.homeflixDesktop) {
            document.getElementById('remote-status').textContent = 'Desktop remote is available. Open Settings to view its pairing address and PIN.';
            window.homeflixDesktop.getRemoteInfo().then(info => {
                if (info && info.url) document.getElementById('remote-status').textContent = 'Remote: ' + info.url + ' · PIN: ' + info.pin;
            }).catch(() => {});
            window.homeflixDesktop.onRemoteCommand(command => {
                if (command.action==='toggle') togglePlay();
                else if (command.action==='play') { video.play().catch(()=>{}); state.isPlaying=true; updatePlayIcons(); }
                else if (command.action==='pause') { video.pause(); state.isPlaying=false; updatePlayIcons(); }
                else if (command.action==='seek') video.currentTime=Math.max(0,Math.min(video.duration||0,video.currentTime+(Number(command.value)||0)));
                else if (command.action==='volume') { video.volume=Math.max(0,Math.min(1,Number(command.value)||0)); volumeSlider.value=video.volume; volumeLabel.textContent=Math.round(video.volume*100)+'%'; }
                else if (command.action==='mute') toggleMute();
                else if (command.action==='next') playNext();
                else if (command.action==='previous') selectQueueItem(Math.max(0,state.currentIndex-1));
                else if (command.action==='fullscreen') toggleFullscreen();
                else if (command.action==='status') {
                    window.homeflixDesktop.sendRemoteStatus({title:currentTitleEl.textContent,playing:!video.paused,currentTime:video.currentTime,duration:video.duration||0,volume:video.volume});
                }
            });
        } else {
            document.getElementById('remote-status').textContent = 'Website mode: phone remote needs the installed desktop app on the same Wi-Fi network.';
        }

        requestAnimationFrame(renderVisualizer);

        // CPU & GPU Telemetry Simulator Loop
        setInterval(() => {
            const cpu = Math.floor(12 + Math.random() * 18 + (state.isPlaying ? 15 : 0));
            const gpu = Math.floor(22 + Math.random() * 25 + (state.isPlaying ? 25 : 0));
            const net = (0.8 + Math.random() * 1.5).toFixed(1);

            document.getElementById('cpu-stat').textContent = `${cpu}%`;
            document.getElementById('gpu-stat').textContent = `${gpu}%`;
            document.getElementById('net-stat').textContent = `${net} GB/s`;
        }, 2000);

        // Keyboard Shortcuts Handler
        const shortcutsModal = document.getElementById('shortcuts-modal');
        function toggleShortcutsModal() {
            shortcutsModal.classList.toggle('hidden');
        }

        function toggleCRT() {
            state.isCRTActive = !state.isCRTActive;
            document.body.classList.toggle('crt-off', !state.isCRTActive);
            showToast(state.isCRTActive ? 'CRT Scanlines Enabled' : 'CRT Scanlines Disabled');
        }

        window.addEventListener('keydown', (e) => {
            // Do not trigger if typing in an input modal
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            } else if (e.code === 'KeyF') {
                e.preventDefault();
                toggleFullscreen();
            } else if (e.code === 'KeyM') {
                e.preventDefault();
                toggleMute();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                skipTime(10);
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                skipTime(-10);
            } else if (e.code === 'ArrowUp') {
                e.preventDefault();
                const cur = parseFloat(volumeSlider.value);
                const next = Math.min(3, cur + 0.1);
                volumeSlider.value = next;
                volumeSlider.dispatchEvent(new Event('input'));
            } else if (e.code === 'ArrowDown') {
                e.preventDefault();
                const cur = parseFloat(volumeSlider.value);
                const next = Math.max(0, cur - 0.1);
                volumeSlider.value = next;
                volumeSlider.dispatchEvent(new Event('input'));
            } else if (e.code === 'KeyN') {
                e.preventDefault();
                playNext();
            } else if (e.code === 'KeyP') {
                e.preventDefault();
                selectQueueItem(Math.max(0, state.currentIndex - 1));
            } else if (e.code === 'KeyC') {
                e.preventDefault();
                toggleCRT();
            } else if (e.code === 'KeyR') {
                e.preventDefault();
                toggleLoop();
            } else if (e.key === '?') {
                e.preventDefault();
                toggleShortcutsModal();
            }
        });

        // Toast Helper
        function showToast(msg) {
            const toast = document.getElementById('cyber-toast');
            document.getElementById('toast-message').textContent = msg;
            toast.classList.remove('translate-y-20', 'opacity-0');
            setTimeout(() => {
                toast.classList.add('translate-y-20', 'opacity-0');
            }, 3000);
        }

        function formatTime(seconds) {
            if (isNaN(seconds)) return '00:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }

;

(() => {
      'use strict';
      const $ = id => document.getElementById(id);
      const KEY = 'homeflix.cybernode.upgrade.v1';
      const safeRead = () => { try { const v=JSON.parse(localStorage.getItem(KEY)||'{}'); return v&&typeof v==='object'?v:{}; } catch { return {}; } };
      let db = safeRead();
      if (!Array.isArray(db.profiles) || !db.profiles.length) db.profiles=['Main'];
      if (!db.active || !db.profiles.includes(db.active)) db.active=db.profiles[0];
      if (!db.data || typeof db.data!=='object') db.data={};
      if (!db.accent) db.accent='#06b6d4';
      const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch(e) { toast('Storage is full; export a backup or clear browser storage.'); } };
            const profileData = () => { if(!db.data[db.active]) db.data[db.active]={favorites:[],progress:{},watched:[]}; const p=db.data[db.active]; p.favorites ||= []; p.progress ||= {}; p.watched ||= []; return p; };
      const video = document.querySelector('video');
      const titleNode = $('current-title') || $('video-title') || $('now-playing-title');
      const currentTitle = () => {
        const t=(titleNode?.textContent||$('hf-current-title')?.textContent||'').trim();
        if(t && !/nothing selected|homeflix cyber node/i.test(t)) return t;
        const src=video?.currentSrc||video?.src||'';
        try { const u=new URL(src,location.href); const last=decodeURIComponent(u.pathname.split('/').pop()||''); return last && last!=='/'?last.replace(/\.[^.]+$/,''):'Current media'; } catch { return 'Current media'; }
      };
      const getKey = () => currentTitle().toLowerCase();
      const toast = msg => { if(typeof window.showToast==='function') window.showToast(msg); else { const old=$('hf-upgrade-toast'); if(old)old.remove(); const n=document.createElement('div');n.id='hf-upgrade-toast';n.textContent=msg;n.style.cssText='position:fixed;z-index:99999;bottom:75px;right:18px;padding:12px 16px;border:1px solid #22d3ee;border-radius:10px;background:#0b1220;color:white;font:13px Inter,sans-serif;box-shadow:0 8px 30px #0008';document.body.append(n);setTimeout(()=>n.remove(),2600); } };
      const fmt = n => { n=Math.max(0,Math.floor(Number(n)||0)); return Math.floor(n/60)+':'+String(n%60).padStart(2,'0'); };
      function render() {
      $('hf-profile').innerHTML=''; db.profiles.forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;$('hf-profile').append(o)});$('hf-profile').value=db.active;
        const p=profileData(), title=currentTitle(), key=getKey();
        $('hf-current-title').textContent=title;
        $('hf-current-meta').textContent=video&&Number.isFinite(video.duration)&&video.duration>0?fmt(video.currentTime)+' / '+fmt(video.duration):'Playback details appear when media is loaded.';
        $('hf-favorite-current').textContent=p.favorites.includes(key)?'★ Remove favorite':'☆ Add favorite';
        const progress=Object.entries(p.progress).filter(([,v])=>v&&v.duration>0&&v.time>5&&v.time/v.duration<.96).sort((a,b)=>(b[1].updated||0)-(a[1].updated||0));
        $('hf-progress-list').innerHTML=''; if(!progress.length) $('hf-progress-list').innerHTML='<div class="hf-muted">Nothing to resume yet. Start watching something.</div>';
        progress.slice(0,12).forEach(([k,v])=>{const row=document.createElement('div');row.className='hf-item';const label=document.createElement('span');label.textContent=v.title||k;const meta=document.createElement('span');meta.className='hf-muted';meta.textContent=Math.round(v.time/v.duration*100)+'%';row.append(label,meta);row.title='Saved at '+fmt(v.time);$('hf-progress-list').append(row);});
        $('hf-favorite-list').innerHTML=''; if(!p.favorites.length) $('hf-favorite-list').innerHTML='<div class="hf-muted">Your list is empty. Add the current title while it is playing.</div>';
        p.favorites.forEach(k=>{const row=document.createElement('div');row.className='hf-item';const label=document.createElement('span');label.textContent=k;const rm=document.createElement('button');rm.className='hf-btn';rm.textContent='Remove';rm.onclick=()=>{p.favorites=p.favorites.filter(x=>x!==k);persist();render()};row.append(label,rm);$('hf-favorite-list').append(row);});
        $('hf-diagnostics').textContent='Player: '+(video?'video element detected':'no video element found')+' · Network: '+(navigator.onLine?'online':'offline')+' · Storage: '+(navigator.storage&&navigator.storage.estimate?'available':'browser-managed');
        if(navigator.storage&&navigator.storage.estimate){navigator.storage.estimate().then(({usage,quota})=>{const fmtBytes=n=>{if(!Number.isFinite(n))return 'unknown';const u=['B','KB','MB','GB','TB'];let i=0,v=n;while(v>=1024&&i<u.length-1){v/=1024;i++;}return v.toFixed(i?1:0)+' '+u[i];};$('hf-diagnostics').textContent+=' · Used: '+fmtBytes(usage||0)+' / '+fmtBytes(quota||0);}).catch(()=>{});}
      }
      $('hf-upgrade-launcher').addEventListener('click',()=>{render();$('hf-upgrade-panel').classList.add('open');});
      $('hf-upgrade-close').addEventListener('click',()=>$('hf-upgrade-panel').classList.remove('open'));
      $('hf-open-settings').addEventListener('click',()=>{$('hf-upgrade-panel').classList.remove('open');openLibrarySettings();});
      $('hf-upgrade-panel').addEventListener('click',e=>{if(e.target===$('hf-upgrade-panel'))$('hf-upgrade-panel').classList.remove('open')});
      document.addEventListener('keydown',e=>{if(e.key==='Escape')$('hf-upgrade-panel').classList.remove('open')});
      $('hf-profile').addEventListener('change',e=>{db.active=e.target.value;persist();render();});
      $('hf-add-profile').addEventListener('click',()=>{const name=$('hf-new-profile').value.trim().slice(0,32);if(!name)return;if(db.profiles.some(x=>x.toLowerCase()===name.toLowerCase()))return toast('That profile already exists.');db.profiles.push(name);db.active=name;$('hf-new-profile').value='';persist();render();toast('Profile created.');});
      $('hf-new-profile').addEventListener('keydown',e=>{if(e.key==='Enter')$('hf-add-profile').click()});
      $('hf-favorite-current').addEventListener('click',()=>{const p=profileData(),k=getKey();p.favorites=p.favorites.includes(k)?p.favorites.filter(x=>x!==k):[...p.favorites,k];persist();render();toast(p.favorites.includes(k)?'Added to My List.':'Removed from My List.');});
      $('hf-mark-watched').addEventListener('click',()=>{const p=profileData(),k=getKey();if(!p.watched.includes(k))p.watched.push(k);delete p.progress[k];persist();render();toast('Marked watched for '+db.active+'.');});
      document.documentElement.style.setProperty('--hf-accent','#e50914');
      const settingsGear=$('hf-upgrade-launcher');if(settingsGear){settingsGear.style.removeProperty('background');settingsGear.style.removeProperty('background-image');}
      $('hf-toggle-crt').addEventListener('click',()=>{document.body.classList.toggle('crt-off');db.crtOff=document.body.classList.contains('crt-off');persist();toast(db.crtOff?'Scanlines disabled.':'Scanlines enabled.');});
      
       let sleepTimerId=null, sleepDeadline=0;
       const sleepStatus=$('hf-sleep-status'), sleepStart=$('hf-sleep-start'), sleepCancel=$('hf-sleep-cancel');
       const paintSleepTimer=()=>{
         if(!sleepTimerId){sleepStatus.textContent='Timer is off.';sleepCancel.disabled=true;return;}
         const left=Math.max(0,sleepDeadline-Date.now()), total=Math.ceil(left/1000);
         sleepStatus.textContent='Sleep timer active · '+String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0')+' remaining';
         sleepCancel.disabled=false;
         if(left<=0){clearInterval(sleepTimerId);sleepTimerId=null;sleepDeadline=0;if(video)video.pause();sleepStatus.textContent='Timer finished · playback paused.';sleepCancel.disabled=true;toast('Sleep timer finished. Playback paused.');}
       };
       sleepStart.addEventListener('click',()=>{
         if(sleepTimerId)clearInterval(sleepTimerId);
         const minutes=Math.max(1,Math.min(180,Number($('hf-sleep-duration').value)||30));
         sleepDeadline=Date.now()+minutes*60*1000;
         sleepTimerId=setInterval(paintSleepTimer,1000);
         paintSleepTimer();toast('Sleep timer set for '+minutes+' minutes.');
       });
       sleepCancel.addEventListener('click',()=>{
         if(sleepTimerId)clearInterval(sleepTimerId);
         sleepTimerId=null;sleepDeadline=0;paintSleepTimer();toast('Sleep timer cancelled.');
       });
if(db.crtOff)document.body.classList.add('crt-off');
      $('hf-surprise').addEventListener('click',()=>{const cards=[...document.querySelectorAll('.library-card')];const visible=cards.filter(c=>c.offsetParent!==null);if(!visible.length)return toast('Import or scan your library first.');const card=visible[Math.floor(Math.random()*visible.length)];card.scrollIntoView({behavior:'smooth',block:'center'});card.click();toast('Your next pick is ready to explore.');$('hf-upgrade-panel').classList.remove('open');});
      $('hf-export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({...db,exportedAt:new Date().toISOString(),app:'HomeFlix Cyber Node'},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='homeflix-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
      $('hf-import').addEventListener('click',()=>$('hf-import-file').click());
      $('hf-import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const incoming=JSON.parse(await file.text());if(!Array.isArray(incoming.profiles)||!incoming.data||typeof incoming.data!=='object')throw Error('Invalid HomeFlix backup');db={...db,profiles:incoming.profiles.filter(x=>typeof x==='string').slice(0,50),active:incoming.active,data:incoming.data,accent:incoming.accent||db.accent};if(!db.profiles.length)db.profiles=['Main'];if(!db.profiles.includes(db.active))db.active=db.profiles[0];persist();render();toast('Backup imported.');}catch(err){toast('Could not import: '+err.message)}finally{e.target.value='';}});
      function saveProgress(){if(!video||!Number.isFinite(video.duration)||video.duration<=0)return;const p=profileData(),k=getKey();p.progress[k]={title:currentTitle(),time:video.currentTime,duration:video.duration,updated:Date.now()};if(video.currentTime/video.duration>=.96&&!p.watched.includes(k)){p.watched.push(k);delete p.progress[k]}persist();}
      if(video){video.addEventListener('timeupdate',()=>{if(Math.floor(video.currentTime)%10===0)saveProgress()});video.addEventListener('pause',saveProgress);video.addEventListener('ended',()=>{const p=profileData(),k=getKey();if(!p.watched.includes(k))p.watched.push(k);delete p.progress[k];persist();render()});video.addEventListener('loadedmetadata',render);video.addEventListener('play',render);}
      window.addEventListener('online',render);window.addEventListener('offline',render);
      render();
    })();

;

function openImageViewer(item) {
        const viewer=document.getElementById('hf-photo-viewer');
        const image=document.getElementById('hf-photo-viewer-image');
        if(!viewer||!image||!item)return;
        image.src=item.url;
        image.alt=item.title||'Photo';
        document.getElementById('hf-photo-viewer-title').textContent=item.title||'Photo';
        viewer.classList.add('open');
        document.body.style.overflow='hidden';
        if(!document.fullscreenElement && viewer.requestFullscreen) viewer.requestFullscreen().catch(()=>{});
      }
      function closePhotoViewer() {
        const viewer=document.getElementById('hf-photo-viewer');
        if(!viewer)return;
        viewer.classList.remove('open');
        document.body.style.overflow='';
        if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(()=>{});
      }
      function togglePhotoViewerFullscreen() {
        const viewer=document.getElementById('hf-photo-viewer');
        if(!viewer)return;
        if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
        else if(viewer.requestFullscreen) viewer.requestFullscreen().catch(()=>{});
      }
      document.addEventListener('keydown',event=>{
        if(event.key==='Escape' && document.getElementById('hf-photo-viewer')?.classList.contains('open')) closePhotoViewer();
      });


/* HomeFlix Advanced Settings: saved preferences and honest runtime diagnostics. */
(function homeflixAdvancedSettings(){
  const KEY='homeflix-advanced-settings-v1';
  const defaults={reducedMotion:false,crt:!document.body.classList.contains('crt-off'),rememberVolume:true,audioMonitor:true,autoplayNext:false,playbackSpeed:1,startMuted:false};
  let audioInterruptions=0, lastAudioEvent=null, audioListenersAttached=false;
  const read=()=>{try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}};
  const write=v=>{try{const serialized=JSON.stringify(v);localStorage.setItem(KEY,serialized);return localStorage.getItem(KEY)===serialized}catch{return false}};
  const $=id=>document.getElementById(id);
  function apply(v){
    document.body.classList.toggle('hf-reduced-motion',!!v.reducedMotion);
    document.body.classList.toggle('crt-off',!v.crt);
    try{localStorage.setItem('homeflix.crtOff',JSON.stringify(!v.crt))}catch{}
    const crtToggle=$('hf-toggle-crt');
    if(crtToggle) crtToggle.setAttribute('aria-pressed',String(!!v.crt));
    const video=document.querySelector('video');if(video){const speed=Number(v.playbackSpeed);video.playbackRate=[0.5,0.75,1,1.25,1.5,1.75,2].includes(speed)?speed:1;}
  }
  function attachAudioMonitor(){
    if(audioListenersAttached)return;
    const video=document.querySelector('video'); if(!video)return;
    audioListenersAttached=true;
    const note=(kind)=>{const v=read();if(!v.audioMonitor)return;audioInterruptions++;lastAudioEvent={kind,time:new Date().toISOString(),currentTime:Number(video.currentTime)||0,networkState:video.networkState,readyState:video.readyState};paintDiagnostics();};
    video.addEventListener('waiting',()=>{if(!video.paused)note('waiting');});
    video.addEventListener('stalled',()=>note('stalled'));
    video.addEventListener('error',()=>note('media-error'));
    video.addEventListener('playing',paintDiagnostics);
    video.addEventListener('loadedmetadata',paintDiagnostics);
  }
  function paintDiagnostics(){
    const video=document.querySelector('video');
    const memory=$('hf-setting-memory'),playback=$('hf-setting-playback'),events=$('hf-setting-audio-events'),gpu=$('hf-setting-gpu'),note=$('hf-setting-diagnostics-note');
    try {
      const m=window.performance && window.performance.memory;
      if(memory) memory.textContent=m&&Number.isFinite(m.usedJSHeapSize)?(m.usedJSHeapSize/1048576).toFixed(1)+' MB JS heap':'Not exposed by this runtime';
      if(playback){if(!video||!video.currentSrc)playback.textContent='No media loaded';else if(video.error)playback.textContent='Playback error ('+video.error.code+')';else playback.textContent=(video.paused?'Paused':'Playing')+(Number.isFinite(video.videoWidth)&&video.videoWidth?' · '+video.videoWidth+'×'+video.videoHeight:'');}
      if(events)events.textContent=audioInterruptions+' detected'+(lastAudioEvent?' · last: '+lastAudioEvent.kind:'');
      if(gpu){const t=$('hardware-acceleration');gpu.textContent=t?(t.disabled?'Desktop-only control':(t.checked?'Enabled (restart may be required)':'Disabled (restart may be required)')):'See hardware setting above';}
      if(note)note.textContent=lastAudioEvent?'Audio events are diagnostic signals, not proof of audible dropouts. Last event: '+lastAudioEvent.kind+' at '+lastAudioEvent.time+'. CPU/GPU decoder details are not exposed by every runtime.':'Live stats are best-effort. CPU usage and active GPU decoder details are not exposed by every runtime.';
    } catch(error) {
      if(note) note.textContent='Diagnostics could not read one or more runtime values: '+(error&&error.message?error.message:'unknown error')+'. Try Refresh again.';
    }
  }
  function syncControls(){
    const v=read();
    for(const [id,key] of [['hf-setting-reduced-motion','reducedMotion'],['hf-setting-crt','crt'],['hf-setting-volume-memory','rememberVolume'],['hf-setting-audio-monitor','audioMonitor'],['hf-setting-autoplay','autoplayNext'],['hf-setting-start-muted','startMuted']]){const el=$(id);if(el)el.checked=!!v[key];}
    const speed=$('hf-setting-speed');if(speed)speed.value=String(v.playbackSpeed||1);
    apply(v);attachAudioMonitor();paintDiagnostics();
  }
  function saveControls(){
    const v={reducedMotion:!!$('hf-setting-reduced-motion')?.checked,crt:!!$('hf-setting-crt')?.checked,rememberVolume:!!$('hf-setting-volume-memory')?.checked,audioMonitor:!!$('hf-setting-audio-monitor')?.checked,autoplayNext:!!$('hf-setting-autoplay')?.checked,playbackSpeed:Number($('hf-setting-speed')?.value||1),startMuted:!!$('hf-setting-start-muted')?.checked};
    if(!write(v)){if(typeof showToast==='function')showToast('Could not save advanced settings in local storage.');return;}
    apply(v);paintDiagnostics();
    if(typeof showToast==='function')showToast('Advanced preferences saved.');
  }
  function exportDiagnostics(){
    let url=null;
    try {
      const video=document.querySelector('video'),m=window.performance&&window.performance.memory,sc=window.screen;
      const report={app:'HomeFlix Cyber Node',createdAt:new Date().toISOString(),userAgent:navigator.userAgent,online:navigator.onLine,screen:{width:sc?sc.width:null,height:sc?sc.height:null,devicePixelRatio:window.devicePixelRatio||1},memory:m?{usedJSHeapSize:m.usedJSHeapSize,totalJSHeapSize:m.totalJSHeapSize,jsHeapSizeLimit:m.jsHeapSizeLimit}:null,playback:video?{paused:video.paused,currentTime:video.currentTime,duration:Number.isFinite(video.duration)?video.duration:null,videoWidth:video.videoWidth,videoHeight:video.videoHeight,readyState:video.readyState,networkState:video.networkState,error:video.error?{code:video.error.code,message:video.error.message}:null}:null,audio:{interruptions:audioInterruptions,lastEvent:lastAudioEvent},advancedSettings:read(),hardwareAcceleration:$('hardware-acceleration')?$('hardware-acceleration').checked:null,limitations:['CPU usage and GPU decoder details are not exposed by every runtime.','Audio events indicate media pipeline stalls/errors and do not confirm audible output.']};
      const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
      url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='homeflix-diagnostics-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();
      if(typeof showToast==='function')showToast('Diagnostics report exported.');
    } catch(error) {
      if(typeof showToast==='function')showToast('Could not export diagnostics: '+(error&&error.message?error.message:'unknown error'));
      const note=$('hf-setting-diagnostics-note');if(note)note.textContent='Export failed: '+(error&&error.message?error.message:'unknown error');
    } finally {if(url)setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }
  function init(){
    const run=$('hf-run-diagnostics'),exp=$('hf-export-diagnostics'),reset=$('hf-reset-advanced');
    run?.addEventListener('click',()=>{attachAudioMonitor();paintDiagnostics();if(typeof showToast==='function')showToast('Diagnostics refreshed.');});
    exp?.addEventListener('click',exportDiagnostics);
    reset?.addEventListener('click',()=>{write({...defaults});syncControls();if(typeof showToast==='function')showToast('Advanced preferences reset.');});
    for(const id of ['hf-setting-reduced-motion','hf-setting-crt','hf-setting-volume-memory','hf-setting-audio-monitor','hf-setting-autoplay','hf-setting-speed','hf-setting-start-muted'])$(id)?.addEventListener('change',saveControls);
    const settings=$('library-settings-modal');
    if(settings)new MutationObserver(()=>{if(!settings.classList.contains('hidden'))syncControls();}).observe(settings,{attributes:true,attributeFilter:['class']});
    const video=document.querySelector('video');
    if(video){
      const restoreVolume=()=>{const prefs=read();if(!prefs.rememberVolume)return;try{const saved=Number(localStorage.getItem('homeflix-preferred-volume'));if(Number.isFinite(saved)&&saved>=0&&saved<=1)video.volume=saved;}catch{}};
      const applyPlaybackPrefs=()=>{const prefs=read();const speed=Number(prefs.playbackSpeed||1);video.playbackRate=[0.5,0.75,1,1.25,1.5,1.75,2].includes(speed)?speed:1;if(prefs.startMuted)video.muted=true;};
      restoreVolume();applyPlaybackPrefs();video.addEventListener('loadedmetadata',()=>{restoreVolume();applyPlaybackPrefs();});
      video.addEventListener('volumechange',()=>{if(!read().rememberVolume)return;try{localStorage.setItem('homeflix-preferred-volume',String(video.volume));}catch{}});
    }
    syncControls();setInterval(()=>{if(settings&&!settings.classList.contains('hidden'))paintDiagnostics()},2000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)paintDiagnostics()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
