// ============================================================
// # 📖 🚪  A PAGE OF ITS OWN FOR EVERY COURSE
// # 🔤 JavaScript
// # 🎯 Opens one course on a page to itself, reached by pressing its
// #    strip on the board. For now it carries only its name and the way
// #    back: what belongs on it is still being decided
// # 🔗 It is deliberately bare rather than a half-copy of the card. A
// #    page that repeats what the board already says teaches the reader
// #    that opening it is not worth the press, and that is hard to undo
// #    later. Both screens work on the same course objects held by the
// #    store, so whatever is put here edits the same thing the board
// #    shows — there is no second copy to keep in step
// ============================================================
(() => {
  const keep = window.MyTermBoardStore;
  const $ = id => document.getElementById(id);

  const page = $('course'), board = $('board');
  const title = $('course-title'), backBtn = $('course-back');

  let openId = null;

  const course = () => (keep.live()?.courses || []).find(c => c.id === openId) || null;

  const draw = () => {
    const c = course();
    if (!c) return;
    title.textContent = c.name || 'Untitled course';
  };

  const leave = () => {
    page.hidden = true;
    board.hidden = false;
    openId = null;
    window.MyTermBoardRedraw?.();
  };

  backBtn.onclick = leave;

  // Going back is the only thing this page does, so the key that means
  // "back" everywhere else means it here too
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && openId) leave();
  });

  // ============================================================
  // # 🔗 🪟  ARRIVING HERE BY ADDRESS
  // # 🔤 JavaScript
  // # 🎯 A tab opened on ?course=<id> lands on that course instead of
  // #    the board
  // # 🔗 This is what lets the board open a course in a tab of its own
  // #    and stay where it was. It is tried only once a tab: the board
  // #    paints twice, first from what was kept here and again when
  // #    Drive answers, and opening on both would drag a reader who had
  // #    pressed Back straight out of the board again
  // ============================================================
  let cameByAddress = false;

  const askedFor = () => new URLSearchParams(location.search).get('course');

  window.MyTermCoursePage = {
    open: id => {
      openId = id;
      board.hidden = true;
      page.hidden = false;
      draw();
    },
    fromAddress: () => {
      if (cameByAddress) return;
      const id = askedFor();
      if (!id) return;
      const known = (keep.live()?.courses || []).some(c => c.id === id && !c.deleted);
      if (!known) return;
      cameByAddress = true;
      window.MyTermCoursePage.open(id);
    },
    openId: () => openId,
    redraw: () => { if (openId) draw(); }
  };
})();
