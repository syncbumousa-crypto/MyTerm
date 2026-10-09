// ============================================================
// # 🏷️ ✏️  THE TERM NAME
// # 🔤 JavaScript
// # 🎯 One spot at the top of the board that is three things in turn:
// #    a button when there is no name, a box while typing, and a plain
// #    title once named. Clicking the title opens the box again
// # 🔗 All the names here sit inside one wrapper, so they stay private
// #    to this file. The saving is in the other file: this one only
// #    draws, and calls that one whenever something changed
// ============================================================
(() => {
  const keep = window.MyTermBoardStore;
  const $ = id => document.getElementById(id);

  const board = $('board'), session = $('session'), backBtn = $('to-board');
  const setBtn = $('term-set'), nameBox = $('term-input'), title = $('term-title');
  const columns = $('columns'), addBtn = $('add-course'), moreBtn = $('board-more');

  const arabic = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

  let data = { term: '', courses: [] };
  const save = () => keep.write(data);

  const showName = () => {
    const named = data.term.trim() !== '';
    setBtn.hidden = named;
    title.hidden = !named;
    nameBox.hidden = true;
    title.textContent = data.term;
  };

  const editName = () => {
    setBtn.hidden = true;
    title.hidden = true;
    nameBox.hidden = false;
    nameBox.value = data.term;
    nameBox.focus();
    nameBox.select();
  };

  const doneName = () => {
    data.term = nameBox.value.trim();
    save();
    showName();
  };

  setBtn.onclick = editName;
  title.onclick = editName;
  nameBox.onblur = doneName;
  nameBox.onkeydown = event => {
    if (event.key === 'Enter') nameBox.blur();
    if (event.key === 'Escape') { nameBox.value = data.term; nameBox.blur(); }
  };

  // ============================================================
  // # 🧱 ➕  A COLUMN FOR EVERY COURSE
  // # 🔤 JavaScript
  // # 🎯 Adds a course and draws a column for it. The column head is a
  // #    box, so the name is changed by typing in it with no extra step
  // # 🔗 The page reads right to left, so each new column lands to the
  // #    left of the one before it on its own. The whole row is drawn
  // #    again after every add, which keeps each column's place in the
  // #    list matching its place on screen
  // ============================================================
  const makeColumn = (name, place) => {
    const column = document.createElement('section');
    column.className = 'col';

    const head = document.createElement('input');
    head.className = 'col-name';
    head.value = name;
    head.placeholder = 'اسم المادة';
    head.oninput = () => { data.courses[place] = head.value; save(); };

    const body = document.createElement('div');
    body.className = 'col-body';

    column.append(head, body);
    return column;
  };

  const drawColumns = () => {
    columns.textContent = '';
    data.courses.forEach((name, place) => columns.append(makeColumn(name, place)));
  };

  addBtn.onclick = () => {
    data.courses.push('مادة ' + arabic(data.courses.length + 1));
    save();
    drawColumns();
    const fresh = columns.lastElementChild?.querySelector('.col-name');
    fresh?.focus();
    fresh?.select();
  };

  // ============================================================
  // # 🪟 🔀  WHEN THE BOARD SHOWS, AND WHEN IT STEPS ASIDE
  // # 🔤 JavaScript
  // # 🎯 Opens the board once the saving place is ready, hides it while
  // #    that place is still being set up, and clears it on the way out
  // # 🔗 Listens for three messages the other files send. It never asks
  // #    Google or the database anything itself. The dark class on the
  // #    body is what turns the page dark and moves it to the top, so
  // #    a long row of columns is not cut off
  // ============================================================
  const openBoard = () => {
    data = keep.read() || { term: '', courses: [] };
    showName();
    drawColumns();
    session.hidden = true;
    board.hidden = false;
    backBtn.hidden = false;
    document.body.classList.add('board-on');
  };

  const leaveBoard = () => {
    board.hidden = true;
    document.body.classList.remove('board-on');
  };

  moreBtn.onclick = () => { leaveBoard(); session.hidden = false; };
  backBtn.onclick = openBoard;

  document.addEventListener('place-ready', openBoard);
  document.addEventListener('place-needed', () => { leaveBoard(); backBtn.hidden = true; });
  document.addEventListener('signed-out', () => { leaveBoard(); backBtn.hidden = true; });
})();
