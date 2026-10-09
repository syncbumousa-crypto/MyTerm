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
  const termGpa = $('term-gpa'), termShape = $('term-shape');

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
  // # 🗂️ 🔽  WHICH CARDS ARE FOLDED
  // # 🔤 JavaScript
  // # 🎯 Remembers, in this browser only, which courses the reader has
  // #    folded shut
  // # 🔗 What is kept is the folded ones, not the open ones, so a course
  // #    added on another device arrives open and is seen. This is a
  // #    convenience of one screen, not part of the term: it never goes
  // #    to Drive, so folding on the laptop does not fold the phone
  // ============================================================
  const FOLDED = 'myterm.folded';

  const foldedIds = () => {
    try { return new Set(JSON.parse(localStorage.getItem(FOLDED) || '[]')); } catch { return new Set(); }
  };

  const rememberFold = (id, folded) => {
    try {
      const all = foldedIds();
      folded ? all.add(id) : all.delete(id);
      localStorage.setItem(FOLDED, JSON.stringify([...all]));
    } catch { /* a browser that forbids it simply forgets, and that is survivable */ }
  };

  // ============================================================
  // # 🧱 ➕  A CARD FOR EVERY COURSE
  // # 🔤 JavaScript
  // # 🎯 Draws one card: a head strip carrying everything true of the
  // #    whole course, and under it the chapter rows, which fold away
  // # 🔗 The head strip is read left to right as one sentence — fold ·
  // #    grade · name and count · the three shapes · open · remove —
  // #    and the shapes sit at the same place in every card, which is
  // #    the only way two courses can be compared without reading.
  // #    Pressing anywhere on the strip folds it, because an arrow is a
  // #    twenty pixel target and whoever misses it believes the card is
  // #    broken; anything that can be typed in or pressed keeps its own
  // #    press, so the name is still edited where it is read
  // ============================================================
  const makeColumn = course => {
    const column = document.createElement('section');
    column.className = 'col';

    const folded = foldedIds().has(course.id);
    if (!folded) column.classList.add('open');

    const twist = document.createElement('button');
    twist.className = 'col-twist';
    twist.type = 'button';
    twist.textContent = '▸';
    twist.title = 'Fold this course';

    const fold = () => {
      const nowOpen = column.classList.toggle('open');
      rememberFold(course.id, !nowOpen);
    };

    twist.onclick = fold;

    // The grade is the reading and the way in: pressing it opens the
    // working behind it. There used to be a line saying the standing
    // and a button saying "Marks" at the foot of every card, whether
    // or not there was anything to show
    const grade = document.createElement('button');
    grade.className = 'col-grade';
    grade.type = 'button';
    grade.onclick = () => column.classList.toggle('marks-on');

    const head = document.createElement('input');
    head.className = 'col-name';
    head.value = course.name;
    head.placeholder = 'Course name';
    head.oninput = () => {
      course.name = head.value;
      course.updatedAt = now();
      touched();
    };

    const count = document.createElement('span');
    count.className = 'col-count';

    const title = document.createElement('div');
    title.className = 'col-title';
    title.append(head, count);

    // Removing takes two presses, not a dialog box: the first asks and
    // the second does it, and it goes back if left alone. The course
    // folder in Drive is never touched: your own files live in it
    const drop = document.createElement('button');
    drop.className = 'col-icon';
    drop.type = 'button';
    drop.textContent = '×';
    drop.title = 'Remove this course from the board';
    let asking = null;
    drop.onclick = () => {
      if (!asking) {
        drop.textContent = 'sure?';
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

    const open = document.createElement('button');
    open.className = 'col-icon';
    open.type = 'button';
    open.textContent = '⤢';
    open.title = 'Open the course page';
    open.onclick = () => window.MyTermCoursePage?.open(course.id);

    const top = document.createElement('div');
    top.className = 'col-top';
    top.append(twist, grade, title, readingOf(course, 'md'), open, drop);
    top.onclick = event => { if (!event.target.closest('input, button')) fold(); };

    const body = document.createElement('div');
    body.className = 'col-body';
    drawChapters(course, body);

    column.append(top, body, marksPart(course));
    paintHead(column, course);
    return column;
  };

  // ============================================================
  // # 🎓 🎨  WHAT THE HEAD OF A CARD SAYS
  // # 🔤 JavaScript
  // # 🎯 Writes the count line and the grade, and walks the grade's
  // #    colour from green at the top of the scale to red at the bottom
  // # 🔗 One function for all of it, called after every change, so the
  // #    number, the letter and the colour are worked out in one place
  // #    and cannot drift apart. A course with nothing marked shows a
  // #    plain dash: no mark is not a bad mark
  // ============================================================
  const paintHead = (column, course) => {
    const list = alive(course);
    const done = list.filter(h => h.done).length;
    const count = column.querySelector('.col-count');
    if (count) {
      count.textContent = '';
      if (list.length) {
        const finished = document.createElement('b');
        finished.textContent = done;
        count.append(finished, document.createTextNode(` of ${list.length} chapters`));
      } else {
        count.textContent = 'no chapters yet';
      }
    }

    const grade = column.querySelector('.col-grade');
    if (!grade) return;
    const standing = standingOf(course);
    grade.textContent = '';
    grade.classList.toggle('has', Boolean(standing));
    if (!standing) {
      grade.textContent = '–';
      grade.style.removeProperty('--g');
      grade.title = 'No marks recorded yet — press to add them';
      return;
    }
    const letter = document.createElement('b');
    letter.textContent = standing.letter;
    const pct = document.createElement('s');
    pct.textContent = Math.round(standing.pct) + '%';
    grade.append(letter, pct);
    grade.style.setProperty('--g', `hsl(${Math.round((standing.points / 4) * 130)}, 58%, 44%)`);
    grade.title = `${standing.pct}% · ${standing.letter} · ${standing.points} of 4 — on ${standing.weight} of 100 marked so far`;
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
    const inner = document.createElement('div');
    inner.className = 'marks';

    // The grade in the head is the only place the standing is said, so
    // every change here goes back up to it
    const showStanding = () => {
      const column = inner.closest('.col');
      if (column) paintHead(column, course);
      refreshTermGpa();
    };

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
    return inner;
  };

  // ============================================================
  // # 🔲 🧾  THE WHOLE TERM IN THREE SHAPES
  // # 🔤 JavaScript
  // # 🎯 The same three shapes as a course, read once over everything:
  // #    how much is set up, how much is finished, and how the marks
  // #    stand
  // # 🔗 Every number is counted from the courses, never stored and
  // #    never typed. What the shapes mean in words is in their tips,
  // #    so the reading is the shapes and nothing crowds them
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
      ok, bad, unknown: Math.max(0, weight - ok - bad), weight
    };
  };

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

  const drawChapters = (course, body) => {
    body.textContent = '';
    alive(course).forEach((ch, index) => {
      const row = document.createElement('div');
      row.className = 'ch' + (ch.done ? ' done' : '');

      // The square is a vessel that fills, with no tick drawn in it:
      // the fill is the reading, and a mark on top of a full square is
      // the same thing said twice
      const mark = document.createElement('button');
      mark.className = 'ch-mark' + (ch.done ? ' done' : '');
      mark.type = 'button';
      mark.title = ch.done ? 'Finished' : 'Not finished yet';
      mark.onclick = () => {
        ch.done = !ch.done;
        ch.updatedAt = now();
        changed(course);
        drawChapters(course, body);
        refreshScores();
      };

      // Its place in the course, in a column of its own, so the names
      // all begin at one line down the card however long the numbers get
      const no = document.createElement('span');
      no.className = 'ch-no';
      no.textContent = 'C' + (index + 1);

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

      row.append(mark, no, name, off);
      body.append(row);
    });

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
      const fresh = body.querySelector('.ch:last-of-type .ch-name');
      fresh?.focus();
      fresh?.select();
    };
    body.append(add);
  };

  const refreshScores = () => {
    [...columns.children].forEach((column, i) => {
      const course = living()[i];
      if (!course) return;
      paintHead(column, course);
      // The three shapes in the head are redrawn from the course, never
      // patched in place: a shape that is edited rather than remade is
      // a shape that can be left saying what used to be true
      const trio = column.querySelector('.col-top .trio');
      if (trio) trio.replaceWith(readingOf(course, 'md'));
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
