/* ============================================================
   ChordSync - ChordPro Parser + HTML Renderer
   ============================================================ */

window.Editor = (() => {

  /* ---------- Parser ---------- */
  // Parses text with inline [Chord] markers into structured lines
  // Format:
  //   VERSO 1          → section header
  //   [G]Imagine [Am]no heaven  → chord+lyric line
  //   [G] [Am] [F]     → chord-only line
  //   (empty)          → blank separator

  function parse(text) {
    const lines = text.split('\n');
    const result = [];

    for (let raw of lines) {
      const line = raw.trimEnd();

      // Section header: all-caps or known patterns, no chord markers, short
      if (isSectionHeader(line)) {
        result.push({ type: 'section', text: line.trim() });
        continue;
      }

      // Blank line
      if (!line.trim()) {
        result.push({ type: 'blank' });
        continue;
      }

      // Tab line: starts with e|, E|, A|, D|, G|, B|
      if (/^[eEADGBh]\|/.test(line.trim())) {
        result.push({ type: 'tab', text: line });
        continue;
      }

      // Has chord markers?
      if (line.includes('[')) {
        result.push({ type: 'lyric', ...parseLyricLine(line) });
      } else if (isPlainChordLine(line)) {
        // Plain chord-only line (e.g. "Am  G  F  C" from intro sections)
        const re = /[A-G][#b]?(?:maj|min|aug|dim|sus|add|m)?[0-9]{0,2}(?:\/[A-G][#b]?)?/g;
        const pairs = [];
        let m;
        while ((m = re.exec(line)) !== null) pairs.push({ chord: m[0], lyric: '' });
        result.push({ type: 'lyric', pairs, chordOnly: true });
      } else {
        // Plain lyric (no chords)
        result.push({ type: 'lyric', pairs: [{ chord: '', lyric: line }] });
      }
    }

    return result;
  }

  function isSectionHeader(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.includes('[')) return false;
    const PATTERNS = [
      /^(intro|verso|coro|puente|estrofa|pre.?coro|outro|bridge|chorus|verse|pre.?chorus|interlude|solo|bridge|final|fin|coda|hook|refr[aá]n|parte)\s*\d*$/i,
      /^\[?(intro|verse|chorus|bridge|pre.?chorus|outro|solo|interlude|coda|hook|verse \d|chorus \d)\]?$/i,
    ];
    if (PATTERNS.some(p => p.test(trimmed))) return true;
    // Short, uppercase or Title Case, no lowercase words except small ones
    if (trimmed.length < 40 && /^[A-ZÁÉÍÓÚ\s\d\-\/]+$/.test(trimmed)) return true;
    return false;
  }

  function isPlainChordLine(line) {
    const t = line.trim();
    if (!t || t.length < 2) return false;
    const chordRe = /[A-G][#b]?(?:maj|min|aug|dim|sus|add|m)?[0-9]{0,2}(?:\/[A-G][#b]?)?/g;
    const chords  = (t.match(chordRe) || []);
    if (!chords.length) return false;
    const nonSpace = t.replace(/\s/g, '').length;
    return chords.join('').length / nonSpace > 0.6;
  }

  function parseLyricLine(line) {
    const pairs = [];
    const regex = /\[([^\]]+)\]([^[]*)/g;
    let match;
    let lastIndex = 0;
    let firstChordPos = line.indexOf('[');

    // Text before first chord
    if (firstChordPos > 0) {
      pairs.push({ chord: '', lyric: line.slice(0, firstChordPos) });
    }

    while ((match = regex.exec(line)) !== null) {
      pairs.push({ chord: match[1].trim(), lyric: match[2] });
      lastIndex = regex.lastIndex;
    }

    // Remaining text
    if (lastIndex < line.length && lastIndex > 0) {
      const remaining = line.slice(lastIndex);
      if (remaining && pairs.length > 0) {
        pairs[pairs.length - 1].lyric += remaining;
      }
    }

    // Detect chord-only lines (no meaningful lyric content)
    const hasLyrics = pairs.some(p => p.lyric.trim().length > 0);

    return { pairs, chordOnly: !hasLyrics };
  }

  /* ---------- Renderer ---------- */
  function render(text, options = {}) {
    const { transpose = 0, notation = 'american', keyRoot = 'C' } = options;
    const parsed = parse(text);
    const fragments = [];
    let lineIndex = 0;

    for (const node of parsed) {
      if (node.type === 'section') {
        fragments.push(`<div class="cs-section">${escHtml(node.text)}</div>`);
      } else if (node.type === 'blank') {
        fragments.push('<div class="cs-blank"></div>');
      } else if (node.type === 'tab') {
        fragments.push(`<div class="cs-tab">${escHtml(node.text)}</div>`);
      } else if (node.type === 'lyric') {
        const dataLine = `data-line="${lineIndex}"`;
        lineIndex++;

        if (node.chordOnly) {
          // Render as chord-only row
          let chordHtml = '<div class="cs-chord-only">';
          for (const p of node.pairs) {
            if (p.chord) {
              const displayed = transformChord(p.chord, transpose, notation, keyRoot);
              const raw = transpose !== 0 ? Chords.transposeChord(p.chord, transpose) : p.chord;
              chordHtml += `<span class="cs-chord" data-chord="${escAttr(raw)}" title="${escAttr(raw)}">${escHtml(displayed)}</span>`;
            }
          }
          chordHtml += '</div>';
          fragments.push(`<div class="cs-line-group" ${dataLine}>${chordHtml}</div>`);
        } else {
          // Chord + lyric pairs
          let lineHtml = '<div class="cs-line">';
          for (const p of node.pairs) {
            const raw = transpose !== 0 && p.chord ? Chords.transposeChord(p.chord, transpose) : p.chord;
            const displayed = p.chord ? transformChord(p.chord, transpose, notation, keyRoot) : '';
            const chordSpan = p.chord
              ? `<span class="cs-chord" data-chord="${escAttr(raw)}" title="${escAttr(raw)}">${escHtml(displayed)}</span>`
              : `<span class="cs-chord" style="visibility:hidden">x</span>`;
            lineHtml += `<span class="cs-pair">${chordSpan}<span class="cs-lyric">${escHtml(p.lyric || '')}</span></span>`;
          }
          lineHtml += '</div>';
          fragments.push(`<div class="cs-line-group" ${dataLine}>${lineHtml}</div>`);
        }
      }
    }

    return fragments.join('\n');
  }

  function transformChord(chord, transpose, notation, keyRoot) {
    let c = chord;
    if (transpose !== 0) c = Chords.transposeChord(c, transpose);
    return Chords.displayChord(c, notation, keyRoot);
  }

  // Get text lines (lyric lines) for sync indexing
  function getLyricLines(text) {
    const parsed = parse(text);
    return parsed
      .filter(n => n.type === 'lyric')
      .map(n => n.pairs.map(p => p.lyric).join('').trim());
  }

  // Guess song structure labels from section headers
  function extractStructure(text) {
    const parsed = parse(text);
    const sections = [];
    let lineCount = 0;
    for (const node of parsed) {
      if (node.type === 'section') {
        sections.push({ label: node.text, lineIndex: lineCount });
      } else if (node.type === 'lyric') {
        lineCount++;
      }
    }
    return sections;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  function escAttr(s) {
    return String(s)
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  return { parse, render, getLyricLines, extractStructure };
})();
