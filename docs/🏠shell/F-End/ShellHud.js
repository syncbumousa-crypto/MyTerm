// ============================================================
// # 🙂 📌  THE FACE AND THE TICK, FLOATING IN THE CORNER
// # 🔤 JavaScript
// # 🎯 Two small things pinned to the top corner of every screen: a
// #    round face that opens the account and where the work is kept,
// #    and beside it a tick that turns into a turning circle while
// #    anything is still on its way to Drive
// # 🔗 A new account has no picture anywhere, so one is made from what
// #    we do have: the first letter of the address, on a colour taken
// #    from the address itself — so the same person always gets the
// #    same face, with nothing uploaded and nothing to fetch. The two
// #    sit above the page, not inside it, because they belong to every
// #    screen and must not scroll away with any one of them
// ============================================================
(() => {
  const $ = id => document.getElementById(id);
  const hud = $('hud'), dot = $('hud-sync'), face = $('hud-face');
  const board = $('board'), course = $('course'), session = $('session');

  // Picked to sit well on a dark page and to be told apart at a glance
  const SHADES = ['#6b8f71', '#7b6ea8', '#8a6a5e', '#5f7f99', '#947a4e', '#8a5f73'];

  const shadeOf = name => {
    let sum = 0;
    for (const letter of name) sum += letter.codePointAt(0);
    return SHADES[sum % SHADES.length];
  };

  // A tick means "it is in your Drive". A turning circle means "not yet".
  // There is no third quiet state: silence after an edit would read as
  // saved, and that is the one lie this corner must never tell
  const WORDS = {
    waiting: 'Not saved yet…',
    saving: 'Saving to your Drive…',
    saved: 'Saved to your Drive',
    arrived: 'An update arrived from your other device',
    failed: 'Not saved — your Drive access ran out',
    unread: 'Could not read your file from Drive'
  };

  window.MyTermHud = {
    face: email => {
      const who = (email || '?').trim();
      face.textContent = (who[0] || '?').toUpperCase();
      face.style.background = shadeOf(who);
      face.title = who + ' — your account and where your work is kept';
      hud.hidden = false;
    },

    hide: () => { hud.hidden = true; },

    sync: state => {
      const busy = state === 'saving' || state === 'waiting';
      const wrong = state === 'failed' || state === 'unread';
      dot.classList.toggle('busy', busy);
      dot.classList.toggle('wrong', wrong);
      dot.textContent = busy ? '' : wrong ? '!' : '✓';
      dot.title = WORDS[state] || WORDS.saved;
    }
  };

  face.onclick = () => {
    board.hidden = true;
    course.hidden = true;
    session.hidden = false;
  };
})();
