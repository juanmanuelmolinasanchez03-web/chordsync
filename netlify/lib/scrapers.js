const axios   = require('axios');
const cheerio = require('cheerio');

const http = axios.create({
  timeout: 14000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
  },
});

// ── UG FORMAT PARSER ─────────────────────────────────────────────────────────

function isChordLine(line) {
  const t = line.trim();
  if (!t || t.length < 2) return false;
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

  let result = lyricLine;
  for (let i = inline.length - 1; i >= 0; i--) {
    const at = inline[i].col;
    result = result.slice(0, at) + `[${inline[i].chord}]` + result.slice(at);
  }
  for (const p of overflow) result += `[${p.chord}]`;
  return result;
}

function parseUGFormat(raw) {
  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
               .replace(/\[tab\]/g, '').replace(/\[\/tab\]/g, '');

  const lines  = text.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('[ch]')) {
      const rendered = line.replace(/\[ch\]([^\[]+)\[\/ch\]/g, '$1');
      const next = lines[i + 1];
      if (next !== undefined && next.trim() && !next.includes('[ch]')) {
        result.push(mergeAboveLyric(rendered, next));
        i++;
      } else {
        result.push(rendered);
      }
      continue;
    }

    const secM = line.trim().match(/^\[([^\]]+)\]$/);
    if (secM) { result.push(secM[1]); continue; }

    result.push(line);
  }

  return result.join('\n');
}

// ── ULTIMATE GUITAR ───────────────────────────────────────────────────────────
async function ultimateGuitar(artist, title) {
  const queries = [`${artist} ${title}`, title, `${title} ${artist}`];

  for (const q of queries.filter(Boolean)) {
    try {
      const sr  = await http.get(`https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}`);
      const $   = cheerio.load(sr.data);
      const raw = $('[class*="js-store"]').attr('data-content') || '';
      if (!raw) continue;

      const json    = JSON.parse(raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
      const results = json?.store?.page?.data?.results || [];
      const chords  = results.find(r => r.type === 'Chords' && r.tab_url);
      if (!chords) continue;

      const tabPage = await http.get(chords.tab_url);
      const $t      = cheerio.load(tabPage.data);
      const rawTab  = $t('[class*="js-store"]').attr('data-content') || '';
      if (!rawTab) continue;

      const tabJson  = JSON.parse(rawTab.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
      const content  = tabJson?.store?.page?.data?.tab_view?.wiki_tab?.content || '';
      if (!content || content.length < 80) continue;

      return {
        chordPro: parseUGFormat(content).trim(),
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

// ── AZLYRICS ──────────────────────────────────────────────────────────────────
function toAZSlug(s) {
  return s.toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]/g, '');
}

async function azLyrics(artist, title) {
  const a = toAZSlug(artist), t = toAZSlug(title);
  if (a && t) {
    try {
      const url  = `https://www.azlyrics.com/lyrics/${a}/${t}.html`;
      const page = await http.get(url, { headers: { 'Referer': 'https://www.azlyrics.com/' } });
      const $    = cheerio.load(page.data);
      let lyrics = '';
      $('div.col-xs-12 > div').each((_, el) => {
        const html = $(el).html() || '';
        if (html.includes('Sorry about that')) {
          lyrics = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
        }
      });
      if (lyrics.length > 80) return { type: 'plain', text: lyrics, source: 'AZLyrics', url };
    } catch {}
  }

  try {
    const sr   = await http.get(`https://search.azlyrics.com/search.php?q=${encodeURIComponent(`${artist} ${title}`)}&w=songs`, { headers: { 'Referer': 'https://www.azlyrics.com/' } });
    const $    = cheerio.load(sr.data);
    const href = $('table.table a').filter((_, el) => $(el).attr('href')?.includes('azlyrics.com/lyrics/')).first().attr('href');
    if (!href) return null;

    const page = await http.get(href, { headers: { 'Referer': 'https://www.azlyrics.com/' } });
    const $p   = cheerio.load(page.data);
    let lyrics = '';
    $p('div.col-xs-12 > div').each((_, el) => {
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
      const r     = await http.get('https://lrclib.net/api/search', { params });
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

// ── MULTI-SOURCE LYRICS ───────────────────────────────────────────────────────
async function fetchLyricsMulti(artist, title) {
  const [r1, r2, r3, r4] = await Promise.allSettled([
    lrcLibDirect(artist, title).catch(() => null),
    lrcLibSearch(artist, title).catch(() => null),
    lyricsOvh(artist, title).catch(() => null),
    azLyrics(artist, title).catch(() => null),
  ]);
  const all = [r1, r2, r3, r4].map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
  const synced = all.find(r => r.type === 'synced');
  if (synced) return synced;
  return all.filter(r => r.type === 'plain').sort((a, b) => b.text.length - a.text.length)[0] || null;
}

// ── UG SEARCH (multiple results) ─────────────────────────────────────────────
async function ugSearch(query) {
  try {
    const sr      = await http.get(`https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(query)}`);
    const $       = cheerio.load(sr.data);
    const rawAttr = $('[class*="js-store"]').attr('data-content') || '';
    if (!rawAttr) return [];

    const json    = JSON.parse(rawAttr.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    const results = json?.store?.page?.data?.results || [];

    return results
      .filter(r => (r.type === 'Chords' || r.type === 'Tab') && r.tab_url)
      .slice(0, 8)
      .map(r => ({
        title:   r.song_name  || '',
        artist:  r.artist_name || '',
        type:    r.type,
        rating:  r.rating,
        votes:   r.votes,
        url:     r.tab_url,
      }));
  } catch (e) {
    console.error('[UG search]', e.message);
    return [];
  }
}

// ── UG FETCH ONE TAB ─────────────────────────────────────────────────────────
async function ugFetch(tabUrl) {
  try {
    const tabPage = await http.get(tabUrl);
    const $t      = cheerio.load(tabPage.data);
    const rawTab  = $t('[class*="js-store"]').attr('data-content') || '';
    if (!rawTab) return null;

    const tabJson = JSON.parse(rawTab.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    const content = tabJson?.store?.page?.data?.tab_view?.wiki_tab?.content || '';
    const meta    = tabJson?.store?.page?.data?.tab || {};
    if (!content || content.length < 40) return null;

    return {
      chordPro: parseUGFormat(content).trim(),
      url:      tabUrl,
      source:   'Ultimate Guitar',
      artist:   meta.artist_name || '',
      song:     meta.song_name   || '',
      rating:   meta.rating,
      votes:    meta.votes,
    };
  } catch (e) {
    console.error('[UG fetch]', e.message);
    return null;
  }
}

module.exports = { http, ultimateGuitar, ugSearch, ugFetch, fetchLyricsMulti, lrcLibDirect, lrcLibSearch, lyricsOvh };
