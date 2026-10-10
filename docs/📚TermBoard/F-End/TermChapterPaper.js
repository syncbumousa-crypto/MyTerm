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

  // How much larger than fitting the desk the reader has asked for. It
  // multiplies how the sheet is DRAWN and nothing else — what goes on a
  // sheet is still counted against the real 800 by 1131, so zooming in
  // moves not one row and changes not one page number. Written in one
  // place: a ceiling spelled out at each of the three ways in means a
  // way in that stops short of what the others allow
  const ZOOM_MAX = 2.5;
  let zoom = 1;

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

  let host = null, stage = null, probe = null, folio = null, told = () => {};
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
    // The stripes go on the TERM and not on its meaning: what is marked
    // is the term — whether you are asked for it — and the meaning is
    // only the answer to it
    const away = which === 'term' && row.outside ? ' outside' : '';
    return `<td class="c${which === 'term' ? 'term' : 'def'}${away}${hide}" dir="${here.dir}"`
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

  // ============================================================
  // # 🏷️ 📄  ONE HEADER TO A SHEET
  // # 🔤 JavaScript
  // # 🎯 Consecutive rows sharing a table number are one table, and the
  // #    words naming the columns are written once at the top of a sheet
  // # 🔗 A HEADER ON EVERY TABLE WAS A HEADER REPEATED MID-PAGE. The
  // #    words "Term" and "What it means" answer one question — which
  // #    column is which — and that question is asked once, by the eye,
  // #    when the sheet is first looked at. Written again four inches
  // #    lower it answers nothing and reads as the start of something
  // #    new, so a table break looked like a page break.
  // #
  // #    And the first table still wears none when it is the same table
  // #    that ran off the bottom of the sheet before: a break made by
  // #    the paper must never be told apart from one the reader asked
  // #    for. So a sheet carries one header or none — never two
  // ============================================================
  const pageHtml = (list, carry) => {
    let out = '', i = 0, first = true;
    while (i < list.length) {
      const cid = list[i].cid;
      const run = [];
      while (i < list.length && list[i].cid === cid) run.push(list[i++]);
      const cont = first && carry !== null && cid === carry;
      const wears = first && !cont;
      out += `<table class="ctbl${cont ? ' cont' : ''}">${COLS}${wears ? headHtml() : ''}`
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
  // Only ever one gear awake, and it goes back to sleep the moment the
  // list it opened is gone
  const wake = gear => {
    stage?.querySelectorAll('.crowgear.on').forEach(g => { if (g !== gear) g.classList.remove('on'); });
    gear?.classList.add('on');
  };

  const hideMenu = () => { if (menu) menu.remove(); menu = null; wake(null); };

  // An Arabic keyboard writes ٥ and not 5, so both are taken. Otherwise
  // a right number typed by the owner of the keyboard is refused — and
  // refused with a message about numbers, which reads as nonsense
  const plainDigits = s => String(s == null ? '' : s)
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0));

  // ============================================================
  // # 🔢 ⌨️  ASKING FOR A NUMBER, INSIDE THE MENU
  // # 🔤 JavaScript
  // # 🎯 Turns the menu into a small form: a box for a row number, a
  // #    line saying what will happen, and a way out
  // # 🔗 In the menu and not in one of the browser's own ask-boxes. One
  // #    of those stops the whole page dead, cannot say in two lines
  // #    what moving differs from trading in, and on a page kept open
  // #    all evening it is the thing a reader learns to dismiss without
  // #    reading. The range is written in the box itself, and a number
  // #    outside it is answered with the range rather than refused in
  // #    silence
  // ============================================================
  const askNumber = (title, note, total, run) => {
    if (!menu) return;
    menu.textContent = '';
    menu.classList.add('asking');

    const head = document.createElement('p');
    head.className = 'cmenu-ask';
    head.textContent = title;

    const why = document.createElement('p');
    why.className = 'cmenu-why';
    why.textContent = note;

    const line = document.createElement('div');
    line.className = 'cmenu-line';

    const box = document.createElement('input');
    box.type = 'text';
    box.inputMode = 'numeric';
    box.className = 'cmenu-box';
    box.placeholder = '1–' + total;

    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'cmenu-go';
    go.textContent = 'OK';

    const bad = document.createElement('p');
    bad.className = 'cmenu-bad';

    const send = () => {
      const n = parseInt(plainDigits(box.value).trim(), 10);
      if (!(n >= 1 && n <= total)) {
        bad.textContent = 'The rows of this chapter are 1 to ' + total + '.';
        box.focus();
        box.select();
        return;
      }
      hideMenu();
      run(n - 1);
      repaint();
    };

    go.onclick = send;
    box.onkeydown = event => {
      if (event.key === 'Enter') { event.preventDefault(); send(); }
      if (event.key === 'Escape') { event.preventDefault(); hideMenu(); }
    };

    line.append(box, go);
    menu.append(head, why, line, bad);
    box.focus();
  };

  const showMenu = (rowId, x, y, fromNumber) => {
    hideMenu();
    const rows = store().rows();
    const at = rows.findIndex(r => r.id === rowId);
    if (at < 0) return;
    const mine = at + 1, total = rows.length;

    // Whether there is another table on either side to join this one to.
    // Asked of the rows and not of the menu, so the two items grey
    // themselves out the moment there is only one table left
    const cid = rows[at].cid;
    let head = at, tail = at;
    while (head > 0 && rows[head - 1].cid === cid) head--;
    while (tail < total - 1 && rows[tail + 1].cid === cid) tail++;

    menu = document.createElement('div');
    menu.className = 'cmenu';

    const item = (face, off, run) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = face;
      button.disabled = off;
      button.onclick = () => { if (off) return; hideMenu(); run(); repaint(); };
      menu.append(button);
    };

    const asks = (face, off, title, note, run) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = face;
      button.disabled = off;
      // This one does NOT close the menu: the menu becomes the question
      button.onclick = () => { if (!off) askNumber(title, note, total, run); };
      menu.append(button);
    };

    item('↑  Move up', !fromNumber || at === 0, () => store().move(rowId, -1));
    item('↓  Move down', !fromNumber || at === total - 1, () => store().move(rowId, 1));
    asks('⇄  Swap with another row…', total < 2,
         'Swap row ' + mine + ' with',
         'The two trade places. Everything between them stays exactly where it is.',
         other => store().swap(rowId, other));
    asks('⇲  Move to another number…', total < 2,
         'Move row ' + mine + ' to',
         'It is taken out and put back in, so every row between shifts one place.',
         to => store().moveTo(rowId, to));
    menu.append(document.createElement('hr'));
    item('↑  Join the table above', head === 0, () => store().join(rowId, -1));
    item('↓  Join the table below', tail === total - 1, () => store().join(rowId, 1));
    menu.append(document.createElement('hr'));
    item(rows[at].outside ? '▨  Mark as required' : '▨  Mark as not required',
         false, () => store().outside(rowId, !rows[at].outside));
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
      // ============================================================
      // # ⚙️ 💤  THE GEAR SLEEPS UNTIL IT IS WOKEN
      // # 🔤 JavaScript
      // # 🎯 One press in its place brings it out; the next opens its
      // #    list
      // # 🔗 It sits in the margin OUTSIDE the number, where nothing
      // #    else is, and it is not drawn until it is asked for. A mark
      // #    standing beside all forty rows of a sheet is forty small
      // #    distractions on a page whose whole point is the two columns
      // #    in the middle — and the thing it opens is wanted perhaps
      // #    twice an evening.
      // #
      // #    Two presses and not one, for the same reason the cross
      // #    became a gear: what this opens ends in removing the row,
      // #    and a sleeping control cannot be opened by a hand that
      // #    missed the number cell
      // ============================================================
      const gear = event.target.closest('[data-gear]');
      if (gear) {
        if (!gear.classList.contains('on')) {
          wake(gear);
          return;
        }
        const box = gear.getBoundingClientRect();
        showMenu(gear.dataset.gear, Math.round(box.right + 4), Math.round(box.top), true);
        // After, not before: opening a list clears the one standing, and
        // clearing a list puts its gear to sleep — so the gear would go
        // dark at the very moment its own list appeared beside it
        wake(gear);
        return;
      }
      // A press anywhere else on the paper puts it back to sleep: a gear
      // left standing on a row the reader has walked away from is the
      // very clutter it was hidden to avoid
      wake(null);

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

  // Nothing is printed on the sheet but what is written on it. Which
  // sheet this is belongs to the reading and not to the paper, and it
  // floats over the desk instead
  const sheetOf = page => {
    const paper = document.createElement('article');
    paper.className = 'cpaper';
    paper.innerHTML = pageHtml(page.list, page.carry);
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
    // A whole sheet across the desk is ONE HUNDRED PER CENT. Never more
    // on its own: a sheet stretched past its real size by nobody's
    // asking is a blurry A4. Past that it only goes where the reader
    // takes it, and then the desk is scrolled to reach the edges
    const base = Math.min(PAPER_W, room);
    const drawn = Math.round(base * zoom);
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
    // The sheets are a different size now, so the step between them is
    // too — and the step is what says which sheet is being read
    folioLater();
  };

  const layOut = () => {
    const keptTop = host.scrollTop;
    stage.textContent = '';

    const rows = store().rows();
    const units = rows.map((row, i) => ({ row, n: i + 1, cid: row.cid, lead: row.lead }));
    // Counted against the REAL height of a sheet, not the drawn one
    const pages = units.length ? splitPages(units, PAPER_H) : [];

    if (!pages.length) lay(blankSheet());
    pages.forEach(page => lay(sheetOf(page)));
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
      // Into whichever part of the chapter is on the paper. The store
      // knows which that is; naming it here was a second place to get it
      // wrong, and it always named the first
      if (!store().addRow()) return;
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
    folioNow();
    // The paper has been cut again, so whatever is counted off it —
    // how much is written, how many pages, how long it takes — is now
    // something else. The strip above is told rather than left to find
    // out on its own the next time something happens to make it redraw
    told();
  };

  // ============================================================
  // # 🔢 🪧  WHICH SHEET THE EYE IS ON
  // # 🔤 JavaScript
  // # 🎯 A small box floating over the paper saying which sheet of how
  // #    many is being read
  // # 🔗 IT IS NOT PRINTED ON THE SHEET ANY MORE. A number on the paper
  // #    is part of the paper: it scrolls away with the sheet it belongs
  // #    to, so the one moment a reader asks "where am I" — mid-page,
  // #    mid-scroll — is the one moment there is nothing to read. And on
  // #    a sheet it reads as the page number of a printed document,
  // #    which this is not: the division into sheets is this site's own,
  // #    and it moves when a row is added.
  // #
  // #    It floats, so it is always there; and it is kept BEHIND the
  // #    top strip, because the strip is what the reader pressed to get
  // #    anywhere and a reading must never stand in front of a control
  // ============================================================
  const folioNow = () => {
    if (!folio || !stage || !host) return;
    const slots = stage.querySelectorAll('.cpaper-slot');
    if (slots.length < 2) { folio.hidden = true; return; }
    folio.hidden = false;

    const first = slots[0];
    // Measured off two slots and not from a constant: the gap between
    // sheets is a style, and a number worked out from a remembered gap
    // goes wrong the first time the style changes
    const step = slots[1].offsetTop - first.offsetTop;
    if (step < 2) return;

    // The sheet under a line a third of the way down the desk, not the
    // one at the very top: at the top, a sheet two pixels from leaving
    // the screen still counts as the one being read
    const at = host.scrollTop + host.clientHeight * 0.33 - first.offsetTop;
    const n = Math.max(1, Math.min(slots.length, Math.floor(at / step) + 1));
    const says = n + ' / ' + slots.length;
    if (folio.textContent !== says) folio.textContent = says;
  };

  let folioSoon = null;
  const folioLater = () => {
    if (folioSoon) return;
    folioSoon = requestAnimationFrame(() => { folioSoon = null; folioNow(); });
  };

  const build = into => {
    host = into;
    host.textContent = '';
    folio = document.createElement('div');
    folio.className = 'cfolio';
    folio.hidden = true;
    stage = document.createElement('div');
    stage.className = 'cstage';
    probe = document.createElement('article');
    probe.className = 'cpaper cprobe';
    probe.style.minHeight = '0';
    host.append(folio, stage, probe);
    host.addEventListener('scroll', folioLater, { passive: true });
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
    // # 📏 📃  HOW MANY PAGES A LIST OF ROWS COMES TO
    // # 🔤 JavaScript
    // # 🎯 Counts the sheets some rows would fill, for working out how
    // #    long a part takes to read
    // # 🔗 MEASURED AT A FIXED REFERENCE AND NOT AT THE READER'S OWN
    // #    SETTINGS. Type size and column width belong to whoever is
    // #    looking, so pages counted at them would be a different
    // #    number on the laptop and on the phone — and the minutes they
    // #    feed go into the course paper, which both devices share. One
    // #    of them would be wrong, and neither would know which.
    // #
    // #    The reference is the sheet's own size with type at sixteen
    // #    and the Term column at a hundred and eighty: the size the
    // #    division was designed against
    // ============================================================
    pagesOf: rows => {
      if (!probe || !rows || !rows.length) return 0;
      const keptFont = probe.style.fontSize, keptCol = probe.style.getPropertyValue('--term-col');
      probe.style.fontSize = '16px';
      probe.style.setProperty('--term-col', '180px');
      const units = rows.map((row, i) => ({ row, n: i + 1, cid: row.cid, lead: row.lead }));
      const pages = splitPages(units, PAPER_H).length;
      probe.style.fontSize = keptFont;
      if (keptCol) probe.style.setProperty('--term-col', keptCol);
      else probe.style.removeProperty('--term-col');
      return pages;
    },

    // How large the reader has asked for the paper to be drawn, and the
    // one place that decides what counts as too large. Called many times
    // a second while two fingers are moving, so it does no cutting and
    // no building: it writes two numbers and resizes the slots
    zoom: next => {
      const want = Math.min(ZOOM_MAX, Math.max(1, Number(next) || 1));
      if (want === zoom) return zoom;
      zoom = want;
      fit();
      return zoom;
    },

    zoomNow: () => zoom,

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
