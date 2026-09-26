/* ============================================================
   ChordSync - Chord Data, Transposition, Notation
   ============================================================ */

window.Chords = (() => {

  const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FLAT_MAP  = { 'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#','Cb':'B','Fb':'E' };

  const LATIN = ['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];
  const NASHVILLE_MAJOR = ['1','b2','2','b3','3','4','#4','5','b6','6','b7','7'];

  // Guitar chord voicings: strings = [E2,A2,D3,G3,B3,e4], -1=muted, 0=open, n=fret
  const GUITAR = {
    'C':     { s:[-1,3,2,0,1,0], f:[0,3,2,0,1,0] },
    'C#':    { s:[-1,4,3,1,2,1], f:[0,4,3,1,2,1], b:1 },
    'D':     { s:[-1,-1,0,2,3,2], f:[0,0,0,1,3,2] },
    'D#':    { s:[-1,-1,1,3,4,3], f:[0,0,1,2,4,3] },
    'E':     { s:[0,2,2,1,0,0], f:[0,2,3,1,0,0] },
    'F':     { s:[1,3,3,2,1,1], f:[1,3,4,2,1,1], b:1 },
    'F#':    { s:[2,4,4,3,2,2], f:[1,3,4,2,1,1], b:2 },
    'G':     { s:[3,2,0,0,0,3], f:[2,1,0,0,0,3] },
    'G#':    { s:[4,3,1,1,1,4], f:[4,3,1,1,1,4], b:1 },
    'A':     { s:[-1,0,2,2,2,0], f:[0,0,1,2,3,0] },
    'A#':    { s:[-1,1,3,3,3,1], f:[0,1,2,3,4,1], b:1 },
    'B':     { s:[-1,2,4,4,4,2], f:[0,1,3,4,4,1], b:2 },
    'Cm':    { s:[-1,3,5,5,4,3], f:[0,1,3,4,2,1], b:3 },
    'C#m':   { s:[-1,4,6,6,5,4], f:[0,1,3,4,2,1], b:4 },
    'Dm':    { s:[-1,-1,0,2,3,1], f:[0,0,0,2,3,1] },
    'D#m':   { s:[-1,-1,1,3,4,2], f:[0,0,1,3,4,2] },
    'Em':    { s:[0,2,2,0,0,0], f:[0,2,3,0,0,0] },
    'Fm':    { s:[1,3,3,1,1,1], f:[1,3,4,1,1,1], b:1 },
    'F#m':   { s:[2,4,4,2,2,2], f:[1,3,4,1,1,1], b:2 },
    'Gm':    { s:[3,5,5,3,3,3], f:[1,3,4,1,1,1], b:3 },
    'G#m':   { s:[4,6,6,4,4,4], f:[1,3,4,1,1,1], b:4 },
    'Am':    { s:[-1,0,2,2,1,0], f:[0,0,2,3,1,0] },
    'A#m':   { s:[-1,1,3,3,2,1], f:[0,1,3,4,2,1], b:1 },
    'Bm':    { s:[-1,2,4,4,3,2], f:[0,1,3,4,2,1], b:2 },
    'C7':    { s:[-1,3,2,3,1,0], f:[0,3,2,4,1,0] },
    'D7':    { s:[-1,-1,0,2,1,2], f:[0,0,0,2,1,3] },
    'E7':    { s:[0,2,0,1,0,0], f:[0,2,0,1,0,0] },
    'F7':    { s:[1,3,1,2,1,1], f:[1,3,1,2,1,1], b:1 },
    'G7':    { s:[3,2,0,0,0,1], f:[3,2,0,0,0,1] },
    'A7':    { s:[-1,0,2,0,2,0], f:[0,0,2,0,3,0] },
    'B7':    { s:[-1,2,1,2,0,2], f:[0,2,1,3,0,4] },
    'Am7':   { s:[-1,0,2,0,1,0], f:[0,0,2,0,1,0] },
    'Em7':   { s:[0,2,0,0,0,0], f:[0,2,0,0,0,0] },
    'Dm7':   { s:[-1,-1,0,2,1,1], f:[0,0,0,2,1,1] },
    'Cmaj7': { s:[-1,3,2,0,0,0], f:[0,3,2,0,0,0] },
    'Fmaj7': { s:[-1,-1,3,2,1,0], f:[0,0,3,2,1,0] },
    'Gmaj7': { s:[3,2,0,0,0,2], f:[2,1,0,0,0,3] },
    'Amaj7': { s:[-1,0,2,1,2,0], f:[0,0,2,1,3,0] },
    'Asus2': { s:[-1,0,2,2,0,0], f:[0,0,1,2,0,0] },
    'Asus4': { s:[-1,0,2,2,3,0], f:[0,0,1,2,3,0] },
    'Dsus2': { s:[-1,-1,0,2,3,0], f:[0,0,0,1,2,0] },
    'Dsus4': { s:[-1,-1,0,2,3,3], f:[0,0,0,1,2,4] },
    'Gsus4': { s:[3,3,0,0,1,3], f:[2,3,0,0,1,4] },
    'Esus4': { s:[0,2,2,2,0,0], f:[0,1,2,3,0,0] },
    'Cadd9': { s:[-1,3,2,0,3,0], f:[0,3,2,0,4,0] },
    'Gadd9': { s:[3,0,0,0,0,3], f:[2,0,0,0,0,3] },
    'Dadd9': { s:[-1,-1,0,2,3,0], f:[0,0,0,1,2,0] },
  };

  // Piano chord notes as semitones from C (0=C, 1=C#, 2=D, ...)
  const PIANO = {
    'C':[0,4,7],     'C#':[1,5,8],    'D':[2,6,9],     'D#':[3,7,10],
    'E':[4,8,11],    'F':[5,9,0],     'F#':[6,10,1],   'G':[7,11,2],
    'G#':[8,0,3],    'A':[9,1,4],     'A#':[10,2,5],   'B':[11,3,6],
    'Cm':[0,3,7],    'C#m':[1,4,8],   'Dm':[2,5,9],    'D#m':[3,6,10],
    'Em':[4,7,11],   'Fm':[5,8,0],    'F#m':[6,9,1],   'Gm':[7,10,2],
    'G#m':[8,11,3],  'Am':[9,0,4],    'A#m':[10,1,5],  'Bm':[11,2,6],
    'C7':[0,4,7,10], 'D7':[2,6,9,0],  'E7':[4,8,11,2], 'F7':[5,9,0,3],
    'G7':[7,11,2,5], 'A7':[9,1,4,7],  'B7':[11,3,6,9],
    'Am7':[9,0,4,7], 'Em7':[4,7,11,2],'Dm7':[2,5,9,0],
    'Cmaj7':[0,4,7,11],'Fmaj7':[5,9,0,4],'Gmaj7':[7,11,2,6],'Amaj7':[9,1,4,8],
    'Asus2':[9,11,4],'Asus4':[9,2,4], 'Dsus2':[2,4,9], 'Dsus4':[2,7,9],
    'Gsus4':[7,0,2], 'Cadd9':[0,4,7,2],'Gadd9':[7,11,2,9],
  };

  // Common chord progressions per key (for estimation)
  const PROGRESSIONS = {
    'C':  ['C','Dm','Em','F','G','Am','Bdim'],
    'G':  ['G','Am','Bm','C','D','Em','F#dim'],
    'D':  ['D','Em','F#m','G','A','Bm','C#dim'],
    'A':  ['A','Bm','C#m','D','E','F#m','G#dim'],
    'E':  ['E','F#m','G#m','A','B','C#m','D#dim'],
    'F':  ['F','Gm','Am','A#','C','Dm','Edim'],
    'Bb': ['A#','Cm','Dm','D#','F','Gm','Adim'],
    'Am': ['Am','Bdim','C','Dm','Em','F','G'],
    'Em': ['Em','F#dim','G','Am','Bm','C','D'],
    'Dm': ['Dm','Edim','F','Gm','Am','A#','C'],
  };

  // Nashville number mapping relative to major scale
  const MAJOR_INTERVALS = [0,2,4,5,7,9,11];

  function normalize(chord) {
    // Parse chord symbol into root + suffix
    const match = chord.match(/^([A-G][b#]?)(.*)/);
    if (!match) return { root: chord, suffix: '' };
    let root = match[1];
    const suffix = match[2];
    if (FLAT_MAP[root]) root = FLAT_MAP[root];
    return { root, suffix };
  }

  function noteIndex(note) {
    const normalized = FLAT_MAP[note] || note;
    return CHROMATIC.indexOf(normalized);
  }

  function transposeNote(note, semitones) {
    const idx = noteIndex(note);
    if (idx < 0) return note;
    return CHROMATIC[((idx + semitones) % 12 + 12) % 12];
  }

  function transposeChord(chord, semitones) {
    if (semitones === 0) return chord;
    const { root, suffix } = normalize(chord);
    const newRoot = transposeNote(root, semitones);
    return newRoot + suffix;
  }

  function toLatinNotation(chord) {
    const { root, suffix } = normalize(chord);
    const idx = noteIndex(root);
    if (idx < 0) return chord;
    return LATIN[idx] + suffix;
  }

  function toNashville(chord, keyRoot) {
    const { root, suffix } = normalize(chord);
    const chordIdx = noteIndex(root);
    const keyIdx = noteIndex(keyRoot);
    if (chordIdx < 0 || keyIdx < 0) return chord;
    const interval = ((chordIdx - keyIdx) + 12) % 12;
    const degree = NASHVILLE_MAJOR[interval];
    return degree + (suffix || '');
  }

  function displayChord(chord, notation, keyRoot) {
    if (!chord) return '';
    switch (notation) {
      case 'latin':    return toLatinNotation(chord);
      case 'nashville': return toNashville(chord, keyRoot || 'C');
      default:         return chord;
    }
  }

  function suggestCapo(originalKey, targetShapes) {
    // Suggest capo position to play targetShapes key over originalKey
    const origIdx = noteIndex(originalKey);
    const tgtIdx  = noteIndex(targetShapes);
    if (origIdx < 0 || tgtIdx < 0) return 0;
    return ((origIdx - tgtIdx) + 12) % 12;
  }

  function getCapoKey(key, capo) {
    // When capo is at position N, the sounding key when playing 'key' shapes
    return CHROMATIC[((noteIndex(key) + capo) % 12 + 12) % 12];
  }

  function getGuitarVoicing(chord) {
    const { root, suffix } = normalize(chord);
    const key = root + suffix;
    // Direct lookup
    if (GUITAR[key]) return GUITAR[key];
    // Try with flats normalized
    const norm = (FLAT_MAP[root] || root) + suffix;
    if (GUITAR[norm]) return GUITAR[norm];
    // Fallback: build barre chord from E-shape
    const idx = noteIndex(root);
    if (idx >= 0) {
      const isMinor = suffix.startsWith('m') && !suffix.startsWith('maj');
      if (isMinor) {
        return { s: [idx, idx+2, idx+2, idx, idx, idx], f:[1,3,4,1,1,1], b: idx };
      } else {
        return { s: [idx, idx+2, idx+2, idx+1, idx, idx], f:[1,3,4,2,1,1], b: idx };
      }
    }
    return null;
  }

  function getPianoNotes(chord) {
    const { root, suffix } = normalize(chord);
    const key = root + suffix;
    if (PIANO[key]) return PIANO[key];
    const norm = (FLAT_MAP[root] || root) + suffix;
    if (PIANO[norm]) return PIANO[norm];
    // Basic triad estimation
    const idx = noteIndex(root);
    const isMinor = suffix.startsWith('m') && !suffix.startsWith('maj');
    const isDim   = suffix.includes('dim');
    const isAug   = suffix.includes('aug');
    if (idx < 0) return [];
    if (isDim)   return [idx, (idx+3)%12, (idx+6)%12];
    if (isAug)   return [idx, (idx+4)%12, (idx+8)%12];
    if (isMinor) return [idx, (idx+3)%12, (idx+7)%12];
    return [idx, (idx+4)%12, (idx+7)%12];
  }

  // Extract all unique chord names from a ChordPro string
  function extractChords(text) {
    const matches = text.match(/\[([A-G][^[\]]*?)\]/g) || [];
    const chords = [...new Set(matches.map(m => m.slice(1,-1)))];
    return chords.filter(c => /^[A-G]/.test(c));
  }

  // Estimate key from chord list using circle of fifths scoring
  function estimateKey(chordList) {
    let best = 'C';
    let bestScore = -1;
    for (const [key, scale] of Object.entries(PROGRESSIONS)) {
      let score = 0;
      for (const ch of chordList) {
        const { root, suffix } = normalize(ch);
        const inScale = scale.some(sc => {
          const { root: sr } = normalize(sc);
          return noteIndex(sr) === noteIndex(root);
        });
        if (inScale) score++;
      }
      if (score > bestScore) { bestScore = score; best = key; }
    }
    return best;
  }

  return {
    CHROMATIC, FLAT_MAP, GUITAR, PIANO, PROGRESSIONS,
    normalize, noteIndex, transposeChord, displayChord,
    suggestCapo, getCapoKey,
    getGuitarVoicing, getPianoNotes,
    extractChords, estimateKey,
  };
})();
