/* ============================================================
   ChordSync - PDF Export
   Uses browser print API + a print-friendly CSS approach.
   Falls back to jsPDF if available.
   ============================================================ */

window.Export = (() => {

  function toPDF(songData) {
    const { title, artist, key, bpm, timeSignature, capo, chordPro, transpose, notation } = songData;

    // Render the chord sheet
    const html = Editor.render(chordPro || '', { transpose: transpose || 0, notation: notation || 'american', keyRoot: key || 'C' });

    // Build a print window
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      App.toast('Permite ventanas emergentes para exportar PDF', 'error');
      return;
    }

    const displayKey = transpose
      ? Chords.transposeChord(key || 'C', transpose)
      : (key || 'C');

    const capoBadge = capo && capo > 0
      ? `<span class="badge">Capo ${capo}</span>`
      : '';

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escHtml(title || 'Canción')} - ChordSync</title>
  <style>
    @page { size: A4; margin: 20mm 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #1a1a1a; background: #fff; }
    .page-header { margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #222; }
    .song-title { font-size: 22px; font-weight: 900; font-family: system-ui, sans-serif; color: #111; }
    .song-artist { font-size: 14px; color: #555; font-family: system-ui, sans-serif; margin-top: 4px; }
    .badges { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    .badge { display: inline-block; padding: 2px 10px; background: #f0f0f8; border: 1px solid #ccc; border-radius: 12px; font-size: 11px; font-family: system-ui, sans-serif; font-weight: 600; color: #333; }
    .badge-key { background: #ede9fe; border-color: #7c6fff; color: #5b3ebf; }
    .cs-section { font-family: system-ui, sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #c2440a; margin: 18px 0 8px; padding: 3px 8px; background: #fff4ed; border-left: 3px solid #c2440a; }
    .cs-section:first-child { margin-top: 0; }
    .cs-line-group { margin-bottom: 14px; }
    .cs-line { display: flex; flex-wrap: wrap; align-items: flex-end; min-height: 2.6em; }
    .cs-pair { display: inline-flex; flex-direction: column; align-items: flex-start; }
    .cs-chord { font-size: 9.5px; font-weight: 800; color: #5b3ebf; margin-bottom: 1px; white-space: nowrap; min-height: 1.2em; line-height: 1.2; padding: 0 1px; }
    .cs-lyric { font-size: 12px; color: #111; white-space: pre; line-height: 1.5; }
    .cs-chord-only { display: flex; gap: 10px; margin-bottom: 6px; }
    .cs-blank { height: 10px; }
    .cs-tab { font-size: 9.5px; color: #333; background: #f8f8f8; border: 1px solid #ddd; padding: 8px 12px; margin: 8px 0; white-space: pre; overflow: hidden; }
    .footer { margin-top: 32px; padding-top: 8px; border-top: 1px solid #ddd; font-family: system-ui, sans-serif; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .cs-section { break-inside: avoid; }
      .cs-line-group { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="song-title">${escHtml(title || 'Sin título')}</div>
    <div class="song-artist">${escHtml(artist || '')}</div>
    <div class="badges">
      <span class="badge badge-key">🎵 ${escHtml(displayKey)}</span>
      ${bpm ? `<span class="badge">♩ ${bpm} BPM</span>` : ''}
      ${timeSignature ? `<span class="badge">${escHtml(timeSignature)}</span>` : ''}
      ${capoBadge}
    </div>
  </div>
  <div class="chordsheet">${html}</div>
  <div class="footer">
    <span>Exportado con ChordSync</span>
    <span>${new Date().toLocaleDateString()}</span>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);

    win.document.close();
  }

  function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { toPDF };
})();
