// ============================================================
// # 💾 🗄️  KEEPING THE BOARD BETWEEN VISITS
// # 🔤 JavaScript
// # 🎯 Nothing here shows on screen. It writes the term name and the
// #    course names into the browser's own lasting store, and reads
// #    them back when the page opens again
// # 🔗 The screen file calls these three on every change. This is a
// #    stop on the way: the board will later live in the user's own
// #    Drive file, and then this store becomes the quick local copy.
// #    Every call is wrapped, because a browser with its shields up
// #    can refuse the store and throw instead of answering
// ============================================================
(() => {
  const KEY = 'myterm.board';

  window.MyTermBoardStore = {
    read: () => {
      try {
        const kept = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (!kept) return null;
        return {
          term: typeof kept.term === 'string' ? kept.term : '',
          courses: Array.isArray(kept.courses) ? kept.courses.filter(c => typeof c === 'string') : []
        };
      } catch { return null; }
    },
    write: board => { try { localStorage.setItem(KEY, JSON.stringify(board)); } catch {} },
    clear: () => { try { localStorage.removeItem(KEY); } catch {} }
  };
})();
