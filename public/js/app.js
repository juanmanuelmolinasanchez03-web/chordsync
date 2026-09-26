/* ============================================================
   ChordSync - Main Application Controller
   ============================================================ */

window.App = (() => {

  /* ---------- State ---------- */
  const state = {
    song: {
      id: null,
      youtubeId: null,
      youtubeUrl: null,
      title: '',
      artist: '',
      key: 'C',
      bpm: 120,
      timeSignature: '4/4',
      structure: [],
      chordPro: '',
      syncedLines: [],
      lyricsSource: '',
      transpose: 0,
      capo: 0,
    },
    settings: {
      notation: 'american',
      instrument: 'guitar',
      theme: 'dark',
      liveFontSize: 1.5,
    },
    player: {
      duration: 0,
      loop: { active: false, start: 0, end: 0 },
    },
    ui: {
      view: 'home',
      sidebarOpen: false,
      liveMode: false,
      editMode: false,
      metronomeOn: false,
    },
  };

  /* ---------- Helpers ---------- */
  function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function isYouTubeUrl(s) {
    return /youtube\.com|youtu\.be/i.test(s);
  }

  /* ---------- DOM Cache ---------- */
  const $ = id => document.getElementById(id);
  const els = {
    urlInput:         $('url-input'),
    btnAnalyze:       $('btn-analyze'),
    sidebar:          $('sidebar'),
    btnToggleSidebar: $('btn-toggle-sidebar'),
    btnCloseSidebar:  $('btn-close-sidebar'),
    btnTheme:         $('btn-theme'),
    libraryList:      $('library-list'),
    setlistList:      $('setlist-list'),
    setlistDetail:    $('setlist-detail'),
    setlistDetailName:$('setlist-detail-name'),
    setlistSongsList: $('setlist-songs-list'),
    btnBackSetlist:   $('btn-back-setlist'),

    // Views
    homeView:      $('home-view'),
    loadingView:   $('loading-view'),
    songView:      $('song-view'),
    recentSongs:   $('recent-songs'),
    recentList:    $('recent-list'),

    // Loading steps
    stepVideo:    $('step-video'),
    stepLyrics:   $('step-lyrics'),
    stepChords:   $('step-chords'),
    stepAnalysis: $('step-analysis'),

    // Song info
    songTitle:    $('song-title'),
    songArtist:   $('song-artist'),
    tagKey:       $('tag-key'),
    tagBpm:       $('tag-bpm'),
    tagTime:      $('tag-time'),
    tagCapo:      $('tag-capo'),
    songTags:     document.querySelector('.song-tags'),
    structureBar: $('structure-bar'),

    // Toolbar
    btnTransposeDown: $('btn-transpose-down'),
    btnTransposeUp:   $('btn-transpose-up'),
    transposeDisplay: $('transpose-display'),
    capoSelect:       $('capo-select'),
    notationSelect:   $('notation-select'),
    speedSelect:      $('speed-select'),
    btnLoopStart:     $('btn-loop-start'),
    btnLoopEnd:       $('btn-loop-end'),
    btnLoopToggle:    $('btn-loop-toggle'),
    btnMetronome:     $('btn-metronome'),
    metronomeBpm:     $('metronome-bpm'),
    btnSyncMinus:     $('btn-sync-minus'),
    btnSyncPlus:      $('btn-sync-plus'),
    btnEditMode:      $('btn-edit-mode'),

    // Song actions
    btnSaveSong:   $('btn-save-song'),
    btnAddSetlist: $('btn-add-setlist'),
    btnLiveMode:   $('btn-live-mode'),
    btnExportPdf:  $('btn-export-pdf'),

    // Chord sheet
    chordsheetDisplay:  $('chordsheet-display'),
    chordsheetEditor:   $('chordsheet-editor'),
    chordsheetTextarea: $('chordsheet-textarea'),
    btnSaveEdit:        $('btn-save-edit'),
    btnCancelEdit:      $('btn-cancel-edit'),

    // Player
    btnPlayPause:     $('btn-play-pause'),
    iconPlay:         $('icon-play'),
    iconPause:        $('icon-pause'),
    timeCurrent:      $('time-current'),
    timeTotal:        $('time-total'),
    progressContainer:$('progress-container'),
    progressBar:      $('progress-bar'),
    loopRegion:       $('loop-region'),
    btnVolume:        $('btn-volume'),
    volumeSlider:     $('volume-slider'),

    // Chord panel
    chordPanel:        $('chord-panel'),
    chordPanelName:    $('chord-panel-name'),
    chordPanelDiagram: $('chord-panel-diagram'),
    chordPanelInstLabel: $('chord-panel-inst-label'),

    // Search modal
    searchModal:       $('search-modal'),
    searchModalTitle:  $('search-modal-title'),
    searchModalBody:   $('search-modal-body'),
    searchModalClose:  $('search-modal-close'),

    // Chord modal
    chordModal:            $('chord-modal'),
    chordModalTitle:       $('chord-modal-title'),
    chordDiagramContainer: $('chord-diagram-container'),
    chordModalClose:       $('chord-modal-close'),

    // Setlist modal
    setlistModal:      $('setlist-modal'),
    setlistModalClose: $('setlist-modal-close'),
    setlistModalBody:  $('setlist-modal-body'),

    // Live mode
    liveMode:        $('live-mode'),
    liveTitle:       $('live-title'),
    liveArtist:      $('live-artist'),
    liveKey:         $('live-key'),
    liveBpm:         $('live-bpm'),
    liveChordsheet:  $('live-chordsheet'),
    liveProgressBar: $('live-progress-bar'),
    btnExitLive:     $('btn-exit-live'),
    btnLiveFontUp:   $('btn-live-font-up'),
    btnLiveFontDown: $('btn-live-font-down'),
  };

  /* ---------- Toast ---------- */
  function toast(msg, type = 'info', duration = 3000) {
    const container = $('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'toast-out 0.25s ease forwards';
      setTimeout(() => el.remove(), 280);
    }, duration);
  }

  /* ---------- View Management ---------- */
  function showView(name) {
    state.ui.view = name;
    [els.homeView, els.loadingView, els.songView].forEach(v => {
      if (v) v.classList.remove('active');
    });
    const view = { home: els.homeView, loading: els.loadingView, song: els.songView }[name];
    if (view) view.classList.add('active');
  }

  function setLoadingStep(step, status) {
    const el = els[`step${step.charAt(0).toUpperCase() + step.slice(1)}`];
    if (!el) return;
    el.classList.remove('active', 'done', 'error');
    const icons = { active: '⏳', done: '✅', error: '❌' };
    const label = el.dataset.label || el.textContent.replace(/^[✅❌⏳]\s*/, '');
    if (!el.dataset.label) el.dataset.label = label;
    el.classList.add(status);
    el.textContent = `${icons[status] || '⏳'} ${el.dataset.label}`;
  }

  /* ---------- Chord Panel ---------- */
  function updateChordPanel(chordName) {
    if (!chordName) return;
    els.chordPanelName.textContent = chordName;
    Diagrams.show(chordName, els.chordPanelDiagram, state.settings.instrument);
  }

  function setChordPanelInstrument(inst) {
    state.settings.instrument = inst;
    const labels = { guitar: 'Guitarra', piano: 'Piano', bass: 'Bajo' };
    els.chordPanelInstLabel.textContent = labels[inst] || inst;
    // Update all tooltip wiring
    Diagrams.initTooltips(inst);
    // Re-render current panel chord if any
    const current = els.chordPanelName.textContent;
    if (current && current !== '—') updateChordPanel(current);
  }

  /* ---------- Render Chord Sheet ---------- */
  function renderSheet() {
    const { chordPro, transpose, key } = state.song;
    const { notation } = state.settings;

    const html = Editor.render(chordPro || '', { transpose, notation, keyRoot: key });
    els.chordsheetDisplay.innerHTML = html;

    // Wire chord click → modal
    els.chordsheetDisplay.querySelectorAll('.cs-chord[data-chord]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        showChordModal(el.dataset.chord);
      });
      // Wire hover → chord panel
      el.addEventListener('mouseenter', () => updateChordPanel(el.dataset.chord));
    });

    // Tooltip hover
    Diagrams.initTooltips(state.settings.instrument);

    renderStructureBar();
    highlightLine(Sync.currentLine);
  }

  /* ---------- Structure Bar ---------- */
  function renderStructureBar() {
    const structure = Editor.extractStructure(state.song.chordPro || '');
    els.structureBar.innerHTML = '';
    for (const sec of structure) {
      const pill = document.createElement('button');
      pill.className = 'section-pill';
      pill.textContent = sec.label;
      pill.dataset.lineIndex = sec.lineIndex;
      pill.addEventListener('click', () => scrollToSection(sec.lineIndex));
      els.structureBar.appendChild(pill);
    }
  }

  function scrollToSection(lineIndex) {
    const el = els.chordsheetDisplay.querySelector(`[data-line="${lineIndex}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Karaoke Highlighting ---------- */
  function highlightLine(idx, lineData) {
    // Use chord-sheet line index from aligned sync data when available
    const sheetIdx = (lineData?.lineIndex != null) ? lineData.lineIndex : idx;

    els.chordsheetDisplay.querySelectorAll('.cs-line-group.current-line')
      .forEach(el => el.classList.remove('current-line'));

    if (sheetIdx >= 0) {
      const el = els.chordsheetDisplay.querySelector(`[data-line="${sheetIdx}"]`);
      if (el) {
        el.classList.add('current-line');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Update chord panel with first chord of this line
        const firstChord = el.querySelector('.cs-chord[data-chord]');
        if (firstChord) updateChordPanel(firstChord.dataset.chord);
      }

      // Live mode mirror
      if (state.ui.liveMode) {
        els.liveChordsheet.querySelectorAll('.cs-line-group.current-line')
          .forEach(el => el.classList.remove('current-line'));
        const liveEl = els.liveChordsheet.querySelector(`[data-line="${sheetIdx}"]`);
        if (liveEl) {
          liveEl.classList.add('current-line');
          liveEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }

  /* ---------- Search Flow (title search, no URL) ---------- */
  async function searchByTitle(query) {
    els.searchModalTitle.textContent = `Resultados para "${query}"`;
    els.searchModalBody.innerHTML = '<p style="color:var(--text-muted);padding:8px 0">Buscando…</p>';
    els.searchModal.style.display = 'flex';

    try {
      const res     = await fetch(`/api/chords/results?q=${encodeURIComponent(query)}`);
      const results = res.ok ? await res.json() : [];

      if (!results.length) {
        els.searchModalBody.innerHTML = '<p style="color:var(--text-muted)">No se encontraron resultados. Prueba con el link de YouTube directamente.</p>';
        return;
      }

      els.searchModalBody.innerHTML = results.map((r, i) => `
        <button class="search-result-btn" data-index="${i}">
          <div class="sr-info">
            <span class="sr-title">${escHtml(r.title)}</span>
            <span class="sr-artist">${escHtml(r.artist)}</span>
          </div>
          <div class="sr-meta">
            <span class="sr-type">${escHtml(r.type)}</span>
            ${r.rating ? `<span class="sr-rating">★ ${Number(r.rating).toFixed(1)}</span>` : ''}
          </div>
        </button>`).join('');

      els.searchModalBody.querySelectorAll('.search-result-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = results[+btn.dataset.index];
          els.searchModal.style.display = 'none';
          analyzeFromSearchResult(r);
        });
      });
    } catch {
      els.searchModalBody.innerHTML = '<p style="color:var(--warm)">Error al buscar. Intenta de nuevo.</p>';
    }
  }

  async function analyzeFromSearchResult(result) {
    showView('loading');
    resetLoadingSteps();

    setLoadingStep('video', 'active');
    // No video info for title searches — use result metadata
    state.song.youtubeId  = null;
    state.song.youtubeUrl = null;
    state.song.title      = `${result.title} — ${result.artist}`;
    state.song.artist     = result.artist;
    setLoadingStep('video', 'done');

    setLoadingStep('chords', 'active');
    setLoadingStep('lyrics', 'active');

    const [chordsRes, lyricsRes] = await Promise.allSettled([
      fetch(`/api/chords/fetch?url=${encodeURIComponent(result.url)}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/lyrics/multi?artist=${encodeURIComponent(result.artist)}&title=${encodeURIComponent(result.title)}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const chords = chordsRes.status === 'fulfilled' ? chordsRes.value : null;
    const lyrics = lyricsRes.status === 'fulfilled' ? lyricsRes.value : null;

    let chordPro = chords?.chordPro || '';
    if (!chordPro && lyrics?.text) chordPro = Lyrics.plainToChordPro(lyrics.text);
    state.song.chordPro = chordPro;

    let syncedLines = [];
    if (lyrics?.type === 'synced') {
      syncedLines = Lyrics.parseLRC(lyrics.text);
    }
    state.song.syncedLines = syncedLines;

    setLoadingStep('chords', chords?.chordPro ? 'done' : 'error');
    setLoadingStep('lyrics', (chordPro || syncedLines.length) ? 'done' : 'error');

    setLoadingStep('analysis', 'active');
    if (chordPro) {
      const detectedKey = Chords.estimateKey(Chords.extractChords(chordPro));
      if (detectedKey) state.song.key = detectedKey;
    }
    state.song.bpm = 120;
    state.song.timeSignature = '4/4';
    setLoadingStep('analysis', 'done');

    autoSaveSong();
    applySongToUI();
    showView('song');
    initSync();
    Library.addRecent(state.song);
    refreshRecent();
    refreshLibraryUI();
  }

  /* ---------- Estimated sync for plain lyrics ---------- */
  function initSync() {
    if (state.song.syncedLines.length > 0) {
      const lyricLines = Editor.getLyricLines(state.song.chordPro);
      const aligned    = Sync.alignPlainToSynced(lyricLines.join('\n'), state.song.syncedLines);
      Sync.init(aligned, () => YT_Player.getCurrentTime(), (idx, lineData) => highlightLine(idx, lineData));
    } else if (state.song.chordPro) {
      // Estimated sync: divide video duration equally among lyric lines
      // We wait until we have a duration, then build fake timestamps
      startEstimatedSync();
    }
  }

  let estimatedSyncTimer = null;

  function startEstimatedSync() {
    if (estimatedSyncTimer) clearInterval(estimatedSyncTimer);
    let attempts = 0;
    estimatedSyncTimer = setInterval(() => {
      const duration = YT_Player.getDuration();
      attempts++;
      if (duration > 5 || attempts > 30) {
        clearInterval(estimatedSyncTimer);
        estimatedSyncTimer = null;
        if (duration > 5) buildEstimatedSync(duration);
      }
    }, 500);
  }

  function buildEstimatedSync(duration) {
    const lyricLines = Editor.getLyricLines(state.song.chordPro);
    if (!lyricLines.length) return;
    // Assume lyrics start at ~5% and end at ~90% of the song
    const start    = duration * 0.05;
    const end      = duration * 0.90;
    const step     = (end - start) / lyricLines.length;
    const synced   = lyricLines.map((text, i) => ({ time: start + i * step, text, lineIndex: i }));
    Sync.init(synced, () => YT_Player.getCurrentTime(), (idx, lineData) => highlightLine(idx, lineData));
    if (YT_Player.isPlaying()) Sync.start();
  }

  /* ---------- Auto-save song on analyze ---------- */
  function autoSaveSong() {
    if (!state.song.id) state.song.id = 'song_' + Date.now().toString(36);
    Library.save({ ...state.song });
  }

  /* ---------- Analyze Flow ---------- */
  async function analyze(url) {
    const videoId = YT_Player.extractVideoId(url);
    if (!videoId) {
      toast('URL de YouTube no válida', 'error');
      return;
    }

    showView('loading');
    resetLoadingSteps();

    // Step 1: Video info
    setLoadingStep('video', 'active');
    const info     = await YT_Player.getVideoInfo(url);
    const rawTitle = info?.title || '';
    const author   = info?.author_name || '';
    const parsed   = Lyrics.parseVideoTitle(rawTitle);
    const artist   = parsed.artist || author;
    const song     = parsed.song   || rawTitle;

    state.song.youtubeId  = videoId;
    state.song.youtubeUrl = url;
    state.song.title      = rawTitle;
    state.song.artist     = artist;
    setLoadingStep('video', rawTitle ? 'done' : 'error');

    // Steps 2+3: fetch chords first, then lyrics with corrected artist/title
    setLoadingStep('lyrics', 'active');
    setLoadingStep('chords', 'active');

    // Fetch chords
    const chordsRes = await fetch(`/api/chords/search?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(song)}`)
      .then(r => r.ok ? r.json() : null).catch(() => null);

    // Use UG's artist/title for lyrics if available (more accurate than video title)
    const lyricsArtist = chordsRes?.artist || artist;
    const lyricsTitle  = chordsRes?.song   || song;

    const lyricsRes = await fetch(`/api/lyrics/multi?artist=${encodeURIComponent(lyricsArtist)}&title=${encodeURIComponent(lyricsTitle)}`)
      .then(r => r.ok ? r.json() : null).catch(() => null);

    let chordPro = chordsRes?.chordPro || '';
    const hasRealChords = chordPro.includes('[');

    // Build chord pro from lyrics if no chords found
    if (!hasRealChords) {
      if (lyricsRes?.text) {
        const plain = lyricsRes.type === 'synced'
          ? Lyrics.parseLRC(lyricsRes.text).map(l => l.text).join('\n')
          : lyricsRes.text;
        chordPro = Lyrics.plainToChordPro(plain);
      }
    }

    // Get synced lines if available
    let syncedLines = [];
    if (lyricsRes?.type === 'synced') {
      syncedLines = Lyrics.parseLRC(lyricsRes.text);
    }

    state.song.chordPro    = chordPro;
    state.song.syncedLines = syncedLines;
    if (chordsRes?.url) { state.song.chordsUrl = chordsRes.url; }

    setLoadingStep('chords', hasRealChords ? 'done' : 'error');
    setLoadingStep('lyrics', (chordPro || syncedLines.length) ? 'done' : 'error');

    // Step 4: Musical analysis
    setLoadingStep('analysis', 'active');
    state.song.bpm           = 120;
    state.song.timeSignature = '4/4';
    if (hasRealChords) {
      const detectedKey = Chords.estimateKey(Chords.extractChords(chordPro));
      if (detectedKey) state.song.key = detectedKey;
    }
    setLoadingStep('analysis', 'done');

    els.metronomeBpm.value = state.song.bpm;

    YT_Player.loadVideo(videoId);
    autoSaveSong();
    applySongToUI();
    showView('song');
    initSync();

    Library.addRecent(state.song);
    refreshRecent();
    refreshLibraryUI();

    const parts = [];
    if (chordsRes?.source) parts.push(`acordes: ${chordsRes.source}`);
    if (lyricsRes?.source) parts.push(`letra: ${lyricsRes.source}`);

    if (chordsRes?.url) {
      const srcBadge = document.createElement('a');
      srcBadge.className = 'tag';
      srcBadge.href = chordsRes.url;
      srcBadge.target = '_blank';
      srcBadge.rel = 'noopener';
      srcBadge.title = 'Ver en fuente original';
      srcBadge.textContent = `🔗 ${chordsRes.source || 'Fuente'}`;
      srcBadge.style.marginLeft = '6px';
      els.songTags?.appendChild(srcBadge);
    }

    if (parts.length) {
      toast(`Cargado — ${parts.join(' · ')}`, 'success', 4000);
    } else {
      toast('No se encontró letra ni acordes. Puedes editarlos manualmente.', 'info', 5000);
    }
  }

  function resetLoadingSteps() {
    ['video','lyrics','chords','analysis'].forEach(s => setLoadingStep(s, 'active'));
    $('loading-status').textContent = 'Analizando canción…';
  }

  function analyzeTitle(title, artist) {
    const keys = ['C','G','D','A','E','F','Am','Em','Dm'];
    const key = keys[Math.floor(Math.random() * keys.length)];
    const bpmOptions = [80, 90, 100, 110, 120, 130, 140];
    const bpm = bpmOptions[Math.floor(Math.random() * bpmOptions.length)];
    return { key, bpm, timeSignature: '4/4' };
  }

  function addEstimatedChords(text, key) {
    const scale = Chords.PROGRESSIONS[key] || Chords.PROGRESSIONS['C'];
    const lines = text.split('\n');
    const result = [];
    let chordIndex = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || Editor.parse(line).some(n => n.type === 'section')) {
        result.push(line);
        continue;
      }
      if (chordIndex % 2 === 0 && scale.length > 0) {
        const chord = scale[(chordIndex / 2) % scale.length].replace('dim','');
        result.push(`[${chord}]${trimmed}`);
      } else {
        result.push(trimmed);
      }
      chordIndex++;
    }

    return result.join('\n');
  }

  /* ---------- Apply Song to UI ---------- */
  function applySongToUI() {
    const s = state.song;
    els.songTitle.textContent  = s.title  || 'Sin título';
    els.songArtist.textContent = s.artist || '';
    els.songTags?.querySelectorAll('a.tag').forEach(el => el.remove());

    const dispKey = s.transpose
      ? Chords.transposeChord(s.key, s.transpose)
      : s.key;
    els.tagKey.textContent  = `🎵 ${dispKey || 'C'}`;
    els.tagBpm.textContent  = `♩ ${s.bpm} BPM`;
    els.tagTime.textContent = `⏱ ${s.timeSignature}`;

    if (s.capo > 0) {
      els.tagCapo.textContent = `🔒 Capo ${s.capo}`;
      els.tagCapo.style.display = '';
    } else {
      els.tagCapo.style.display = 'none';
    }

    els.transposeDisplay.textContent = s.transpose >= 0 ? `+${s.transpose}` : `${s.transpose}`;
    els.capoSelect.value   = s.capo;
    els.metronomeBpm.value = s.bpm;

    renderSheet();

    els.liveTitle.textContent  = s.title  || '';
    els.liveArtist.textContent = s.artist || '';
    els.liveKey.textContent    = `${dispKey || 'C'}`;
    els.liveBpm.textContent    = `${s.bpm} BPM`;
    els.liveChordsheet.innerHTML = els.chordsheetDisplay.innerHTML;

    // Reset chord panel
    els.chordPanelName.textContent = '—';
    els.chordPanelDiagram.innerHTML = '<p class="chord-panel-hint">Pasa el cursor<br>sobre un acorde</p>';
  }

  /* ---------- Player UI Updates ---------- */
  let playerPollId = null;

  function startPlayerPoll() {
    if (playerPollId) return;
    playerPollId = setInterval(updatePlayerUI, 200);
  }

  function stopPlayerPoll() {
    clearInterval(playerPollId);
    playerPollId = null;
  }

  function updatePlayerUI() {
    if (!YT_Player.ready) return;
    const current  = YT_Player.getCurrentTime();
    const duration = YT_Player.getDuration();
    state.player.duration = duration;

    els.timeCurrent.textContent = formatTime(current);
    els.timeTotal.textContent   = formatTime(duration);
    els.progressBar.style.width = duration > 0 ? `${(current / duration) * 100}%` : '0%';
    els.liveProgressBar.style.width = els.progressBar.style.width;

    if (state.player.loop.active) {
      const { start, end } = state.player.loop;
      if (current >= end && end > start) YT_Player.seekTo(start);
    }
  }

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m   = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  /* ---------- Chord Modal ---------- */
  function showChordModal(chord) {
    if (!chord) return;
    els.chordModalTitle.textContent = chord;
    renderChordDiagram(chord, state.settings.instrument);

    // Sync active tab to current instrument
    els.chordModal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === state.settings.instrument);
    });

    els.chordModal.style.display = 'flex';

    els.chordModal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        els.chordModal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setChordPanelInstrument(btn.dataset.tab);
        renderChordDiagram(chord, btn.dataset.tab);
      };
    });
  }

  function renderChordDiagram(chord, instrument) {
    Diagrams.show(chord, els.chordDiagramContainer, instrument);
  }

  /* ---------- Setlist Modal ---------- */
  function showSetlistModal() {
    if (!state.song.title) { toast('No hay canción cargada', 'error'); return; }
    const setlists = Library.getSetlists();
    let html = '<div class="setlist-pick-list">';
    if (setlists.length === 0) {
      html += '<p style="color:var(--text-muted);font-size:0.88rem;margin-bottom:12px;">No tienes setlists todavía.</p>';
    } else {
      for (const sl of setlists) {
        html += `<button class="setlist-pick-btn" data-setlist-id="${sl.id}">
          🎵 ${escHtml(sl.name)} <small style="color:var(--text-muted);margin-left:auto">${sl.songs?.length || 0} canciones</small>
        </button>`;
      }
    }
    html += `<button class="setlist-pick-btn setlist-pick-new" data-action="new">+ Crear nuevo setlist</button>`;
    html += '</div>';
    els.setlistModalBody.innerHTML = html;
    els.setlistModal.style.display = 'flex';

    els.setlistModalBody.querySelectorAll('[data-setlist-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        addToSetlist(btn.dataset.setlistId);
        els.setlistModal.style.display = 'none';
      });
    });
    els.setlistModalBody.querySelector('[data-action="new"]')?.addEventListener('click', () => {
      const name = prompt('Nombre del nuevo setlist:');
      if (!name) return;
      const sl = Library.saveSetlist({ name, songs: [] });
      addToSetlist(sl.id);
      els.setlistModal.style.display = 'none';
    });
  }

  function addToSetlist(setlistId) {
    const sl = Library.getSetlistById(setlistId);
    if (!sl) return;

    // Save song first if not already saved
    if (!state.song.id) {
      const saved = Library.save({ ...state.song });
      state.song.id = saved.id;
    }

    if (!sl.songs.includes(state.song.id)) {
      sl.songs.push(state.song.id);
      Library.saveSetlist(sl);
    }
    refreshLibraryUI();
    toast(`"${state.song.title}" añadida a "${sl.name}"`, 'success');
  }

  /* ---------- Live Mode ---------- */
  function enterLiveMode() {
    state.ui.liveMode = true;
    els.liveMode.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    applyLiveFontSize();
    els.liveChordsheet.innerHTML = els.chordsheetDisplay.innerHTML;
    if (Sync.currentLine >= 0) {
      const el = els.liveChordsheet.querySelector(`[data-line="${Sync.currentLine}"]`);
      if (el) { el.classList.add('current-line'); el.scrollIntoView({ block: 'center' }); }
    }
  }

  function exitLiveMode() {
    state.ui.liveMode = false;
    els.liveMode.style.display = 'none';
    document.body.style.overflow = '';
  }

  function applyLiveFontSize() {
    els.liveChordsheet.style.fontSize = `${state.settings.liveFontSize}rem`;
  }

  /* ---------- Library UI ---------- */
  function refreshLibraryUI() {
    const songs    = Library.getAll();
    const setlists = Library.getSetlists();

    // Songs list
    if (songs.length === 0) {
      els.libraryList.innerHTML = '<div class="library-empty">Ninguna canción guardada todavía</div>';
    } else {
      els.libraryList.innerHTML = songs.map(s => `
        <li data-id="${s.id}" class="${state.song.id === s.id ? 'active' : ''}">
          <div style="flex:1;min-width:0">
            <div class="lib-title">${escHtml(s.title || 'Sin título')}</div>
            <div class="lib-artist">${escHtml(s.artist || '')}</div>
          </div>
          <div class="lib-actions">
            <button class="btn-icon btn-small" data-action="load" data-id="${s.id}" title="Cargar">▶</button>
            <button class="btn-icon btn-small" data-action="delete" data-id="${s.id}" title="Eliminar">🗑</button>
          </div>
        </li>`).join('');
    }

    // Setlists
    if (setlists.length === 0) {
      els.setlistList.innerHTML = '<div class="library-empty">Ningún setlist todavía</div>';
    } else {
      els.setlistList.innerHTML = setlists.map(sl => `
        <li data-setlist-id="${sl.id}">
          <span class="lib-title">🎵 ${escHtml(sl.name || 'Setlist')}</span>
          <span class="lib-artist">${sl.songs?.length || 0} canciones</span>
        </li>`).join('');
    }

    // Wire library clicks
    els.libraryList.querySelectorAll('li[data-id]').forEach(li => {
      li.addEventListener('click', () => loadSongFromLibrary(li.dataset.id));
    });
    els.libraryList.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('¿Eliminar esta canción de la biblioteca?')) {
          Library.remove(btn.dataset.id);
          refreshLibraryUI();
          toast('Canción eliminada', 'info');
        }
      });
    });

    // Wire setlist clicks → show detail
    els.setlistList.querySelectorAll('li[data-setlist-id]').forEach(li => {
      li.addEventListener('click', () => showSetlistDetail(li.dataset.setlistId));
    });
  }

  function showSetlistDetail(setlistId) {
    const sl = Library.getSetlistById(setlistId);
    if (!sl) return;
    els.setlistDetailName.textContent = sl.name;
    els.setlistDetail.style.display = '';

    if (!sl.songs?.length) {
      els.setlistSongsList.innerHTML = '<div class="library-empty">Setlist vacío</div>';
    } else {
      els.setlistSongsList.innerHTML = sl.songs.map(songId => {
        const s = Library.getById(songId);
        if (!s) return '';
        return `<li data-id="${s.id}">
          <div style="flex:1;min-width:0">
            <div class="lib-title">${escHtml(s.title || 'Sin título')}</div>
            <div class="lib-artist">${escHtml(s.artist || '')}</div>
          </div>
          <button class="btn-icon btn-small" data-action="remove-from-setlist" data-song-id="${s.id}" data-setlist-id="${setlistId}" title="Quitar">✕</button>
        </li>`;
      }).join('');
    }

    els.setlistSongsList.querySelectorAll('li[data-id]').forEach(li => {
      li.addEventListener('click', () => loadSongFromLibrary(li.dataset.id));
    });
    els.setlistSongsList.querySelectorAll('[data-action="remove-from-setlist"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const sl2 = Library.getSetlistById(btn.dataset.setlistId);
        if (!sl2) return;
        sl2.songs = sl2.songs.filter(id => id !== btn.dataset.songId);
        Library.saveSetlist(sl2);
        showSetlistDetail(btn.dataset.setlistId);
        refreshLibraryUI();
      });
    });
  }

  function loadSongFromLibrary(id) {
    const song = Library.getById(id);
    if (!song) { toast('Canción no encontrada en biblioteca', 'error'); return; }
    Object.assign(state.song, song);
    els.urlInput.value = song.youtubeUrl || '';
    if (song.youtubeId) YT_Player.loadVideo(song.youtubeId);
    applySongToUI();
    showView('song');
    initSync();
    refreshLibraryUI();
    toast(`"${song.title}" cargada`, 'success');
  }

  function refreshRecent() {
    const recent = Library.getRecent();
    if (recent.length === 0) { els.recentSongs.style.display = 'none'; return; }
    els.recentSongs.style.display = '';
    els.recentList.innerHTML = recent.map(s => `
      <div class="recent-card" data-id="${s.id}">
        <div class="rc-title">${escHtml(s.title || 'Sin título')}</div>
        <div class="rc-artist">${escHtml(s.artist || '')}</div>
      </div>`).join('');
    els.recentList.querySelectorAll('.recent-card').forEach(card => {
      card.addEventListener('click', () => loadSongFromLibrary(card.dataset.id));
    });
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    // Analyze or search
    els.btnAnalyze.addEventListener('click', () => {
      const val = els.urlInput.value.trim();
      if (!val) return;
      if (isYouTubeUrl(val) || YT_Player.extractVideoId(val)) {
        analyze(val);
      } else {
        searchByTitle(val);
      }
    });
    els.urlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') els.btnAnalyze.click();
    });

    // Search modal close
    els.searchModalClose.addEventListener('click', () => { els.searchModal.style.display = 'none'; });
    $('search-modal-overlay').addEventListener('click', () => { els.searchModal.style.display = 'none'; });

    // Sidebar
    els.btnToggleSidebar.addEventListener('click', () => {
      state.ui.sidebarOpen = !state.ui.sidebarOpen;
      els.sidebar.classList.toggle('open', state.ui.sidebarOpen);
    });
    els.btnCloseSidebar.addEventListener('click', () => {
      state.ui.sidebarOpen = false;
      els.sidebar.classList.remove('open');
    });
    els.btnBackSetlist.addEventListener('click', () => {
      els.setlistDetail.style.display = 'none';
    });

    // Theme
    els.btnTheme.addEventListener('click', () => {
      const isDark = document.body.dataset.theme === 'dark';
      document.body.dataset.theme = isDark ? 'light' : 'dark';
      state.settings.theme = isDark ? 'light' : 'dark';
    });

    // Chord panel instrument tabs
    document.querySelectorAll('.cp-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cp-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setChordPanelInstrument(btn.dataset.inst);
      });
    });

    // Transpose
    els.btnTransposeDown.addEventListener('click', () => {
      state.song.transpose = ((state.song.transpose - 1 + 12) % 12) || 0;
      if (state.song.transpose > 6) state.song.transpose -= 12;
      els.transposeDisplay.textContent = state.song.transpose >= 0 ? `+${state.song.transpose}` : `${state.song.transpose}`;
      renderSheet();
      updateKeyTag();
      if (state.song.transpose !== 0) {
        toast('💡 Para cambiar el tono del video, prueba la extensión "Transpose ♭♯" en Chrome.', 'info', 5000);
      }
    });

    els.btnTransposeUp.addEventListener('click', () => {
      state.song.transpose = (state.song.transpose + 1 + 12) % 12;
      if (state.song.transpose > 6) state.song.transpose -= 12;
      els.transposeDisplay.textContent = state.song.transpose >= 0 ? `+${state.song.transpose}` : `${state.song.transpose}`;
      renderSheet();
      updateKeyTag();
      if (state.song.transpose !== 0) {
        toast('💡 Para cambiar el tono del video, prueba la extensión "Transpose ♭♯" en Chrome.', 'info', 5000);
      }
    });

    function updateKeyTag() {
      const dispKey = Chords.transposeChord(state.song.key || 'C', state.song.transpose);
      els.tagKey.textContent = `🎵 ${dispKey}`;
      if (state.ui.liveMode) els.liveKey.textContent = dispKey;
    }

    // Capo
    els.capoSelect.addEventListener('change', () => {
      state.song.capo = parseInt(els.capoSelect.value);
      if (state.song.capo > 0) {
        els.tagCapo.textContent = `🔒 Capo ${state.song.capo}`;
        els.tagCapo.style.display = '';
        const capoSuggestion = Chords.getCapoKey(state.song.key, state.song.capo);
        toast(`Capo ${state.song.capo}: suena en ${capoSuggestion}`, 'info');
      } else {
        els.tagCapo.style.display = 'none';
      }
    });

    // Notation
    els.notationSelect.addEventListener('change', () => {
      state.settings.notation = els.notationSelect.value;
      renderSheet();
    });

    // Speed
    els.speedSelect.addEventListener('change', () => {
      YT_Player.setPlaybackRate(parseFloat(els.speedSelect.value));
    });

    // Loop
    els.btnLoopStart.addEventListener('click', () => {
      state.player.loop.start = YT_Player.getCurrentTime();
      toast(`Loop inicio: ${formatTime(state.player.loop.start)}`, 'info');
      updateLoopRegion();
    });
    els.btnLoopEnd.addEventListener('click', () => {
      state.player.loop.end = YT_Player.getCurrentTime();
      toast(`Loop fin: ${formatTime(state.player.loop.end)}`, 'info');
      updateLoopRegion();
    });
    els.btnLoopToggle.addEventListener('click', () => {
      state.player.loop.active = !state.player.loop.active;
      els.btnLoopToggle.classList.toggle('active', state.player.loop.active);
      toast(state.player.loop.active ? 'Loop activo' : 'Loop desactivado', 'info');
    });

    function updateLoopRegion() {
      const { start, end } = state.player.loop;
      const dur = YT_Player.getDuration();
      if (!dur) return;
      const left  = (start / dur) * 100;
      const width = ((end - start) / dur) * 100;
      if (width > 0) {
        els.loopRegion.style.left  = `${left}%`;
        els.loopRegion.style.width = `${width}%`;
        els.loopRegion.style.display = 'block';
      }
    }

    // Metronome
    els.btnMetronome.addEventListener('click', () => {
      const bpm = parseInt(els.metronomeBpm.value) || 120;
      const isOn = Metronome.toggle({
        bpm,
        beatsPerBar: parseInt(state.song.timeSignature?.split('/')[0]) || 4,
        onBeat: (beat, isAccent) => updateMetronomeIndicator(beat, isAccent),
      });
      els.btnMetronome.classList.toggle('active', isOn);
      state.ui.metronomeOn = isOn;
      if (!isOn) clearMetronomeIndicator();
    });
    els.metronomeBpm.addEventListener('change', () => {
      const bpm = parseInt(els.metronomeBpm.value) || 120;
      Metronome.setBPM(bpm);
      state.song.bpm = bpm;
      els.tagBpm.textContent = `♩ ${bpm} BPM`;
      if (state.ui.metronomeOn) {
        Metronome.stop();
        Metronome.start({
          bpm,
          beatsPerBar: parseInt(state.song.timeSignature?.split('/')[0]) || 4,
          onBeat: (beat, isAccent) => updateMetronomeIndicator(beat, isAccent),
        });
      }
    });

    // Sync adjustment
    els.btnSyncMinus.addEventListener('click', () => {
      const off = Sync.adjustOffset(-0.5);
      toast(`Sincronía: ${off.toFixed(1)}s`, 'info');
    });
    els.btnSyncPlus.addEventListener('click', () => {
      const off = Sync.adjustOffset(0.5);
      toast(`Sincronía: ${off.toFixed(1)}s`, 'info');
    });

    // Edit mode
    els.btnEditMode.addEventListener('click', () => toggleEditMode());
    els.btnSaveEdit.addEventListener('click', saveEdit);
    els.btnCancelEdit.addEventListener('click', cancelEdit);

    // Save song
    els.btnSaveSong.addEventListener('click', () => {
      if (!state.song.title) { toast('No hay canción cargada', 'error'); return; }
      const saved = Library.save({ ...state.song });
      state.song.id = saved.id;
      refreshLibraryUI();
      toast(`"${state.song.title}" guardada en biblioteca`, 'success');
    });

    // Add to setlist
    els.btnAddSetlist.addEventListener('click', showSetlistModal);

    // Setlist modal close
    els.setlistModalClose.addEventListener('click', () => {
      els.setlistModal.style.display = 'none';
    });
    $('setlist-modal-overlay').addEventListener('click', () => {
      els.setlistModal.style.display = 'none';
    });

    // Live mode
    els.btnLiveMode.addEventListener('click', enterLiveMode);
    els.btnExitLive.addEventListener('click', exitLiveMode);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && state.ui.liveMode) exitLiveMode();
    });
    els.btnLiveFontUp.addEventListener('click', () => {
      state.settings.liveFontSize = Math.min(3, state.settings.liveFontSize + 0.2);
      applyLiveFontSize();
    });
    els.btnLiveFontDown.addEventListener('click', () => {
      state.settings.liveFontSize = Math.max(0.8, state.settings.liveFontSize - 0.2);
      applyLiveFontSize();
    });

    // Export PDF
    els.btnExportPdf.addEventListener('click', () => {
      if (!state.song.chordPro) { toast('No hay canción cargada', 'error'); return; }
      Export.toPDF({
        title: state.song.title, artist: state.song.artist,
        key: state.song.key, bpm: state.song.bpm,
        timeSignature: state.song.timeSignature, capo: state.song.capo,
        chordPro: state.song.chordPro, transpose: state.song.transpose,
        notation: state.settings.notation,
      });
    });

    // Player controls
    els.btnPlayPause.addEventListener('click', () => YT_Player.togglePlay());
    els.progressContainer.addEventListener('click', e => {
      const rect = els.progressContainer.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      YT_Player.seekTo(ratio * (YT_Player.getDuration() || 0));
    });
    els.volumeSlider.addEventListener('input', () => {
      YT_Player.setVolume(parseInt(els.volumeSlider.value));
    });

    // Chord modal close
    els.chordModalClose.addEventListener('click', () => {
      els.chordModal.style.display = 'none';
    });
    $('chord-modal-overlay').addEventListener('click', () => {
      els.chordModal.style.display = 'none';
    });

    // New setlist (from sidebar)
    $('btn-new-setlist').addEventListener('click', () => {
      const name = prompt('Nombre del nuevo setlist:');
      if (!name) return;
      Library.saveSetlist({ name, songs: [] });
      refreshLibraryUI();
      toast(`Setlist "${name}" creado`, 'success');
    });

    // Key tag click → capo suggestions
    els.tagKey.addEventListener('click', () => {
      if (!state.song.key) return;
      const suggestions = [0,1,2,3,4,5].map(capo => {
        const shapes = Chords.CHROMATIC[((Chords.noteIndex(state.song.key) - capo) + 12) % 12];
        return `Capo ${capo}: tocar en ${shapes}`;
      });
      toast(suggestions[state.song.capo] || 'Elige capo en la barra de herramientas', 'info', 4000);
    });

    // BPM tag click → tap tempo
    els.tagBpm.title = 'Click para tap tempo';
    els.tagBpm.addEventListener('click', () => {
      const detected = Metronome.tap();
      if (detected) {
        state.song.bpm = detected;
        els.tagBpm.textContent = `♩ ${detected} BPM`;
        els.metronomeBpm.value = detected;
        Metronome.setBPM(detected);
      }
    });
  }

  /* ---------- Edit Mode ---------- */
  function toggleEditMode() {
    state.ui.editMode = !state.ui.editMode;
    if (state.ui.editMode) {
      els.chordsheetTextarea.value = state.song.chordPro || '';
      els.chordsheetDisplay.style.display = 'none';
      els.chordsheetEditor.style.display  = 'flex';
      els.btnEditMode.classList.add('active');
    } else {
      els.chordsheetDisplay.style.display = '';
      els.chordsheetEditor.style.display  = 'none';
      els.btnEditMode.classList.remove('active');
    }
  }

  function saveEdit() {
    state.song.chordPro = els.chordsheetTextarea.value;
    toggleEditMode();
    renderSheet();
    const chords = Chords.extractChords(state.song.chordPro);
    if (chords.length > 0) {
      state.song.key = Chords.estimateKey(chords);
      els.tagKey.textContent = `🎵 ${state.song.key}`;
    }
    toast('Cambios guardados', 'success');
  }

  function cancelEdit() {
    state.ui.editMode = false;
    els.chordsheetDisplay.style.display = '';
    els.chordsheetEditor.style.display  = 'none';
    els.btnEditMode.classList.remove('active');
  }

  /* ---------- Metronome Indicator ---------- */
  let metronomeDots = null;

  function buildMetronomeIndicator(beatsPerBar) {
    let el = document.getElementById('metronome-indicator');
    if (!el) {
      el = document.createElement('div');
      el.id = 'metronome-indicator';
      el.className = 'metronome-indicator';
      document.body.appendChild(el);
    }
    el.innerHTML = '';
    metronomeDots = [];
    for (let i = 0; i < beatsPerBar; i++) {
      const dot = document.createElement('div');
      dot.className = 'beat-dot';
      el.appendChild(dot);
      metronomeDots.push(dot);
    }
    el.style.display = 'flex';
  }

  function updateMetronomeIndicator(beat, isAccent) {
    const beatsPerBar = parseInt(state.song.timeSignature?.split('/')[0]) || 4;
    if (!metronomeDots || metronomeDots.length !== beatsPerBar) {
      buildMetronomeIndicator(beatsPerBar);
    }
    metronomeDots.forEach((d, i) => {
      d.classList.remove('active', 'accent');
      if (i === beat) d.classList.add(isAccent ? 'accent' : 'active');
    });
  }

  function clearMetronomeIndicator() {
    const el = document.getElementById('metronome-indicator');
    if (el) el.style.display = 'none';
    metronomeDots = null;
  }

  /* ---------- YouTube Events ---------- */
  function wireYouTube() {
    YT_Player.on('onPlay', () => {
      els.iconPlay.style.display  = 'none';
      els.iconPause.style.display = '';
      // If sync has lines, start it; otherwise try building estimated sync now
      if (Sync.syncedLines.length > 0) {
        Sync.start();
      } else if (state.song.chordPro) {
        const dur = YT_Player.getDuration();
        if (dur > 5) buildEstimatedSync(dur);
        else startEstimatedSync();
      }
      startPlayerPoll();
    });
    YT_Player.on('onPause', () => {
      els.iconPlay.style.display  = '';
      els.iconPause.style.display = 'none';
      Sync.stop();
    });
    YT_Player.on('onEnded', () => {
      els.iconPlay.style.display  = '';
      els.iconPause.style.display = 'none';
      Sync.stop();
    });
  }

  /* ---------- Init ---------- */
  function init() {
    YT_Player.init(() => wireYouTube());
    bindEvents();
    refreshLibraryUI();
    refreshRecent();

    const saved = localStorage.getItem('chordsync_settings');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        Object.assign(state.settings, s);
        if (s.theme) document.body.dataset.theme = s.theme;
        if (s.notation) els.notationSelect.value = s.notation;
        // Restore instrument tab
        if (s.instrument) {
          document.querySelectorAll('.cp-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.inst === s.instrument);
          });
          setChordPanelInstrument(s.instrument);
        }
      } catch {}
    }

    window.addEventListener('beforeunload', () => {
      localStorage.setItem('chordsync_settings', JSON.stringify(state.settings));
    });

    const urlParams = new URLSearchParams(window.location.search);
    const urlParam  = urlParams.get('url') || urlParams.get('v');
    if (urlParam) {
      els.urlInput.value = urlParam.includes('youtube') ? urlParam : `https://www.youtube.com/watch?v=${urlParam}`;
      setTimeout(() => analyze(els.urlInput.value), 500);
    }

    console.log('🎸 ChordSync initialized');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { toast, showView, state, renderSheet, analyze, formatTime };
})();
