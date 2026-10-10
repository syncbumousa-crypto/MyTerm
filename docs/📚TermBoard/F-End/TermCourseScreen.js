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
  const backBtn = $('course-back'), fullBtn = $('course-full'), syncDot = $('course-sync');
  const fontDown = $('font-down'), fontUp = $('font-up'), fontNow = $('font-now');
  const widthDown = $('width-down'), widthUp = $('width-up'), widthNow = $('width-now');

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
  const PREF = { font: 'myterm.read.font', width: 'myterm.read.width' };
  const FONTS = [85, 100, 115, 130, 150];
  const WIDTHS = [560, 720, 880, 1040, 1240];

  const readPref = (key, fallback) => {
    try { const v = Number(localStorage.getItem(key)); return Number.isFinite(v) && v > 0 ? v : fallback; }
    catch { return fallback; }
  };
  const writePref = (key, value) => { try { localStorage.setItem(key, String(value)); } catch {} };

  const lastChapterKey = id => 'myterm.read.chapter.' + id;

  let fontPct = readPref(PREF.font, 100);
  let columnPx = readPref(PREF.width, 720);

  const applyRead = () => {
    page.style.setProperty('--read-font', fontPct + '%');
    page.style.setProperty('--read-width', columnPx + 'px');
    fontNow.textContent = fontPct + '%';
    widthNow.textContent = columnPx + 'px';
    fontDown.disabled = fontPct <= FONTS[0];
    fontUp.disabled = fontPct >= FONTS[FONTS.length - 1];
    widthDown.disabled = columnPx <= WIDTHS[0];
    widthUp.disabled = columnPx >= WIDTHS[WIDTHS.length - 1];
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
  widthDown.onclick = () => { columnPx = step(WIDTHS, columnPx, -1); writePref(PREF.width, columnPx); applyRead(); };
  widthUp.onclick = () => { columnPx = step(WIDTHS, columnPx, 1); writePref(PREF.width, columnPx); applyRead(); };

  fullBtn.onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else page.requestFullscreen?.().catch(() => {});
  };

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

  const drawRows = () => {
    const content = window.MyTermChapterStore?.content();
    if (!content) return;

    const section = content.sections[0];
    const sheet = document.createElement('article');
    sheet.className = 'csheet';

    const table = document.createElement('div');
    table.className = 'ctable';

    const legend = document.createElement('div');
    legend.className = 'crow clegend';
    ['#', 'Term', 'What it means', ''].forEach((word, i) => {
      const cell = document.createElement('span');
      cell.textContent = word;
      if (i === 3) cell.className = 'crow-end';
      legend.append(cell);
    });
    table.append(legend);

    const rows = section.rows.filter(r => !r.deleted);
    rows.forEach((row, index) => {
      const line = document.createElement('div');
      line.className = 'crow';

      const no = document.createElement('span');
      no.className = 'crow-no';
      no.textContent = row.no || String(index + 1);

      const term = document.createElement('div');
      term.className = 'crow-term';
      term.contentEditable = 'true';
      term.textContent = row.term;
      term.dataset.empty = 'Term';
      term.oninput = () => window.MyTermChapterStore.editRow(row.id, 'term', term.textContent);

      const text = document.createElement('div');
      text.className = 'crow-text';
      text.contentEditable = 'true';
      text.textContent = row.text;
      text.dataset.empty = 'What it means';
      text.oninput = () => window.MyTermChapterStore.editRow(row.id, 'text', text.textContent);

      // The tick is the only thing on this line that goes to the small
      // file, and it is the only thing pressed a hundred times an evening
      const tick = document.createElement('button');
      tick.className = 'crow-tick';
      tick.type = 'button';
      const paintTick = () => {
        const on = window.MyTermChapterStore.isOn(row.id);
        tick.classList.toggle('on', on);
        tick.textContent = on ? '✓' : '';
        tick.title = on ? 'Done' : 'Not done yet';
        line.classList.toggle('done', on);
      };
      tick.onclick = () => {
        window.MyTermChapterStore.mark(row.id, !window.MyTermChapterStore.isOn(row.id));
        paintTick();
        drawTabs();
      };
      paintTick();

      const off = document.createElement('button');
      off.className = 'crow-off';
      off.type = 'button';
      off.textContent = '×';
      off.title = 'Remove this row';
      off.onclick = () => { window.MyTermChapterStore.dropRow(row.id); drawBody(); };

      const end = document.createElement('span');
      end.className = 'crow-end';
      end.append(tick, off);

      line.append(no, term, text, end);
      table.append(line);
    });

    if (!rows.length) {
      const none = document.createElement('p');
      none.className = 'ctable-none';
      none.textContent = 'Nothing written in this chapter yet.';
      table.append(none);
    }

    const add = document.createElement('button');
    add.className = 'csheet-done';
    add.type = 'button';
    add.textContent = '+ row';
    add.onclick = () => {
      window.MyTermChapterStore.addRow(section.id);
      drawBody();
      const last = body.querySelector('.crow:last-of-type .crow-term');
      last?.focus();
    };

    const count = document.createElement('p');
    count.className = 'ctable-count';
    const done = rows.filter(r => window.MyTermChapterStore.isOn(r.id)).length;
    count.textContent = rows.length ? `${done} of ${rows.length} done` : '';

    sheet.append(table, count, add);
    body.textContent = '';
    body.append(sheet);
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

  const leave = () => {
    page.hidden = true;
    board.hidden = false;
    document.body.classList.remove('reading');
    openId = null;
    window.MyTermBoardRedraw?.();
  };

  backBtn.onclick = leave;

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && openId && !document.fullscreenElement) leave();
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
