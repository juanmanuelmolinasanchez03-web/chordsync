/* ============================================================
   ChordSync - Song Library & Setlists (LocalStorage)
   ============================================================ */

window.Library = (() => {

  const STORAGE_KEY   = 'chordsync_library';
  const SETLIST_KEY   = 'chordsync_setlists';
  const RECENT_KEY    = 'chordsync_recent';
  const MAX_RECENT    = 10;

  /* ---------- Songs ---------- */

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  }

  function save(songData) {
    const songs = getAll();
    const idx = songs.findIndex(s => s.id === songData.id);
    const song = {
      ...songData,
      id: songData.id || generateId(),
      savedAt: Date.now(),
    };
    if (idx >= 0) songs[idx] = song;
    else songs.unshift(song);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    addRecent(song);
    return song;
  }

  function remove(id) {
    const songs = getAll().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    // Remove from setlists too
    const setlists = getSetlists().map(sl => ({
      ...sl,
      songs: sl.songs.filter(sid => sid !== id),
    }));
    localStorage.setItem(SETLIST_KEY, JSON.stringify(setlists));
  }

  function getById(id) {
    return getAll().find(s => s.id === id) || null;
  }

  function search(query) {
    const q = query.toLowerCase();
    return getAll().filter(s =>
      s.title?.toLowerCase().includes(q) ||
      s.artist?.toLowerCase().includes(q)
    );
  }

  /* ---------- Recent ---------- */

  function addRecent(song) {
    const recent = getRecent().filter(s => s.id !== song.id);
    recent.unshift({ id: song.id, title: song.title, artist: song.artist });
    recent.splice(MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  }

  function getRecent() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch { return []; }
  }

  /* ---------- Setlists ---------- */

  function getSetlists() {
    try {
      return JSON.parse(localStorage.getItem(SETLIST_KEY) || '[]');
    } catch { return []; }
  }

  function saveSetlist(setlist) {
    const setlists = getSetlists();
    const idx = setlists.findIndex(s => s.id === setlist.id);
    const sl = { ...setlist, id: setlist.id || generateId() };
    if (idx >= 0) setlists[idx] = sl;
    else setlists.push(sl);
    localStorage.setItem(SETLIST_KEY, JSON.stringify(setlists));
    return sl;
  }

  function removeSetlist(id) {
    const setlists = getSetlists().filter(s => s.id !== id);
    localStorage.setItem(SETLIST_KEY, JSON.stringify(setlists));
  }

  function addToSetlist(setlistId, songId) {
    const setlists = getSetlists();
    const sl = setlists.find(s => s.id === setlistId);
    if (!sl) return;
    if (!sl.songs.includes(songId)) sl.songs.push(songId);
    localStorage.setItem(SETLIST_KEY, JSON.stringify(setlists));
  }

  function removeFromSetlist(setlistId, songId) {
    const setlists = getSetlists();
    const sl = setlists.find(s => s.id === setlistId);
    if (!sl) return;
    sl.songs = sl.songs.filter(id => id !== songId);
    localStorage.setItem(SETLIST_KEY, JSON.stringify(setlists));
  }

  function reorderSetlist(setlistId, fromIdx, toIdx) {
    const setlists = getSetlists();
    const sl = setlists.find(s => s.id === setlistId);
    if (!sl) return;
    const [moved] = sl.songs.splice(fromIdx, 1);
    sl.songs.splice(toIdx, 0, moved);
    localStorage.setItem(SETLIST_KEY, JSON.stringify(setlists));
  }

  function getSetlistById(id) {
    return getSetlists().find(s => s.id === id) || null;
  }

  function getSetlistSongs(setlistId) {
    const sl = getSetlists().find(s => s.id === setlistId);
    if (!sl) return [];
    return sl.songs.map(id => getById(id)).filter(Boolean);
  }

  /* ---------- Helpers ---------- */

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return {
    getAll, save, remove, getById, search,
    getRecent, addRecent,
    getSetlists, saveSetlist, removeSetlist, getSetlistById,
    addToSetlist, removeFromSetlist, reorderSetlist, getSetlistSongs,
    generateId,
  };
})();
