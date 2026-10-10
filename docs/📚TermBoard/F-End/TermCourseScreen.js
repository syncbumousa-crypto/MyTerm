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
  const tabs = $('course-tabs'), body = $('course-body');
  const fullBtn = $('course-full'), syncDot = $('course-sync');
  const fontDown = $('font-down'), fontUp = $('font-up'), fontNow = $('font-now');
  const colDown = $('col-down'), colUp = $('col-up'), colNow = $('col-now');
  const langBtn = $('course-lang');
  const eyeBtn = $('course-eye'), darkBtn = $('course-dark'), bookBtn = $('course-book');
  const barPull = $('course-bar-pull'), footPull = $('course-foot-pull');
  const zoomNow = $('zoom-now');

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
      + '<path d="M10 10a3.2 3.2 0 0 0 4.3 4.3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M5 9l7 7 7-7"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M19 15l-7-7-7 7"/></svg>'
  };

  bookBtn.innerHTML = ICONS.book;

  // ============================================================
  // # 🪝 🎚️  PULLING A STRIP OPEN, AND SHUTTING IT
  // # 🔤 JavaScript
  // # 🎯 The two tabs, their arrows, and remembering which strips this
  // #    reader left open
  // # 🔗 The arrow points THE WAY THE STRIP WILL GO when it is pressed,
  // #    not at the state it is in. Both readings exist and a reader
  // #    will take one of them — so it had better be the one that is
  // #    true of what happens next, because that is the half they are
  // #    about to act on.
  // #
  // #    Which strips are open is the reader's, like the size of type:
  // #    somebody who reads with both of them away should not have to
  // #    put them away again every time they open a chapter
  // ============================================================
  const STRIPS = { bar: 'myterm.read.bar', foot: 'myterm.read.foot' };

  const readShut = (key, fallback) => {
    try {
      const kept = localStorage.getItem(key);
      return kept === null ? fallback : kept === 'shut';
    } catch { return fallback; }
  };

  // The chapters are what the page is for, so they start open. The
  // controls are reached for now and then, so they start away — and the
  // tab that brings them back is sitting right where they went
  let barShut = readShut(STRIPS.bar, false);
  let footShut = readShut(STRIPS.foot, true);

  const paintStrips = () => {
    page.classList.toggle('bar-shut', barShut);
    page.classList.toggle('foot-shut', footShut);
    barPull.innerHTML = barShut ? ICONS.down : ICONS.up;
    barPull.title = barShut ? 'Show the chapters' : 'Hide the chapters';
    footPull.innerHTML = footShut ? ICONS.up : ICONS.down;
    footPull.title = footShut ? 'Show the controls' : 'Hide the controls';
  };

  barPull.onclick = () => {
    barShut = !barShut;
    writePref(STRIPS.bar, barShut ? 'shut' : 'open');
    paintStrips();
  };

  footPull.onclick = () => {
    footShut = !footShut;
    writePref(STRIPS.foot, footShut ? 'shut' : 'open');
    paintStrips();
    // The paper has more or less room under it now, and a sheet is only
    // ever as wide as the desk — so it is refitted, never recut
    window.MyTermPaper?.fit();
  };

  // ============================================================
  // # 🔍 🤏  PINCHING THE PAPER LARGER
  // # 🔤 JavaScript
  // # 🎯 Two fingers on a trackpad or on a screen make the sheet bigger
  // #    or smaller, and the strip says by how much
  // # 🔗 A TRACKPAD PINCH ARRIVES AS A WHEEL EVENT WITH CTRL HELD. That
  // #    is how the browser reports it, so catching that one event
  // #    covers both the pinch and a mouse held with ctrl — and catching
  // #    it is also what stops the browser zooming its own page, which
  // #    would blow up the strips and the menus along with the paper.
  // #
  // #    Zooming moves no row and changes no page number: what fits on a
  // #    sheet is counted against the sheet's real size, and this only
  // #    changes how large that sheet is DRAWN
  // ============================================================
  const ZOOM_PREF = 'myterm.read.zoom';

  const paintZoom = () => {
    zoomNow.textContent = Math.round((window.MyTermPaper?.zoomNow() ?? 1) * 100) + '%';
  };

  const zoomTo = (next, keep) => {
    const got = window.MyTermPaper?.zoom(next);
    if (got === undefined) return;
    paintZoom();
    if (keep) writePref(ZOOM_PREF, got);
  };

  document.addEventListener('wheel', event => {
    if (!openId || !event.ctrlKey) return;
    event.preventDefault();
    // Held to small steps. A trackpad sends these in a flood, and one
    // unclamped report from a fast pinch jumps the whole range at once
    const step = Math.max(-0.08, Math.min(0.08, -event.deltaY * 0.01));
    zoomTo((window.MyTermPaper?.zoomNow() ?? 1) + step, true);
  }, { passive: false });

  // ============================================================
  // # 🤏 📐  TWO FINGERS ON A SCREEN
  // # 🔤 JavaScript
  // # 🎯 The same, for a touch screen, where the browser reports two
  // #    fingers and not a pinch
  // # 🔗 THE FIRST TOUCH IS NOT REFUSED. Two fingers moving together is
  // #    a two-finger scroll, which every touchpad and screen allows,
  // #    and refusing the event at the start would kill that scroll on
  // #    every two-fingered touch — including the ones that were never
  // #    going to be a pinch. So the refusal waits until the distance
  // #    between the fingers has actually changed, at which point it is
  // #    a pinch for certain.
  // #
  // #    And the measure is the RATIO between now and the start, not a
  // #    running sum of changes: the paper then follows the fingers
  // #    exactly, and nothing drifts over a long pinch. The starting
  // #    distance is taken again at the moment it arms, or the paper
  // #    would jump by the whole threshold on the first frame
  // ============================================================
  const PINCH_ARM = 12;

  const spanOf = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  let pinch = null;

  document.addEventListener('touchstart', event => {
    if (!openId || event.touches.length !== 2) { pinch = null; return; }
    pinch = { from: spanOf(event.touches[0], event.touches[1]),
              was: window.MyTermPaper?.zoomNow() ?? 1, armed: false };
  }, { passive: true });

  document.addEventListener('touchmove', event => {
    if (!pinch) return;
    if (event.touches.length !== 2) { pinch = null; return; }
    const span = spanOf(event.touches[0], event.touches[1]);
    if (!pinch.armed) {
      if (Math.abs(span - pinch.from) < PINCH_ARM) return;
      pinch.armed = true;
      pinch.from = span;
    }
    event.preventDefault();
    zoomTo(pinch.was * (span / pinch.from), false);
  }, { passive: false });

  // Written down once the fingers are off, not on every frame of the
  // pinch — and only if it ever became a pinch at all
  ['touchend', 'touchcancel'].forEach(name => document.addEventListener(name, event => {
    if (!pinch || event.touches.length >= 2) return;
    const armed = pinch.armed;
    pinch = null;
    if (armed) writePref(ZOOM_PREF, window.MyTermPaper?.zoomNow() ?? 1);
  }, { passive: true }));

  const now = () => new Date().toISOString();
  const alive = course => (course.chapters || []).filter(h => !h.deleted);

  let openId = null, openChapter = null, wideTab = true;

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

  const repaper = () => window.MyTermPaper.paint(body, afterPaper, readLang);

  const applyRead = () => {
    page.style.setProperty('--read-font', fontPct + '%');
    page.style.setProperty('--term-col', termPx + 'px');
    fontNow.textContent = fontPct + '%';
    colNow.textContent = termPx + 'px';
    fontDown.disabled = fontPct <= FONTS[0];
    fontUp.disabled = fontPct >= FONTS[FONTS.length - 1];
    colDown.disabled = termPx <= COLS[0];
    colUp.disabled = termPx >= COLS[COLS.length - 1];
    // The globe says it by itself. A label beside it said the same thing
    // twice, and the only thing the second one added was the question of
    // whether it meant the language now or the one it would turn to
    langBtn.title = readLang === 'ar' ? 'Arabic — press for English' : 'English — press for Arabic';
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
  // ============================================================
  // # ⏱️ 🧮  HOW LONG A CHAPTER TAKES
  // # 🔤 JavaScript
  // # 🎯 Works out each part's minutes from the rule set on it, adds
  // #    them up, and writes the total beside the chapter
  // # 🔗 THE RULE IS STORED, THE MINUTES ARE WORKED OUT. A number typed
  // #    once stops being true the next time a row is added — and the
  // #    whole reason for asking is to know how much is left. So the
  // #    reader says what one row costs them, or what one page costs
  // #    them, and the total follows whatever is actually in the part.
  // #
  // #    It is written into the chapter's own minutes, which is where
  // #    the board already reads its hours from — so the card on the
  // #    board, the bar on the tab and this all say the one number
  // ============================================================
  const minutesOf = part => {
    if (!part.each) return 0;
    if (part.per === 'page') {
      const rows = window.MyTermChapterStore?.rowsOf(part.id) || [];
      return (window.MyTermPaper?.pagesOf(rows) || 0) * part.each;
    }
    return part.rows * part.each;
  };

  const retime = () => {
    const c = course();
    const ch = c && alive(c).find(h => h.id === openChapter);
    if (!ch || window.MyTermChapterStore?.openId() !== ch.id) return;
    const total = (window.MyTermChapterStore.sections() || [])
      .reduce((sum, part) => sum + minutesOf(part), 0);
    if (ch.minutes === total) return;
    ch.minutes = total;
    ch.updatedAt = now();
    touch();
  };

  // What the paper calls when it has been cut again: the readings on the
  // strip are all counted off the rows, so they are all out of date
  const afterPaper = () => { retime(); drawTabs(); };

  // One line of the two under a chapter's name: a rail with a filled
  // part and a reading beside it. Both are drawn the same way because
  // they are the same KIND of thing — how far through something you are
  // — and a reader should not have to learn two shapes for that
  const barOf = (kind, done, total, words) => {
    const line = document.createElement('span');
    line.className = 'ctab-line';

    const rail = document.createElement('span');
    rail.className = 'ctab-bar ' + kind;
    const fill = document.createElement('i');
    fill.style.width = (total > 0 ? Math.round(Math.min(1, done / total) * 100) : 0) + '%';
    rail.append(fill);

    const count = document.createElement('span');
    count.className = 'ctab-count';
    count.textContent = words;

    line.append(rail, count);
    return line;
  };

  // ============================================================
  // # 🗂️ ➕  THE STRIP OF CHAPTERS
  // # 🔤 JavaScript
  // # 🎯 One tab per chapter — its name, how much of its hours are done
  // #    and how much of it is learnt — the parts inside the open one,
  // #    and the two ways to add
  // # 🔗 The two lines are the two questions a reader asks of a chapter
  // #    and they are not the same question: HOW MUCH OF IT HAVE I SAT
  // #    WITH is hours, and HOW MUCH OF IT DO I KNOW is ticks. A chapter
  // #    can be all hours and no knowing, and that is worth seeing.
  // #
  // #    The hours are the chapter's own; the learnt count is a copy the
  // #    chapter writes into the course paper when it is open, so every
  // #    tab can show it and not only the one in hand
  // ============================================================
  const drawTabs = () => {
    const c = course();
    tabs.textContent = '';
    if (!c) return;

    const hours = window.MyTermHours;
    const list = alive(c);

    list.forEach((ch, index) => {
      // TWO THINGS AND NOT ONE: whether this is the chapter being read,
      // and whether its tab is unfolded. They were one, and then folding
      // a tab away had to mean closing the chapter — so a reader who
      // wanted the strip smaller had to stop reading to get it. Folded,
      // the chapter being read still says so with a white name and a
      // lighter edge, because the white part that said it is inside
      const open = ch.id === openChapter;
      const wide = open && wideTab;
      const tab = document.createElement('div');
      tab.className = 'ctab' + (open ? ' on' : '') + (wide ? ' wide' : '');
      tab.dataset.chapter = ch.id;

      const head = document.createElement('span');
      head.className = 'ctab-head';
      const no = document.createElement('span');
      no.className = 'ctab-no';
      no.textContent = 'C' + (index + 1);

      // The name is the way in AND the way to change it: one press opens
      // the chapter, and a press on a chapter already open opens its
      // name for writing. A pencil beside every tab would be five more
      // things on a strip whose whole job is to be small
      const name = document.createElement('span');
      name.className = 'ctab-name';
      name.textContent = ch.name || 'Unnamed chapter';
      name.title = open ? 'Press to rename' : ch.name || 'Unnamed chapter';
      name.onclick = event => {
        event.stopPropagation();
        if (open) renameChapter(ch, name);
        else openOne(ch.id);
      };

      head.append(no, name);

      // How long the chapter takes, to the right of its name. It is not
      // typed and not stored as a number: it is the sum of what its
      // parts come to under the rules set on them, so it follows every
      // row added and every row taken away without anybody going back
      // to correct it
      const span = document.createElement('span');
      span.className = 'ctab-time';
      span.textContent = ch.minutes ? (hours ? hours.fmt(ch.minutes) : ch.minutes + 'm') : '—';
      span.title = ch.minutes ? 'What this chapter comes to' : 'No pace set on its parts yet';
      head.append(span);

      // The way to add a part sits beside the chapter's own name, small,
      // and only while the chapter is unfolded. It belongs to the
      // CHAPTER — a plus at the end of the row of parts read as one more
      // part, which is the one thing it is not
      if (wide) {
        const addPart = document.createElement('button');
        addPart.className = 'ctab-addpart';
        addPart.type = 'button';
        addPart.textContent = '+';
        addPart.title = 'Add a part to this chapter';
        addPart.onclick = event => {
          event.stopPropagation();
          if (!window.MyTermChapterStore?.addSection()) return;
          drawTabs();
          drawRows();
        };
        head.append(addPart);
      }

      // The open chapter is counted from the rows themselves, the rest
      // from the tally each wrote beside itself last time it saved. The
      // open one has its two files in hand, so asking them is both
      // cheaper and newer — and a reader ticking a box watches the bar
      // move under it rather than waiting for the save
      const live = open && window.MyTermChapterStore?.openId() === ch.id
        ? window.MyTermChapterStore.counts() : null;
      const rowsOf = live ? live.rows : ch.rows;
      const learntOf = live ? live.learnt : ch.learnt;

      tab.append(head);

      // A FOLDED chapter says how far through it you are; an unfolded
      // one hands that question to its parts and gets out of their way.
      // Both at once would be the same thing said twice at two sizes,
      // and the whole of it is only the sum of the parts underneath
      if (wide) {
        tab.append(partsOf());
      } else {
        const lines = document.createElement('span');
        lines.className = 'ctab-lines';
        lines.append(
          barOf('done', ch.doneMinutes, ch.minutes, hours ? hours.fmt(ch.minutes) : ''),
          barOf('learnt', learntOf, rowsOf, rowsOf ? learntOf + '/' + rowsOf : '—'));
        tab.append(lines);
      }

      // Pressing the chapter you are already in folds its tab away, and
      // again unfolds it. It does not stop you reading it: making the
      // strip smaller should not cost you the page you are on
      tab.onclick = () => {
        if (!open) { openOne(ch.id); return; }
        wideTab = !wideTab;
        drawTabs();
      };
      tabs.append(tab);
    });

    // After the last chapter, the way to another one. It stands in the
    // strip where the chapter it adds will stand
    const more = document.createElement('button');
    more.className = 'ctab-new';
    more.type = 'button';
    more.textContent = '+';
    more.title = 'Add a chapter';
    more.onclick = () => {
      const made = { id: 'h-' + Math.random().toString(36).slice(2, 8),
                     name: 'Chapter ' + (alive(c).length + 1),
                     done: false, minutes: 0, doneMinutes: 0, rows: 0, learnt: 0,
                     updatedAt: now(), deleted: false };
      c.chapters = c.chapters || [];
      c.chapters.push(made);
      touch();
      openOne(made.id);
    };
    tabs.append(more);
  };

  // ============================================================
  // # 📑 ➕  THE PARTS INSIDE THE OPEN CHAPTER
  // # 🔤 JavaScript
  // # 🎯 A small square for every part of the chapter, and one more to
  // #    start another
  // # 🔗 Only the open chapter shows them. A strip where every chapter
  // #    unfolded everything it holds is a strip taller than the page it
  // #    sits over — and the parts of a chapter nobody is reading are
  // #    not a thing anybody is looking for
  // ============================================================
  const partsOf = () => {
    const box = document.createElement('span');
    box.className = 'ctab-parts';

    const parts = window.MyTermChapterStore?.sections() || [];
    const here = window.MyTermChapterStore?.openSection();

    parts.forEach(part => {
      const one = document.createElement('div');
      one.className = 'ctab-part' + (part.id === here ? ' on' : '');

      const line = document.createElement('span');
      line.className = 'ctab-part-head';

      // The gear stands to the LEFT of the part's name, where nothing
      // else on this strip stands — so it is never confused with the
      // plus on the chapter above it, which is on the right and adds
      // rather than sets
      const gear = document.createElement('button');
      gear.className = 'ctab-gear';
      gear.type = 'button';
      gear.textContent = '⚙';
      gear.title = 'How long this part takes';
      gear.onclick = event => {
        event.stopPropagation();
        askPace(part, gear);
      };

      const name = document.createElement('span');
      name.className = 'ctab-part-name';
      name.textContent = part.name;
      line.append(gear, name);

      // The same two lines the chapter wore, now where they belong: one
      // part at a time, at a size that can be read
      const lines = document.createElement('span');
      lines.className = 'ctab-lines';
      lines.append(
        barOf('done', part.written, part.rows,
              part.rows ? part.written + '/' + part.rows : '—'),
        barOf('learnt', part.learnt, part.rows,
              part.rows ? part.learnt + '/' + part.rows : '—'));
      one.append(line, lines);

      one.title = part.rows
        ? part.written + ' of ' + part.rows + ' written, ' + part.learnt + ' learnt'
        : 'Nothing written in it yet';
      one.onclick = event => {
        event.stopPropagation();
        window.MyTermChapterStore.useSection(part.id);
        drawTabs();
        drawRows();
      };
      box.append(one);
    });

    return box;
  };

  // ============================================================
  // # ⏱️ ⚙️  SAYING WHAT A PART COSTS
  // # 🔤 JavaScript
  // # 🎯 Two ways of reckoning — by the row or by the page — and how
  // #    many minutes each one costs
  // # 🔗 BY THE PAGE IS NOT THE SAME AS BY THE ROW and neither is
  // #    always right. A list of terms is read a row at a time and
  // #    costs by the row; a part written as prose is read a page at a
  // #    time and a row of it means nothing. So the reader says which,
  // #    and what it comes to is shown while they are choosing — a
  // #    number of minutes per row tells nobody how long the part is
  // ============================================================
  let paceBox = null;

  const shutPace = () => { if (paceBox) paceBox.remove(); paceBox = null; };

  const askPace = (part, near) => {
    shutPace();

    let per = part.per, each = part.each;
    const pages = window.MyTermPaper?.pagesOf(window.MyTermChapterStore?.rowsOf(part.id) || []) || 0;

    paceBox = document.createElement('div');
    paceBox.className = 'cmenu asking cpace';
    paceBox.onclick = event => event.stopPropagation();

    const title = document.createElement('p');
    title.className = 'cmenu-ask';
    title.textContent = part.name;

    const pick = document.createElement('div');
    pick.className = 'cpace-pick';

    const sum = document.createElement('p');
    sum.className = 'cmenu-why';

    const box = document.createElement('input');
    box.type = 'text';
    box.inputMode = 'numeric';
    box.className = 'cmenu-box';
    box.value = each ? String(each) : '';
    box.placeholder = '0';

    const howMany = () => (per === 'page' ? pages : part.rows);

    const retell = () => {
      const minutes = (Number(plainDigits(box.value)) || 0) * howMany();
      sum.textContent = howMany() + (per === 'page' ? ' pages' : ' rows') + ' → '
        + (minutes ? (window.MyTermHours ? window.MyTermHours.fmt(minutes) : minutes + 'm') : 'nothing yet');
    };

    [['row', 'By the row'], ['page', 'By the page']].forEach(([which, words]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cpace-one' + (per === which ? ' on' : '');
      button.textContent = words;
      button.onclick = () => {
        per = which;
        [...pick.children].forEach(b => b.classList.toggle('on', b === button));
        retell();
      };
      pick.append(button);
    });

    const line = document.createElement('div');
    line.className = 'cmenu-line';
    const unit = document.createElement('span');
    unit.className = 'cpace-unit';
    unit.textContent = 'min each';

    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'cmenu-go';
    go.textContent = 'OK';
    go.onclick = () => {
      window.MyTermChapterStore.setPace(part.id, per, Number(plainDigits(box.value)) || 0);
      shutPace();
      retime();
      drawTabs();
    };

    box.oninput = retell;
    box.onkeydown = event => {
      if (event.key === 'Enter') { event.preventDefault(); go.click(); }
      if (event.key === 'Escape') { event.preventDefault(); shutPace(); }
    };

    line.append(box, unit, go);
    paceBox.append(title, pick, line, sum);
    retell();

    document.body.append(paceBox);
    const spot = near.getBoundingClientRect();
    const wide = paceBox.offsetWidth, tall = paceBox.offsetHeight;
    paceBox.style.left = Math.min(Math.round(spot.left), window.innerWidth - wide - 8) + 'px';
    paceBox.style.top = Math.min(Math.round(spot.bottom + 6), window.innerHeight - tall - 8) + 'px';
    box.focus();
    box.select();
  };

  // An Arabic keyboard writes ٥ and not 5, and both are taken — the same
  // rule the row menu was given, for the same reason
  const plainDigits = s => String(s == null ? '' : s)
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0));

  document.addEventListener('mousedown', event => {
    if (paceBox && !paceBox.contains(event.target)) shutPace();
  });

  // ============================================================
  // # ✏️ 🏷️  RENAMING A CHAPTER WHERE IT STANDS
  // # 🔤 JavaScript
  // # 🎯 Turns the name on the tab into a box to type in, and puts back
  // #    whatever is left in it
  // # 🔗 In the tab itself, not in a box in the middle of the screen: a
  // #    name is read in its place and should be changed in its place.
  // #    An empty name is refused by keeping the old one — a chapter
  // #    called nothing is a tab that cannot be pressed
  // ============================================================
  const renameChapter = (ch, slot) => {
    const box = document.createElement('input');
    box.className = 'ctab-rename';
    box.value = ch.name || '';
    box.onclick = event => event.stopPropagation();

    const done = keep2 => {
      const want = box.value.trim();
      if (keep2 && want && want !== ch.name) {
        ch.name = want;
        ch.updatedAt = now();
        touch();
      }
      drawTabs();
    };

    box.onkeydown = event => {
      if (event.key === 'Enter') { event.preventDefault(); done(true); }
      if (event.key === 'Escape') { event.preventDefault(); done(false); }
    };
    box.onblur = () => done(true);

    slot.replaceWith(box);
    box.focus();
    box.select();
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
    // And the strip is drawn AGAIN, now that the chapter's own files are
    // here. The first drawing happened before they had been read, so the
    // tab could not yet say what parts the chapter holds or how much of
    // it is learnt — it showed an empty row of parts and a dash
    drawTabs();
    drawRows();
  }

  const openOne = id => {
    openChapter = id;
    // A chapter just opened shows what is in it. Folding is something
    // the reader does to a chapter they already have open, so it starts
    // over whenever a different one is opened
    wideTab = true;
    try { if (openId) localStorage.setItem(lastChapterKey(openId), id); } catch {}
    drawTabs();
    drawBody();
  };

  const draw = () => {
    const c = course();
    if (!c) return;
    // The course's name is the window's name now. It is not on the page
    // any more — it was the same word over the same page for an hour, in
    // the one strip a reader wants out of the way — and a tab is where a
    // name is actually wanted: it is how this window is told from the
    // board's, and from the other course open beside it
    document.title = (c.name || 'Untitled course') + ' — MyTerm';

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
      paintStrips();
      // Whatever was left last time, put back before the first sheet is
      // drawn — a reader who reads at 140% should not watch the page
      // arrive small and then jump
      window.MyTermPaper?.zoom(readPref(ZOOM_PREF, 1));
      paintZoom();
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
