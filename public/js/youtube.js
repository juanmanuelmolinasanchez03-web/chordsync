/* ============================================================
   ChordSync - YouTube IFrame Player Wrapper
   ============================================================ */

window.YT_Player = (() => {

  let player = null;
  let ready  = false;
  let pendingVideoId = null;
  let callbacks = {};
  let retryCount = 0;

  /* ---- Load YouTube IFrame API ---- */
  function init(onReady) {
    callbacks.onReady = onReady;

    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      retryCount = 0;
      createPlayer();
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => console.error('[YT] API script failed to load');
    document.head.appendChild(tag);
  }

  function createPlayer() {
    // Ensure the target element exists
    const el = document.getElementById('youtube-player');
    if (!el) {
      if (retryCount++ < 10) setTimeout(createPlayer, 300);
      return;
    }

    try {
      player = new window.YT.Player('youtube-player', {
        height: '315',
        width:  '560',
        playerVars: {
          autoplay:       0,
          controls:       1,
          modestbranding: 1,
          rel:            0,
          playsinline:    1,
          enablejsapi:    1,
          origin:         window.location.origin,
        },
        events: {
          onReady:       onPlayerReady,
          onStateChange: onStateChange,
          onError:       onPlayerError,
        }
      });
    } catch (e) {
      console.error('[YT] createPlayer failed:', e);
      if (retryCount++ < 3) setTimeout(createPlayer, 1000);
    }
  }

  function onPlayerReady(e) {
    ready = true;
    retryCount = 0;
    if (pendingVideoId) {
      player.cueVideoById(pendingVideoId);
      pendingVideoId = null;
    }
    callbacks.onReady?.();
  }

  function onStateChange(e) {
    const state = e.data;
    callbacks.onStateChange?.(state);
    if (state === window.YT.PlayerState.PLAYING) {
      callbacks.onPlay?.();
    } else if (state === window.YT.PlayerState.PAUSED) {
      callbacks.onPause?.();
    } else if (state === window.YT.PlayerState.ENDED) {
      callbacks.onEnded?.();
    }
  }

  function onPlayerError(e) {
    console.warn('[YT] Player error code:', e.data);
    callbacks.onError?.(e.data);
  }

  /* ---- Public API ---- */

  function loadVideo(videoId) {
    if (!videoId) return;
    if (!ready || !player) {
      pendingVideoId = videoId;
      return;
    }
    try {
      player.cueVideoById(videoId);
    } catch (e) {
      console.error('[YT] cueVideoById failed:', e);
      pendingVideoId = videoId;
    }
  }

  function play()  { try { player?.playVideo();  } catch {} }
  function pause() { try { player?.pauseVideo(); } catch {} }

  function togglePlay() {
    if (!player || !ready) return;
    try {
      const state = player.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) pause();
      else play();
    } catch {}
  }

  function seekTo(seconds) {
    try { player?.seekTo(seconds, true); } catch {}
  }

  function setVolume(v) {
    try { player?.setVolume(Math.max(0, Math.min(100, v))); } catch {}
  }

  function setPlaybackRate(rate) {
    try { player?.setPlaybackRate(rate); } catch {}
  }

  function getCurrentTime() {
    try { return player?.getCurrentTime() || 0; } catch { return 0; }
  }

  function getDuration() {
    try { return player?.getDuration() || 0; } catch { return 0; }
  }

  function isPlaying() {
    try { return player?.getPlayerState() === window.YT.PlayerState.PLAYING; } catch { return false; }
  }

  /* ---- Utility ---- */

  function extractVideoId(url) {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
    return null;
  }

  async function getVideoInfo(url) {
    try {
      const res = await fetch(`/api/video-info?${new URLSearchParams({ url })}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function on(event, cb) {
    callbacks[event] = cb;
  }

  return {
    init, loadVideo,
    play, pause, togglePlay, seekTo,
    setVolume, setPlaybackRate,
    getCurrentTime, getDuration, isPlaying,
    extractVideoId, getVideoInfo, on,
    get ready() { return ready; },
  };
})();
