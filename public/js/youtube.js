/* ============================================================
   ChordSync - YouTube IFrame Player Wrapper
   ============================================================ */

window.YT_Player = (() => {

  let player = null;
  let ready  = false;
  let pendingVideoId = null;
  let callbacks = {};

  /* ---- Load YouTube IFrame API ---- */
  function init(onReady) {
    callbacks.onReady = onReady;

    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }

    window.onYouTubeIframeAPIReady = createPlayer;

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  function createPlayer() {
    player = new window.YT.Player('youtube-player', {
      height: '315',
      width:  '560',
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onStateChange,
      }
    });
  }

  function onPlayerReady(e) {
    ready = true;
    if (pendingVideoId) {
      loadVideo(pendingVideoId);
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

  /* ---- Public API ---- */

  function loadVideo(videoId) {
    if (!ready || !player) {
      pendingVideoId = videoId;
      return;
    }
    player.cueVideoById(videoId);
  }

  function play()  { player?.playVideo();  }
  function pause() { player?.pauseVideo(); }

  function togglePlay() {
    if (!player) return;
    const state = player.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) pause();
    else play();
  }

  function seekTo(seconds) {
    player?.seekTo(seconds, true);
  }

  function setVolume(v) {
    player?.setVolume(Math.max(0, Math.min(100, v)));
  }

  function setPlaybackRate(rate) {
    player?.setPlaybackRate(rate);
  }

  function getCurrentTime() {
    return player?.getCurrentTime() || 0;
  }

  function getDuration() {
    return player?.getDuration() || 0;
  }

  function isPlaying() {
    return player?.getPlayerState() === window.YT.PlayerState.PLAYING;
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
    // Plain video ID?
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
    return null;
  }

  async function getVideoInfo(url) {
    try {
      const params = new URLSearchParams({ url });
      const res = await fetch(`/api/video-info?${params}`);
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
