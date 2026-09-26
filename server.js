const express = require('express');
const axios   = require('axios');
const cheerio = require('cheerio');
const path    = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// ── HTTP client ──────────────────────────────────────────────────────────────
const http = axios.create({
  timeout: 14000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
  },
});

// Simple in-memory TTL cache
const cache = new Map();
function cached(key, fn, ttl = 120000) {
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  return fn().then(v => { cache.set(key, v); setTimeout(() => cache.delete(key), ttl); return v; });
}

// ── UG FORMAT PARSER ─────────────────────────────────────────────────────────
// Converts Ultimate Guitar's [ch]chord[/ch] + [tab] format to inline [Chord]lyric

function isChordLine(line) {
  const t = line.trim();
  if (!t || t.length < 2) return false;
  // Rendered chord line: mostly chord names and whitespace
  const chordRe = /[A-G][#b]?(?:maj|min|aug|dim|sus|add|m)?[0-9]{0,2}(?:\/[A-G][#b]?)?/g;
  const chords  = (t.match(chordRe) || []);
  if (!chords.length) return false;
  const nonSpace = t.replace(/\s/g, '').length;
  return chords.join('').length / nonSpace > 0.55;
}

function mergeAboveLyric(chordLine, lyricLine) {
  const re  = /[A-G][#b]?(?:maj|min|aug|dim|sus|add|m)?[0-9]{0,2}(?:\/[A-G][#b]?)?/g;
  const pos = [];
  let m;
  while ((m = re.exec(chordLine)) !== null) pos.push({ chord: m[0], col: m.index });
  if (!pos.length) return lyricLine;

  const lyricLen = lyricLine.length;
  const inline   = pos.filter(p => p.col < lyricLen);
  const overflow = pos.filter(p => p.col >= lyricLen);

  // Insert inline chords right-to-left (safe: each insertion only shifts chars to the right)
  let result = lyricLine;
  for (let i = inline.length - 1; i >= 0; i--) {
    const at = inline[i].col;
    result = result.slice(0, at) + `[${inline[i].chord}]` + result.slice(at);
  }

  // Append overflow chords in order at the end
  for (const p of overflow) result += `[${p.chord}]`;

  return result;
}

function parseUGFormat(raw) {
  // 1. Normalize line endings, remove [tab] / [/tab] wrappers
  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
               .replace(/\[tab\]/g, '').replace(/\[\/tab\]/g, '');

  // 2. Convert [ch]chord[/ch] → render to plain chord name
  //    but keep position in line so we can run mergeAboveLyric
  const lines  = text.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Line contains [ch] tags → chord line
    if (line.includes('[ch]')) {
      // Render: strip [ch] and [/ch] to get plain chord names with spacing
      const rendered = line.replace(/\[ch\]([^\[]+)\[\/ch\]/g, '$1');

      // If next line exists and is NOT a chord line and NOT empty → merge
      const next = lines[i + 1];
      if (next !== undefined && next.trim() && !next.includes('[ch]')) {
        result.push(mergeAboveLyric(rendered, next));
        i++; // consumed the lyric line
      } else {
        // Chord-only line: emit as chord-only
        result.push(rendered);
      }
      continue;
    }

    // Section marker: [Verse 1], [Chorus], etc. (but not [ch] which was handled above)
    const secM = line.trim().match(/^\[([^\]]+)\]$/);
    if (secM) {
      result.push(secM[1]);
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

// ── UG SCRAPER ───────────────────────────────────────────────────────────────
async function ultimateGuitar(artist, title) {
  const queries = [
    `${artist} ${title}`,
    title,
    `${title} ${artist}`,
  ];

  for (const q of queries.filter(Boolean)) {
    try {
      const sr   = await http.get(`https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}`);
      const $    = cheerio.load(sr.data);
      const rawAttr = $('[class*="js-store"]').attr('data-content') || '';
      if (!rawAttr) continue;

      const json = JSON.parse(rawAttr.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
      const results = json?.store?.page?.data?.results || [];

      // Find first Chords result
      const chords = results.find(r => r.type === 'Chords' && r.tab_url);
      if (!chords) continue;

      // Fetch the chord tab page
      const tabPage = await http.get(chords.tab_url);
      const $t      = cheerio.load(tabPage.data);
      const rawTab  = $t('[class*="js-store"]').attr('data-content') || '';
      if (!rawTab) continue;

      const tabJson = JSON.parse(rawTab.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
      const content = tabJson?.store?.page?.data?.tab_view?.wiki_tab?.content || '';
      if (!content || content.length < 80) continue;

      const chordPro = parseUGFormat(content);
      return {
        chordPro: chordPro.trim(),
        url:      chords.tab_url,
        source:   'Ultimate Guitar',
        artist:   chords.artist_name || artist,
        song:     chords.song_name   || title,
        rating:   chords.rating,
        votes:    chords.votes,
      };
    } catch (e) {
      console.error('[UG]', e.message);
    }
  }
  return null;
}

// ── AZLYRICS SCRAPER ─────────────────────────────────────────────────────────
// Construct URL from artist/title: "The Beatles" "Let It Be" → /lyrics/beatles/letitbe.html
function toAZSlug(s) {
  return s.toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]/g, '');
}

async function azLyrics(artist, title) {
  const queries = [
    { a: toAZSlug(artist), t: toAZSlug(title) },
    // Also try search page
  ];

  // Try direct URL first
  for (const { a, t } of queries.filter(q => q.a && q.t)) {
    try {
      const url  = `https://www.azlyrics.com/lyrics/${a}/${t}.html`;
      const page = await http.get(url, { headers: { 'Referer': 'https://www.azlyrics.com/' } });
      const $    = cheerio.load(page.data);

      // Lyrics are in the div after the "Sorry about that" comment
      const allDivs = $('div.col-xs-12 > div');
      let lyrics = '';
      allDivs.each((_, el) => {
        const html = $(el).html() || '';
        if (html.includes('Sorry about that')) {
          lyrics = html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        }
      });
      if (lyrics.length > 80) return { type: 'plain', text: lyrics, source: 'AZLyrics', url };
    } catch {}
  }

  // Try search page
  try {
    const sr = await http.get(
      `https://search.azlyrics.com/search.php?q=${encodeURIComponent(`${artist} ${title}`)}&w=songs`,
      { headers: { 'Referer': 'https://www.azlyrics.com/' } }
    );
    const $ = cheerio.load(sr.data);
    const href = $('table.table a').filter((_, el) => $(el).attr('href')?.includes('azlyrics.com/lyrics/')).first().attr('href');
    if (!href) return null;

    const page = await http.get(href, { headers: { 'Referer': 'https://www.azlyrics.com/' } });
    const $p   = cheerio.load(page.data);
    const allDivs = $p('div.col-xs-12 > div');
    let lyrics = '';
    allDivs.each((_, el) => {
      const html = $p(el).html() || '';
      if (html.includes('Sorry about that')) {
        lyrics = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
      }
    });
    if (lyrics.length > 80) return { type: 'plain', text: lyrics, source: 'AZLyrics', url: href };
  } catch {}

  return null;
}

// ── LRCLIB ────────────────────────────────────────────────────────────────────
async function lrcLibDirect(artist, title) {
  const r = await http.get('https://lrclib.net/api/get', { params: { artist_name: artist, track_name: title } });
  if (r.data?.syncedLyrics) return { type: 'synced', text: r.data.syncedLyrics, source: 'LRCLib' };
  if (r.data?.plainLyrics)  return { type: 'plain',  text: r.data.plainLyrics,  source: 'LRCLib' };
  return null;
}

async function lrcLibSearch(artist, title) {
  const queries = [
    { track_name: title, artist_name: artist },
    { q: `${artist} ${title}` },
    { q: title },
  ];
  for (const params of queries) {
    try {
      const r = await http.get('https://lrclib.net/api/search', { params });
      const items = Array.isArray(r.data) ? r.data : [];
      for (const item of items.slice(0, 4)) {
        if (item.syncedLyrics) return { type: 'synced', text: item.syncedLyrics, source: 'LRCLib' };
        if (item.plainLyrics)  return { type: 'plain',  text: item.plainLyrics,  source: 'LRCLib' };
      }
    } catch {}
  }
  return null;
}

async function lyricsOvh(artist, title) {
  try {
    const r = await http.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    return r.data?.lyrics ? { type: 'plain', text: r.data.lyrics, source: 'Lyrics.ovh' } : null;
  } catch { return null; }
}

// ── ENDPOINTS ─────────────────────────────────────────────────────────────────

// Multi-source lyrics
app.get('/api/lyrics/multi', async (req, res) => {
  const { artist = '', title = '' } = req.query;
  if (!title) return res.status(400).json({ error: 'title required' });

  try {
    const result = await cached(`lyrics:${artist}:${title}`, async () => {
      const [r1, r2, r3, r4] = await Promise.allSettled([
        lrcLibDirect(artist, title).catch(() => null),
        lrcLibSearch(artist, title).catch(() => null),
        lyricsOvh(artist, title).catch(() => null),
        azLyrics(artist, title).catch(() => null),
      ]);
      const all = [r1, r2, r3, r4]
        .map(r => r.status === 'fulfilled' ? r.value : null)
        .filter(Boolean);

      const synced = all.find(r => r.type === 'synced');
      if (synced) return synced;
      return all.filter(r => r.type === 'plain').sort((a, b) => b.text.length - a.text.length)[0] || null;
    });

    if (result) return res.json(result);
    res.status(404).json({ error: 'not found', tried: ['LRCLib', 'Lyrics.ovh', 'AZLyrics'] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── EXTRA CHORD SCRAPERS ──────────────────────────────────────────────────────

function isChordLine2(line) {
  const t = line.trim();
  if (!t) return false;
  const chordRe = /[A-G][#b]?(?:maj|min|aug|dim|sus|add|m)?[0-9]{0,2}(?:\/[A-G][#b]?)?/g;
  const chords = (t.match(chordRe) || []);
  if (!chords.length) return false;
  const nonSpace = t.replace(/\s/g, '').length;
  return chords.join('').length / nonSpace > 0.55;
}

function convertPlainTabToChordPro(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isChordLine2(line)) {
      const next = lines[i + 1];
      if (next !== undefined && next.trim() && !isChordLine2(next)) {
        result.push(mergeAboveLyric(line, next));
        i++;
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }
  return result.join('\n');
}

async function eChords(artist, title) {
  try {
    const q  = `${artist} ${title}`.replace(/\s+/g, '+');
    const sr = await http.get(`https://www.e-chords.com/search-all/${encodeURIComponent(q)}`);
    const $  = cheerio.load(sr.data);
    const href = $('ul#results li a').first().attr('href') || $('h1 a, .result a').first().attr('href');
    if (!href) return null;
    const page = await http.get(href.startsWith('http') ? href : `https://www.e-chords.com${href}`);
    const $p = cheerio.load(page.data);
    const pre = $p('pre#core').text() || $p('pre').first().text();
    if (!pre || pre.length < 60) return null;
    return { chordPro: convertPlainTabToChordPro(pre), url: href, source: 'E-Chords', artist, song: $p('h1').first().text().trim() || title };
  } catch { return null; }
}

async function cifraClub(artist, title) {
  try {
    const q  = `${artist} ${title}`;
    const sr = await http.get(`https://www.cifraclub.com.br/busca/?q=${encodeURIComponent(q)}&type=song`, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } });
    const $  = cheerio.load(sr.data);
    const href = $('a.art_img, ul.art-list a, .busca-item a').first().attr('href');
    if (!href) return null;
    const url  = href.startsWith('http') ? href : `https://www.cifraclub.com.br${href}`;
    const page = await http.get(url, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } });
    const $p   = cheerio.load(page.data);
    const pre  = $p('pre').first().text() || $p('.cifra pre').text();
    if (!pre || pre.length < 60) return null;
    return { chordPro: convertPlainTabToChordPro(pre), url, source: 'CifraClub', artist, song: $p('h1').first().text().trim() || title };
  } catch { return null; }
}

async function chordie(artist, title) {
  try {
    const q  = `${artist} ${title}`;
    const sr = await http.get(`https://www.chordie.com/find.pe?searchwords=${encodeURIComponent(q)}&type=song`);
    const $  = cheerio.load(sr.data);
    const href = $('a[href*="/chord.pe"]').first().attr('href');
    if (!href) return null;
    const url  = href.startsWith('http') ? href : `https://www.chordie.com${href}`;
    const page = await http.get(url);
    const $p   = cheerio.load(page.data);
    const pre  = $p('pre').first().text();
    if (!pre || pre.length < 60) return null;
    return { chordPro: convertPlainTabToChordPro(pre), url, source: 'Chordie', artist, song: $p('h1, h2').first().text().trim() || title };
  } catch { return null; }
}

async function searchChords(artist, title) {
  const [r1, r2, r3, r4] = await Promise.allSettled([
    ultimateGuitar(artist, title).catch(() => null),
    eChords(artist, title).catch(() => null),
    cifraClub(artist, title).catch(() => null),
    chordie(artist, title).catch(() => null),
  ]);
  const results = [r1, r2, r3, r4].map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
  if (!results.length) return null;
  return results.sort((a, b) => (b.chordPro?.length || 0) - (a.chordPro?.length || 0))[0];
}

// Multi-source chords (UG + E-Chords + CifraClub + Chordie in parallel)
app.get('/api/chords/search', async (req, res) => {
  const { artist = '', title = '' } = req.query;
  if (!title) return res.status(400).json({ error: 'title required' });

  try {
    const result = await cached(`chords:${artist}:${title}`, () => searchChords(artist, title));
    if (result) return res.json(result);
    res.status(404).json({ error: 'not found', tried: ['Ultimate Guitar', 'E-Chords', 'CifraClub', 'Chordie'] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Legacy endpoints
app.get('/api/lyrics/search', async (req, res) => {
  try {
    const r = await http.get('https://lrclib.net/api/search', { params: req.query });
    res.json(r.data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/lyrics/synced', async (req, res) => {
  try {
    const r = await http.get('https://lrclib.net/api/get', { params: req.query });
    res.json(r.data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/lyrics/plain', async (req, res) => {
  try {
    const { artist, title } = req.query;
    const r = await http.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    res.json(r.data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// UG search: returns multiple results for a query
app.get('/api/chords/results', async (req, res) => {
  const { q = '' } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    const sr      = await http.get(`https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}`);
    const $       = cheerio.load(sr.data);
    const rawAttr = $('[class*="js-store"]').attr('data-content') || '';
    if (!rawAttr) return res.json([]);
    const json    = JSON.parse(rawAttr.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    const results = (json?.store?.page?.data?.results || [])
      .filter(r => (r.type === 'Chords' || r.type === 'Tab') && r.tab_url)
      .slice(0, 8)
      .map(r => ({ title: r.song_name||'', artist: r.artist_name||'', type: r.type, rating: r.rating, votes: r.votes, url: r.tab_url }));
    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// UG fetch: fetch one specific tab by URL
app.get('/api/chords/fetch', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const tabPage = await http.get(url);
    const $t      = cheerio.load(tabPage.data);
    const rawTab  = $t('[class*="js-store"]').attr('data-content') || '';
    if (!rawTab) return res.status(404).json({ error: 'not found' });
    const tabJson = JSON.parse(rawTab.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    const content = tabJson?.store?.page?.data?.tab_view?.wiki_tab?.content || '';
    const meta    = tabJson?.store?.page?.data?.tab || {};
    if (!content || content.length < 40) return res.status(404).json({ error: 'empty' });
    res.json({ chordPro: parseUGFormat(content).trim(), url, source: 'Ultimate Guitar', artist: meta.artist_name||'', song: meta.song_name||'' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/video-info', async (req, res) => {
  try {
    const r = await http.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(req.query.url)}&format=json`);
    res.json(r.data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n🎸 ChordSync → http://localhost:${PORT}\n`));
