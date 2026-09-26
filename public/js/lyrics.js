/* ============================================================
   ChordSync - Lyrics + Chords Service (multi-source)
   ============================================================ */

window.Lyrics = (() => {

  /* ---- LRC Parser ---- */
  function parseLRC(lrc) {
    if (!lrc) return [];
    const lines  = lrc.split('\n');
    const result = [];
    const re     = /\[(\d{2}):(\d{2})\.(\d{1,3})\]/g;

    for (const line of lines) {
      const text = line.replace(/\[[^\]]*\]/g, '').trim();
      const times = [];
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        times.push(+m[1] * 60 + +m[2] + parseInt(m[3].padEnd(3,'0')) / 1000);
      }
      if (times.length && text) times.forEach(t => result.push({ time: t, text }));
    }
    return result.sort((a, b) => a.time - b.time);
  }

  /* ---- Parse YouTube title → artist / song ---- */
  function parseVideoTitle(title) {
    if (!title) return { artist: '', song: '' };

    // Strip common suffixes first
    const clean = title
      .replace(/\s*[\(\[](?:Official|Lyric|Video|Audio|Music|HD|HQ|4K|Live|ft\.?|feat\.?)[^\)\]]*[\)\]]/gi, '')
      .replace(/\s*[\(\[].*?[\)\]]/g, '')   // remaining brackets
      .trim();

    const patterns = [
      /^(.+?)\s*[-–—]\s*(.+)$/,   // Artist - Song  (most common)
      /^(.+?)\s*:\s*(.+)$/,       // Artist: Song
      /^(.+?)\s+by\s+(.+)$/i,     // Song by Artist
    ];

    for (const p of patterns) {
      const m = clean.match(p);
      if (m) {
        if (p === patterns[2]) return { artist: m[2].trim(), song: m[1].trim() };
        return { artist: m[1].trim(), song: m[2].trim() };
      }
    }
    return { artist: '', song: clean };
  }

  /* ---- Main fetch: tries everything ---- */
  async function fetchAll(artist, title, onProgress) {
    const results = { synced: null, chordPro: null, source: { lyrics: '', chords: '' } };

    // Run lyrics and chords in parallel
    const params = new URLSearchParams();
    if (artist) params.set('artist', artist);
    params.set('title', title);

    onProgress?.('Buscando letra y acordes en todas las fuentes…');

    const [lyricsRes, chordsRes] = await Promise.allSettled([
      fetch(`/api/lyrics/multi?${params}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/chords/search?${params}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const lyrics = lyricsRes.status === 'fulfilled' ? lyricsRes.value : null;
    const chords = chordsRes.status === 'fulfilled' ? chordsRes.value : null;

    // ── Case 1: Got chord sheet (has inline chords + lyrics) ──────────────
    if (chords?.chordPro) {
      onProgress?.(`Acordes encontrados en ${chords.source} ✓`);
      results.chordPro = cleanChordPro(chords.chordPro);
      results.source.chords = chords.source;
      results.chordsUrl = chords.url;

      // Try to get synced timestamps for karaoke even if we have chords
      if (lyrics?.type === 'synced') {
        results.synced = parseLRC(lyrics.text);
        results.source.lyrics = lyrics.source + ' (sync)';
        onProgress?.(`Letra sincronizada encontrada (${lyrics.source}) ✓`);
      } else if (lyrics) {
        results.source.lyrics = lyrics.source;
        onProgress?.(`Letra de ${lyrics.source} ✓`);
      }
      return results;
    }

    // ── Case 2: Got synced lyrics, no chords ──────────────────────────────
    if (lyrics?.type === 'synced') {
      onProgress?.(`Letra sincronizada encontrada (${lyrics.source}) ✓`);
      results.synced = parseLRC(lyrics.text);
      results.source.lyrics = lyrics.source + ' (sync)';
      const plain = results.synced.map(l => l.text).join('\n');
      results.chordPro = plainToChordPro(plain);
      return results;
    }

    // ── Case 3: Got plain lyrics only ─────────────────────────────────────
    if (lyrics?.type === 'plain') {
      onProgress?.(`Letra encontrada (${lyrics.source}) ✓`);
      results.source.lyrics = lyrics.source;
      results.chordPro = plainToChordPro(cleanText(lyrics.text));
      return results;
    }

    // ── Case 4: Nothing found ─────────────────────────────────────────────
    onProgress?.('No se encontró letra automáticamente');
    return results;
  }

  /* ---- Convert plain text to ChordPro (no chords yet) ---- */
  function plainToChordPro(plain) {
    if (!plain) return '';
    return plain.split('\n').map(line => {
      const t = line.trim();
      // Detect section markers between square brackets
      const secMatch = t.match(/^\[([^\]]+)\]$/);
      if (secMatch) return secMatch[1].toUpperCase();
      return t;
    }).join('\n');
  }

  function cleanText(text) {
    return (text || '')
      .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n').trim();
  }

  function cleanChordPro(text) {
    return (text || '')
      .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n').trim();
  }

  return { parseLRC, parseVideoTitle, fetchAll, plainToChordPro, cleanText };
})();
