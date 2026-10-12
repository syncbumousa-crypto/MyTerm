// ============================================================
// # 💺 🪧  WHEN ANOTHER WINDOW TAKES THIS PAGE
// # 🔤 JavaScript
// # 🎯 Covers the screen, and offers the one way back
// # 🔗 A FILE OF ITS OWN, not a few lines inside the shell. Both screens
// #    can lose their seat and the words are the same either way — and
// #    a block hung off the end of a file that wants the whole corner
// #    of a board simply never runs on a page that has no corner.
// #
// #    It covers everything on purpose. A quiet notice at the edge is
// #    read past, and a page that has stopped saving without saying so
// #    is the exact failure this whole mechanism exists to prevent: the
// #    reader goes on typing into a window whose every save is being
// #    undone somewhere else
// ============================================================
(() => {
  const veil = document.getElementById('seat-veil');
  const here = document.getElementById('seat-here');
  if (!veil || !here) return;

  here.onclick = async () => {
    await window.MyTermSeat?.resume?.();
    veil.hidden = true;
  };

  window.MyTermShell = Object.assign(window.MyTermShell || {}, {
    lostSeat: () => { veil.hidden = false; },
    hasSeat: () => veil.hidden
  });
})();
