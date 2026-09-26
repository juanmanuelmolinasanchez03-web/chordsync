/* ============================================================
   ChordSync - Karaoke Synchronization Engine
   ============================================================ */

window.Sync = (() => {

  let syncedLines   = [];  // [{time, text}]
  let currentLine   = -1;
  let offset        = 0;   // seconds offset
  let rafId         = null;
  let getTime       = null; // function returning current playback time
  let onLineChange  = null; // callback(lineIndex, lineData)
  let tapTimes      = [];

  function init(lines, getTimeFn, onChangeFn) {
    syncedLines  = lines || [];
    getTime      = getTimeFn;
    onLineChange = onChangeFn;
    currentLine  = -1;
  }

  function start() {
    stop();
    if (!syncedLines.length || !getTime) return;
    tick();
  }

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function tick() {
    if (!syncedLines.length || !getTime) return;

    const t = getTime() + offset;
    const newLine = findLine(t);

    if (newLine !== currentLine) {
      currentLine = newLine;
      onLineChange?.(currentLine, syncedLines[currentLine] || null);
    }

    rafId = requestAnimationFrame(tick);
  }

  function findLine(t) {
    if (!syncedLines.length) return -1;
    // Binary search for current line
    let lo = 0, hi = syncedLines.length - 1, result = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (syncedLines[mid].time <= t) {
        result = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return result;
  }

  function adjustOffset(delta) {
    offset += delta;
    return offset;
  }

  function setOffset(val) {
    offset = val;
  }

  function getOffset() {
    return offset;
  }

  // Manual tap-sync: tap spacebar to assign timestamps to lines
  let tapLineIndex = 0;

  function startTapSync() {
    tapTimes  = [];
    tapLineIndex = 0;
  }

  function tapLine(currentTime) {
    if (tapLineIndex >= syncedLines.length) return false;
    syncedLines[tapLineIndex].time = currentTime;
    tapTimes.push({ idx: tapLineIndex, time: currentTime });
    tapLineIndex++;
    return tapLineIndex < syncedLines.length;
  }

  function resetTap() {
    tapTimes  = [];
    tapLineIndex = 0;
  }

  // Map plain lyrics to synced lines by best-match, store chord-sheet line index
  function alignPlainToSynced(plain, synced) {
    if (!plain || !synced?.length) return synced;
    const plainLines = plain.split('\n').map(l => l.trim()).filter(Boolean);
    const result = [];

    for (let i = 0; i < synced.length; i++) {
      const syncText = normalize(synced[i].text);
      let best = -1, bestScore = 0;
      for (let j = 0; j < plainLines.length; j++) {
        const score = similarity(syncText, normalize(plainLines[j]));
        if (score > bestScore) { bestScore = score; best = j; }
      }
      // lineIndex = chord-sheet data-line index for correct DOM targeting
      result.push({ ...synced[i], lineIndex: best >= 0 ? best : i });
    }

    return result;
  }

  function normalize(s) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function similarity(a, b) {
    if (!a && !b) return 1;
    if (!a || !b) return 0;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1;
    return (longer.length - editDistance(longer, shorter)) / longer.length;
  }

  function editDistance(a, b) {
    const dp = Array.from({length: a.length + 1}, (_, i) =>
      Array.from({length: b.length + 1}, (_, j) => i === 0 ? j : j === 0 ? i : 0)
    );
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
    return dp[a.length][b.length];
  }

  return {
    init, start, stop,
    adjustOffset, setOffset, getOffset,
    startTapSync, tapLine, resetTap,
    alignPlainToSynced,
    get currentLine() { return currentLine; },
    get syncedLines() { return syncedLines; },
  };
})();
