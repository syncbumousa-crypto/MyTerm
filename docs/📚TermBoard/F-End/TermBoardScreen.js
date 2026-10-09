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
  const columns = $('columns'), addBtn = $('add-course'), moreBtn = $('board-more');
  const state = $('save-state'), renewBtn = $('renew-access'), empty = $('board-empty');
  const termScore = $('term-score');

  const arabic = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const now = () => new Date().toISOString();
  const newId = () => 'c-' + Math.random().toString(36).slice(2, 8);
  const newChapterId = () => 'h-' + Math.random().toString(36).slice(2, 8);

  let data = { term: { name: '', updatedAt: null }, courses: [] };

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
    data.term = { name: nameBox.value, updatedAt: now() };
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
    head.placeholder = 'اسم المادة';
    head.oninput = () => {
      course.name = head.value;
      course.updatedAt = now();
      touched();
    };

    // الحذف بضغطتين لا بنافذة سؤال: الأولى تسأل، والثانية تنفّذ، وتعود
    // إلى حالها إن تركتها. ومجلد المادة في درايفك لا يُمسّ — فيه ملفاتك
    const drop = document.createElement('button');
    drop.className = 'col-drop';
    drop.type = 'button';
    drop.textContent = '×';
    drop.title = 'احذف المادة من اللوحة';
    let asking = null;
    drop.onclick = () => {
      if (!asking) {
        drop.textContent = 'احذف؟';
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

    const top = document.createElement('div');
    top.className = 'col-top';
    top.append(head, drop);

    const body = document.createElement('div');
    body.className = 'col-body';
    drawChapters(course, body);

    const add = document.createElement('button');
    add.className = 'col-add';
    add.type = 'button';
    add.textContent = '+ فصل';
    add.onclick = () => {
      course.chapters = course.chapters || [];
      course.chapters.push({ id: newChapterId(), name: 'فصل ' + arabic(alive(course).length + 1), done: false, updatedAt: now(), deleted: false });
      changed(course);
      drawChapters(course, body);
      const fresh = body.lastElementChild?.querySelector('.ch-name');
      fresh?.focus();
      fresh?.select();
    };

    column.append(top, body, add, scoreLine(course));
    return column;
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
    line.textContent = s ? `${arabic(s.done)} من ${arabic(s.total)} · ${arabic(s.pct)}٪` : '';
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
      mark.title = ch.done ? 'أنجزته' : 'لم تنجزه بعد';
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
      name.placeholder = 'اسم الفصل';
      name.oninput = () => { ch.name = name.value; ch.updatedAt = now(); changed(course); };

      const off = document.createElement('button');
      off.className = 'ch-off';
      off.type = 'button';
      off.textContent = '×';
      off.title = 'احذف الفصل';
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
      if (line) line.textContent = s ? `${arabic(s.done)} من ${arabic(s.total)} · ${arabic(s.pct)}٪` : '';
    });
    const all = living().flatMap(c => alive(c));
    const done = all.filter(h => h.done).length;
    termScore.textContent = all.length ? `${arabic(done)} من ${arabic(all.length)} · ${arabic(Math.round((done / all.length) * 100))}٪ من ترمك` : '';
  };

  const drawColumns = () => {
    columns.textContent = '';
    const here = living();
    here.forEach(course => columns.append(makeColumn(course)));
    empty.hidden = here.length > 0;
    refreshScores();
  };

  addBtn.onclick = () => {
    data.courses.push({ id: newId(), name: 'مادة ' + arabic(living().length + 1), updatedAt: now(), deleted: false });
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
    saving: 'يُحفظ في درايفك…',
    saved: 'محفوظ في درايفك',
    failed: 'لم يُحفظ — الوصول إلى درايفك انتهى. عملك محفوظ هنا ولم يضع.',
    unread: 'تعذّر قراءة ملفك من درايف — ما تراه قد لا يكون كامله.',
    arrived: 'وصل تعديل من جهازك الآخر'
  };

  const say = name => { state.textContent = WORDS[name] || ''; };
  keep.onStatus(name => {
    say(name);
    if (name === 'failed') renewBtn.hidden = false;
    if (name === 'saved') renewBtn.hidden = true;
  });

  const paint = () => { showName(); drawColumns(); };

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

  moreBtn.onclick = () => { leaveBoard(); session.hidden = false; };
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
    setTimeout(() => { if (state.textContent === WORDS.arrived) say(''); }, 2500);
    if (typing && typing.id === 'term-input') editName();
  };

  window.MyTermBell?.listen(hearBell);

  document.addEventListener('place-ready', openBoard);
  document.addEventListener('place-needed', () => { leaveBoard(); backBtn.hidden = true; keep.detach(); });
  document.addEventListener('signed-out', () => { leaveBoard(); backBtn.hidden = true; keep.detach(); });

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') keep.flush(); });
  window.addEventListener('pagehide', () => keep.flush());
})();
