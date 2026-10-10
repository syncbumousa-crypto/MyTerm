// ============================================================
// # 📖 🚪  A PAGE OF ITS OWN FOR EVERY COURSE
// # 🔤 JavaScript
// # 🎯 Opens one course on a page to itself, reached by pressing its
// #    strip on the board: a top strip of its chapters, a body for the
// #    chapter in hand, and a bottom strip for how the page is read
// # 🔗 Two kinds of thing are kept apart here and never mixed. What is
// #    TRUE OF THE TERM — a chapter's name, its hours, whether it is
// #    finished — goes through the same store the board uses, so it
// #    reaches Drive and the phone. What is ONE READER'S PREFERENCE —
// #    the size of type, the width of the column, which chapter was
// #    last open — stays in this browser: it is not part of the term,
// #    and syncing it would mean the laptop reaching over to change
// #    what the phone looks like
// ============================================================
(() => {
  const keep = window.MyTermBoardStore;
  const $ = id => document.getElementById(id);

  const page = $('course'), board = $('board');
  const title = $('course-title'), tabs = $('course-tabs'), body = $('course-body');
  const fullBtn = $('course-full'), syncDot = $('course-sync');
  const fontDown = $('font-down'), fontUp = $('font-up'), fontNow = $('font-now');
  const colDown = $('col-down'), colUp = $('col-up'), colNow = $('col-now');
  const langBtn = $('course-lang'), langNow = $('lang-now');
  const eyeBtn = $('course-eye'), darkBtn = $('course-dark'), bookBtn = $('course-book');
  const foot = $('course-foot'), footZone = $('course-foot-zone');

  // ============================================================
  // # 🖼️ ✒️  THE ICONS OF THE STRIP
  // # 🔤 JavaScript
  // # 🎯 The drawings on the four buttons whose picture changes with
  // #    what they are showing
  // # 🔗 Drawn as lines rather than set as letters or little pictures,
  // #    so they take the colour of the button they sit on and come out
  // #    the same weight at any size — and so a button that is a STATE
  // #    can say which state by changing its drawing: an open eye or a
  // #    struck-through one, a moon or a sun. These are the reader's
  // #    own, traced from their pages so the same picture means the same
  // #    thing in both
  // ============================================================
  const ICONS = {
    book: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'
      + '<path d="M6.5 2.5H20v19H6.5A2.5 2.5 0 0 1 4 19V5a2.5 2.5 0 0 1 2.5-2.5z"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><line x1="12" y1="1.8" x2="12" y2="4"/>'
      + '<line x1="12" y1="20" x2="12" y2="22.2"/><line x1="4.2" y1="4.2" x2="5.8" y2="5.8"/>'
      + '<line x1="18.2" y1="18.2" x2="19.8" y2="19.8"/><line x1="1.8" y1="12" x2="4" y2="12"/>'
      + '<line x1="20" y1="12" x2="22.2" y2="12"/><line x1="4.2" y1="19.8" x2="5.8" y2="18.2"/>'
      + '<line x1="18.2" y1="5.8" x2="19.8" y2="4.2"/></svg>',
    expand: '<svg viewBox="0 0 24 24"><path d="M8.5 3H5a2 2 0 0 0-2 2v3.5"/><path d="M15.5 3H19a2 2 0 0 1 2 2v3.5"/>'
      + '<path d="M21 15.5V19a2 2 0 0 1-2 2h-3.5"/><path d="M3 15.5V19a2 2 0 0 0 2 2h3.5"/></svg>',
    collapse: '<svg viewBox="0 0 24 24"><path d="M8.5 3v3.5a2 2 0 0 1-2 2H3"/><path d="M21 8.5h-3.5a2 2 0 0 1-2-2V3"/>'
      + '<path d="M15.5 21v-3.5a2 2 0 0 1 2-2H21"/><path d="M3 15.5h3.5a2 2 0 0 1 2 2V21"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M1.8 12S5.5 5 12 5s10.2 7 10.2 7-3.7 7-10.2 7S1.8 12 1.8 12z"/>'
      + '<circle cx="12" cy="12" r="3.2"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24"><path d="M9.6 5.3A9.8 9.8 0 0 1 12 5c6.5 0 10.2 7 10.2 7a17 17 0 0 1-3 3.9"/>'
      + '<path d="M6.5 6.8A17 17 0 0 0 1.8 12S5.5 19 12 19a9.9 9.9 0 0 0 4-.8"/>'
      + '<path d="M10 10a3.2 3.2 0 0 0 4.3 4.3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>'
  };

  bookBtn.innerHTML = ICONS.book;

  // ============================================================
  // # 👋 🫥  CALLING THE STRIP UP
  // # 🔤 JavaScript
  // # 🎯 Slides the bottom strip into view when the pointer comes near
  // #    the bottom edge, and lets it go again a moment after it leaves
  // # 🔗 The moment is deliberate: leaving the strip to cross a gap of
  // #    two pixels on the way to a button at the other end of it would
  // #    otherwise drop it out from under the hand. And the zone is a
  // #    thing of its own because a strip that is off the screen cannot
  // #    be hovered and so can never call itself up.
  // #
  // #    It answers a TOUCH as well as a pointer. The first version
  // #    asked the browser whether it could hover and left the strip
  // #    standing still when it said no — and this very browser, driven
  // #    by a mouse, answers no: the strip never moved once. Asking a
  // #    browser what kind of machine it is on is a guess; answering
  // #    both ways is not
  // ============================================================
  let footTimer = null;

  const showFoot = () => { clearTimeout(footTimer); foot.classList.add('show'); };
  const hideFoot = () => {
    clearTimeout(footTimer);
    footTimer = setTimeout(() => foot.classList.remove('show'), 350);
  };

  footZone.addEventListener('mouseenter', showFoot);
  footZone.addEventListener('pointerdown', showFoot);
  foot.addEventListener('mouseenter', showFoot);
  foot.addEventListener('mouseleave', hideFoot);

  // A finger has no "away", so the strip is let go when the reader
  // touches the paper again rather than when a pointer leaves the strip
  body.addEventListener('pointerdown', () => {
    if (foot.classList.contains('show')) hideFoot();
  });

  const now = () => new Date().toISOString();
  const alive = course => (course.chapters || []).filter(h => !h.deleted);

  let openId = null, openChapter = null;

  const course = () => (keep.live()?.courses || []).find(c => c.id === openId) || null;
  const touch = () => { keep.touchCourse(openId); keep.change(keep.live()); };

  // ============================================================
  // # 👁️ 💾  WHAT BELONGS TO THE READER, NOT TO THE TERM
  // # 🔤 JavaScript
  // # 🎯 The size of type, the width of the column, and which chapter
  // #    was last open — kept in this browser only
  // # 🔗 Type size and column width carry no course in their name: they
  // #    are the same wherever you read, and a reader who found the
  // #    size that suits them should not have to find it again in the
  // #    next course. Which chapter was open does carry one, because a
  // #    chapter number means nothing outside the course it belongs to
  // ============================================================
  const PREF = { font: 'myterm.read.font', col: 'myterm.read.termcol',
                 lang: 'myterm.read.lang', dark: 'myterm.read.darkpaper' };
  const FONTS = [85, 100, 115, 130, 150];

  // How wide the Term column is drawn, in the sheet's own units. What it
  // loses the meaning column gains, because that one is given no width
  // and takes whatever is left. The sheet is an A4 and never moves: a
  // reader whose terms are two words wants them narrow, and one writing
  // whole phrases wants them wide, and neither of them wants a different
  // sized page
  const COLS = [110, 140, 180, 230, 290];

  const readPref = (key, fallback) => {
    try { const v = Number(localStorage.getItem(key)); return Number.isFinite(v) && v > 0 ? v : fallback; }
    catch { return fallback; }
  };
  const writePref = (key, value) => { try { localStorage.setItem(key, String(value)); } catch {} };

  const lastChapterKey = id => 'myterm.read.chapter.' + id;

  let fontPct = readPref(PREF.font, 100);
  let termPx = readPref(PREF.col, 180);

  // Which of a row's two languages is on the paper. A preference of the
  // reader, like the size of type — not a fact of the term. Turning the
  // laptop to Arabic must not turn the phone to Arabic, and the words
  // themselves are in the file either way, both of them, always
  let readLang = 'en';
  try { if (localStorage.getItem(PREF.lang) === 'ar') readLang = 'ar'; } catch {}

  // Dark paper is the reader's too, and it is one word on the body
  // rather than a second set of colours — the sheet is turned over
  // whole, so nothing written on it has to know
  let darkPaper = false;
  try { darkPaper = localStorage.getItem(PREF.dark) === 'yes'; } catch {}

  const repaper = () => window.MyTermPaper.paint(body, drawTabs, readLang);

  const applyRead = () => {
    page.style.setProperty('--read-font', fontPct + '%');
    page.style.setProperty('--term-col', termPx + 'px');
    fontNow.textContent = fontPct + '%';
    colNow.textContent = termPx + 'px';
    fontDown.disabled = fontPct <= FONTS[0];
    fontUp.disabled = fontPct >= FONTS[FONTS.length - 1];
    colDown.disabled = termPx <= COLS[0];
    colUp.disabled = termPx >= COLS[COLS.length - 1];
    langNow.textContent = readLang === 'ar' ? 'ع' : 'EN';
    document.body.classList.toggle('darkpaper', darkPaper);
    darkBtn.innerHTML = darkPaper ? ICONS.sun : ICONS.moon;
    darkBtn.title = darkPaper ? 'White paper' : 'Dark paper';
    fullBtn.innerHTML = document.fullscreenElement ? ICONS.collapse : ICONS.expand;
    // Every one of these moves where a sheet runs out — bigger type holds
    // fewer rows, a narrower Term column makes its words wrap over more
    // lines, and the other language is not the same length — so the paper
    // is cut again. The sheet itself is the one thing that never moves
    if (window.MyTermChapterStore?.openId()) repaper();
    paintEye();
  };

  // Steps, not free numbers: a reader pressing a button wants the next
  // size that is clearly different, not one per cent more
  const step = (list, value, way) => {
    const at = list.indexOf(value);
    const from = at >= 0 ? at : list.findIndex(x => x >= value);
    return list[Math.max(0, Math.min(list.length - 1, (from < 0 ? 0 : from) + way))];
  };

  fontDown.onclick = () => { fontPct = step(FONTS, fontPct, -1); writePref(PREF.font, fontPct); applyRead(); };
  fontUp.onclick = () => { fontPct = step(FONTS, fontPct, 1); writePref(PREF.font, fontPct); applyRead(); };
  colDown.onclick = () => { termPx = step(COLS, termPx, -1); writePref(PREF.col, termPx); applyRead(); };
  colUp.onclick = () => { termPx = step(COLS, termPx, 1); writePref(PREF.col, termPx); applyRead(); };

  // ============================================================
  // # 👁️ 🔁  THE EYE
  // # 🔤 JavaScript
  // # 🎯 Covers every meaning on the sheet, or shows everything
  // # 🔗 It is coloured while anything at all is covered — including one
  // #    cell turned over by hand — so the eye is never claiming the
  // #    sheet is open when part of it is not. That is why the paper
  // #    calls back here whenever a single cell is turned over: two
  // #    places showing the same state is two places to go wrong, and
  // #    the one that knows is the one that tells
  // ============================================================
  const paintEye = () => {
    const hidden = window.MyTermPaper?.covers.any() === true;
    eyeBtn.classList.toggle('on', hidden);
    eyeBtn.innerHTML = hidden ? ICONS.eyeOff : ICONS.eye;
    eyeBtn.title = hidden ? 'Show everything' : 'Hide the meanings';
  };

  window.MyTermCourseEye = paintEye;

  eyeBtn.onclick = () => {
    const covers = window.MyTermPaper?.covers;
    if (!covers) return;
    covers.all(!covers.any());
    paintEye();
  };

  // The button says which language is ON the paper, not which one it
  // would turn to — the same way the one beside it says what size the
  // type is now, and not what size pressing it would make it
  langBtn.onclick = () => {
    readLang = readLang === 'ar' ? 'en' : 'ar';
    writePref(PREF.lang, readLang);
    applyRead();
  };

  // Turning the paper over changes no height and moves no row, so there
  // is nothing to cut again — applyRead would do it for nothing
  darkBtn.onclick = () => {
    darkPaper = !darkPaper;
    writePref(PREF.dark, darkPaper ? 'yes' : 'no');
    document.body.classList.toggle('darkpaper', darkPaper);
    darkBtn.innerHTML = darkPaper ? ICONS.sun : ICONS.moon;
    darkBtn.title = darkPaper ? 'White paper' : 'Dark paper';
  };

  fullBtn.onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else page.requestFullscreen?.().catch(() => {});
  };

  // The drawing follows what actually happened, not what was asked for:
  // a window can leave fullscreen by the Escape key, which never comes
  // past the button
  document.addEventListener('fullscreenchange', () => {
    fullBtn.innerHTML = document.fullscreenElement ? ICONS.collapse : ICONS.expand;
    fullBtn.title = document.fullscreenElement ? 'Leave fullscreen' : 'Fullscreen';
  });

  // ============================================================
  // # 🗂️ 📊  THE STRIP OF CHAPTERS
  // # 🔤 JavaScript
  // # 🎯 One tab per chapter: its number, its name, how much of its
  // #    hours are done, and a bar for the same thing seen
  // # 🔗 Every number here is counted from the chapter itself, never
  // #    stored beside it. A tab that kept its own copy of the count
  // #    would be a second place for the truth to live, and the two
  // #    would part on the first edit made anywhere else
  // ============================================================
  const drawTabs = () => {
    const c = course();
    tabs.textContent = '';
    if (!c) return;

    const list = alive(c);
    list.forEach((ch, index) => {
      const tab = document.createElement('button');
      tab.className = 'ctab' + (ch.id === openChapter ? ' on' : '');
      tab.type = 'button';
      tab.dataset.chapter = ch.id;

      const head = document.createElement('span');
      head.className = 'ctab-head';
      const no = document.createElement('span');
      no.className = 'ctab-no';
      no.textContent = 'C' + (index + 1);
      const name = document.createElement('span');
      name.className = 'ctab-name';
      name.textContent = ch.name || 'Unnamed chapter';
      head.append(no, name);

      const hours = window.MyTermHours;
      const line = document.createElement('span');
      line.className = 'ctab-hours';
      if (hours) line.append(hours.pair(ch.doneMinutes, ch.minutes));

      const bar = document.createElement('span');
      bar.className = 'ctab-bar';
      const fill = document.createElement('i');
      fill.style.width = (hours ? hours.cover(ch) : 0) + '%';
      bar.append(fill);

      tab.append(head, line, bar);
      tab.onclick = () => openOne(ch.id);
      tabs.append(tab);
    });

    if (!list.length) {
      const none = document.createElement('p');
      none.className = 'ctab-none';
      none.textContent = 'No chapters yet — add one from the gear on the board.';
      tabs.append(none);
    }
  };

  // ============================================================
  // # 📄 📋  THE CHAPTER IN HAND
  // # 🔤 JavaScript
  // # 🎯 The chapter's own table: a row per term, a tick for each, and
  // #    the way to write new ones
  // # 🔗 Two files stand behind this table and they are never confused.
  // #    The words come from the chapter's content; the ticks come from
  // #    its state. Typing a term rewrites one, ticking a box rewrites
  // #    the other, and the other device downloads only what changed.
  // #    A chapter that could not be read says so and offers to try
  // #    again — it never shows an empty table, because an empty table
  // #    is what a chapter with nothing in it looks like, and a reader
  // #    told that about a chapter they filled last night would believe
  // #    their work was gone
  // ============================================================
  let loading = false;

  const sayTrouble = words => {
    body.textContent = '';
    const box = document.createElement('div');
    box.className = 'cempty';
    const line = document.createElement('p');
    line.textContent = words;
    const again = document.createElement('button');
    again.className = 'csheet-done';
    again.type = 'button';
    again.textContent = 'Try again';
    again.onclick = () => loadChapter();
    box.append(line, again);
    body.append(box);
  };

  // The sheets themselves are laid out elsewhere, because cutting rows
  // into pages is a trade of its own: it measures, it counts, and it
  // knows nothing about courses or chapters. All that is handed over is
  // the box to draw in, and what to call when a tick changes — the strip
  // of chapters above shows the same count and would otherwise go stale
  const drawRows = () => {
    if (!window.MyTermChapterStore?.content()) return;
    repaper();
  };

  const drawBody = () => {
    const c = course();
    if (!c) return;

    const ch = alive(c).find(h => h.id === openChapter);
    if (!ch) {
      body.textContent = '';
      const empty = document.createElement('p');
      empty.className = 'cempty';
      empty.textContent = alive(c).length ? 'Pick a chapter above.' : 'This course has no chapters yet.';
      body.append(empty);
      return;
    }

    if (window.MyTermChapterStore?.openId() === ch.id) drawRows();
    else loadChapter();
  };

  async function loadChapter() {
    const c = course();
    const ch = c && alive(c).find(h => h.id === openChapter);
    if (!c || !ch || loading) return;

    loading = true;
    body.textContent = '';
    const wait = document.createElement('p');
    wait.className = 'cempty';
    wait.textContent = 'Opening the chapter…';
    body.append(wait);

    const opened = await window.MyTermChapterStore.open(keep.live(), c, ch).catch(() => null);
    loading = false;

    if (!opened) {
      sayTrouble('Could not read this chapter from your Drive. Nothing was lost — what is in it is still there.');
      return;
    }
    // Making the folder and the two files writes ids beside the chapter,
    // and those ids belong in the course paper or the next open makes
    // them all over again
    touch();
    drawRows();
  }

  const openOne = id => {
    openChapter = id;
    try { if (openId) localStorage.setItem(lastChapterKey(openId), id); } catch {}
    drawTabs();
    drawBody();
  };

  const draw = () => {
    const c = course();
    if (!c) return;
    title.textContent = c.name || 'Untitled course';

    const list = alive(c);
    if (!list.some(h => h.id === openChapter)) {
      let remembered = null;
      try { remembered = localStorage.getItem(lastChapterKey(openId)); } catch {}
      openChapter = list.some(h => h.id === remembered) ? remembered : (list[0]?.id ?? null);
    }
    drawTabs();
    drawBody();
  };

  // There is no way back from here, and that is the point: this page is
  // a tab of its own, opened on one course, and the board is still
  // sitting in the tab it was opened from, exactly as it was left. A way
  // back would have to go somewhere — and the only somewhere was a
  // SECOND board, built in this tab and never meant to be seen. Closing
  // the tab is the way back, and it is the way back the reader already
  // knows without being told

  // A window that changed width changes only how SMALL the sheet is
  // drawn — never what is on it, because the sheet is an A4 whatever the
  // window is. So the paper is refitted and not recut: no row moves, no
  // page number changes, and a reader typing in a cell while the window
  // is dragged keeps the cell they were in
  let waiting = null;
  window.addEventListener('resize', () => {
    if (!openId || !window.MyTermChapterStore?.openId()) return;
    clearTimeout(waiting);
    waiting = setTimeout(() => window.MyTermPaper.fit(), 120);
  });

  // The same tick the board's corner shows, said again here: this page can
  // be the only thing on screen for an hour, and a reader must never have
  // to go back to the board to find out whether their work was kept
  const WORDS = { waiting: 'Not saved yet…', saving: 'Saving to your Drive…', saved: 'Saved to your Drive',
                  arrived: 'An update arrived from your other device',
                  failed: 'Not saved — your Drive access ran out',
                  unread: 'Could not read your file from Drive' };

  window.MyTermChapterStore?.watch(state => window.MyTermCourseSync(state));

  window.MyTermCourseSync = state => {
    if (!syncDot) return;
    const busy = state === 'saving' || state === 'waiting';
    const wrong = state === 'failed' || state === 'unread';
    syncDot.classList.toggle('busy', busy);
    syncDot.classList.toggle('wrong', wrong);
    syncDot.textContent = busy ? '' : wrong ? '!' : '✓';
    syncDot.title = WORDS[state] || WORDS.saved;
  };

  // ============================================================
  // # 🔗 🪟  ARRIVING HERE BY ADDRESS
  // # 🔤 JavaScript
  // # 🎯 A tab opened on ?course=<id> IS that course's page — the board
  // #    is never shown in it at all
  // # 🔗 asked() is read by the board screen before it shows anything, so
  // #    this tab never flashes a board and then covers it. That is what
  // #    it looked like before, and what it was: the whole board built
  // #    and shown, with another screen laid over it a moment later.
  // #
  // #    The landing is tried only once a tab, because the board paints
  // #    twice — first from what was kept here, then when Drive answers
  // ============================================================
  let cameByAddress = false;

  const askedFor = () => new URLSearchParams(location.search).get('course');

  window.MyTermCoursePage = {
    asked: askedFor,

    open: id => {
      openId = id;
      window.MyTermCurtain?.down();
      board.hidden = true;
      page.hidden = false;
      // The shell's floating corner and its build mark belong to the board.
      // This page pins its own strips to both edges, and the two of them
      // landed on top of it — the avatar over the chapter tabs, the build
      // mark over the first button. A page that fills the window says so
      document.body.classList.add('reading');
      applyRead();
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
    // News from the other device lands here too, not only on the board —
    // and the chapter in hand re-reads its own two files, because the
    // board's paper knows nothing about which rows were ticked
    redraw: async () => {
      if (!openId) return;
      if (window.MyTermChapterStore?.openId()) {
        await window.MyTermChapterStore.refresh();
        drawRows();
      }
      draw();
    }
  };
})();
