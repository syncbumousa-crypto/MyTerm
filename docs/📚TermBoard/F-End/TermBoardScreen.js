// ============================================================
// # 🏷️ ✏️  THE TERM NAME
// # 🔤 JavaScript
// # 🎯 One spot at the top of the board that is three things in turn:
// #    a button when there is no name, a box while typing, and a plain
// #    title once named. Clicking the title opens the box again
// # 🔗 All the names here sit inside one wrapper, so they stay private
// #    to this file. Every letter typed is handed to the store at once,
// #    and the store decides when Drive is actually written
// ============================================================
(() => {
  const keep = window.MyTermBoardStore;
  const $ = id => document.getElementById(id);

  const board = $('board'), session = $('session'), backBtn = $('to-board');
  const setBtn = $('term-set'), nameBox = $('term-input'), title = $('term-title');
  const columns = $('columns'), addBtn = $('add-course');
  const renewBtn = $('renew-access'), empty = $('board-empty');
  const termGpa = $('term-gpa'), termShape = $('term-shape'), termNotes = $('term-notes');

  const arabic = n => String(n);
  const now = () => new Date().toISOString();
  const newId = () => 'c-' + Math.random().toString(36).slice(2, 8);
  const newChapterId = () => 'h-' + Math.random().toString(36).slice(2, 8);

  let data = { term: { name: '', start: '', end: '', updatedAt: null }, days: {}, courses: [] };

  const touched = () => keep.change(data);
  const changed = course => { keep.touchCourse(course.id); touched(); };
  const living = () => data.courses.filter(c => !c.deleted);

  const showName = () => {
    const named = data.term.name.trim() !== '';
    setBtn.hidden = named;
    title.hidden = !named;
    nameBox.hidden = true;
    title.textContent = data.term.name;
  };

  const editName = () => {
    setBtn.hidden = true;
    title.hidden = true;
    nameBox.hidden = false;
    nameBox.value = data.term.name;
    nameBox.focus();
    nameBox.select();
  };

  setBtn.onclick = editName;
  title.onclick = editName;

  nameBox.oninput = () => {
    data.term = { ...data.term, name: nameBox.value, updatedAt: now() };
    touched();
  };

  nameBox.onblur = () => {
    data.term.name = nameBox.value.trim();
    touched();
    showName();
  };

  nameBox.onkeydown = event => {
    if (event.key === 'Enter') nameBox.blur();
    if (event.key === 'Escape') { nameBox.value = data.term.name; nameBox.blur(); }
  };

  // ============================================================
  // # 🧱 ➕  A COLUMN FOR EVERY COURSE
  // # 🔤 JavaScript
  // # 🎯 Adds a course and draws a column for it. The column head is a
  // #    box, so the name is changed by typing in it with no extra step
  // # 🔗 The page reads right to left, so each new column lands to the
  // #    left of the one before it on its own. Every course carries an
  // #    id of its own, so later a rename on one device can be told
  // #    apart from a different course added on another
  // ============================================================
  const makeColumn = course => {
    const column = document.createElement('section');
    column.className = 'col';

    const head = document.createElement('input');
    head.className = 'col-name';
    head.value = course.name;
    head.placeholder = 'Course name';
    head.oninput = () => {
      course.name = head.value;
      course.updatedAt = now();
      touched();
    };

    // Removing takes two presses, not a dialog box: the first asks and
    // the second does it, and it goes back if left alone. The course
    const drop = document.createElement('button');
    drop.className = 'col-drop';
    drop.type = 'button';
    drop.textContent = '×';
    drop.title = 'Remove this course from the board';
    let asking = null;
    drop.onclick = () => {
      if (!asking) {
        drop.textContent = 'Remove?';
        drop.classList.add('asking');
        asking = setTimeout(() => { drop.textContent = '×'; drop.classList.remove('asking'); asking = null; }, 3000);
        return;
      }
      clearTimeout(asking);
      course.deleted = true;
      course.updatedAt = now();
      touched();
      drawColumns();
    };

    // folder in Drive is never touched: your own files live in it
    const open = document.createElement('button');
    open.className = 'col-open';
    open.type = 'button';
    open.textContent = '⤢';
    open.title = 'Open the course page';
    open.onclick = () => window.MyTermCoursePage?.open(course.id);

    const top = document.createElement('div');
    top.className = 'col-top';
    top.append(open, head, drop);

    const body = document.createElement('div');
    body.className = 'col-body';
    drawChapters(course, body);

    const add = document.createElement('button');
    add.className = 'col-add';
    add.type = 'button';
    add.textContent = '+ chapter';
    add.onclick = () => {
      course.chapters = course.chapters || [];
      course.chapters.push({ id: newChapterId(), name: 'Chapter ' + arabic(alive(course).length + 1), done: false, updatedAt: now(), deleted: false });
      changed(course);
      drawChapters(course, body);
      refreshScores();
      const fresh = body.lastElementChild?.querySelector('.ch-name');
      fresh?.focus();
      fresh?.select();
    };

    column.append(top, readingOf(course, 'md'), body, add, scoreLine(course), marksPart(course));
    return column;
  };

  // ============================================================
  // # 🔲 📖  WHAT THE THREE SHAPES SAY ABOUT A COURSE
  // # 🔤 JavaScript
  // # 🎯 Turns a course into the three readings: is it set up, how much
  // #    is finished, and how its marks stand
  // # 🔗 Set up means it has chapters at all, and each chapter has a
  // #    name. Finished is the ticks. The marks are read out of a
  // #    hundred weight: what was earned, what was lost, and what has
  // #    not been graded — the third is silence, not a failure
  // ============================================================
  const readingOf = (course, size) => {
    const list = alive(course);
    const named = list.filter(h => h.name.trim() !== '').length;
    const done = list.filter(h => h.done).length;

    const items = (course.items || []).filter(i => !i.deleted && i.weight > 0);
    const weight = items.reduce((s, i) => s + i.weight, 0) || 100;
    const graded = items.filter(i => i.got !== null && i.outOf > 0);
    const ok = graded.reduce((s, i) => s + (i.got / i.outOf) * i.weight, 0);
    const bad = graded.reduce((s, i) => s + (1 - i.got / i.outOf) * i.weight, 0);

    return window.MyTermShapes.draw(size, {
      ready: list.length ? Math.round((named / list.length) * 100) : 0,
      readyTip: list.length ? `${named} of ${list.length} chapters named` : 'No chapters yet',
      done: list.length ? Math.round((done / list.length) * 100) : 0,
      doneTip: list.length ? `${done} of ${list.length} finished` : 'No chapters yet',
      marks: { ok, bad, unknown: Math.max(0, weight - ok - bad) },
      marksTip: graded.length ? `${Math.round(ok)} earned · ${Math.round(bad)} lost · ${Math.round(Math.max(0, weight - ok - bad))} not graded` : 'No marks recorded yet'
    });
  };

  // ============================================================
  // # 💯 🎓  THE MARKS, THE STANDING, AND THE POINTS
  // # 🔤 JavaScript
  // # 🎯 A folded part under every course: the items it is graded on,
  // #    each with a weight out of a hundred and a raw mark, then the
  // #    standing they add up to, its letter, and its points out of four
  // # 🔗 An item with no mark yet is left out of the standing instead of
  // #    counted as zero, and the weights that remain are scaled up — so
  // #    the number means "where you stand now", not "what you end with
  // #    if you never sit the rest". The scale is the common one out of
  // #    four, and it is written once here and read nowhere else
  // ============================================================
  const CUTS = [[95, 'A+', 4], [90, 'A', 3.75], [85, 'B+', 3.5], [80, 'B', 3], [75, 'C+', 2.5], [70, 'C', 2], [65, 'D+', 1.5], [60, 'D', 1], [0, 'F', 0]];
  const gradeOf = pct => CUTS.find(c => pct >= c[0]) || CUTS[CUTS.length - 1];

  const standingOf = course => {
    const marked = (course.items || []).filter(i => !i.deleted && i.got !== null && i.outOf > 0 && i.weight > 0);
    if (!marked.length) return null;
    const weight = marked.reduce((s, i) => s + i.weight, 0);
    const earned = marked.reduce((s, i) => s + (i.got / i.outOf) * i.weight, 0);
    const pct = weight ? (earned / weight) * 100 : 0;
    const [, letter, points] = gradeOf(pct);
    return { pct: Math.round(pct * 10) / 10, letter, points, weight };
  };

  const marksPart = course => {
    const wrap = document.createElement('div');
    wrap.className = 'marks';

    const toggle = document.createElement('button');
    toggle.className = 'marks-toggle';
    toggle.type = 'button';

    const inner = document.createElement('div');
    inner.className = 'marks-body';
    inner.hidden = true;

    const standing = document.createElement('p');
    standing.className = 'col-standing';

    const showStanding = () => {
      const s = standingOf(course);
      standing.textContent = s ? `${s.pct}% · ${s.letter} · ${s.points} / 4` : '';
      toggle.textContent = (inner.hidden ? '▸ ' : '▾ ') + 'Marks';
      refreshTermGpa();
    };

    toggle.onclick = () => { inner.hidden = !inner.hidden; showStanding(); };

    const drawItems = () => {
      inner.textContent = '';

      const hours = document.createElement('div');
      hours.className = 'mark-row';
      const hoursLabel = document.createElement('span');
      hoursLabel.className = 'mark-label';
      hoursLabel.textContent = 'Hours';
      const hoursBox = document.createElement('input');
      hoursBox.className = 'mark-num';
      hoursBox.type = 'number';
      hoursBox.min = '0';
      hoursBox.value = course.credits ?? 3;
      hoursBox.oninput = () => { course.credits = Number(hoursBox.value) || 0; changed(course); refreshTermGpa(); };
      hours.append(hoursLabel, hoursBox);
      inner.append(hours);

      (course.items || []).filter(i => !i.deleted).forEach(item => {
        const row = document.createElement('div');
        row.className = 'mark-row';

        const name = document.createElement('input');
        name.className = 'mark-name';
        name.value = item.name;
        name.placeholder = 'Item';
        name.oninput = () => { item.name = name.value; item.updatedAt = now(); changed(course); };

        const weight = document.createElement('input');
        weight.className = 'mark-num';
        weight.type = 'number';
        weight.min = '0';
        weight.title = 'Its weight out of 100';
        weight.value = item.weight || '';
        weight.placeholder = 'wt';
        weight.oninput = () => { item.weight = Number(weight.value) || 0; item.updatedAt = now(); changed(course); showStanding(); };

        const got = document.createElement('input');
        got.className = 'mark-num';
        got.type = 'number';
        got.min = '0';
        got.title = 'Your mark';
        got.value = item.got ?? '';
        got.placeholder = 'got';
        got.oninput = () => { item.got = got.value === '' ? null : Number(got.value); item.updatedAt = now(); changed(course); showStanding(); };

        const outOf = document.createElement('input');
        outOf.className = 'mark-num';
        outOf.type = 'number';
        outOf.min = '0';
        outOf.title = 'out of';
        outOf.value = item.outOf || '';
        outOf.placeholder = 'of';
        outOf.oninput = () => { item.outOf = Number(outOf.value) || 0; item.updatedAt = now(); changed(course); showStanding(); };

        const off = document.createElement('button');
        off.className = 'ch-off';
        off.type = 'button';
        off.textContent = '×';
        off.onclick = () => { item.deleted = true; item.updatedAt = now(); changed(course); drawItems(); showStanding(); };

        row.append(name, weight, got, outOf, off);
        inner.append(row);
      });

      const more = document.createElement('button');
      more.className = 'col-add';
      more.type = 'button';
      more.textContent = '+ item';
      more.onclick = () => {
        course.items = course.items || [];
        course.items.push({ id: 'i-' + Math.random().toString(36).slice(2, 8), name: '', weight: 0, got: null, outOf: 0, due: '', updatedAt: now(), deleted: false });
        changed(course);
        drawItems();
      };
      inner.append(more);
    };

    drawItems();
    showStanding();
    wrap.append(standing, toggle, inner);
    return wrap;
  };

  // ============================================================
  // # 🔲 🧾  THE WHOLE TERM IN THREE SHAPES, AND A FEW LINES
  // # 🔤 JavaScript
  // # 🎯 The same three shapes as a course, read once over everything:
  //  #   how much is set up, how much is finished, and how the marks
  // #    stand. Under them a few plain lines saying the same in words
  // # 🔗 Every number is counted from the courses, never stored and
  // #    never typed. Lines with nothing behind them are left out
  // #    instead of printed as zeros: no chapters means no sentence
  // #    about chapters, not a sentence saying none
  // ============================================================
  const termReading = () => {
    const courses = living();
    const chapters = courses.flatMap(c => alive(c));
    const named = chapters.filter(h => h.name.trim() !== '').length;
    const done = chapters.filter(h => h.done).length;

    let ok = 0, bad = 0, weight = 0;
    courses.forEach(c => {
      (c.items || []).filter(i => !i.deleted && i.weight > 0).forEach(i => {
        weight += i.weight;
        if (i.got !== null && i.outOf > 0) {
          ok += (i.got / i.outOf) * i.weight;
          bad += (1 - i.got / i.outOf) * i.weight;
        }
      });
    });

    // The hours of the term come from the courses and nowhere else: each
    // course brings its own credit hours, and how much of it is finished
    // says how many of those hours are finished. Half of a three hour
    // course is an hour and a half. A course with no chapters yet still
    // brings its hours to the total — they are hours you owe, not hours
    // you have done — so the number never flatters by shrinking
    let hours = 0, hoursDone = 0;
    courses.forEach(c => {
      const credits = Number(c.credits) || 0;
      const list = alive(c);
      hours += credits;
      if (list.length) hoursDone += credits * (list.filter(h => h.done).length / list.length);
    });

    return {
      courses: courses.length, chapters: chapters.length, named, done,
      hours, hoursDone,
      ok, bad, unknown: Math.max(0, weight - ok - bad), weight
    };
  };

  // 4.5 not 4.5000, and 3 not 3.0
  const tidy = n => (Math.round(n * 10) / 10).toString();

  const drawTermShape = () => {
    const r = termReading();
    termShape.textContent = '';
    termShape.append(window.MyTermShapes.draw('lg', {
      ready: r.chapters ? Math.round((r.named / r.chapters) * 100) : 0,
      readyTip: `Set up — ${r.named} of ${r.chapters} chapters named`,
      done: r.chapters ? Math.round((r.done / r.chapters) * 100) : 0,
      doneTip: `Finished — ${r.done} of ${r.chapters} chapters`,
      marks: { ok: r.ok, bad: r.bad, unknown: r.unknown },
      marksTip: r.weight
        ? `Marks — ${Math.round(r.ok)} earned, ${Math.round(r.bad)} lost, ${Math.round(r.unknown)} not graded yet`
        : 'Marks — nothing recorded yet'
    }));

    const d = window.MyTermDaysReading;
    const notes = [];
    if (r.hours) notes.push(`${tidy(r.hoursDone)} of ${tidy(r.hours)} term hours finished`);
    if (r.courses) notes.push(`${r.courses} course${r.courses === 1 ? '' : 's'}`
      + (r.chapters ? ` · ${r.chapters} chapter${r.chapters === 1 ? '' : 's'} · ${r.done} finished` : ''));
    if (d && d.all) notes.push(`${d.done} of ${d.past} days worked · ${d.left} day${d.left === 1 ? '' : 's'} left`);
    if (d && d.all && r.chapters) {
      const got = Math.round((r.done / r.chapters) * 100);
      const gone = Math.round((d.past / d.all) * 100);
      const gap = got - gone;
      notes.push(`${got}% finished against ${gone}% of the term gone — ${gap >= 0 ? gap + '% ahead' : -gap + '% behind'}`);
    }

    termNotes.textContent = '';
    notes.forEach(words => {
      const line = document.createElement('p');
      line.className = 'term-note';
      line.textContent = words;
      termNotes.append(line);
    });
  };

  const refreshTermGpa = () => {
    const graded = living().map(c => ({ s: standingOf(c), credits: Number(c.credits) || 0 })).filter(x => x.s && x.credits > 0);
    if (!graded.length) { termGpa.textContent = ''; return; }
    const hours = graded.reduce((s, x) => s + x.credits, 0);
    const points = graded.reduce((s, x) => s + x.s.points * x.credits, 0);
    termGpa.textContent = `Term GPA ${(points / hours).toFixed(2)} / 4 · ${hours} hours`;
    drawTermShape();
  };

  // ============================================================
  // # 📑 ✅  THE CHAPTER ROWS, AND THE NUMBER UNDER THEM
  // # 🔤 JavaScript
  // # 🎯 Draws one row per chapter: a mark that is pressed when it is
  // #    finished, a name that is typed into, and a way to remove it.
  // #    Under them the one number that says how far this course is
  // # 🔗 The number is never typed by anybody: it is counted from the
  // #    marks above it, so it cannot disagree with what is on screen.
  // #    A course with no chapters shows no number at all, because
  // #    nothing out of nothing is not zero, it is unknown
  // ============================================================
  const alive = course => (course.chapters || []).filter(h => !h.deleted);

  const scoreOf = course => {
    const list = alive(course);
    if (!list.length) return null;
    const done = list.filter(h => h.done).length;
    return { done, total: list.length, pct: Math.round((done / list.length) * 100) };
  };

  const scoreLine = course => {
    const line = document.createElement('p');
    line.className = 'col-score';
    const s = scoreOf(course);
    line.textContent = s ? `${s.done} of ${s.total} · ${s.pct}%` : '';
    return line;
  };

  const drawChapters = (course, body) => {
    body.textContent = '';
    alive(course).forEach(ch => {
      const row = document.createElement('div');
      row.className = 'ch';

      const mark = document.createElement('button');
      mark.className = 'ch-mark' + (ch.done ? ' done' : '');
      mark.type = 'button';
      mark.textContent = ch.done ? '✓' : '';
      mark.title = ch.done ? 'Finished' : 'Not finished yet';
      mark.onclick = () => {
        ch.done = !ch.done;
        ch.updatedAt = now();
        changed(course);
        drawChapters(course, body);
        refreshScores();
      };

      const name = document.createElement('input');
      name.className = 'ch-name';
      name.value = ch.name;
      name.placeholder = 'Chapter name';
      name.oninput = () => { ch.name = name.value; ch.updatedAt = now(); changed(course); };

      const off = document.createElement('button');
      off.className = 'ch-off';
      off.type = 'button';
      off.textContent = '×';
      off.title = 'Remove chapter';
      off.onclick = () => {
        ch.deleted = true;
        ch.updatedAt = now();
        changed(course);
        drawChapters(course, body);
        refreshScores();
      };

      row.append(mark, name, off);
      body.append(row);
    });
  };

  const refreshScores = () => {
    [...columns.children].forEach((col, i) => {
      const course = living()[i];
      const line = col.querySelector('.col-score');
      const s = course && scoreOf(course);
      if (line) line.textContent = s ? `${s.done} of ${s.total} · ${s.pct}%` : '';
    });
      // The term reads itself again from the courses: its three shapes
      // and its lines are counted, never stored, so they cannot lag
      drawTermShape();
  };

  const drawColumns = () => {
    columns.textContent = '';
    const here = living();
    here.forEach(course => columns.append(makeColumn(course)));
    empty.hidden = here.length > 0;
    refreshScores();
  };

  addBtn.onclick = () => {
    data.courses.push({ id: newId(), name: 'Course ' + arabic(living().length + 1), updatedAt: now(), deleted: false });
    touched();
    drawColumns();
    const fresh = columns.lastElementChild?.querySelector('.col-name');
    fresh?.focus();
    fresh?.select();
  };

  // ============================================================
  // # 🪟 🔀  WHEN THE BOARD SHOWS, AND WHAT IT SAYS ABOUT SAVING
  // # 🔤 JavaScript
  // # 🎯 Opens the board once the saving place is ready, draws the fast
  // #    copy at once, then draws again from what Drive says. And it
  // #    keeps one quiet line telling whether the work is safe yet
  // # 🔗 The board is drawn twice on purpose: the copy next to the user
  // #    appears with no wait, and Drive is the one that decides. If
  // #    they differ, Drive wins. But a Drive that could not be read is
  // #    never drawn as an empty term — that would read as lost work,
  // #    which is worse than a plain complaint. Google's permission
  // #    lasts about an hour, so it runs out while the page sits open,
  // #    and the only cure is one press by the user: a browser will not
  // #    open that window without a press
  // ============================================================
  const WORDS = {
    waiting: '…',
    saving: 'Saving to your Drive…',
    saved: 'Saved to your Drive',
    failed: 'Not saved — your Drive access ran out. Your work is kept here and is not lost.',
    unread: 'Could not read your file from Drive — what you see may not be all of it.',
    arrived: 'An update arrived from your other device'
  };

  // The corner says it now: a tick when it is in Drive, a turning circle while it is not
  const say = name => window.MyTermHud?.sync(name);
  keep.onStatus(name => {
    say(name);
    if (name === 'failed') renewBtn.hidden = false;
    if (name === 'saved') renewBtn.hidden = true;
  });

  const paint = () => {
    showName();
    drawColumns();
    window.MyTermDays?.show(data);
    drawTermShape();
  };

  const openBoard = async event => {
    const fileId = event?.detail?.fileId;
    if (fileId) keep.attach(fileId);

    session.hidden = true;
    board.hidden = false;
    backBtn.hidden = false;
    document.body.classList.add('board-on');

    const fast = keep.cached();
    if (fast) { data = fast; paint(); }

    const fromDrive = await keep.load().catch(() => null);
    if (fromDrive) {
      data = fromDrive;
      paint();
      renewBtn.hidden = true;
      say('');
    } else {
      say('unread');
      renewBtn.hidden = false;
    }
  };

  renewBtn.onclick = async () => {
    renewBtn.disabled = true;
    say('saving');
    try {
      await window.MyTermCloud.askGoogle();
      const fresh = await keep.load();
      if (fresh) { data = fresh; paint(); }
      await keep.flush();
      renewBtn.hidden = true;
      say('saved');
    } catch {
      say('failed');
    } finally {
      renewBtn.disabled = false;
    }
  };

  const leaveBoard = () => {
    board.hidden = true;
    document.body.classList.remove('board-on');
  };

  backBtn.onclick = () => openBoard();

  // ============================================================
  // # 🔔 👂  LISTENING FOR THE OTHER DEVICE
  // # 🔤 JavaScript
  // # 🎯 When the phone saves, this screen reads the paper again and
  // #    draws it, with nothing for the user to press
  // # 🔗 It steps aside while this device has work of its own not yet
  // #    sent: reading then would throw away what the user just typed.
  // #    The skipped news is not lost — the next save rings again, and
  // #    opening the board reads afresh anyway
  // ============================================================
  const hearBell = async () => {
    const fresh = await keep.load().catch(() => null);
    if (!fresh) return;
    const typing = document.activeElement;
    data = fresh;
    paint();
    say('arrived');
    setTimeout(() => say('saved'), 2500);
    if (typing && typing.id === 'term-input') editName();
  };

  window.MyTermBell?.listen(hearBell);

  document.addEventListener('place-ready', openBoard);
  document.addEventListener('place-needed', () => { leaveBoard(); backBtn.hidden = true; keep.detach(); });
  document.addEventListener('signed-out', () => { leaveBoard(); backBtn.hidden = true; keep.detach(); });

  // What the course page needs from here: the shapes, and a redraw on return
  window.MyTermBoardReading = readingOf;
  window.MyTermBoardRedraw = () => { data = keep.board() || data; paint(); };

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') keep.flush(); });
  window.addEventListener('pagehide', () => keep.flush());
})();
