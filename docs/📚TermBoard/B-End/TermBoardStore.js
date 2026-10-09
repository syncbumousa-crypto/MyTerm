// ============================================================
// # 📄 🗄️  THE TERM PAPER IN THE USER'S DRIVE
// # 🔤 JavaScript
// # 🎯 Nothing here shows on screen. It holds the one paper that says
// #    what the term is called and which courses are in it, reads it
// #    from the user's own Drive, and writes it back when it changes
// # 🔗 The screen file calls change() on every keystroke, and this file
// #    decides when to actually write: the fast copy in the browser is
// #    written at once so nothing is ever lost, and Drive is written
// #    after a short quiet, because a call to Google per letter typed
// #    would be slow and wasteful. Keys are per file, so two accounts
// #    on one browser never read each other's board
// ============================================================
(() => {
  const QUIET = 900;            // كم ينتظر السكون قبل الكتابة في درايف
  const cloud = () => window.MyTermCloud;

  let fileId = null;            // الملف الذي نكتب فيه
  let raw = null;               // كل ما في الملف، حتى ما لا نعرفه
  let timer = null;
  let sending = false;
  let dirty = false;
  let tellStatus = () => {};

  const cacheKey = () => 'myterm.board.' + fileId;

  const empty = () => ({ term: { name: '', updatedAt: null }, courses: [] });

  const shape = doc => ({
    term: {
      name: typeof doc?.term?.name === 'string' ? doc.term.name : '',
      updatedAt: doc?.term?.updatedAt ?? null
    },
    courses: Array.isArray(doc?.courses)
      ? doc.courses.filter(c => c && typeof c.name === 'string').map(c => ({
          id: typeof c.id === 'string' ? c.id : 'c-' + Math.random().toString(36).slice(2, 8),
          name: c.name,
          updatedAt: c.updatedAt ?? null,
          deleted: c.deleted === true
        }))
      : []
  });

  // ============================================================
  // # 💾 ⚡  THE FAST COPY IN THE BROWSER
  // # 🔤 JavaScript
  // # 🎯 Writes and reads a copy next to the user, so the board draws
  // #    the moment it opens instead of waiting on Google
  // # 🔗 This copy is never the truth. Drive is. On every open the copy
  // #    is drawn first and then replaced by what Drive says. Each call
  // #    is wrapped, because a browser with its shields up refuses the
  // #    store and throws instead of answering
  // ============================================================
  const cache = {
    read: () => { try { return shape(JSON.parse(localStorage.getItem(cacheKey()) || 'null')); } catch { return null; } },
    write: board => { try { localStorage.setItem(cacheKey(), JSON.stringify(board)); } catch {} },
    drop: () => { try { localStorage.removeItem(cacheKey()); } catch {} }
  };

  // ============================================================
  // # 📤 ⏳  WRITING TO DRIVE AFTER THE TYPING STOPS
  // # 🔤 JavaScript
  // # 🎯 Sends the paper to Drive once the user has been quiet for a
  // #    moment, says what it is doing, and keeps a count that goes up
  // #    on every write
  // # 🔗 The count is for the next step: another device will watch it to
  // #    know something changed. Fields we did not write are carried
  // #    over untouched, so nothing already in the file is destroyed.
  // #    If a write is still in the air when a new change arrives, the
  // #    new one waits its turn instead of racing it
  // ============================================================
  async function push() {
    if (!fileId || sending || !dirty) return;
    sending = true;
    dirty = false;
    tellStatus('saving');
    try {
      const body = { ...(raw || {}), ...shape(raw), version: Number(raw?.version || 0) + 1, updatedAt: new Date().toISOString() };
      await cloud().writeFile(fileId, body);
      raw = body;
      tellStatus('saved');
    } catch (e) {
      dirty = true;
      tellStatus('failed');
    } finally {
      sending = false;
      if (dirty) setTimeout(push, QUIET);
    }
  }

  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(push, QUIET);
  };

  window.MyTermBoardStore = {
    attach: id => { fileId = id; raw = null; },
    detach: () => { clearTimeout(timer); fileId = null; raw = null; dirty = false; },

    cached: () => (fileId ? cache.read() : null),

    load: async () => {
      if (!fileId) return empty();
      const doc = await cloud().readFile(fileId);
      raw = doc && typeof doc === 'object' ? doc : {};
      const board = shape(raw);
      cache.write(board);
      return board;
    },

    change: board => {
      if (!fileId) return;
      raw = { ...(raw || {}), ...board };
      cache.write(shape(board));
      dirty = true;
      tellStatus('waiting');
      later();
    },

    flush: () => { clearTimeout(timer); return push(); },

    version: () => Number(raw?.version || 0),

    onStatus: fn => { tellStatus = fn; },

    forget: () => { if (fileId) cache.drop(); }
  };
})();
