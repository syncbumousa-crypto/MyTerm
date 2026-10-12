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

  // A panel that opens beside a button must close when attention moves on,
  // or the board ends up wearing one on every card
  const shutMenus = () => {
    document.querySelectorAll('.col-menu').forEach(m => { m.hidden = true; });
    document.querySelectorAll('.col-gear.on').forEach(g => g.classList.remove('on'));
  };

  document.addEventListener('click', event => {
    if (!event.target.closest('.col-menu, .col-gear')) shutMenus();
  });

  // ============================================================
  // # 🧱 ➕  A CARD FOR EVERY COURSE
  // # 🔤 JavaScript
  // # 🎯 Draws one card: a head strip carrying everything true of the
  // #    whole course, and under it the chapter rows, which fold away
  // # 🔗 The head strip is read left to right as one sentence — fold ·
  // #    grade · name and count · the three shapes · the gear —
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

    // Written, not typed into. The strip is the way into the course now,
    // and a box in the middle of it would swallow the press that takes
    // you there — so the name is changed from the gear, where the other
    // things about the course as a whole are changed
    const head = document.createElement('span');
    head.className = 'col-name';
    head.textContent = course.name || 'Course name';
    head.classList.toggle('unnamed', !course.name);

    // Two quiet lines under the name: how many chapters there are, then
    // how much of their time is done. How many chapters are ticked is not
    // among them — the bar of the three shapes says that, and saying it
    // twice in two ways only makes a reader check which one to believe
    const count = document.createElement('span');
    count.className = 'col-count';

    const hours = document.createElement('span');
    hours.className = 'col-count';

    const title = document.createElement('div');
    title.className = 'col-title';
    title.append(head, count, hours);

    // The two parts under the strip are built before the gear, because
    // the gear's panel is how things are added to them and it must have
    // them to hand
    const body = document.createElement('div');
    body.className = 'col-body';
    drawChapters(course, body);

    const marks = marksPart(course);

    // ============================================================
    // # ⚙️ 🗃️  THE ONE BUTTON FOR EVERYTHING DONE TO A COURSE
    // # 🔤 JavaScript
    // # 🎯 A small gear at the end of the strip, opening a panel beside
    // #    itself: the course's name, the hours it is worth, adding a
    // #    chapter, adding something it is graded on, and taking it off
    // #    the board
    // # 🔗 These were five things in five places — two buttons on the
    // #    strip, a dashed button under the chapters, another under the
    // #    marks table, and a line inside the table. Every one of them
    // #    was on screen at all times for something done a few times a
    // #    term, and between them they left the course name four letters
    // #    and an ellipsis. One place, and it stays shut. Removing still
    // #    takes two presses: a panel that opens by accident must not
    // #    delete by accident
    // ============================================================
    const menu = document.createElement('div');
    menu.className = 'col-menu';
    menu.hidden = true;

    const nameLine = document.createElement('label');
    nameLine.className = 'col-menu-line';
    const nameWord = document.createElement('span');
    nameWord.textContent = 'Name';
    const nameBox = document.createElement('input');
    nameBox.className = 'col-menu-name';
    nameBox.value = course.name;
    nameBox.placeholder = 'Course name';
    nameBox.oninput = () => {
      course.name = nameBox.value;
      course.updatedAt = now();
      head.textContent = course.name || 'Course name';
      head.classList.toggle('unnamed', !course.name);
      touched();
    };
    nameLine.append(nameWord, nameBox);

    const hoursLine = document.createElement('label');
    hoursLine.className = 'col-menu-line';
    const hoursWord = document.createElement('span');
    hoursWord.textContent = 'Credit hours';
    const hoursBox = document.createElement('input');
    hoursBox.className = 'col-menu-num';
    hoursBox.type = 'number';
    hoursBox.min = '0';
    hoursBox.value = course.credits ?? 3;
    hoursBox.oninput = () => { course.credits = Number(hoursBox.value) || 0; changed(course); refreshTermGpa(); };
    hoursLine.append(hoursWord, hoursBox);

    // The course folder in Drive is never touched: your own files live in it
    const drop = document.createElement('button');
    drop.className = 'col-menu-drop';
    drop.type = 'button';
    drop.textContent = 'Remove this course';
    let asking = null;
    drop.onclick = () => {
      if (!asking) {
        drop.textContent = 'Press again to remove';
        drop.classList.add('asking');
        asking = setTimeout(() => {
          drop.textContent = 'Remove this course';
          drop.classList.remove('asking');
          asking = null;
        }, 3000);
        return;
      }
      clearTimeout(asking);
      course.deleted = true;
      course.updatedAt = now();
      touched();
      drawColumns();
    };

    // Both of these open what they add to before adding, so the new row
    // is never written somewhere the reader cannot see it
    const addChapterBtn = document.createElement('button');
    addChapterBtn.className = 'col-menu-do';
    addChapterBtn.type = 'button';
    addChapterBtn.textContent = 'Add a chapter';
    addChapterBtn.onclick = () => {
      course.chapters = course.chapters || [];
      course.chapters.push({ id: newChapterId(), name: 'Chapter ' + arabic(alive(course).length + 1),
                             done: false, minutes: 0, doneMinutes: 0, updatedAt: now(), deleted: false });
      changed(course);
      if (!column.classList.contains('open')) { column.classList.add('open'); rememberFold(course.id, false); }
      drawChapters(course, body);
      refreshScores();
      shutMenus();
      const fresh = body.querySelector('.ch:last-of-type .ch-name');
      fresh?.focus();
      fresh?.select();
    };

    const addMarkBtn = document.createElement('button');
    addMarkBtn.className = 'col-menu-do';
    addMarkBtn.type = 'button';
    addMarkBtn.textContent = 'Add something graded';
    addMarkBtn.onclick = () => {
      column.classList.add('marks-on');
      shutMenus();
      marks.addMark();
    };

    menu.append(nameLine, hoursLine, addChapterBtn, addMarkBtn, drop);

    const gear = document.createElement('button');
    gear.className = 'col-gear';
    gear.type = 'button';
    gear.textContent = '⚙';
    gear.title = 'Hours and removing';
    gear.onclick = () => {
      const opening = menu.hidden;
      shutMenus();                 // one open at a time, or the board fills with panels
      menu.hidden = !opening;
      gear.classList.toggle('on', opening);
    };

    // The strip is the door to the course. Three things on it do their own
    // work instead and must not open it: the arrow that folds the card, the
    // grade that opens the marks, and the gear. Everything else on the
    // strip — the name, the count, the shapes, the space between them —
    // takes you in, so the target is the whole width and not a small icon
    // The course opens in a tab of its own, so the board stays where it
    // was: what you were reading is not replaced by what you went to
    // look at, and closing the one brings you back to the other exactly
    // as you left it. The address carries the course, so the new tab
    // knows which one to show
    const top = document.createElement('div');
    top.className = 'col-top';
    top.append(gear, menu, twist, grade, title, readingOf(course, 'md'));
    top.onclick = event => {
      if (event.target.closest('button, input, .col-menu')) return;
      shutMenus();
      window.open(location.pathname + '?course=' + encodeURIComponent(course.id), '_blank', 'noopener');
    };

    column.append(top, body, marks);
    paintHead(column, course);
    return column;
  };

  // ============================================================
  // # 🎓 🎨  WHAT THE HEAD OF A CARD SAYS
  // # 🔤 JavaScript
  // # 🎯 Writes the two lines under the name and the grade, and walks the
  // #    grade's colour from green at the top of the scale to red at the
  // #    bottom
  // # 🔗 One function for all of it, called after every change, so the
  // #    numbers, the letter and the colour are worked out in one place
  // #    and cannot drift apart
  // ============================================================
  const paintHead = (column, course) => {
    const list = alive(course);
    const lines = column.querySelectorAll('.col-top .col-count');

    if (lines[0]) {
      lines[0].textContent = list.length
        ? list.length + (list.length === 1 ? ' Chapter' : ' Chapters')
        : 'No chapters';
    }

    if (lines[1]) {
      lines[1].textContent = '';
      lines[1].append(hoursPair(list.reduce((s, h) => s + h.doneMinutes, 0),
                                list.reduce((s, h) => s + keep.hoursOf(h), 0)));
    }

    const grade = column.querySelector('.col-grade');
    if (!grade) return;
    const standing = standingOf(course);
    grade.textContent = '';
    grade.classList.add('has');
    const letter = document.createElement('b');
    letter.textContent = standing.letter;
    const pct = document.createElement('s');
    pct.textContent = Math.round(standing.pct) + '%';
    grade.append(letter, pct);
    grade.style.setProperty('--g', gradeColour(standing.points));
    grade.title = standing.assumed
      ? 'Nothing is graded yet, so this is what you are standing at — press to add what the course is graded on'
      : `${standing.pct}% · ${standing.letter} · ${standing.points} of 4 — ${standing.marked} of ${standing.of} items have a score, the rest counted as full marks`;
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
  // ============================================================
  // # ⭕ 📚  A COURSE IN THREE SHAPES
  // # 🔤 JavaScript
  // # 🎯 Its chapters added up: how many are named, how many of their
  // #    hours are done, and what the bank made of them
  // # 🔗 THE DISC MEANS ONE THING ON THIS BOARD AND ONLY ONE. It used to
  // #    be the marks — what was earned and lost of the course's graded
  // #    work — while the chapter's disc beside it was the bank. Two
  // #    discs, same drawing, different question, one screen apart.
  // #
  // #    So the disc is the bank everywhere, and the course's marks keep
  // #    the places that were always theirs: the grade chip on the card,
  // #    the letter, and the table behind it. Nothing about grades is
  // #    lost; it simply stops borrowing a shape that answers something
  // #    else at every other size
  // ============================================================
  const readingOf = (course, size) => {
    const list = alive(course);
    const named = list.filter(h => h.name.trim() !== '').length;
    const sum = sumOf(list);

    return window.MyTermShapes.draw(size, {
      ready: list.length ? Math.round((named / list.length) * 100) : 0,
      readyTip: list.length ? `${named} of ${list.length} chapters named` : 'No chapters yet',
      done: sum.through,
      doneTip: hoursTip(sum, list),
      marks: { ok: sum.good, bad: sum.bad, unknown: sum.unknown },
      marksTip: bankTip(sum, 'this course')
    });
  };

  // ============================================================
  // # 🧮 🎓  HOW A COURSE STANDS
  // # 🔤 JavaScript
  // # 🎯 The scale of letters and points, and the rules that turn a list
  // #    of items into one percentage
  // # 🔗 Written once and read by everything that shows a grade — the
  // #    chip on a card, the table behind it, the disc in the three
  // #    shapes, and the term average — so no two of them can disagree
  // #    about the same course
  // ============================================================
  const CUTS = [[95, 'A+', 4], [90, 'A', 3.75], [85, 'B+', 3.5], [80, 'B', 3], [75, 'C+', 2.5], [70, 'C', 2], [65, 'D+', 1.5], [60, 'D', 1], [0, 'F', 0]];
  const gradeOf = pct => CUTS.find(c => pct >= c[0]) || CUTS[CUTS.length - 1];
  const gradeColour = points => `hsl(${Math.round((points / 4) * 130)}, 58%, 44%)`;

  const marksOf = course => (course.items || []).filter(i => !i.deleted);

  const isGraded = item => !(item.got === null || item.got === undefined || item.got === '' || !(Number(item.got) >= 0));

  // A score that cannot be true: more than the item is out of, or — with
  // no "out of" given — more than the item is worth. It is not guessed
  // at. Dividing by the weight when "out of" was missing turned an item
  // worth 2 with a score of 6 into 6 points of the course, three times
  // its weight, and a course totalled 101.8 out of 90. Six may be six
  // out of six or six out of ten: the difference is 2% or 12%
  const isOdd = item => {
    if (!isGraded(item)) return false;
    const w = Number(item.weight) || 0, got = Number(item.got), outOf = Number(item.outOf) || 0;
    return outOf > 0 ? got > outOf : (w > 0 && got > w);
  };

  // What this item has earned of the course, out of a hundred. An item
  // with no score yet counts as FULL marks, so the standing starts at the
  // top and comes down as real scores arrive — it does not start at zero
  // and frighten you with exams you have not sat
  const earnedOf = item => {
    const w = Number(item.weight) || 0, outOf = Number(item.outOf) || 0;
    if (!isGraded(item) || isOdd(item)) return w;
    const got = Number(item.got);
    return outOf > 0 ? w * (got / outOf) : got;
  };

  const standingOf = course => {
    const list = marksOf(course);
    const weight = list.reduce((s, i) => s + (Number(i.weight) || 0), 0);

    // A course with nothing in it yet stands at the top, like an item with
    // no score: the reading begins at A+ and comes down as real marks
    // arrive. It is marked `assumed` because nothing here was measured —
    // the term average leaves such a course out of its sum rather than
    // counting four points nobody earned
    if (!list.length || weight <= 0) {
      const [, letter, points] = gradeOf(100);
      return { pct: 100, letter, points, weight: 0, earned: 0, marked: 0, of: list.length, assumed: true };
    }

    const earned = list.reduce((s, i) => s + earnedOf(i), 0);
    // Over every weight, not only the marked ones, because the unmarked
    // are already counted as full above
    const pct = (earned / weight) * 100;
    const [, letter, points] = gradeOf(pct);
    return { pct: Math.round(pct * 10) / 10, letter, points, weight, earned,
             marked: list.filter(isGraded).length, of: list.length, assumed: false };
  };

  // ============================================================
  // # 💯 📋  THE TABLE OF MARKS, BEHIND THE GRADE
  // # 🔤 JavaScript
  // # 🎯 A table of everything the course is graded on, opened from the
  // #    grade in the head of its card. One row per item, seven columns:
  // #    what it is · the raw score · what that earns of the course ·
  // #    its weight · its own letter · when it is due · what has to be
  // #    read or done for it
  // # 🔗 Two rules decide every number here, and both are deliberate.
  // #    An item with no score yet counts as FULL marks, so the standing
  // #    begins at the top and comes down as real scores arrive, instead
  // #    of starting at zero and frightening you with exams you have not
  // #    sat. And a score that cannot be true — more than its "out of",
  // #    or more than its weight when no "out of" is given — is never
  // #    guessed at: it is marked and counted as full until the missing
  // #    number is supplied. Guessing it once turned an item worth 2
  // #    with a score of 6 into 6 points of a course, and that course
  // #    totalled 101.8 out of 90
  // ============================================================
  const COLUMNS = [
    ['Item', 'lgC'], ['Score', 'lgC'], ['Earn', 'lgR'], ['%', 'lgC'],
    ['Grade', 'lgC'], ['Due', 'lgC'], ['Material needed', 'lgC'], ['', 'lgL']
  ];

  const today = () => new Date().toISOString().slice(0, 10);

  // ============================================================
  // # 📚 ☑️  CHOOSING WHAT AN ITEM NEEDS
  // # 🔤 JavaScript
  // # 🎯 A list of this course's own chapters, each one tickable, opened
  // #    from the cell that shows what the item needs
  // # 🔗 It is put on the page itself and placed by measured coordinates,
  // #    not inside the cell. The table of marks slides sideways inside
  // #    the card, and anything drawn within something that slides is cut
  // #    off at its edge — which is how the gear's panel came to be open
  // #    and invisible. Only one is ever open, and it closes on the next
  // #    press anywhere else
  // ============================================================
  const shutMaterial = () => document.getElementById('matPop')?.remove();

  const openMaterial = (button, course, item, afterChange) => {
    const already = document.getElementById('matPop');
    const mine = already?.dataset.item;
    shutMaterial();
    if (mine === item.id) return;          // pressing it again closes it

    const chapters = alive(course);
    const pop = document.createElement('div');
    pop.className = 'matPop';
    pop.id = 'matPop';
    pop.dataset.item = item.id;

    if (!chapters.length) {
      const none = document.createElement('p');
      none.className = 'matNoneYet';
      none.textContent = 'This course has no chapters yet. Add one from the gear, then it can be chosen here.';
      pop.append(none);
    }

    chapters.forEach((ch, index) => {
      const line = document.createElement('label');
      line.className = 'matRow';

      const tick = document.createElement('input');
      tick.type = 'checkbox';
      tick.className = 'matTick';
      tick.checked = (item.material || []).includes(ch.id);
      tick.onchange = () => {
        const row = (course.items || []).find(x => x.id === item.id);
        if (!row) return;
        const have = new Set(row.material || []);
        tick.checked ? have.add(ch.id) : have.delete(ch.id);
        row.material = [...have];
        row.updatedAt = now();
        changed(course);
        afterChange();
      };

      const no = document.createElement('span');
      no.className = 'matNo';
      no.textContent = 'C' + (index + 1);

      const name = document.createElement('span');
      name.className = 'matName';
      name.textContent = ch.name || 'Unnamed chapter';

      line.append(tick, no, name);
      pop.append(line);
    });

    document.body.append(pop);
    const at = button.getBoundingClientRect();
    const width = pop.offsetWidth, height = pop.offsetHeight;
    // It must stay on the screen: against the right edge or near the
    // bottom it is pulled back rather than drawn where it cannot be read
    pop.style.left = Math.max(8, Math.min(at.left, window.innerWidth - width - 8)) + 'px';
    pop.style.top = (at.bottom + height + 8 > window.innerHeight ? at.top - height - 4 : at.bottom + 4) + 'px';
  };

  document.addEventListener('click', event => {
    if (!event.target.closest('.matPop, .asMat')) shutMaterial();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') shutMaterial();
  });

  const marksPart = course => {
    const panel = document.createElement('div');
    panel.className = 'marks';

    const table = document.createElement('div');
    table.className = 'asTable';

    // The grade in the head of the card is the ONE place the standing is
    // said. There was a line under this table saying it a second time, in
    // other words, two inches away — and two sayings of one number only
    // make a reader stop to work out which of them to believe
    const tellTheHead = () => {
      const column = panel.closest('.col');
      if (column) paintHead(column, course);
      refreshTermGpa();
    };

    const drawItems = () => {
      table.textContent = '';

      const legend = document.createElement('div');
      legend.className = 'asLegend';
      COLUMNS.forEach(([word, align]) => {
        const cell = document.createElement('span');
        cell.className = align;
        cell.textContent = word;
        legend.append(cell);
      });
      table.append(legend);

      const list = marksOf(course);
      if (!list.length) {
        const none = document.createElement('div');
        none.className = 'asEmpty';
        none.textContent = 'No items yet — add the first below.';
        table.append(none);
      }

      list.forEach(item => {
        const row = document.createElement('div');
        row.className = 'asItem';

        // Every field writes by the item's own id. The list drawn here is
        // filtered, so its order is not the order of what is stored, and
        // writing by position would land the change on somebody else
        const field = (cls, type, value, key, placeholder) => {
          const box = document.createElement('input');
          box.type = type;
          box.className = 'asIn ' + cls;
          box.value = value ?? '';
          if (placeholder) box.placeholder = placeholder;
          if (type === 'number') { box.min = '0'; box.step = 'any'; }
          box.oninput = () => {
            const mine = (course.items || []).find(x => x.id === item.id);
            if (!mine) return;
            // An empty score means "not marked yet", which is not the same
            // as a zero; an empty weight or total is simply nothing
            mine[key] = type !== 'number' ? box.value
                      : key === 'got' ? (box.value === '' ? null : Number(box.value))
                      : (Number(box.value) || 0);
            mine.updatedAt = now();
            changed(course);
            paintRow();
            tellTheHead();
          };
          return box;
        };

        const name = field('asName', 'text', item.name, 'name', 'Midterm…');
        name.title = item.name || 'Item name';
        name.addEventListener('input', () => { name.title = name.value || 'Item name'; });
        row.append(name);

        // The two halves of one reading, so they are one cell: a score is
        // nothing without what it is out of
        const score = document.createElement('span');
        score.className = 'asG';
        score.append(field('asNum', 'number', item.got, 'got', '—'));
        const slash = document.createElement('span');
        slash.className = 'asUnit';
        slash.textContent = '/';
        score.append(slash, field('asNum', 'number', item.outOf || '', 'outOf', String(item.weight || '')));
        row.append(score);

        const earn = document.createElement('span');
        earn.className = 'asEarned';
        row.append(earn);

        row.append(field('asNum asW', 'number', item.weight || '', 'weight', '0'));

        // The item's own letter, out of its own total — not out of the
        // course. It needs both numbers: with no "out of" there is no
        // percentage at all, and inventing one is what made a score of 6
        // on an item worth 2 read as six per cent
        const letter = document.createElement('span');
        letter.className = 'asGrade';
        row.append(letter);

        row.append(field('asDue', 'date', item.due, 'due', ''));

        // What has to be read for this item is not typed: it is chosen
        // from the chapters this course already has. Typing it would let
        // the two drift — a chapter renamed, and a sentence still naming
        // the old one with nothing to notice it
        const mat = document.createElement('button');
        mat.className = 'asMat';
        mat.type = 'button';
        mat.onclick = event => {
          event.stopPropagation();
          openMaterial(mat, course, item, paintRow);
        };
        row.append(mat);

        const off = document.createElement('button');
        off.className = 'asDel';
        off.type = 'button';
        off.textContent = '×';
        off.title = 'Remove this item';
        off.onclick = () => {
          const mine = (course.items || []).find(x => x.id === item.id);
          if (!mine) return;
          mine.deleted = true;
          mine.updatedAt = now();
          changed(course);
          drawItems();
          tellTheHead();
        };
        row.append(off);

        // The row says what it is worth the moment it is typed in, not
        // when the panel is next opened. A due date that has passed turns
        // the row, and that too must show as it is typed
        const paintRow = () => {
          const mine = (course.items || []).find(x => x.id === item.id) || item;
          const graded = isGraded(mine), odd = isOdd(mine);
          earn.textContent = Math.round(earnedOf(mine) * 10) / 10 + '%';
          earn.classList.toggle('asAssumed', !graded || odd);
          earn.title = odd ? 'Not counted — the score does not fit the item; give its "out of"'
                     : graded ? 'Earned out of the course'
                              : 'Counted as full marks until you enter a score';
          score.classList.toggle('asOdd', odd);
          score.title = odd ? 'This score is larger than the item can be worth — give its "out of" so it can be counted' : '';

          const pct = graded && !odd && Number(mine.outOf) > 0 ? (100 * Number(mine.got)) / Number(mine.outOf) : null;
          if (pct === null) {
            letter.textContent = '';
            letter.style.removeProperty('--g');
            letter.title = '';
          } else {
            const [, word, points] = gradeOf(pct);
            letter.textContent = word;
            letter.style.setProperty('--g', gradeColour(points));
            letter.title = Math.round(pct * 10) / 10 + '% on this item';
          }

          row.classList.toggle('asLate', Boolean(mine.due && mine.due < today() && !graded));

          const chapters = alive(course);
          const chosen = (mine.material || []).filter(id => chapters.some(h => h.id === id));
          mat.classList.toggle('matNone', chosen.length === 0);
          mat.textContent = !chapters.length ? 'no chapters'
            : !chosen.length ? '—'
            : chosen.length === 1 ? (chapters.find(h => h.id === chosen[0]).name || 'one chapter')
            : chosen.length + ' of ' + chapters.length;
          mat.title = chosen.length
            ? 'Needs: ' + chosen.map(id => chapters.find(h => h.id === id).name || 'a chapter').join(' · ')
            : 'Nothing chosen yet — press to pick the chapters this needs';
        };

        paintRow();
        table.append(row);
      });
    };

    // Adding is asked for from the gear, like everything else done to a
    // course as a whole, so the panel hands out the way to do it rather
    // than carrying a button of its own
    panel.addMark = () => {
      course.items = course.items || [];
      course.items.push({ id: 'i-' + Math.random().toString(36).slice(2, 8), name: '', weight: 0,
                          got: null, outOf: 0, due: '', material: '', updatedAt: now(), deleted: false });
      changed(course);
      drawItems();
      tellTheHead();
      table.querySelector('.asItem:last-of-type .asName')?.focus();
    };

    drawItems();
    panel.append(table);
    setTimeout(tellTheHead, 0);
    return panel;
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
  // ============================================================
  // # ➕ 🧮  EVERY LEVEL IS THE SUM OF THE ONE BELOW IT
  // # 🔤 JavaScript
  // # 🎯 Hours done of hours there are, and the bank's green and red,
  // #    added up over whatever list of chapters is handed in
  // # 🔗 ONE COUNTING, USED THREE TIMES: a chapter's own, a course's
  // #    chapters, the whole term's. Three separate counts would be
  // #    three chances for the term to disagree with the courses it is
  // #    made of — and it is exactly the kind of disagreement nobody
  // #    notices, because each number looks reasonable on its own.
  // #
  // #    Hours and not chapters: a chapter counted as one whole thing
  // #    makes a forty row chapter and a three row one worth the same,
  // #    and a term of one long course and four short ones then reads
  // #    as four fifths done when the work left is most of it
  // ============================================================
  const sumOf = list => {
    let hours = 0, did = 0, rows = 0, good = 0, bad = 0, marked = 0;
    list.forEach(h => {
      // Measured, or the reader's own guess where they asked for it —
      // decided in ONE place, because the bar beside the chapter, the
      // hours under the course, the term's total and "you'll finish in
      // N days" all divide by this and must not each decide for
      // themselves what a chapter is worth
      const worth = keep.hoursOf(h);
      hours += worth;
      // A chapter nobody has paced still counts what was ticked on it,
      // the only way it ever could: all of it, or none
      did += worth > 0 ? Math.min(worth, h.doneMinutes || 0) : 0;
      rows += h.rows || 0;
      good += h.good || 0;
      bad += h.bad || 0;
      if (h.done) marked++;
    });
    const asked = good + bad;
    return {
      hours, did, rows, good, bad, asked,
      unknown: Math.max(0, rows - asked),
      through: hours > 0
        ? Math.min(100, Math.round((did / hours) * 100))
        : (list.length ? Math.round((marked / list.length) * 100) : 0),
      marked
    };
  };

  const bankTip = (sum, what) => (sum.asked
    ? `The bank asked ${sum.asked} of ${sum.rows} ${what} — ${sum.good} right, ${sum.bad} wrong`
    : `The bank has not asked you anything in ${what} yet`);

  const hoursTip = (sum, list) => (sum.hours > 0
    ? `${fmtHours(sum.did)} done of ${fmtHours(sum.hours)}`
    : (list.length ? `${sum.marked} of ${list.length} finished` : 'No chapters yet'));

  const termReading = () => {
    const courses = living();
    const chapters = courses.flatMap(c => alive(c));
    return {
      courses: courses.length,
      chapters: chapters.length,
      named: chapters.filter(h => h.name.trim() !== '').length,
      list: chapters,
      sum: sumOf(chapters)
    };
  };

  const drawTermShape = () => {
    const r = termReading();
    termShape.textContent = '';
    termShape.append(window.MyTermShapes.draw('lg', {
      ready: r.chapters ? Math.round((r.named / r.chapters) * 100) : 0,
      readyTip: `Set up — ${r.named} of ${r.chapters} chapters named`,
      done: r.sum.through,
      doneTip: hoursTip(r.sum, r.list),
      marks: { ok: r.sum.good, bad: r.sum.bad, unknown: r.sum.unknown },
      marksTip: bankTip(r.sum, 'the whole term')
    }));
  };

  // ============================================================
  // # 🎓 🟩  THE TERM AVERAGE, UNDER ITS NAME
  // # 🔤 JavaScript
  // # 🎯 One number out of four, and four blocks beside it. Each block is
  // #    one whole point, filled by as much of that point as was earned —
  // #    at 2.40 two are full, the third is four tenths full, the fourth
  // #    is empty
  // # 🔗 No new arithmetic lives here. The number is each course's own
  // #    standing — the very thing its grade shows — turned into points
  // #    and averaged by credit hours, so the card and the average can
  // #    never say different things about the same course.
  // #
  // #    Every course counts, including one with nothing graded yet: its
  // #    card already reads A+ because full marks are assumed until a
  // #    real score says otherwise, and the average is the sum of what
  // #    the cards say. So a new term begins at 4.00 and comes down as
  // #    marks arrive. Leaving such a course out instead would mean the
  // #    cards and the number under the term were adding up different
  // #    courses, and the reader would have no way to tell which.
  // #
  // #    The blocks mean the number needs no "out of 4" beside it — the
  // #    shape says it, so the words under them are said small, once
  // ============================================================
  const creditsOf = course => {
    const hours = Number(course.credits);
    return hours > 0 ? hours : 3;        // nothing said reads as three
  };

  const refreshTermGpa = () => {
    const rows = living().map(c => ({ course: c, s: standingOf(c), credits: creditsOf(c) }))
      .filter(x => x.s);

    termGpa.textContent = '';
    if (!rows.length) { drawTermShape(); return; }

    const hours = rows.reduce((sum, x) => sum + x.credits, 0);
    const gpa = rows.reduce((sum, x) => sum + x.s.points * x.credits, 0) / hours;

    // The colour of the band the average falls in, from the one scale the
    // whole site reads, so the number is the same colour as the grade it
    // would be if the term were one course
    const band = CUTS.find(c => gpa >= c[2] - 0.0001) || CUTS[CUTS.length - 1];

    const value = document.createElement('b');
    value.className = 'gpaVal';
    value.textContent = gpa.toFixed(2);

    const bars = document.createElement('span');
    bars.className = 'gpaBars';
    for (let point = 0; point < 4; point++) {
      const block = document.createElement('span');
      block.className = 'gpaSeg';
      const fill = document.createElement('i');
      fill.style.width = Math.max(0, Math.min(1, gpa - point)) * 100 + '%';
      block.append(fill);
      bars.append(block);
    }

    const scale = document.createElement('span');
    scale.className = 'gpaOf';
    scale.textContent = 'GPA · OUT OF 4.00';

    const side = document.createElement('span');
    side.className = 'gpaSide';
    side.append(bars, scale);

    // ============================================================
    // THE AVERAGE IS COVERED UNTIL IT IS ASKED FOR
    // A grade is the one number on this board a reader may not want on
    // screen in a room with other people in it — the same reason a
    // banking app opens with the balance hidden. It starts covered on
    // EVERY open and is not remembered: a choice remembered is a
    // choice made once and then quietly forgotten about, which is
    // exactly the wrong property for this one
    // ============================================================
    const eye = document.createElement('button');
    eye.type = 'button';
    eye.className = 'gpaEye';
    const shut = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/>'
      + '<path d="M10.6 5.2A9 9 0 0 1 12 5c6 0 9 7 9 7a16 16 0 0 1-2.9 3.9"/>'
      + '<path d="M6.5 7.4A16 16 0 0 0 3 12s3 7 9 7a9 9 0 0 0 3.8-.8"/>'
      + '<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
    const open = '<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/>'
      + '<circle cx="12" cy="12" r="3"/></svg>';
    const cover = on => {
      termGpa.classList.toggle('hid', on);
      eye.innerHTML = on ? shut : open;
      eye.title = on ? 'Show the term average' : 'Hide the term average';
    };
    eye.onclick = () => cover(!termGpa.classList.contains('hid'));

    termGpa.style.setProperty('--g', gradeColour(band[2]));
    termGpa.append(eye, value, side);
    cover(true);
    // Which of these are measured and which are still assumed is the one
    // thing the number itself cannot say, so the tip says it per course
    termGpa.title = `Term GPA — ${rows.length} course${rows.length === 1 ? '' : 's'} · ${hours} credit hours\n`
      + rows.map(x => `${x.course.name || 'Untitled'}  ${x.s.letter}  ${Math.round(x.s.pct * 10) / 10}%  ·  ${x.s.points.toFixed(2)} × ${x.credits}h`
                      + (x.s.assumed ? '  (nothing graded yet)' : '')).join('\n')
      + '\nFull marks are assumed until a score says otherwise, so a new term starts at 4.00.';

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

    // Nothing on this card is typed any more. How long a chapter takes
    // is the sum of what its parts are paced at; how much of it is done
    // is the rows ticked off inside it; and "finished" was a third
    // opinion beside those two -- a chapter can hardly be marked done
    // while its own parts say otherwise. All three were boxes a reader
    // could set against the truth, and every one of them did
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

    // ============================================================
    // # ⏳ 🔀  MEASURED, OR WHAT YOU EXPECT IT TO COST
    // # 🔤 JavaScript
    // # 🎯 A chapter says which of the two its hours are read by, and
    // #    carries the reader's own guess when it is the second
    // # 🔗 THE MEASURED NUMBER IS NEVER OVERWRITTEN. A chapter that has
    // #    not been written yet measures nothing — truthfully — and a
    // #    term made mostly of those read as a few hours of work, which
    // #    is no use for planning. So the guess is a field of its own
    // #    beside the measurement, and the chapter says which one it
    // #    means. Switch back to Real and the measurement is still
    // #    there, untouched, however long the guess has been showing
    // ============================================================
    const hoursWrap = document.createElement('span');
    hoursWrap.className = 'ch-hoursby';

    const draw = () => {
      hoursWrap.textContent = '';
      const byGuess = ch.hoursBy === 'expect';

      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'ch-hlink' + (byGuess ? ' guess' : '');
      open.textContent = 'hours';
      open.title = byGuess
        ? 'Read by what you expect it to cost'
        : 'Read by what its parts actually hold';

      const pop = document.createElement('span');
      pop.className = 'ch-hpop';
      pop.hidden = true;

      const pick = (mode, words) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ch-hpick' + ((ch.hoursBy === mode) ? ' on' : '');
        b.textContent = words;
        b.onclick = e => {
          e.stopPropagation();
          ch.hoursBy = mode;
          ch.updatedAt = now();
          changed(course);
          draw();
          redraw();
        };
        return b;
      };
      pop.append(pick('real', 'Real'), pick('expect', 'By expectation'));

      // The box only when the guess is what is being read — an hours
      // field standing beside a number it is not feeding is a question
      // with no answer attached
      if (byGuess) {
        const box = document.createElement('input');
        box.type = 'number';
        box.className = 'ch-hnum';
        box.min = '0';
        box.step = '0.5';
        box.placeholder = 'hours';
        box.value = ch.expect > 0 ? String(Math.round(ch.expect / 60 * 10) / 10) : '';
        box.title = 'How many hours you expect this chapter to take';
        box.onclick = e => e.stopPropagation();
        box.oninput = () => {
          const h = Math.max(0, Number(box.value) || 0);
          ch.expect = Math.round(h * 60);
          ch.updatedAt = now();
          changed(course);
          redraw();
        };
        pop.append(box);
      }

      open.onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; };
      hoursWrap.append(open, pop);
    };
    draw();

    box.append(partsOf(ch), off, hoursWrap);
    return box;
  };

  // ============================================================
  // # 📑 ⏱️  THE PARTS OF A CHAPTER, ON THE BOARD
  // # 🔤 JavaScript
  // # 🎯 Under an opened chapter: every part of it, how many hours of it
  // #    are done of how many there are, and a bar of the same
  // # 🔗 Read from the copy the chapter writes beside itself, never by
  // #    opening the chapter. A board that opened every chapter to draw
  // #    its card would read the whole term to show one course.
  // #
  // #    A chapter that has never been opened on this device has no copy
  // #    yet, and says so rather than showing an empty list — which
  // #    would read as a chapter with nothing in it
  // ============================================================
  const partsOf = ch => {
    const box = document.createElement('div');
    box.className = 'dparts';
    const list = (ch.parts || []).filter(p => p.name !== '' || p.rows);
    if (!list.length) {
      const none = document.createElement('p');
      none.className = 'dnone';
      none.textContent = 'Open the chapter once and its parts will show here.';
      box.append(none);
      return box;
    }

    list.forEach(part => {
      const row = document.createElement('div');
      row.className = 'dpart';

      // The name and the clock on one line, the part's own bar under it.
      // HOURS AND NOT A COUNT OF ROWS: this board is kept in hours from
      // the course's total down, and a part that answered "11 of 44"
      // here would be the one reading on the card in another currency
      const head = document.createElement('div');
      head.className = 'dphead';

      const name = document.createElement('span');
      name.className = 'dpname';
      name.textContent = part.name;

      head.append(name, hoursPair(part.done, part.minutes));

      const rail = document.createElement('span');
      rail.className = 'dprail';
      const fill = document.createElement('i');
      fill.style.width = (part.minutes ? Math.min(100, (part.done / part.minutes) * 100) : 0) + '%';
      rail.append(fill);

      row.append(head, rail);
      row.title = part.name + ' · ' + (part.minutes
        ? `${fmtHours(part.done)} done of ${fmtHours(part.minutes)}`
        : 'no pace set on it yet');
      box.append(row);
    });
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
    const mins = Math.max(0, Number(minutes) || 0);
    // Under a minute is said in seconds. A part paced at forty seconds a
    // row is a real pace, and rounding its first row to "0h" would tell
    // the reader their tick did nothing
    const secs = Math.round(mins * 60);
    if (secs === 0) return '0h';
    if (secs < 60) return secs + 's';
    const m = Math.round(mins);
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

  // ============================================================
  // # 🟢 🔴  WHAT THE BANK SAYS, ON THE BOARD
  // # 🔤 JavaScript
  // # 🎯 The chapter's disc is its bank: green for the rows a question
  // #    asked and you got, red for the ones you missed, grey for the
  // #    rest of the chapter the bank has not asked about
  // # 🔗 It is the one reading on this board the reader does not give
  // #    themselves. The name is written, the tick is pressed — both of
  // #    them say what the reader believes. This says what actually
  // #    happened when they were asked, and it arrives here on its own,
  // #    counted off the chapter's own two files the moment an answer
  // #    is given
  // ============================================================
  const chapterReading = ch => {
    // Counted by the same hand that counts the course above it and the
    // term above that, over a list of one
    const sum = sumOf([ch]);
    return window.MyTermShapes.draw('sm', {
      ready: ch.name.trim() !== '' ? 100 : 0,
      readyTip: ch.name.trim() !== '' ? 'Named and ready' : 'Not named yet',
      done: sum.through,
      doneTip: hoursTip(sum, [ch]),
      marks: { ok: sum.good, bad: sum.bad, unknown: sum.unknown },
      marksTip: bankTip(sum, 'this chapter')
    });
  };

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

      row.append(twist, no, name, hoursPair(ch.doneMinutes, keep.hoursOf(ch)), chapterReading(ch),
                 chapterDetail(course, ch, redraw));
      body.append(row);
    });

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
  // Both corners hear it: the board's and the course page's. A reader who
  // spends an hour inside one chapter must not have to go back to the board
  // to find out whether what they wrote was kept
  const say = name => { window.MyTermHud?.sync(name); window.MyTermCourseSync?.(name); };
  keep.onStatus(name => {
    say(name);
    if (name === 'failed') renewBtn.hidden = false;
    if (name === 'saved') renewBtn.hidden = true;
  });

  const paint = () => {
    showName();
    drawColumns();
    window.MyTermDays?.show(data);
    // The pace is drawn beside the days and reads the same board, but it
    // waits on one small file of its own, so it is asked rather than told
    if (window.MyTermPace?.arm('pace')) window.MyTermPace.show();
    drawTermShape();
    // A tab opened on one course lands on it, once the courses are here
    window.MyTermCoursePage?.fromAddress();
  };

  const showBoard = () => {
    window.MyTermCurtain?.down();
    board.hidden = false;
    backBtn.hidden = false;
    document.body.classList.add('board-on');
    // A tab that is showing the board is not showing a course, so this
    // is the moment the address and the seat both belong to the board
    if (!window.MyTermCoursePage?.openId?.()) {
      window.MyTermWhere?.atBoard?.();
      window.MyTermSeat?.take?.('board', () => window.MyTermShell?.lostSeat?.());
    }
  };

  const openBoard = async event => {
    const fileId = event?.detail?.fileId;
    if (fileId) keep.attach(fileId);

    session.hidden = true;

    // A TAB OPENED ON ONE COURSE IS THAT COURSE'S PAGE AND NOTHING ELSE.
    // The board was being shown first and covered a moment later, once
    // the courses had been read — and that is exactly what it looked
    // like: a second copy of the board with another screen laid over it.
    // So when the address names a course, the board is built but never
    // shown. It is still built, because the course page reads the term
    // out of the same place the board does, and a second way of loading
    // one course alone would be a second thing to keep right
    const wanted = window.MyTermCoursePage?.asked?.();
    if (!wanted) showBoard();

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

    // The course it was opened on is not there — removed on the other
    // device, or a link kept from before. The board is then the only
    // honest thing to show, rather than a blank screen that says nothing
    if (wanted && !window.MyTermCoursePage?.openId()) showBoard();
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
    // The course page is drawn from the same data, so news from the other
    // device must reach it too — it may well be the screen being looked at
    window.MyTermCoursePage?.redraw();
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
  // The course page reads a chapter exactly as its card does: one way of
  // counting, handed over, so the two can never put different numbers on
  // the same chapter
  window.MyTermChapterReading = chapterReading;
  window.MyTermHours = { fmt: fmtHours, pair: hoursPair };
  window.MyTermBoardRedraw = () => { data = keep.board() || data; paint(); };

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') keep.flush(); });
  window.addEventListener('pagehide', () => keep.flush());
})();
