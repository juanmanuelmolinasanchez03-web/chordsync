/* ============================================================
   ChordSync - Chord Diagram Rendering (Guitar + Piano SVG)
   ============================================================ */

window.Diagrams = (() => {

  /* ---- Guitar Diagram ---- */
  function renderGuitar(voicing, chordName) {
    if (!voicing) return '<p style="color:var(--text-muted);padding:20px;">Sin diagrama disponible</p>';

    const { s: strings, f: fingers, b: barre } = voicing;
    const W = 140, H = 170;
    const PL = 28, PT = 40, PR = 16, PB = 12;
    const SW = (W - PL - PR) / 5;  // string spacing
    const FH = (H - PT - PB) / 4;  // fret spacing
    const nStrings = 6;
    const nFrets = 5;

    // Find start fret
    const frettedNotes = strings.filter(n => n > 0);
    let startFret = 1;
    if (frettedNotes.length > 0) {
      const minFret = Math.min(...frettedNotes);
      if (minFret > 2) startFret = minFret;
    }

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

    // Style
    const lineColor = 'var(--border-light)';
    const dotColor  = 'var(--chord-color)';
    const textColor = 'var(--text-secondary)';

    // Nut (thick bar at top if startFret=1)
    if (startFret === 1) {
      svg += `<rect x="${PL}" y="${PT - 4}" width="${5*SW}" height="5" fill="${textColor}" rx="1"/>`;
    } else {
      // Fret number indicator
      svg += `<text x="${PL - 6}" y="${PT + FH * 0.5 + 5}" text-anchor="end" font-size="11" fill="${textColor}" font-family="system-ui">${startFret}</text>`;
    }

    // Fret lines
    for (let i = 0; i <= 4; i++) {
      const y = PT + i * FH;
      svg += `<line x1="${PL}" y1="${y}" x2="${PL + 5*SW}" y2="${y}" stroke="${lineColor}" stroke-width="1"/>`;
    }

    // String lines
    for (let i = 0; i < nStrings; i++) {
      const x = PL + i * SW;
      svg += `<line x1="${x}" y1="${PT}" x2="${x}" y2="${PT + 4*FH}" stroke="${lineColor}" stroke-width="1.5"/>`;
    }

    // Barre chord
    if (barre != null) {
      const barreFret = barre - startFret + 1;
      if (barreFret >= 1 && barreFret <= 4) {
        const y = PT + (barreFret - 0.5) * FH;
        // Find first and last string that uses barre
        let firstStr = 0, lastStr = 5;
        for (let i = 0; i < 6; i++) {
          if (strings[i] === barre) { firstStr = i; break; }
        }
        for (let i = 5; i >= 0; i--) {
          if (strings[i] >= barre) { lastStr = i; break; }
        }
        svg += `<rect x="${PL + firstStr * SW - 6}" y="${y - 7}" width="${(lastStr - firstStr) * SW + 12}" height="14" fill="${dotColor}" rx="7"/>`;
      }
    }

    // Finger dots
    for (let i = 0; i < nStrings; i++) {
      const fret = strings[i];
      const x = PL + i * SW;

      if (fret === -1) {
        // Muted
        svg += `<text x="${x}" y="${PT - 10}" text-anchor="middle" font-size="12" fill="${textColor}">✕</text>`;
      } else if (fret === 0) {
        // Open
        svg += `<circle cx="${x}" cy="${PT - 10}" r="4" fill="none" stroke="${textColor}" stroke-width="1.5"/>`;
      } else {
        const relFret = fret - startFret + 1;
        if (relFret >= 1 && relFret <= 4) {
          const y = PT + (relFret - 0.5) * FH;
          if (!(barre != null && fret === barre)) {
            svg += `<circle cx="${x}" cy="${y}" r="7" fill="${dotColor}"/>`;
            if (fingers && fingers[i] > 0) {
              svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="9" fill="#fff" font-weight="bold">${fingers[i]}</text>`;
            }
          }
        }
      }
    }

    // String labels (E A D G B e)
    const labels = ['E','A','D','G','B','e'];
    for (let i = 0; i < 6; i++) {
      svg += `<text x="${PL + i * SW}" y="${H - 2}" text-anchor="middle" font-size="10" fill="${textColor}" font-family="system-ui">${labels[i]}</text>`;
    }

    svg += '</svg>';
    return svg;
  }

  /* ---- Piano Diagram ---- */
  function renderPiano(notes, chordName) {
    const W = 280, H = 110;
    const wkW = 28, wkH = 80;
    const bkW = 18, bkH = 50;
    const nOctaves = 2;
    const nWhite = 7 * nOctaves;
    const totalW = nWhite * wkW;
    const offsetX = (W - totalW) / 2;
    const offsetY = 14;

    // White key layout: C D E F G A B
    const whiteOrder = [0,2,4,5,7,9,11];
    // Black key layout (relative to white key index): C#=0.5, D#=1.5, F#=3.5, G#=4.5, A#=5.5
    const blackPos = [0.65, 1.65, 3.65, 4.65, 5.65];
    const blackNotes = [1, 3, 6, 8, 10];

    const normalizedNotes = notes.map(n => ((n % 12) + 12) % 12);

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

    // Draw white keys
    for (let oct = 0; oct < nOctaves; oct++) {
      for (let i = 0; i < 7; i++) {
        const note = whiteOrder[i];
        const x = offsetX + (oct * 7 + i) * wkW;
        const isHighlighted = normalizedNotes.includes(note);
        const fill = isHighlighted ? 'var(--chord-color)' : 'var(--text-primary)';
        const stroke = 'var(--border)';
        svg += `<rect x="${x + 0.5}" y="${offsetY}" width="${wkW - 1}" height="${wkH}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" rx="2"/>`;
        if (isHighlighted) {
          const label = ['C','D','E','F','G','A','B'][i];
          svg += `<text x="${x + wkW/2}" y="${offsetY + wkH - 6}" text-anchor="middle" font-size="9" fill="#fff" font-weight="bold" font-family="system-ui">${label}</text>`;
        }
      }
    }

    // Draw black keys (on top)
    for (let oct = 0; oct < nOctaves; oct++) {
      for (let i = 0; i < 5; i++) {
        const note = blackNotes[i];
        const x = offsetX + (oct * 7 + blackPos[i]) * wkW;
        const isHighlighted = normalizedNotes.includes(note);
        const fill = isHighlighted ? 'var(--chord-color)' : '#1A1A2E';
        svg += `<rect x="${x}" y="${offsetY}" width="${bkW}" height="${bkH}" fill="${fill}" rx="2"/>`;
      }
    }

    // Label
    svg += `<text x="${W/2}" y="${H - 4}" text-anchor="middle" font-size="11" fill="var(--text-muted)" font-family="system-ui">${chordName}</text>`;

    svg += '</svg>';
    return svg;
  }

  /* ---- Bass Diagram ---- */
  const BASS_POS = {
    'E': {s:0,f:0}, 'F': {s:0,f:1}, 'F#':{s:0,f:2},
    'G': {s:0,f:3}, 'G#':{s:0,f:4},
    'A': {s:1,f:0}, 'A#':{s:1,f:1}, 'B': {s:1,f:2},
    'C': {s:1,f:3}, 'C#':{s:1,f:4},
    'D': {s:2,f:0}, 'D#':{s:2,f:1},
  };

  function renderBass(chordName) {
    const { root } = Chords.normalize(chordName);
    const normRoot = Chords.FLAT_MAP[root] || root;
    const pos = BASS_POS[normRoot] || { s: 0, f: 0 };

    const W = 200, H = 160;
    const nStr = 4, nFrets = 5;
    const PL = 30, PT = 38, PR = 20, PB = 24;
    const SW = (W - PL - PR) / (nStr - 1);
    const FH = (H - PT - PB) / nFrets;
    const lineColor = 'var(--border-light)';
    const dotColor  = 'var(--chord-color)';
    const textColor = 'var(--text-secondary)';
    const labels = ['E','A','D','G'];

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    // Nut
    svg += `<rect x="${PL}" y="${PT-5}" width="${(nStr-1)*SW}" height="5" fill="${textColor}" rx="1"/>`;
    // Fret lines
    for (let i = 0; i <= nFrets; i++) {
      const y = PT + i * FH;
      svg += `<line x1="${PL}" y1="${y}" x2="${PL+(nStr-1)*SW}" y2="${y}" stroke="${lineColor}" stroke-width="1"/>`;
    }
    // String lines
    for (let i = 0; i < nStr; i++) {
      const x = PL + i * SW;
      const sw = 2.5 - i * 0.5;
      svg += `<line x1="${x}" y1="${PT}" x2="${x}" y2="${PT+nFrets*FH}" stroke="${lineColor}" stroke-width="${sw}"/>`;
    }
    // Root dot
    const rx = PL + pos.s * SW;
    if (pos.f === 0) {
      svg += `<circle cx="${rx}" cy="${PT-13}" r="7" fill="${dotColor}"/>`;
    } else {
      const ry = PT + (pos.f - 0.5) * FH;
      svg += `<circle cx="${rx}" cy="${ry}" r="9" fill="${dotColor}"/>`;
    }
    // Labels
    for (let i = 0; i < nStr; i++) {
      svg += `<text x="${PL+i*SW}" y="${H-4}" text-anchor="middle" font-size="10" fill="${textColor}" font-family="system-ui">${labels[i]}</text>`;
    }
    // Subtitle
    svg += `<text x="${W/2}" y="14" text-anchor="middle" font-size="10" fill="${textColor}" font-family="system-ui">nota raíz</text>`;
    svg += '</svg>';
    return svg;
  }

  /* ---- Render into container ---- */
  function show(chordName, container, instrument = 'guitar') {
    const { root, suffix } = Chords.normalize(chordName);
    const normalized = (Chords.FLAT_MAP[root] || root) + suffix;

    let html = '';
    if (instrument === 'guitar') {
      const voicing = Chords.getGuitarVoicing(normalized) || Chords.getGuitarVoicing(chordName);
      html = renderGuitar(voicing, chordName);
    } else if (instrument === 'bass') {
      html = renderBass(chordName);
    } else {
      const notes = Chords.getPianoNotes(normalized) || Chords.getPianoNotes(chordName);
      html = renderPiano(notes || [], chordName);
    }

    container.innerHTML = html;
  }

  /* ---- Tooltip on chord hover ---- */
  let tooltip = null;

  function initTooltips(instrument = 'guitar') {
    document.querySelectorAll('.cs-chord[data-chord]').forEach(el => {
      el.addEventListener('mouseenter', e => showTooltip(e, instrument));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  function showTooltip(e, instrument) {
    const chord = e.currentTarget.dataset.chord;
    if (!chord) return;

    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'chord-tooltip';
      tooltip.style.cssText = `
        position:fixed; z-index:800; background:var(--bg-card);
        border:1px solid var(--border-light); border-radius:10px;
        padding:8px; box-shadow:var(--shadow); pointer-events:none;
      `;
      document.body.appendChild(tooltip);
    }

    const { root, suffix } = Chords.normalize(chord);
    const normalized = (Chords.FLAT_MAP[root] || root) + suffix;

    if (instrument === 'guitar') {
      const voicing = Chords.getGuitarVoicing(normalized);
      tooltip.innerHTML = renderGuitar(voicing, chord);
    } else if (instrument === 'bass') {
      tooltip.innerHTML = renderBass(chord);
    } else {
      const notes = Chords.getPianoNotes(normalized);
      tooltip.innerHTML = renderPiano(notes || [], chord);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const tW = instrument === 'guitar' ? 140 : instrument === 'bass' ? 200 : 280;
    const tH = instrument === 'guitar' ? 170 : instrument === 'bass' ? 160 : 110;

    let left = rect.left + rect.width / 2 - tW / 2;
    let top  = rect.top - tH - 8;
    if (top < 8) top = rect.bottom + 8;
    if (left < 8) left = 8;
    if (left + tW > window.innerWidth - 8) left = window.innerWidth - tW - 8;

    tooltip.style.left = left + 'px';
    tooltip.style.top  = top + 'px';
    tooltip.style.display = 'block';
  }

  function hideTooltip() {
    if (tooltip) tooltip.style.display = 'none';
  }

  return { renderGuitar, renderPiano, show, initTooltips, showTooltip, hideTooltip };
})();
