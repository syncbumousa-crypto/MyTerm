// ============================================================
// # 📖 🚪  A PAGE OF ITS OWN FOR EVERY COURSE
// # 🔤 JavaScript
// # 🎯 Opens one course on a page to itself: its name, its three
// #    shapes read large, and its chapters as full rows with room to
// #    type in — instead of the narrow strip a column allows
// # 🔗 Both screens work on the same course objects held by the store,
// #    so a change made here is the same change the board sees: there
// #    is no second copy to keep in step. Going back only redraws the
// #    board, it never reloads, because nothing was lost by leaving
// ============================================================
(() => {
  const keep = window.MyTermBoardStore;
  const $ = id => document.getElementById(id);

  const page = $('course'), board = $('board');
  const nameBox = $('course-name'), shapeBox = $('course-shape');
  const list = $('course-chapters'), addBtn = $('course-add'), backBtn = $('course-back');
  const line = $('course-line');

  const arabic = n => String(n);
  const now = () => new Date().toISOString();
  const alive = course => (course.chapters || []).filter(h => !h.deleted);

  let openId = null;

  const course = () => (keep.live()?.courses || []).find(c => c.id === openId) || null;
  const touch = () => { keep.touchCourse(openId); keep.change(keep.live()); };

  // ============================================================
  // # 📑 ✍️  THE CHAPTER ROWS, WITH ROOM
  // # 🔤 JavaScript
  // # 🎯 The same three things as in the column — a mark, a name, a way
  // #    out — but wide enough to read and type a real chapter title
  // # 🔗 Drawn again after every change rather than patched in place:
  // #    the list is short, and redrawing is the one way to be sure the
  // #    screen says exactly what the data says
  // ============================================================
  const draw = () => {
    const c = course();
    if (!c) return;

    nameBox.value = c.name;
    list.textContent = '';

    alive(c).forEach(ch => {
      const row = document.createElement('div');
      row.className = 'crow';

      const mark = document.createElement('button');
      mark.type = 'button';
      mark.className = 'ch-mark' + (ch.done ? ' done' : '');
      mark.textContent = ch.done ? '✓' : '';
      mark.onclick = () => { ch.done = !ch.done; ch.updatedAt = now(); touch(); draw(); };

      const name = document.createElement('input');
      name.className = 'crow-name';
      name.value = ch.name;
      name.placeholder = 'Chapter name';
      name.oninput = () => { ch.name = name.value; ch.updatedAt = now(); touch(); };

      const off = document.createElement('button');
      off.type = 'button';
      off.className = 'ch-off';
      off.textContent = '×';
      off.onclick = () => { ch.deleted = true; ch.updatedAt = now(); touch(); draw(); };

      row.append(mark, name, off);
      list.append(row);
    });

    const here = alive(c);
    const done = here.filter(h => h.done).length;
    line.textContent = here.length
      ? `${done} of ${here.length} chapters · ${Math.round((done / here.length) * 100)}%`
      : 'No chapters yet — add the first one.';

    shapeBox.textContent = '';
    shapeBox.append(window.MyTermBoardReading(c, 'lg'));
  };

  nameBox.oninput = () => { const c = course(); if (c) { c.name = nameBox.value; c.updatedAt = now(); keep.change(keep.live()); } };

  addBtn.onclick = () => {
    const c = course();
    c.chapters = c.chapters || [];
    c.chapters.push({ id: 'h-' + Math.random().toString(36).slice(2, 8), name: 'Chapter ' + arabic(alive(c).length + 1), done: false, updatedAt: now(), deleted: false });
    touch();
    draw();
    list.lastElementChild?.querySelector('.crow-name')?.focus();
  };

  backBtn.onclick = () => {
    page.hidden = true;
    board.hidden = false;
    openId = null;
    window.MyTermBoardRedraw?.();
  };

  window.MyTermCoursePage = {
    open: id => {
      openId = id;
      board.hidden = true;
      page.hidden = false;
      draw();
    },
    openId: () => openId,
    redraw: () => { if (openId) draw(); }
  };
})();
