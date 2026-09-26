/* ============================================================
   ChordSync - Web Audio Metronome
   ============================================================ */

window.Metronome = (() => {

  let audioCtx    = null;
  let isRunning   = false;
  let bpm         = 120;
  let beatsPerBar = 4;
  let subdivision = 1;
  let beat        = 0;
  let nextBeatTime = 0;
  let intervalId  = null;
  let onBeat      = null; // callback(beatNum, isAccent)

  const SCHEDULE_AHEAD = 0.1; // seconds to schedule ahead
  const TICK_INTERVAL  = 25;  // ms between scheduler ticks

  function ensureContext() {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function beep(time, isAccent) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.frequency.value = isAccent ? 880 : 440;
    osc.type = 'sine';

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(isAccent ? 0.4 : 0.25, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.start(time);
    osc.stop(time + 0.07);
  }

  function scheduler() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    while (nextBeatTime < now + SCHEDULE_AHEAD) {
      const isAccent = beat % beatsPerBar === 0;
      beep(nextBeatTime, isAccent);

      const beatNum = beat % beatsPerBar;
      const ahead   = nextBeatTime - now;
      setTimeout(() => onBeat?.(beatNum, isAccent), Math.max(0, ahead * 1000));

      nextBeatTime += 60 / bpm / subdivision;
      beat++;
    }
  }

  function start(opts = {}) {
    ensureContext();
    if (opts.bpm)         bpm = opts.bpm;
    if (opts.beatsPerBar) beatsPerBar = opts.beatsPerBar;
    if (opts.subdivision) subdivision = opts.subdivision;
    if (opts.onBeat)      onBeat = opts.onBeat;

    beat = 0;
    nextBeatTime = audioCtx.currentTime + 0.1;
    isRunning = true;

    clearInterval(intervalId);
    intervalId = setInterval(scheduler, TICK_INTERVAL);
    scheduler();
  }

  function stop() {
    isRunning = false;
    clearInterval(intervalId);
    intervalId = null;
  }

  function setBPM(newBPM) {
    bpm = Math.max(40, Math.min(300, newBPM));
  }

  function setBeatsPerBar(n) {
    beatsPerBar = n || 4;
  }

  function toggle(opts) {
    if (isRunning) { stop(); return false; }
    else { start(opts); return true; }
  }

  // Tap tempo detection
  const tapHistory = [];
  const MAX_GAP = 3000; // ms

  function tap() {
    const now = Date.now();
    if (tapHistory.length > 0 && now - tapHistory[tapHistory.length - 1] > MAX_GAP) {
      tapHistory.length = 0;
    }
    tapHistory.push(now);
    if (tapHistory.length < 2) return null;

    // Keep last 8 taps
    if (tapHistory.length > 8) tapHistory.shift();

    // Average interval
    let total = 0;
    for (let i = 1; i < tapHistory.length; i++) {
      total += tapHistory[i] - tapHistory[i-1];
    }
    const avg = total / (tapHistory.length - 1);
    return Math.round(60000 / avg);
  }

  return {
    start, stop, toggle, setBPM, setBeatsPerBar, tap,
    get bpm()       { return bpm; },
    get isRunning() { return isRunning; },
    get beat()      { return beat % beatsPerBar; },
  };
})();
