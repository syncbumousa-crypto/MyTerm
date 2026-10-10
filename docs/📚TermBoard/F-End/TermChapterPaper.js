// ============================================================
// # 📄 🖨️  THE SHEETS, AND WHERE EACH ONE ENDS
// # 🔤 JavaScript
// # 🎯 Lays the rows of a chapter onto sheets of white paper: groups
// #    them into tables, measures how much fits on a sheet, cuts there,
// #    and draws the marks, the menus and the ticks on top
// # 🔗 THE SHEET IS MEASURED, NOT GUESSED. Nothing here knows how tall
// #    a row is — a row can be one line or ten, in any type size the
// #    reader chose, at any width. So a hidden sheet of exactly the real
// #    width is built off-screen, rows are added to it one at a time,
// #    and the moment it grows past the height of a page the page is
// #    closed and the row starts the next one. Any rule of thumb
// #    instead of this — so many rows a page, so many letters a row —
// #    is wrong the first time somebody writes a long definition.
// #
// #    And the paper is not decoration. A sheet having an END is the
// #    only reason a row can be told to BEGIN one
// ============================================================
(() => {
  const store = () => window.MyTermChapterStore;

  // The sheet's one real size, in the units everything on it is drawn
  // in. Nothing may make these depend on the window: they are what the
  // division into sheets is counted against
  const PAPER_W = 800;
  const PAPER_H = Math.round(PAPER_W * 297 / 210);

  // The number and the box are the width of what they hold and never
  // move. The Term column is the reader's to set, and the meaning column
  // is given no width at all — so it takes whatever is left, and every
  // millimetre taken off the Term is a millimetre the meaning gains
  const COLS = '<colgroup><col style="width:34px"><col style="width:var(--term-col,180px)">'
    + '<col><col style="width:34px"></colgroup>';

  // ============================================================
  // # 🌍 🔁  THE TWO LANGUAGES OF A ROW
  // # 🔤 JavaScript
  // # 🎯 Which two of the row's four fields are on the paper, which way
  // #    they read, and what the header over them says
  // # 🔗 THE LANGUAGE IS CHOSEN BEFORE THE PAPER IS CUT, NEVER AFTER.
  // #    The same idea is not the same length in two languages, so
  // #    swapping the words in cells that are already laid out leaves
  // #    the last rows hanging off the bottom of a sheet. The language
  // #    goes into the very HTML the hidden sheet is measured with, and
  // #    changing it cuts the paper again — which is also why typing
  // #    while Arabic is showing writes into the Arabic field and not
  // #    over the English one
  // ============================================================
  const LANGS = {
    en: { term: 'term', text: 'text', dir: 'ltr', other: 'ar',
          head: ['#', 'Term', 'What it means', ''] },
    ar: { term: 'termAr', text: 'textAr', dir: 'rtl', other: 'en',
          head: ['#', 'المصطلح', 'المعنى', ''] }
  };

  let host = null, stage = null, probe = null, told = () => {};
  let menu = null, bar = null, listening = false, lang = 'en';

  // ============================================================
  // # 🙈 🧠  COVERING A CELL, TO SEE IF YOU KNOW IT
  // # 🔤 JavaScript
  // # 🎯 Remembers which cells are covered over, so a sheet can be read
  // #    as a test instead of as a summary
  // # 🔗 KEPT FOR THE SITTING ONLY, and written to no file. What you have
  // #    covered up this evening is not a fact about the course and has
  // #    no business travelling to the phone — nor being there tomorrow.
  // #
  // #    And it is kept by COLUMN, not by language: covering the meaning
  // #    of a row covers that row's meaning, whichever of the two
  // #    languages happens to be on the paper
  // ============================================================
  const covered = new Set();
  const coverKey = (rowId, col) => rowId + ':' + col;

  // ============================================================
  // # 🧾 🔤  ONE ROW, WRITTEN OUT
  // # 🔤 JavaScript
  // # 🎯 The four cells of a row as paper: its number, the term, what it
  // #    means, and the box
  // # 🔗 The number shown is always the row's position — one, two,
  // #    three — and never the id kept in the file. The id survives
  // #    moves and removals on purpose, so it has gaps and jumps in it,
  // #    and a reader counting down a page does not care which row was
  // #    written first
  // ============================================================
  const plainWords = html => {
    const box = document.createElement('div');
    box.innerHTML = html || '';
    return box.textContent.replace(/\s+/g, ' ').trim();
  };

  // Written with split and join rather than with /"/g on purpose. A lone
  // quote inside a regular expression is a quote to anything reading this
  // file as text, and the guard that checks every file for helpers that
  // were deleted reads it that way: that one character swallowed the next
  // forty lines and it reported two live functions as missing
  const asAttr = s => s.split('&').join('&amp;').split('"').join('&quot;').split('<').join('&lt;');

  // An empty cell does not sit blank: it shows the SAME ROW in the other
  // language, faintly. Turning a chapter that was written in English over
  // to Arabic would otherwise show a page of empty boxes — which is what
  // a chapter nobody has written looks like — and the reader would have
  // to turn back to see what each one is supposed to say. What shows here
  // is only a hint drawn by the page; it is in no file, and the first
  // letter typed replaces it
  const cellOf = (row, which) => {
    const here = LANGS[lang], there = LANGS[here.other];
    const words = row[here[which]];
    let hint = plainWords(row[there[which]]);
    // The hint is the OTHER language, so it reads the other way round.
    // Left to the cell's own direction, an English sentence hinted inside
    // an Arabic cell had its full stop thrown to the far end of the line
    let hintDir = there.dir;
    if (hint.length > 90) hint = hint.slice(0, 89) + '…';
    if (!hint) { hint = here.head[which === 'term' ? 1 : 2]; hintDir = here.dir; }
    // No contenteditable until it is asked for by a double press. A cell
    // that is always open to typing cannot also answer a single press,
    // and the single press is the one a reader makes a hundred times an
    // evening: cover this, uncover that, do I know it
    const hide = covered.has(coverKey(row.id, which)) ? ' covered' : '';
    return `<td class="c${which === 'term' ? 'term' : 'def'}${hide}" dir="${here.dir}"`
      + ` data-col="${which}" data-field="${here[which]}"`
      + ` data-hintdir="${hintDir}" data-empty="${asAttr(hint)}">${words}</td>`;
  };

  const headHtml = () => '<tr>' + LANGS[lang].head.map(w => `<th>${w}</th>`).join('') + '</tr>';

  const rowHtml = (row, n) => {
    const on = store().isOn(row.id);
    const cls = [row.lead ? 'clead' : '', on ? 'done' : ''].filter(Boolean).join(' ');
    // A gear and not a cross. A cross is one thing only, and the most
    // destructive thing a row can do — standing on its own in the corner
    // of every row, it is the easiest to press by accident and the only
    // one that cannot be undone. The gear opens the list that removing
    // sits at the bottom of, along with everything else about this row
    return `<tr data-row="${row.id}"${cls ? ` class="${cls}"` : ''}>`
      + `<td class="cno"><span class="crowgear" data-gear="${row.id}" title="This row">⚙</span>${n}</td>`
      + cellOf(row, 'term')
      + cellOf(row, 'text')
      + `<td class="cbox"><button class="cbx${on ? ' on' : ''}" type="button" data-tick="${row.id}"`
      + ` title="${on ? 'Learnt' : 'Not learnt yet'}"></button></td>`
      + '</tr>';
  };

  // Consecutive rows sharing a table number are one table. The first
  // table on a sheet wears no header when it is the same table that ran
  // off the bottom of the sheet before: a break made by the paper must
  // never be told apart from a break the reader asked for
  const pageHtml = (list, carry) => {
    let out = '', i = 0, first = true;
    while (i < list.length) {
      const cid = list[i].cid;
      const run = [];
      while (i < list.length && list[i].cid === cid) run.push(list[i++]);
      const cont = first && carry !== null && cid === carry;
      out += `<table class="ctbl${cont ? ' cont' : ''}">${COLS}${cont ? '' : headHtml()}`
        + run.map(u => rowHtml(u.row, u.n)).join('') + '</table>';
      first = false;
    }
    return out;
  };

  // ============================================================
  // # ✂️ 📏  WHERE THE PAPER RUNS OUT
  // # 🔤 JavaScript
  // # 🎯 Walks the rows, adding each to the sheet in hand, and closes
  // #    the sheet the moment it no longer fits
  // # 🔗 A row taller than a whole sheet on its own still gets its own
  // #    sheet rather than being refused: a sheet's height is a floor
  // #    and not a ceiling, so that sheet is merely too long, and
  // #    nothing the reader wrote is ever hidden
  // ============================================================
  const splitPages = (list, roomH) => {
    const pages = [];
    let cur = [], carry = null;

    const close = () => {
      pages.push({ list: cur, carry });
      carry = cur[cur.length - 1].cid;
      cur = [];
    };

    list.forEach(u => {
      // A primary row is read from the top of clean paper
      if (u.lead && cur.length) close();
      probe.innerHTML = pageHtml(cur.concat([u]), carry);
      if (probe.offsetHeight > roomH && cur.length) close();
      cur.push(u);
    });

    if (cur.length) pages.push({ list: cur, carry });
    return pages;
  };

  // ============================================================
  // # 🖍️ 🪄  THE BAR THAT MARKS WHAT IS SELECTED
  // # 🔤 JavaScript
  // # 🎯 Appears over a selection inside a cell and puts one of the
  // #    marks on it, or takes them all off again
  // # 🔗 Its buttons act on MOUSE DOWN and refuse the event, so the
  // #    selection is never lost: a button that waited for the click
  // #    would have taken the focus away first, and there would be
  // #    nothing selected left to mark by the time it ran
  // ============================================================
  const MARKS = [
    ['hl', 'H', 'Highlight'],
    ['pa', 'A', 'Red'],
    ['pb', 'A', 'Green'],
    ['bx', '▭', 'Blue box'],
    ['b', 'B', 'Bold'],
    ['i', 'I', 'Italic'],
    ['u', 'U', 'Underline'],
    ['off', '⌫', 'Plain again']
  ];

  // Which cell the SELECTION is in, not which one has the focus. A cell
  // is only open to typing after a double press, so for most of the
  // evening no cell has the focus at all — and marking a passage is a
  // thing a reader does while reading, not while editing
  const CELLS = '.ctbl td.cterm, .ctbl td.cdef';

  const editing = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node && node.nodeType !== 1) node = node.parentNode;
    return node && node.closest ? node.closest(CELLS) : null;
  };

  const saveCell = cell => {
    const row = cell && cell.closest('tr[data-row]');
    if (row) store().editRow(row.dataset.row, cell.dataset.field, cell.innerHTML);
  };

  // Is the selection already inside a mark of this kind? Then pressing it
  // again takes it off. Only the mark the whole selection sits inside is
  // found, which is the case a reader means nine times in ten — and the
  // last button on the bar strips a selection of everything regardless
  const wearing = (range, name, cls, cell) => {
    let node = range.commonAncestorContainer;
    while (node && node !== cell) {
      if (node.nodeType === 1 && node.nodeName === name && (!cls || node.classList.contains(cls))) return node;
      node = node.parentNode;
    }
    return null;
  };

  // ============================================================
  // # ✍️ 🧷  PUTTING A MARK ON, BY HAND
  // # 🔤 JavaScript
  // # 🎯 Wraps what is selected in the mark, or unwraps it again
  // # 🔗 Done with the selection itself and not with the browser's own
  // #    editing commands. It was tried that way first and measured:
  // #    insertHTML answered "done" and quietly threw the class off the
  // #    span on its way in, so every highlight came back plain and
  // #    nothing anywhere said why. The range is ours to cut and wrap,
  // #    and what is wrapped is exactly what is then in the file
  // ============================================================
  const unwrap = node => {
    const parent = node.parentNode;
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
  };

  // Two marks that do the same job to the same words: one colours the
  // letters, one colours the ground behind them. Only one of each can be
  // seen, so putting the second on takes the first off. Letting them
  // nest left a wrapper doing nothing, invisible, and impossible to take
  // off again except by chance — found in a row the reader had been
  // trying the buttons on
  const KIN = { pa: 'pb', pb: 'pa', hl: 'bx', bx: 'hl' };

  const applyMark = kind => {
    const cell = editing();
    const sel = window.getSelection();
    if (!cell || !sel || !sel.rangeCount || sel.isCollapsed) return;

    if (kind === 'off') {
      const range = sel.getRangeAt(0);
      const words = range.toString();
      range.deleteContents();
      range.insertNode(document.createTextNode(words));
    } else {
      const plain = kind === 'b' || kind === 'i' || kind === 'u';
      const name = plain ? kind.toUpperCase() : 'SPAN';
      const worn = wearing(sel.getRangeAt(0), name, plain ? '' : kind, cell);
      if (worn) {
        unwrap(worn);
      } else {
        const range = sel.getRangeAt(0);
        const made = document.createElement(plain ? kind : 'span');
        if (!plain) made.className = kind;
        made.append(range.extractContents());
        range.insertNode(made);

        // THE NEW MARK GOES ON FIRST, AND THE ONE IT REPLACES COMES OFF
        // AFTER. The other way round was tried and measured: taking the
        // old one off moves the words out of it and throws the element
        // away, and a selection made by its edges was pointing AT that
        // element — so what came back was an empty mark around nothing
        // and the words sitting plain beside it. The new mark is an
        // element we hold, which no amount of surgery can lose.
        //
        // Above: only when it wraps this and nothing else — that is the
        // case that leaves a wrapper doing nothing. One that covers more
        // than this is still colouring its other words and is left alone.
        // Inside: all of them, because the reader asked for this colour
        // over the whole of what they picked
        if (!plain && KIN[kind]) {
          const over = made.parentNode;
          if (over && over.nodeName === 'SPAN'
              && over.classList.contains(KIN[kind]) && over.childNodes.length === 1) unwrap(over);
          made.querySelectorAll('span.' + KIN[kind]).forEach(node => unwrap(node));
        }
      }
    }

    sel.removeAllRanges();
    // Neighbouring pieces of text left by the cut are joined back into
    // one, or the cell slowly fills with fragments and every later mark
    // has to be stitched across more of them
    cell.normalize();
    saveCell(cell);
    hideBar();
  };

  const hideBar = () => { if (bar) bar.remove(); bar = null; };

  const showBar = () => {
    const sel = window.getSelection();
    if (!editing() || !sel || sel.isCollapsed || !sel.rangeCount) return hideBar();

    const box = sel.getRangeAt(0).getBoundingClientRect();
    if (!box.width && !box.height) return hideBar();

    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'cmark';
      MARKS.forEach(([kind, face, words]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'm-' + kind;
        button.textContent = face;
        button.title = words;
        button.addEventListener('mousedown', event => { event.preventDefault(); applyMark(kind); });
        bar.append(button);
      });
      document.body.append(bar);
    }

    const wide = bar.offsetWidth || 210;
    bar.style.top = Math.max(6, box.top - bar.offsetHeight - 8) + 'px';
    bar.style.left = Math.min(window.innerWidth - wide - 8, Math.max(8, box.left + box.width / 2 - wide / 2)) + 'px';
  };

  // ============================================================
  // # 🖱️ 📜  THE MENU OF A ROW
  // # 🔤 JavaScript
  // # 🎯 Moving a row, naming it the primary row, splitting its table
  // #    off, joining it to a neighbour, and taking it away
  // # 🔗 Moving is offered from the NUMBER cell only, because that is
  // #    the column that is about where a row stands; the rest is
  // #    offered from any cell. The ends of the list are disabled and
  // #    not removed — a menu whose items come and go has to be read
  // #    again every time, and the hand should find the same item in
  // #    the same place twice
  // ============================================================
  const hideMenu = () => { if (menu) menu.remove(); menu = null; };

  const showMenu = (rowId, x, y, fromNumber) => {
    hideMenu();
    const rows = store().rows();
    const at = rows.findIndex(r => r.id === rowId);
    if (at < 0) return;
    const row = rows[at];

    menu = document.createElement('div');
    menu.className = 'cmenu';

    const item = (face, off, run) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = face;
      button.disabled = off;
      button.onclick = () => { hideMenu(); if (!off) { run(); repaint(); } };
      menu.append(button);
    };

    item('↑  Move up', !fromNumber || at === 0, () => store().move(rowId, -1));
    item('↓  Move down', !fromNumber || at === rows.length - 1, () => store().move(rowId, 1));
    menu.append(document.createElement('hr'));
    item(row.lead ? '◆  Not the primary row' : '◆  Make this the primary row',
         false, () => store().lead(rowId, !row.lead));
    item('─  Start a new table here', at === 0, () => store().split(rowId));
    item('↑  Join the table above', at === 0, () => store().join(rowId, -1));
    item('↓  Join the table below', at === rows.length - 1, () => store().join(rowId, 1));
    menu.append(document.createElement('hr'));
    item('✕  Remove this row', false, () => store().dropRow(rowId));

    document.body.append(menu);
    const wide = menu.offsetWidth, tall = menu.offsetHeight;
    menu.style.left = Math.min(x, window.innerWidth - wide - 8) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - tall - 8) + 'px';
  };

  // ============================================================
  // # 🪢 👂  ONE LISTENER FOR EVERY SHEET
  // # 🔤 JavaScript
  // # 🎯 Ticks, removals, typing, the menu and the mark bar, all heard
  // #    on the one box that holds the sheets
  // # 🔗 Handlers are hung on the box and not on the rows, because the
  // #    rows are thrown away and built again on every cut of the
  // #    paper. Hanging them on the rows would mean a listener per cell
  // #    per redraw, and the day one redraw is missed, half the page
  // #    stops answering with nothing in the log.
  // #
  // #    The paper is NOT recut while a cell is being typed in: a recut
  // #    rebuilds the cells, and the caret would jump to the top of the
  // #    page between two letters. The sheet simply grows a little
  // #    until the reader looks away, and then it is cut properly
  // ============================================================
  // ============================================================
  // # 👆 👆👆  ONE PRESS COVERS, TWO PRESSES OPEN FOR TYPING
  // # 🔤 JavaScript
  // # 🎯 The single press that turns a cell over, and the double press
  // #    that opens it to be written in
  // # 🔗 The frequent action gets the single press. A summary is written
  // #    over a few evenings and read over many, and on the evenings it
  // #    is read a cell is turned over and back a hundred times — while
  // #    typing into one happens a handful of times a week. Giving the
  // #    single press to typing, which is where it was, made the common
  // #    thing impossible and the rare thing free.
  // #
  // #    A double press lands as TWO single presses and then itself, so
  // #    the cover is turned over and straight back — it ends where it
  // #    started, and the only cost is one frame of grey. And whatever
  // #    it was, opening a cell for typing always uncovers it: nobody
  // #    can write in a box they cannot see
  // ============================================================
  const coverOf = cell => coverKey(cell.closest('tr[data-row]').dataset.row, cell.dataset.col);

  const turnOver = (cell, on) => {
    if (on) covered.add(coverOf(cell)); else covered.delete(coverOf(cell));
    cell.classList.toggle('covered', on);
    window.MyTermCourseEye?.();
  };

  const startTyping = cell => {
    turnOver(cell, false);
    cell.contentEditable = 'true';
    cell.focus();
    // The caret at the end of what is there. Left to itself the browser
    // puts it wherever the second press landed, which after an uncover
    // is wherever the grey panel happened to be
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const listenDesk = desk => {
    desk.addEventListener('click', event => {
      const tick = event.target.closest('[data-tick]');
      if (tick) {
        const id = tick.dataset.tick;
        const on = !store().isOn(id);
        store().mark(id, on);
        // The one change on this page that does NOT recut the paper: a
        // tick alters no height, and a reader ticking twenty boxes in a
        // row should not have the page rebuilt under their hand twenty
        // times. So the three marks of it are turned over by hand here
        tick.classList.toggle('on', on);
        tick.title = on ? 'Learnt' : 'Not learnt yet';
        tick.closest('tr')?.classList.toggle('done', on);
        countLine();
        told();
        return;
      }
      // The menu opens BESIDE the gear, not under the pointer: the gear
      // is a place on the page and the reader's eye is already on it
      const gear = event.target.closest('[data-gear]');
      if (gear) {
        const box = gear.getBoundingClientRect();
        showMenu(gear.dataset.gear, Math.round(box.right + 4), Math.round(box.top), true);
        return;
      }

      const cell = event.target.closest(CELLS);
      if (!cell || cell.isContentEditable) return;
      // A press that ended a selection is not a tap. The reader was
      // picking out words to mark, and turning the cell over under their
      // hand would throw away what they had just selected
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      turnOver(cell, !cell.classList.contains('covered'));
    });

    desk.addEventListener('dblclick', event => {
      const cell = event.target.closest(CELLS);
      if (!cell) return;
      event.preventDefault();
      startTyping(cell);
    });

    desk.addEventListener('input', event => {
      const cell = event.target.closest(CELLS);
      const row = cell && cell.closest('tr[data-row]');
      if (row) store().editRow(row.dataset.row, cell.dataset.field, cell.innerHTML);
    });

    // The paper is recut when the reader leaves it, not when they step
    // from one cell to the next — a recut between two cells would take
    // the cell they were aiming at out from under them
    desk.addEventListener('focusout', event => {
      const cell = event.target.closest && event.target.closest(CELLS);
      if (!cell) return;
      // Shut again behind them, or the cell stays open to typing and the
      // next single press on it puts a caret in instead of covering it
      cell.contentEditable = 'false';
      const to = event.relatedTarget;
      if (to && desk.contains(to)) return;
      hideBar();
      repaint();
    });

    desk.addEventListener('contextmenu', event => {
      const row = event.target.closest('tr[data-row]');
      if (!row) return;
      event.preventDefault();
      showMenu(row.dataset.row, event.clientX, event.clientY, !!event.target.closest('td.cno'));
    });

    // After the event, not during it: the selection a mouse makes is not
    // final until the browser has finished with the press
    desk.addEventListener('mouseup', () => setTimeout(showBar, 0));
    desk.addEventListener('keyup', () => setTimeout(showBar, 0));
  };

  const listenOnce = () => {
    document.addEventListener('mousedown', event => {
      if (menu && !menu.contains(event.target)) hideMenu();
      if (bar && !bar.contains(event.target) && !event.target.closest('.ctbl')) hideBar();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { hideMenu(); hideBar(); } });
    window.addEventListener('scroll', () => { hideMenu(); hideBar(); }, true);
  };

  // ============================================================
  // # 🧮 🖌️  DRAWING THE WHOLE THING
  // # 🔤 JavaScript
  // # 🎯 Builds the desk, cuts the rows into sheets of one fixed size,
  // #    shrinks them to whatever room there is, and puts the reading
  // #    and the way to add a row under the last
  // # 🔗 The sheet is ALWAYS 800 by 1131, on a laptop and on a phone
  // #    alike. The window decides only how small it is drawn, never how
  // #    much goes on it — so a chapter breaks at the same rows on every
  // #    device, and the row a reader made begin a page begins that same
  // #    page everywhere. The window used to set the sheet's own size,
  // #    and then "page 2 of 4" was a different four pages on the phone
  // ============================================================
  const countLine = () => {
    const line = stage && stage.querySelector('.ctable-count');
    if (!line) return;
    const rows = store().rows();
    const done = rows.filter(r => store().isOn(r.id)).length;
    line.textContent = rows.length ? `${done} of ${rows.length} learnt` : '';
  };

  const blankSheet = () => {
    const paper = document.createElement('article');
    paper.className = 'cpaper';
    const none = document.createElement('p');
    none.className = 'ctable-none';
    none.textContent = 'Nothing written on this sheet yet.';
    paper.append(none);
    return paper;
  };

  const sheetOf = (page, n, of) => {
    const paper = document.createElement('article');
    paper.className = 'cpaper';
    paper.innerHTML = pageHtml(page.list, page.carry);
    const no = document.createElement('span');
    no.className = 'cpaper-no';
    no.textContent = n + ' / ' + of;
    paper.append(no);
    return paper;
  };

  const lay = paper => {
    const slot = document.createElement('div');
    slot.className = 'cpaper-slot';
    slot.append(paper);
    stage.append(slot);
  };

  // ONE CUT AT A TIME. Clearing the desk takes the focus off whatever
  // cell had it, which fires focusout, whose whole job is to cut the
  // paper — so a cut made while a cell was being typed in started a
  // second cut inside itself, and the two of them filled the same desk:
  // the sheets that came back were a mixture of both, and the cell the
  // reader had been in belonged to neither, so the next thing they
  // pressed did nothing at all and said nothing
  let cutting = false;

  const repaint = () => {
    if (!host || !stage || cutting) return;
    cutting = true;
    try { layOut(); } finally { cutting = false; }
  };

  // ============================================================
  // # 🔍 📉  HOW SMALL THE SHEET IS DRAWN
  // # 🔤 JavaScript
  // # 🎯 Fits the sheets to whatever room the desk has, and gives each
  // #    slot the room its sheet actually takes once shrunk
  // # 🔗 THIS IS NOT A CUT, and that is the whole point of a sheet that
  // #    never changes size: a window being dragged narrower changes
  // #    only how small the paper is drawn, never what is on it, so
  // #    nothing is rebuilt and nobody loses the cell they were typing
  // #    in. And the room is read TWICE on purpose: the first reading is
  // #    taken with the desk still empty, and the moment the sheets land
  // #    a scrolling bar appears and takes fifteen pixels of the width
  // #    that was just measured — which was fifteen pixels of sheet
  // #    hanging off the side
  // ============================================================
  const fitOnce = () => {
    const room = stage.clientWidth || PAPER_W;
    // Shrunk to fit, never blown up: a sheet stretched past its real
    // size on a wide screen is a blurry A4, and how large the words are
    // is the reader's own control
    const drawn = Math.min(PAPER_W, room);
    const scale = drawn / PAPER_W;
    stage.style.setProperty('--pageMaxW', drawn + 'px');
    stage.style.setProperty('--pageScale', scale.toFixed(4));

    // A slot holds the room a sheet takes once shrunk. Almost always
    // that is exactly a page; a sheet that measured a line long is given
    // the few millimetres it actually grew, so the next one does not sit
    // on it
    stage.querySelectorAll('.cpaper-slot').forEach(slot => {
      const paper = slot.firstElementChild;
      if (paper) slot.style.height = Math.ceil(paper.offsetHeight * scale) + 'px';
    });
    return room;
  };

  const fit = () => {
    if (!stage) return;
    const first = fitOnce();
    if (stage.clientWidth !== first) fitOnce();
  };

  const layOut = () => {
    const keptTop = host.scrollTop;
    stage.textContent = '';

    const rows = store().rows();
    const units = rows.map((row, i) => ({ row, n: i + 1, cid: row.cid, lead: row.lead }));
    // Counted against the REAL height of a sheet, not the drawn one
    const pages = units.length ? splitPages(units, PAPER_H) : [];

    if (!pages.length) lay(blankSheet());
    pages.forEach((page, i) => lay(sheetOf(page, i + 1, pages.length)));
    fit();

    // The reading and the way to add a row belong on the desk, not on
    // the paper — but kept to the width of a sheet, or a button stretches
    // across the whole dark ground and reads as a bar, not a button
    const foot = document.createElement('div');
    foot.className = 'cdesk-foot';
    stage.append(foot);

    const count = document.createElement('p');
    count.className = 'ctable-count';
    foot.append(count);

    const add = document.createElement('button');
    add.className = 'csheet-done';
    add.type = 'button';
    add.textContent = '+ row';
    add.onclick = () => {
      const section = store().content()?.sections[0];
      if (!section) return;
      store().addRow(section.id);
      repaint();
      // Straight into typing. A row added and then left shut would need
      // a double press before a word could go in it, which is a strange
      // thing to ask of somebody who just pressed "add a row"
      const cells = stage.querySelectorAll('.ctbl tr[data-row] td.cterm');
      const last = cells[cells.length - 1];
      if (last) startTyping(last);
    };
    foot.append(add);

    countLine();
    host.scrollTop = keptTop;
  };

  const build = into => {
    host = into;
    host.textContent = '';
    stage = document.createElement('div');
    stage.className = 'cstage';
    probe = document.createElement('article');
    probe.className = 'cpaper cprobe';
    probe.style.minHeight = '0';
    host.append(stage, probe);
    listenDesk(stage);
    if (!listening) { listenOnce(); listening = true; }
  };

  window.MyTermPaper = {
    // Called whenever the chapter in hand changes, and whenever the
    // reader changes the type size or the column width — both of those
    // move where the paper runs out, so both mean a fresh cut.
    //
    // The desk is built again whenever it is not on the page any more.
    // The page that calls this clears the same box to say "opening the
    // chapter…" and to say a chapter could not be read, so the desk is
    // swept away by somebody else's honest work rather than by a fault,
    // and holding a reference to it without checking would draw sheets
    // into a box that nobody can see
    paint: (into, onTick, which) => {
      told = onTick || (() => {});
      lang = LANGS[which] ? which : 'en';
      if (!stage || !stage.isConnected || stage.parentNode !== into) build(into);
      repaint();
    },

    // The window changed width. Nothing is rebuilt: the sheets are the
    // same sheets with the same rows on them, drawn a little smaller or
    // a little larger
    fit,

    // ============================================================
    // # 👁️ 🗂️  THE WHOLE SHEET AT ONCE
    // # 🔤 JavaScript
    // # 🎯 Covers every meaning on the sheet, or shows everything there
    // #    is to show
    // # 🔗 The two are NOT each other's opposite, on purpose. Covering
    // #    covers the MEANINGS and leaves the terms, because that is
    // #    what turns a summary into a test: you read the term and try
    // #    to say what it is. Showing shows EVERYTHING, terms included —
    // #    a reader pressing it is asking to see their sheet, not to be
    // #    handed back exactly the puzzle they were in the middle of.
    // #    This is the reader's own rule from their own pages.
    // #
    // #    It is a pass over what is drawn and not a cut: covering
    // #    changes no height, by design, so not one row moves
    // ============================================================
    covers: {
      any: () => store().rows().some(r =>
        covered.has(coverKey(r.id, 'term')) || covered.has(coverKey(r.id, 'text'))),

      all: on => {
        store().rows().forEach(r => {
          if (on) {
            covered.add(coverKey(r.id, 'text'));
          } else {
            covered.delete(coverKey(r.id, 'text'));
            covered.delete(coverKey(r.id, 'term'));
          }
        });
        if (!stage) return;
        stage.querySelectorAll('.ctbl tr[data-row]').forEach(tr => {
          tr.querySelectorAll('td.cterm, td.cdef').forEach(cell => {
            cell.classList.toggle('covered', covered.has(coverKey(tr.dataset.row, cell.dataset.col)));
          });
        });
      }
    },

    // The sheets come off the desk, and the two floating things with
    // them: a menu or a mark bar left standing after the page it
    // belonged to is gone would act on a row nobody can see
    shut: () => {
      hideMenu();
      hideBar();
      if (stage) stage.textContent = '';
    }
  };
})();
