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
    // The card carries the id of the course it draws. Reading them back
    // by their place in the row was true only while the row held cards
    // and nothing else: the day the tile that adds a course joined it,
    // every card was being repainted with the next course's numbers
    column.dataset.course = course.id;

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

    const icons = document.createElement('div');
    icons.className = 'col-icons';
    icons.append(open, drop);

    const top = document.createElement('div');
    top.className = 'col-top';
    top.append(twist, grade, title, readingOf(course, 'md'), icons);
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
        count.append(finished, document.createTextNode(` of ${list.length} · `),
                     hoursPair(list.reduce((s, h) => s + h.doneMinutes, 0),
                               list.reduce((s, h) => s + h.minutes, 0)));
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

  // ============================================================
  // # 📂 🔎  WHAT IS BEHIND A CHAPTER'S ARROW
  // # 🔤 JavaScript
  // # 🎯 The things that do not fit on one line: how long the chapter is
  // #    meant to take, how much of it is done, whether it is finished,
  // #    and the way to remove it
  // # 🔗 Hours are typed in hours and kept in minutes, so half an hour
  // #    can be said as 0.5 and nothing is lost to rounding. Removing
  // #    lives here and not on the line: a line this narrow cannot hold
  // #    it, and a thing that cannot be undone is better one press away
  // ============================================================
  const chapterDetail = (course, ch, redraw) => {
    const box = document.createElement('div');
    box.className = 'ch-detail';

    const numberLine = (label, minutes, write) => {
      const line = document.createElement('div');
      line.className = 'dline';
      const key = document.createElement('span');
      key.className = 'dk';
      key.textContent = label;
      const field = document.createElement('input');
      field.className = 'dnum';
      field.type = 'number';
      field.min = '0';
      field.step = '0.5';
      field.value = minutes ? Math.round((minutes / 60) * 100) / 100 : '';
      field.placeholder = '0';
      field.title = label + ', in hours';
      field.oninput = () => {
        write(Math.max(0, Math.round((Number(field.value) || 0) * 60)));
        ch.updatedAt = now();
        changed(course);
        paintRow();
      };
      const unit = document.createElement('span');
      unit.className = 'dunit';
      unit.textContent = 'h';
      line.append(key, field, unit);
      return line;
    };

    const bar = document.createElement('div');
    bar.className = 'dbar';
    const fill = document.createElement('i');
    bar.append(fill);

    const mark = document.createElement('button');
    mark.className = 'dtog';
    mark.type = 'button';

    // Redrawing the whole card on every keystroke would take the cursor
    // out of the box being typed in, so what changed is painted in place
    // and the full redraw is kept for what adds or removes a row
    const paintRow = () => {
      const row = box.parentElement;
      fill.style.width = coverOf(ch) + '%';
      mark.textContent = ch.done ? '✓ finished' : 'mark finished';
      mark.classList.toggle('on', ch.done);
      if (!row) return;
      row.classList.toggle('done', ch.done);
      row.querySelector('.ch-hours')?.replaceWith(hoursPair(ch.doneMinutes, ch.minutes));
      row.querySelector('.trio')?.replaceWith(chapterReading(ch));
      refreshScores();
    };

    mark.onclick = () => {
      ch.done = !ch.done;
      ch.updatedAt = now();
      changed(course);
      paintRow();
    };

    const off = document.createElement('button');
    off.className = 'ch-off';
    off.type = 'button';
    off.textContent = 'remove chapter';
    off.onclick = () => {
      ch.deleted = true;
      ch.updatedAt = now();
      changed(course);
      redraw();
    };

    box.append(
      numberLine('How long it takes', ch.minutes, v => { ch.minutes = v; }),
      numberLine('Done of it', ch.doneMinutes, v => { ch.doneMinutes = v; }),
      bar,
      mark,
      off
    );
    paintRow();
    return box;
  };

  // ============================================================
  // # ⏱️ 🔤  HOURS, WRITTEN THE WAY THEY ARE READ
  // # 🔤 JavaScript
  // # 🎯 Turns a count of minutes into the shortest true thing to say
  // #    about it, and builds the pair "what is done of what there is"
  // # 🔗 Green for what is finished and orange for what is left, in
  // #    every place hours appear, so the two colours never have to be
  // #    learned twice. Nothing is rounded up: forty minutes is 40m,
  // #    not "about an hour", because the number is there to be trusted
  // ============================================================
  const fmtHours = minutes => {
    const m = Math.max(0, Math.round(minutes || 0));
    if (m === 0) return '0h';
    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60), rest = m % 60;
    return h + 'h' + (rest ? rest + 'm' : '');
  };

  const hoursPair = (doneMin, totalMin) => {
    const box = document.createElement('span');
    box.className = 'ch-hours';
    const done = document.createElement('span');
    done.className = 'hDone';
    done.textContent = fmtHours(doneMin);
    const sep = document.createElement('span');
    sep.className = 'hSep';
    sep.textContent = ' / ';
    const left = document.createElement('span');
    left.className = 'hLeft';
    left.textContent = fmtHours(totalMin);
    box.append(done, sep, left);
    box.title = `${fmtHours(doneMin)} done of ${fmtHours(totalMin)}`;
    return box;
  };

  // How full the bar is. While no hours are set anywhere the tick is all
  // there is to go on, so it answers; once a length is given the time
  // answers instead. Without the fallback the bar would sit empty for
  // everybody who has not yet decided how long anything takes
  const coverOf = ch => ch.minutes > 0
    ? Math.min(100, Math.round((ch.doneMinutes / ch.minutes) * 100))
    : (ch.done ? 100 : 0);

  const chapterReading = ch => window.MyTermShapes.draw('sm', {
    ready: ch.name.trim() !== '' ? 100 : 0,
    readyTip: ch.name.trim() !== '' ? 'Named and ready' : 'Not named yet',
    done: coverOf(ch),
    doneTip: ch.minutes > 0
      ? `${fmtHours(ch.doneMinutes)} of ${fmtHours(ch.minutes)}`
      : (ch.done ? 'Finished' : 'Not finished yet'),
    marks: { ok: 0, bad: 0, unknown: 0 },
    marksTip: 'Nothing is judged chapter by chapter yet'
  });

  // Which rows are open. It lives for as long as the page does and no
  // longer: a detail left open is a thing this reader is doing now, not
  // a thing about the term, so it has no business in Drive
  const openRows = new Set();

  const drawChapters = (course, body) => {
    body.textContent = '';
    alive(course).forEach((ch, index) => {
      const row = document.createElement('div');
      row.className = 'ch' + (ch.done ? ' done' : '') + (openRows.has(ch.id) ? ' open' : '');

      // The arrow is the only way in and the only way out, so what is
      // behind it is reachable and nothing on the line is spent on it
      const twist = document.createElement('button');
      twist.className = 'ch-twist';
      twist.type = 'button';
      twist.textContent = '▸';
      twist.title = 'What is in this chapter';
      twist.onclick = () => {
        row.classList.contains('open') ? openRows.delete(ch.id) : openRows.add(ch.id);
        row.classList.toggle('open');
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

      const redraw = () => { drawChapters(course, body); refreshScores(); };

      row.append(twist, no, name, hoursPair(ch.doneMinutes, ch.minutes), chapterReading(ch),
                 chapterDetail(course, ch, redraw));
      body.append(row);
    });

    const add = document.createElement('button');
    add.className = 'col-add';
    add.type = 'button';
    add.textContent = '+ chapter';
    add.onclick = () => {
      course.chapters = course.chapters || [];
      course.chapters.push({ id: newChapterId(), name: 'Chapter ' + arabic(alive(course).length + 1), done: false, minutes: 0, doneMinutes: 0, updatedAt: now(), deleted: false });
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
    const here = living();
    columns.querySelectorAll('.col').forEach(column => {
      const course = here.find(c => c.id === column.dataset.course);
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

  // The way to add a course stands in the row it adds to, as a tile of
  // its own at the near end — not as a wide button floating above the
  // cards, where it was the loudest thing on the board and still said
  // nothing about where the new course would land
  const drawColumns = () => {
    columns.textContent = '';
    const here = living();
    here.forEach(course => columns.append(makeColumn(course)));
    columns.append(addBtn);
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
