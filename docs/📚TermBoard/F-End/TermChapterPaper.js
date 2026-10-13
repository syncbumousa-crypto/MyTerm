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
  let menu = null, bar = null, listening = false, lang = 'en', rowFlash = null;
  // A press that has not yet found out whether it is one press or two
  let pressing = null;
  // The last single press on a cell, for telling a double press on a
  // phone apart from two single ones (see the press listener)
  let lastPress = null;

  // ============================================================
  // # 🙈 🧠  COVERING A CELL, TO SEE IF YOU KNOW IT
  // # 🔤 JavaScript
  // # 🎯 Remembers which cells are covered over, so a sheet can be read
  // #    as a test instead of as a summary
  // # 🔗 KEPT, in the reader's own file beside the ticks, so a sheet
  // #    covered for a test is found that way again after a reload and
  // #    on the other device — the reader's own asking. It used to be
  // #    for the sitting only, and every reload handed back a sheet with
  // #    the whole test undone.
  // #
  // #    And it is kept by COLUMN, not by language: covering the meaning
  // #    of a row covers that row's meaning, whichever of the two
  // #    languages happens to be on the paper
  // ============================================================
  const coverKey = (rowId, col) => rowId + ':' + col;
  const covered = {
    has: key => store().isCovered?.(key) === true,
    set: (keys, on) => store().cover?.(keys, on)
  };

  // ============================================================
  // # 🌐 🔳  ONE CELL IN THE OTHER LANGUAGE
  // # 🔤 JavaScript
  // # 🎯 Which cells have been turned over to the other language, one at
  // #    a time, without touching the rest of the sheet
  // # 🔗 KEPT BY CELL AND FOR THE SITTING ONLY, like the covers above and
  // #    for the same reason: a reader checking what one term is called
  // #    in Arabic has not changed anything about the course, and should
  // #    not find the sheet that way tomorrow.
  // #
  // #    It is a TURN and not a setting: flipped means "the other one",
  // #    whichever the sheet is in. So a cell turned over and then the
  // #    whole sheet turned over comes back to the language it started
  // #    in, which is what "the other one" has to mean
  // ============================================================
  const flipped = new Set();

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
    const turned = flipped.has(coverKey(row.id, which));
    const here = LANGS[turned ? LANGS[lang].other : lang];
    const there = LANGS[here.other];
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
    const tint = which === 'term' && row.tint ? ' tint-' + row.tint : '';
    // The mark that turns this one cell over, asleep in its far bottom
    // corner. It is drawn INSIDE the cell because that is the box it
    // belongs to — and so it is taken out again before a word of the
    // cell is written to the file: see wordsOf
    const flip = '<button class="ccelllang" type="button" contenteditable="false"'
      + ` data-flip="${which}" title="${here.other === 'ar' ? 'Show this one in Arabic' : 'Show this one in English'}">`
      + `${here.other === 'ar' ? 'ع' : 'En'}</button>`;

    return `<td class="c${which === 'term' ? 'term' : 'def'}${away}${tint}${hide}" dir="${here.dir}"`
      + ` data-col="${which}" data-field="${here[which]}"`
      + ` data-hintdir="${hintDir}" data-empty="${asAttr(hint)}">${words}${flip}</td>`;
  };

  // ============================================================
  // # ✂️ 💾  WHAT OF A CELL IS THE READER'S WORDS
  // # 🔤 JavaScript
  // # 🎯 The cell's own writing, with the page's own furniture taken out
  // # 🔗 THE LANGUAGE MARK LIVES INSIDE THE CELL, and the cell is handed
  // #    to the file whole on every keystroke. Saved as it stands, every
  // #    row would carry a button in its text — in Drive, on the phone,
  // #    and in every copy made from then on, growing by one more button
  // #    each time the page drew itself. So the words are taken from a
  // #    COPY of the cell with the furniture removed, and the cell on
  // #    screen is never touched
  // ============================================================
  const wordsOf = cell => {
    const copy = cell.cloneNode(true);
    copy.querySelectorAll('.ccelllang').forEach(node => node.remove());
    // The line break an empty cell is given to type on (see startTyping)
    // is room for a caret, not something the reader wrote, and a break at
    // the very end of a cell draws nothing anyway
    return copy.innerHTML.replace(/<br\s*\/?>\s*$/i, '');
  };

  // Only ever one language mark awake, like the gear
  const wakeFlip = mark => {
    stage?.querySelectorAll('.ccelllang.on').forEach(m => { if (m !== mark) m.classList.remove('on'); });
    mark?.classList.add('on');
  };

  // One cell drawn again where it stands. The row is read from the store
  // rather than kept: the words may have been typed into since the sheet
  // was cut, and a cell redrawn from the old copy would quietly put the
  // reader's own typing back as it was
  const redrawCell = (cell, rowId) => {
    const row = (store().rows() || []).find(r => r.id === rowId)
      || (store().sections() || []).reduce((found, part) =>
           found || (store().rowsOf(part.id) || []).find(r => r.id === rowId), null);
    if (!row) return;
    const box = document.createElement('tbody');
    box.innerHTML = '<tr>' + cellOf(row, cell.dataset.col) + '</tr>';
    const made = box.querySelector('td');
    if (made) cell.replaceWith(made);
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
    // A row that knows where it is in the book says so, on the other
    // side of the number from the gear — in the margin, where nothing
    // else is. It is NOT hidden like the gear: the gear is a way in to
    // doing something, and this is a fact about the row, which a reader
    // scanning a sheet wants to see without pressing anything
    const places = store().linksOf ? store().linksOf(row.id) : [];
    const mark = places.length
      ? `<span class="crowsrc" data-places="${row.id}" title="${places.length === 1
          ? 'Where this is in the book' : places.length + ' places in the book'}">◆</span>`
      : '';

    // ============================================================
    // THE WAY INTO THE LONG EXPLANATION, UNDER THE NUMBER
    //
    // Small, and under the number rather than beside it, because it is
    // the third thing in a column one character wide. The reader's own
    // pages open this by pressing the row itself — but a press on a row
    // here already means two other things (turning a cell over, and
    // going to where it is in the book), and a gesture that means three
    // things means none of them
    // ============================================================
    return `<tr data-row="${row.id}"${cls ? ` class="${cls}"` : ''}>`
      + `<td class="cno">${mark}<span class="crowgear" data-gear="${row.id}" title="This row">⚙</span>${n}`
      + `<button class="crowmore" type="button" data-more="${row.id}"`
      + ' title="The long explanation">⋯</button>'
      // And under it, the reader's own sheet on this row. Two marks and
      // not one with a choice behind it: one is the chapter talking and
      // the other is the reader, and a reader reaching for their own
      // note should not have to pass through a list to get to it
      + `<button class="crownote${plainWords(row.note) || /<img/i.test(row.note || '') ? ' has' : ''}"`
      + ` type="button" data-note="${row.id}" title="Your own note on this row">✎</button></td>`
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
  // ============================================================
  // # 🎨 👨‍👩‍👧  TWO FAMILIES OF COLOUR, AND THREE PLAIN MARKS
  // # 🔤 JavaScript
  // # 🎯 The colours behind the words and the colours of the words, and
  // #    bold, slanted and underlined
  // # 🔗 A FAMILY IS WHAT CANNOT BE WORN TWICE AT ONCE. Only one colour
  // #    can be behind a word and only one can be in it, so putting a
  // #    second on takes the first off. Left to nest, the one underneath
  // #    is a wrapper doing nothing, invisible, and impossible to take
  // #    off again except by chance — found in a row the reader had been
  // #    trying the buttons on.
  // #
  // #    The first colour of each family is the one their own pages have
  // #    always used, under the same name, so every summary already
  // #    written keeps its yellow and its red without being touched. The
  // #    old blue box joins the highlights as one of them: it is a
  // #    colour behind words, whatever it was called
  // ============================================================
  // A highlighter pen, drawn in lines like every other picture on this
  // site, so it takes the colour of the button it sits on
  const PEN = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"'
    + ' stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M15.5 3.5l5 5-8.5 8.5H7v-5z"/><line x1="3" y1="21" x2="21" y2="21"/></svg>';

  const PAINTS = {
    hl: [['hl', 'Yellow'], ['hlg', 'Green'], ['hlb', 'Blue'], ['hlp', 'Pink'], ['hlo', 'Orange']],
    ink: [['pa', 'Red'], ['pb', 'Green'], ['tcb', 'Blue'], ['tco', 'Orange'], ['tcp', 'Purple']]
  };

  const FAMILY = { bx: 'hl' };
  Object.entries(PAINTS).forEach(([family, list]) =>
    list.forEach(([cls]) => { FAMILY[cls] = family; }));

  // The bar, in the order a hand reaches for them: the two that open a
  // choice of colour first, then the three that are only ever themselves
  const TOOLS = [
    ['hl', 'Highlight'],
    ['ink', 'Text colour'],
    ['b', 'Bold'],
    ['i', 'Italic'],
    ['u', 'Underline'],
    ['num', 'Number the lines']
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
    if (row) store().editRow(row.dataset.row, cell.dataset.field, wordsOf(cell));
  };

  // ============================================================
  // # 🔁 🅱️  PRESSING A MARK THE WORDS ALREADY WEAR TAKES IT OFF
  // # 🔗 IT USED TO ASK ONLY THE ONE ELEMENT HOLDING THE WHOLE SELECTION.
  // #    A word picked out by a double press, or by dragging from one
  // #    end of it to the other, has its edges OUTSIDE the <b> around
  // #    it, so that question found nothing — and bold went on a second
  // #    time instead of coming off. Now every letter picked is asked:
  // #    if each one already wears the mark, the press takes it off what
  // #    was picked and nothing else; if any one does not, the whole
  // #    selection gets it, as a word processor does
  // ============================================================
  const isMark = (node, kind) => {
    if (!node || node.nodeType !== 1) return false;
    if (kind === 'b') return node.nodeName === 'B' || node.nodeName === 'STRONG';
    if (kind === 'i') return node.nodeName === 'I' || node.nodeName === 'EM';
    if (kind === 'u') return node.nodeName === 'U';
    return node.nodeName === 'SPAN' && node.classList.contains(kind);
  };

  // The outermost mark of this kind standing over a node, inside the cell
  const markAbove = (node, kind, cell) => {
    let top = null;
    while (node && node !== cell) {
      if (isMark(node, kind)) top = node;
      node = node.parentNode;
    }
    return top;
  };

  // Does every letter picked already wear it? Spaces are not asked: a
  // reader dragging across two bold words picks the plain space between
  const allWear = (range, kind, cell) => {
    const walk = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let any = false;
    for (let node = walk.nextNode(); node; node = walk.nextNode()) {
      if (!range.intersectsNode(node) || node.parentNode.closest?.('.ccelllang')) continue;
      const from = node === range.startContainer ? range.startOffset : 0;
      const to = node === range.endContainer ? range.endOffset : node.length;
      if (!node.textContent.slice(from, to).trim()) continue;
      any = true;
      if (!markAbove(node.parentNode, kind, cell)) return false;
    }
    return any;
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

  const kinOf = node => (node && node.nodeType === 1 && node.nodeName === 'SPAN'
    ? [...node.classList].map(c => FAMILY[c]).find(Boolean) || null : null);

  // Does this mark wrap THIS and nothing else? Cutting words out of a
  // run leaves empty text nodes on either side of what was taken, and
  // counting children straight found three where there was one — so the
  // old colour was never recognised as spent and stayed on, wrapped
  // around the new one, invisible and impossible to take off again. A
  // node with no text at all is not a child anybody meant
  const wrapsOnly = (over, kid) => [...over.childNodes]
    .every(node => node === kid || (node.nodeType === 3 && node.textContent === ''));

  const applyMark = kind => {
    const cell = editing();
    const sel = window.getSelection();
    if (!cell || !sel || !sel.rangeCount || sel.isCollapsed) return;

    const plain = kind === 'b' || kind === 'i' || kind === 'u';
    const range = sel.getRangeAt(0);
    if (allWear(range, kind, cell)) {
      // Off, from what was picked and nothing else. The words are lifted
      // out and stripped of the mark; if a mark of it stood over the
      // whole selection, that mark is cut in two around the gap so the
      // words either side keep it
      const top = markAbove(range.commonAncestorContainer, kind, cell);
      if (top) {
        // Cut from each edge of the selection to the END of that mark,
        // the far edge first: a range reaching to the end of an element
        // carries a copy of every mark it passes through, so a highlight
        // inside the bold stays on the words that come out of the bold
        const [sc, so, ec, eo] = [range.startContainer, range.startOffset, range.endContainer, range.endOffset];
        const cut = (node, at) => {
          const part = document.createRange();
          part.setStart(node, at);
          part.setEnd(top, top.childNodes.length);
          return part.extractContents();
        };
        const after = top.cloneNode(false);
        after.append(cut(ec, eo));
        const piece = cut(sc, so);
        [...piece.querySelectorAll('*')].filter(node => isMark(node, kind)).forEach(unwrap);
        top.parentNode.insertBefore(after, top.nextSibling);
        top.parentNode.insertBefore(piece, after);
        if (!after.textContent) after.remove();
        if (!top.textContent) top.remove();
      } else {
        const piece = range.extractContents();
        [...piece.querySelectorAll('*')].filter(node => isMark(node, kind)).forEach(unwrap);
        range.insertNode(piece);
      }
    } else {
      const made = document.createElement(plain ? kind : 'span');
      if (!plain) made.className = kind;
      made.append(range.extractContents());
      range.insertNode(made);
      // The same mark already on some of the words inside is folded into
      // the new one, not left nested inside it where it could never be
      // taken off on its own
      [...made.querySelectorAll('*')].filter(node => isMark(node, kind)).forEach(unwrap);

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
      const family = FAMILY[kind];
      if (family) {
        const over = made.parentNode;
        if (kinOf(over) === family && wrapsOnly(over, made)) unwrap(over);
        made.querySelectorAll('span').forEach(node => {
          if (node !== made && kinOf(node) === family) unwrap(node);
        });
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

  // ============================================================
  // # 🔢 ✍️  NUMBERING THE LINES PICKED
  // # 🔤 JavaScript
  // # 🎯 Puts 1. 2. 3. at the start of every line the selection touches
  // # 🔗 THE NUMBERS ARE WRITTEN, NOT COUNTED. They go into the words as
  // #    plain text, exactly as if the reader had typed them, and are
  // #    never worked out again: a list that renumbered itself when one
  // #    line was taken out is the muddle the reader asked not to have.
  // #    A line is what a break ends, so a cell with no breaks is one
  // #    line. Lines that are only space are skipped and not counted.
  // #
  // #    Pressed again over lines that ALL already start with a number,
  // #    it takes the numbers off — the same rule as bold
  // ============================================================
  const LEAD = /^(\s*)(\d+|[٠-٩]+)[.)-]\s?/;

  const numberLines = () => {
    const cell = editing();
    const sel = window.getSelection();
    if (!cell || !sel || !sel.rangeCount) return;
    const picked = sel.getRangeAt(0);

    // Where every line of the cell begins, in order: the start of the
    // cell, the place after each break, and the start of each block a
    // browser may have made out of a press of Enter
    const starts = [{ node: cell, at: 0 }];
    cell.querySelectorAll('br, div, p').forEach(el => {
      if (el.closest('.ccelllang')) return;
      if (el.nodeName === 'BR') starts.push({ node: el.parentNode, at: [...el.parentNode.childNodes].indexOf(el) + 1 });
      else starts.push({ node: el, at: 0 });
    });
    const end = { node: cell, at: cell.childNodes.length };
    const before = (a, b) => {
      const r = document.createRange();
      r.setStart(a.node, a.at);
      return r.comparePoint(b.node, b.at) > 0;
    };
    starts.sort((a, b) => (before(a, b) ? -1 : before(b, a) ? 1 : 0));

    const lines = [];
    starts.forEach((from, i) => {
      const to = starts[i + 1] || end;
      const line = document.createRange();
      line.setStart(from.node, from.at);
      line.setEnd(to.node, to.at);
      // Only the lines the selection reaches into
      if (line.compareBoundaryPoints(Range.END_TO_START, picked) >= 0) return;   // ends before it starts
      if (line.compareBoundaryPoints(Range.START_TO_END, picked) <= 0) return;   // starts after it ends
      const copy = document.createElement('div');
      copy.append(line.cloneContents());
      copy.querySelectorAll('.ccelllang').forEach(node => node.remove());
      const words = copy.textContent;
      if (!words.trim()) return;
      lines.push({ from, words });
    });
    if (!lines.length) return;

    // The first piece of writing in a line, where its number is or goes
    const firstText = from => {
      const walk = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      const r = document.createRange();
      r.setStart(from.node, from.at);
      for (let node = walk.nextNode(); node; node = walk.nextNode()) {
        if (node.parentNode.closest?.('.ccelllang')) continue;
        if (r.comparePoint(node, 0) >= 0 && node.textContent.length) return node;
      }
      return null;
    };

    const off = lines.every(l => LEAD.test(l.words));
    // From the last line back to the first, so writing into one line
    // never shifts where the lines before it begin
    for (let k = lines.length - 1; k >= 0; k--) {
      const text = firstText(lines[k].from);
      if (off) {
        const found = text && text.textContent.match(LEAD);
        if (found) text.deleteData(found[1].length, found[0].length - found[1].length);
      } else {
        const label = (k + 1) + '. ';
        const at = lines[k].from;
        // Into the line's first words when nothing but space comes before
        // them, so the number sits right against the line and wears what
        // the line's first word wears; otherwise at the line's very start
        const gap = document.createRange();
        gap.setStart(at.node, at.at);
        if (text) gap.setEnd(text, 0);
        if (text && !gap.toString().trim()) {
          text.insertData(text.textContent.search(/\S|$/), label);
        } else {
          gap.collapse(true);
          gap.insertNode(document.createTextNode(label));
        }
      }
    }

    sel.removeAllRanges();
    cell.normalize();
    saveCell(cell);
    hideBar();
  };

  const hideBar = () => { if (bar) bar.remove(); bar = null; keptRange = null; };

  // ============================================================
  // # 🖍️ 🎨  FIVE TOOLS, AND TWO OF THEM OPEN A CHOICE
  // # 🔤 JavaScript
  // # 🎯 Highlight, text colour, bold, slanted, underlined — and the
  // #    first two open a row of colours to pick from
  // # 🔗 EVERY PRESS ON THIS BAR IS A MOUSEDOWN THAT REFUSES THE EVENT,
  // #    the swatches included. A button that waited for the click would
  // #    have taken the focus off the cell first, and there would be
  // #    nothing selected left to colour by the time it ran.
  // #
  // #    The colours are behind a press and not spread across the bar
  // #    because the bar stands over the reader's own words: ten
  // #    swatches in a row is a panel wide enough to hide the line being
  // #    worked on, to say nothing of a reader who wants bold
  // ============================================================
  // ============================================================
  // # 👆 🧷  A PRESS ON THE BAR, BY MOUSE OR BY FINGER
  // # 🔗 BY FINGER IT IS TAKEN ON THE WAY DOWN, and refused there. A tap
  // #    on a phone sends its mouse events only after the finger lifts,
  // #    and by then the tap has already moved the caret and the words
  // #    picked are gone — so nothing was coloured. Refusing the touch at
  // #    its start leaves the selection where it was; and if it was lost
  // #    anyway, it is put back from the copy kept when the bar opened
  // ============================================================
  const press = (el, run) => {
    el.addEventListener('mousedown', event => { event.preventDefault(); bringBack(); run(); });
    el.addEventListener('touchstart', event => { event.preventDefault(); bringBack(); run(); }, { passive: false });
  };

  const buildBar = () => {
    bar = document.createElement('div');
    bar.className = 'cmark';

    const row = document.createElement('div');
    row.className = 'cmark-row';

    const palette = document.createElement('div');
    palette.className = 'cmark-pal';
    palette.hidden = true;

    let open = null;
    const fill = family => {
      palette.textContent = '';
      PAINTS[family].forEach(([cls, words]) => {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'cmark-dab ' + (family === 'hl' ? 'on-' + cls : 'in-' + cls);
        swatch.title = words;
        press(swatch, () => applyMark(cls));
        palette.append(swatch);
      });
    };

    TOOLS.forEach(([kind, words]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'm-' + kind;
      button.title = words;
      button.textContent = kind === 'hl' ? '' : kind === 'ink' ? 'T' : kind === 'num' ? '1.' : kind.toUpperCase();
      if (kind === 'hl') button.innerHTML = PEN;

      press(button, () => {
        if (kind === 'num') { numberLines(); return; }
        if (kind !== 'hl' && kind !== 'ink') { applyMark(kind); return; }
        // The same one twice shuts it again, so a reader who opened the
        // colours and changed their mind is one press from the words
        open = open === kind ? null : kind;
        row.querySelectorAll('button').forEach(b => b.classList.remove('on'));
        if (open) { button.classList.add('on'); fill(open); }
        palette.hidden = !open;
        place();
      });
      row.append(button);
    });

    bar.append(row, palette);
    document.body.append(bar);
  };

  // Put where it stands: above the words if there is room over them, and
  // under them if there is not — a bar that opens a second row near the
  // top of the window would otherwise be pushed off the screen
  let place = () => {};
  let keptRange = null;
  const TOUCH = window.matchMedia?.('(pointer: coarse)').matches === true;

  // Puts back the selection the bar was opened for, when a press on the
  // bar has taken it away
  const bringBack = () => {
    const sel = window.getSelection();
    if (!keptRange || !sel) return;
    const lost = !sel.rangeCount || sel.isCollapsed || !editing();
    if (lost) { sel.removeAllRanges(); sel.addRange(keptRange); }
  };

  const showBar = () => {
    const sel = window.getSelection();
    if (!editing() || !sel || sel.isCollapsed || !sel.rangeCount) return hideBar();

    const box = sel.getRangeAt(0).getBoundingClientRect();
    if (!box.width && !box.height) return hideBar();

    if (!bar) buildBar();

    // Kept, so a press on the bar that loses the selection on its way —
    // as a finger on a phone can — still knows what was picked
    keptRange = sel.getRangeAt(0).cloneRange();

    // ============================================================
    // # 👀 ⌨️  ONLY WHERE THE READER CAN SEE IT
    // # 🔗 THE WINDOW'S HEIGHT IS NOT WHAT IS ON SCREEN on an iPhone with
    // #    the keyboard up: Safari keeps reporting the full height and lays
    // #    the keyboard over the bottom of it. The bar was put "under the
    // #    words, where there is room" — and the room was behind the
    // #    keyboard, so on the iPhone it was there and never seen. The
    // #    part actually on screen is the visual viewport, and the bar is
    // #    kept inside it: under the words, else over them, else at the
    // #    top of what is visible
    // ============================================================
    place = () => {
      if (!bar) return;
      const from = keptRange && keptRange.getBoundingClientRect();
      const at = from && (from.width || from.height) ? from : box;
      const view = window.visualViewport;
      const lo = view ? view.offsetTop : 0;
      const hi = view ? view.offsetTop + view.height : window.innerHeight;
      const left = view ? view.offsetLeft : 0;
      const right = view ? view.offsetLeft + view.width : window.innerWidth;
      const wide = bar.offsetWidth || 160, tall = bar.offsetHeight || 32;
      const over = at.top - tall - 8;
      const under = at.bottom + 8;
      const fitsUnder = under + tall <= hi - 6, fitsOver = over >= lo + 6;
      // On a touch screen UNDER the words first: the phone puts its own
      // Copy / Paste above a selection, and the two would sit on each other
      const top = TOUCH
        ? (fitsUnder ? under : fitsOver ? over : lo + 6)
        : (fitsOver ? over : fitsUnder ? under : lo + 6);
      bar.style.top = top + 'px';
      bar.style.left = Math.min(right - wide - 8,
                                Math.max(left + 8, at.left + at.width / 2 - wide / 2)) + 'px';
    };
    place();
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

  // The places one row points at, as a list to choose from. It wears
  // the menu's own frame, so a reader meets one kind of panel here and
  // not two
  const WORDS_FOR = { term: 'the term', text: 'its meaning', ask: 'the question' };

  // ============================================================
  // # 📖 🎯  THE PLACES A CELL CAME FROM
  // # 🔤 JavaScript
  // # 🎯 Lights what the pressed cell points at, and only asks when
  // #    there is a real choice to make
  // # 🔗 PLACES IN DIFFERENT BOOKS ARE ALL LIT AT ONCE and nothing is
  // #    asked: they are not alternatives. A thing explained in the
  // #    book and tested in the bank has two sources, both true, and
  // #    both columns are on screen — so showing one and hiding the
  // #    other behind a question is hiding half the answer.
  // #
  // #    The question is only worth asking when two places are in the
  // #    SAME book, because then one column can show only one of them.
  // #    And even then the first is lit straight away, so the list is
  // #    an offer and never a toll gate.
  // #
  // #    A row with nowhere to go says so on the column it would have
  // #    gone to. Silence reads as a press that did not register, and
  // #    the reader presses again
  // ============================================================
  const toSources = (rowId, col, event) => {
    hideMenu();
    const all = store().linksOf(rowId);

    // ============================================================
    // THE TERM CELL ASKS A NARROW QUESTION; THE MEANING ASKS A WIDE ONE
    //
    // Pressing the term means "where is this word printed" — one spot,
    // and the reader wants to be taken there. Pressing the meaning
    // means "where does this come from", and the honest answer is
    // everything: the passage in the book, and every question in the
    // bank that asks it. That is the reader's own arrangement, and the
    // reason it is not one rule for both is that they are not one
    // question.
    //
    // A term with no spot of its own still falls back to the rest: a
    // press that finds nothing when something is there is a press that
    // tells the reader there is nothing
    // ============================================================
    const mine = col === 'term' ? all.filter(l => l.what === 'term') : all;
    const places = mine.length ? mine : all;

    // The bank questions that test this row are a second kind of answer
    // to the same press: not WHERE it came from, but what will be asked
    // of it. They are never guessed at and never skipped — a question
    // list is the thing a reader is most pleased to be shown
    const tests = store().testedBy ? store().testedBy(rowId) : [];

    if (!places.length && !tests.length) { window.MyTermSourcePane?.sayNowhere?.(); return; }

    const books = new Set(places.map(l => l.src));
    const noChoice = places.length === books.size;

    // Light whatever can be lit straight away, in every column at once.
    // Places in two different books are not alternatives: a thing
    // explained in the book and tested in the bank has two sources,
    // both true, and both columns are on the screen
    if (noChoice) places.forEach(l => window.MyTermSourcePane?.goTo?.(l));
    else if (places.length) window.MyTermSourcePane?.goTo?.(places[0]);

    // The panel opens when there is something to choose or something to
    // read — never merely to confirm what has already happened
    if (!noChoice || tests.length) {
      showPlaces(noChoice ? [] : places, tests,
        Math.round(event.clientX), Math.round(event.clientY + 8));
    }
  };

  const showPlaces = (places, tests, x, y) => {
    hideMenu();
    menu = document.createElement('div');
    menu.className = 'cmenu';
    menu.onmousedown = e => e.stopPropagation();

    places.forEach(place => {
      const one = document.createElement('button');
      one.type = 'button';
      one.className = 'cmenu-place';
      const dot = document.createElement('i');
      dot.className = 'cmenu-dot is-' + place.what;
      const words = document.createElement('span');
      // The book is named as well as the page, because a row can point
      // into two of them — and "page 20" means nothing until you know
      // which book it is page 20 of
      const from = window.MyTermSources?.one?.(place.src)?.name;
      words.textContent = (from ? from + ' · ' : '') + 'p. ' + place.page
        + ' · ' + (WORDS_FOR[place.what] || place.what);
      one.append(dot, words);
      one.onclick = () => { hideMenu(); window.MyTermSourcePane?.goTo?.(place); };
      menu.append(one);
    });

    // ============================================================
    // # 🎯 📋  THE QUESTIONS THAT WILL ASK YOU THIS
    // # 🔤 JavaScript
    // # 🎯 Every bank question that names this row, with its words
    // # 🔗 BEHIND A FOLD, because there can be four of them and each is
    // #    a sentence — opened flat they would push the places a reader
    // #    was looking for off the bottom of the screen. The count is
    // #    on the fold, so the one thing wanted at a glance — are there
    // #    any, how many — is answered without opening it
    // ============================================================
    if (tests.length) {
      if (places.length) menu.append(document.createElement('hr'));

      const fold = document.createElement('button');
      fold.type = 'button';
      fold.className = 'cmenu-fold';
      fold.textContent = tests.length === 1
        ? '1 question asks you this' : tests.length + ' questions ask you this';

      const list = document.createElement('div');
      list.className = 'cmenu-asks';
      list.hidden = true;

      tests.forEach(q => {
        const one = document.createElement('button');
        one.type = 'button';
        one.className = 'cmenu-ask-one';
        const words = plainWords(q.ask);
        one.textContent = words.length > 96 ? words.slice(0, 95) + '…' : (words || '(no words yet)');
        one.title = words;
        one.onclick = () => {
          hideMenu();
          window.MyTermCoursePage?.toRow?.({ row: q.id, section: q.section });
        };
        list.append(one);
      });

      fold.onclick = () => {
        list.hidden = !list.hidden;
        fold.classList.toggle('open', !list.hidden);
        // Measured again, because the panel is a different height now
        // and an opened fold must not hang off the bottom of the window
        menu.style.top = Math.min(y, window.innerHeight - menu.offsetHeight - 8) + 'px';
      };

      menu.append(fold, list);
    }

    document.body.append(menu);
    menu.style.left = Math.min(x, window.innerWidth - menu.offsetWidth - 8) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - menu.offsetHeight - 8) + 'px';
  };

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
    // Three colours for the TERM's box, to find a term again at a glance.
    // Choosing the colour it already has takes it off
    [['yellow', 'Yellow'], ['green', 'Green'], ['blue', 'Blue']].forEach(([colour, name]) => {
      const on = rows[at].tint === colour;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ctint-pick';
      const dot = document.createElement('i');
      dot.className = 'ctint-dot tint-' + colour;
      button.append(dot, (on ? 'Remove ' + name.toLowerCase() : 'Colorize ' + name.toLowerCase()) + (on ? '  ✓' : ''));
      button.onclick = () => { hideMenu(); store().tint(rowId, on ? '' : colour); repaint(); };
      menu.append(button);
    });
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

  // How long a second press may take to make a double one. A finger
  // lifts and lands slower than a mouse button clicks
  const DOUBLE_MS = window.matchMedia?.('(pointer: coarse)').matches ? 340 : 240;
  let coveredAt = 0;

  // The word a double press picks out on its way is not wanted when the
  // double press meant "cover"
  const dropPicked = cell => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && cell.contains(sel.getRangeAt(0).commonAncestorContainer)) sel.removeAllRanges();
  };

  const turnOver = (cell, on) => {
    covered.set([coverOf(cell)], on);
    cell.classList.toggle('covered', on);
    window.MyTermCourseEye?.();
  };

  // ============================================================
  // # ✌️ 🔤  A DOUBLE PRESS PICKS A WORD AND KEEPS IT
  // # 🔤 JavaScript
  // # 🎯 Opens the cell to typing, and leaves the word the double press
  // #    picked out exactly where it is
  // # 🔗 IT USED TO THROW THE WORD AWAY. A double press is the browser's
  // #    own way of choosing a word, and this ran straight after it and
  // #    put the caret at the end of the cell — so the reader watched
  // #    their word light up and go out in the same breath, and the bar
  // #    of colours never had anything to colour.
  // #
  // #    The caret at the end is still right for the OTHER double press:
  // #    the one that lands on a covered cell, where the second press is
  // #    on a grey panel and picks out nothing. So what the press found
  // #    decides: a word, and it is kept; nothing, and the caret goes
  // #    where a reader about to type would want it.
  // #
  // #    Remembered BEFORE the cell is focused, because focusing a cell
  // #    can collapse what is selected inside it
  // ============================================================
  const startTyping = cell => {
    turnOver(cell, false);

    const sel = window.getSelection();
    const picked = sel && sel.rangeCount && !sel.isCollapsed
      && cell.contains(sel.getRangeAt(0).commonAncestorContainer)
      ? sel.getRangeAt(0).cloneRange() : null;

    cell.contentEditable = 'true';
    cell.focus();

    // ============================================================
    // # ✍️ 📱  THE CARET GOES BEFORE THE LANGUAGE MARK, NEVER AFTER IT
    // # 🔗 The mark is the last thing in every cell, and in a NEW row it
    // #    is the only thing. A caret put after it had nowhere to stand
    // #    but against the mark, and the phone's keyboard wrote into the
    // #    mark itself: the letters were there, in transparent type, and
    // #    were thrown out with the mark when the cell was saved. So an
    // #    empty cell is given a line to type on, and the caret is set
    // #    down at the end of the WORDS
    // ============================================================
    let range = picked;
    if (!range) {
      const flip = cell.querySelector('.ccelllang');
      range = document.createRange();
      if (!wordsOf(cell).trim()) {
        cell.insertBefore(document.createElement('br'), cell.firstChild);
        range.setStart(cell, 0);
      } else if (flip) {
        range.setStartBefore(flip);
      } else {
        range.selectNodeContents(cell);
        range.collapse(false);
      }
      range.collapse(true);
    }
    sel.removeAllRanges();
    sel.addRange(range);

    // The bar comes up for a word that is already picked: the press that
    // picked it was a double one, and the single mouseup that normally
    // calls the bar up has long since been and gone
    if (picked) setTimeout(showBar, 0);
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
      // ============================================================
      // # 🌐 💤  THE LANGUAGE MARK SLEEPS IN THE CORNER
      // # 🔤 JavaScript
      // # 🎯 One press in its place turns that cell over to the other
      // #    language, and leaves the mark showing in the cell it turned
      // # 🔗 There is one of these in every cell of every row, and a
      // #    sheet showing them all is a sheet of buttons with a summary
      // #    somewhere behind it — so they sleep, invisible but still
      // #    there to be pressed. It used to take a press to wake one and
      // #    another to use it; the hand that knows where it is now
      // #    never waits, as the reader asked, the same as the gear
      // ============================================================
      const flip = event.target.closest('[data-flip]');
      if (flip) {
        event.stopPropagation();
        const cell = flip.closest(CELLS);
        const tr = cell && cell.closest('tr[data-row]');
        if (!tr) return;
        const key = coverKey(tr.dataset.row, cell.dataset.col);
        if (flipped.has(key)) flipped.delete(key); else flipped.add(key);
        // The cell is redrawn where it stands rather than the sheet
        // recut: the two languages of one cell are rarely the same
        // length, and recutting would move the row out from under the
        // finger that just pressed it
        redrawCell(cell, tr.dataset.row);
        // Awake in the new cell, so the reader sees what they pressed and
        // can press it again to turn back
        wakeFlip(tr.querySelector(`[data-flip="${cell.dataset.col}"]`));
        return;
      }

      const more = event.target.closest('[data-more]');
      if (more) {
        event.stopPropagation();
        window.MyTermExplain?.open(more.dataset.more);
        return;
      }

      const own = event.target.closest('[data-note]');
      if (own) {
        event.stopPropagation();
        window.MyTermNote?.open(own.dataset.note);
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
      // #    ONE PRESS OPENS IT. It used to take two — one to wake it,
      // #    one to open it — but its place is now the whole margin
      // #    beside the row, and the reader asked for the list to come
      // #    up the moment a finger lands there. Removing the row is
      // #    still at the bottom of that list, a second press away
      // ============================================================
      // ============================================================
      // # 📍 📖  FROM A ROW TO ITS PLACE IN THE BOOK
      // # 🔤 JavaScript
      // # 🎯 One place goes straight there; several put the list beside
      // #    the row and let the reader say which
      // # 🔗 WITH SEVERAL, NOTHING IS CHOSEN FOR THEM. A term has its
      // #    name in one spot and its meaning in another, and opening
      // #    the first of the two is the wrong one half the time — and
      // #    wrong silently, because the page it lands on looks like a
      // #    page that was asked for
      // ============================================================
      const places = event.target.closest('[data-places]');
      if (places) {
        const mine = store().linksOf(places.dataset.places);
        if (!mine.length) return;
        const asks = store().testedBy ? store().testedBy(places.dataset.places) : [];
        if (mine.length === 1 && !asks.length) { window.MyTermSourcePane?.goTo?.(mine[0]); return; }
        if (mine.length === 1) window.MyTermSourcePane?.goTo?.(mine[0]);
        const spot = places.getBoundingClientRect();
        showPlaces(mine, store().testedBy ? store().testedBy(places.dataset.places) : [],
                   Math.round(spot.right + 4), Math.round(spot.top));
        return;
      }

      const gear = event.target.closest('[data-gear]');
      if (gear) {
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
      wakeFlip(null);

      // A cell already open for writing answers to nothing here: the
      // press is the reader putting the caret where they want it
      const cell = event.target.closest(CELLS);
      if (!cell || cell.isContentEditable) return;

      // ============================================================
      // # 📱 ✌️  A DOUBLE PRESS ON A PHONE IS COUNTED HERE
      // # 🔗 A PHONE DOES NOT RELIABLY SAY "DOUBLE". Two taps came in as
      // #    two single presses and no dblclick at all, so the first one
      // #    opened the cell for typing and the second landed in a cell
      // #    already open — and covering on the phone never happened.
      // #    So the two presses are timed here, by the cell they landed
      // #    on, and a finger is given longer than a mouse to come back
      // ============================================================
      const at = Date.now();
      if (lastPress && lastPress.cell === cell && at - lastPress.at < DOUBLE_MS) {
        lastPress = null;
        clearTimeout(pressing);
        pressing = null;
        dropPicked(cell);
        turnOver(cell, !cell.classList.contains('covered'));
        coveredAt = at;
        return;
      }
      lastPress = { cell, at };

      // A press that ended a selection is not a tap. The reader was
      // picking out words to mark, and turning the cell over under their
      // hand would throw away what they had just selected
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;

      // ============================================================
      // # 👆 📖  WHAT ONE PRESS MEANS DEPENDS ON THE BOOKS
      // # 🔤 JavaScript
      // # 🎯 With the sources open, a press on a cell goes to where that
      // #    cell came from; with them away, it turns the cell over
      // # 🔗 ONE GESTURE CANNOT MEAN TWO THINGS AT ONCE, so it means the
      // #    one the reader is plainly there for. Books open on the left
      // #    is somebody checking a summary against its source; books
      // #    away is somebody testing themselves, and covering is the
      // #    whole of that. This is the reader's own arrangement from
      // #    their own pages, and the conflict it resolves is real: in
      // #    this site a single press was already covering.
      // #
      // #    And WHICH cell was pressed says which place is wanted. The
      // #    term and its meaning sit in different spots in the book,
      // #    and the reader pressing the meaning is asking about the
      // #    meaning — a single mark for the whole row would have to
      // #    guess between them
      // ============================================================
      if (window.MyTermSourcePane?.isOpen?.()) {
        const tr = cell.closest('tr[data-row]');
        if (tr) { toSources(tr.dataset.row, cell.dataset.col, event); return; }
      }

      // ============================================================
      // # 1️⃣ 2️⃣  ONE PRESS WRITES, TWO PRESSES COVER
      // # 🔤 JavaScript
      // # 🎯 A press on a cell opens it for writing; two quick presses
      // #    turn it face down instead
      // # 🔗 THE WAITING IS NOT A DELAY, IT IS THE QUESTION. A press that
      // #    acts at once cannot be the first half of a double press —
      // #    the cell would be open for writing and then turned face
      // #    down under the reader's hand, which is two things happening
      // #    for one gesture. So the press waits long enough to find out
      // #    which gesture it is, and nothing shows until it knows.
      // #
      // #    A cell ALREADY open for writing is left alone by both: there
      // #    a double press is the browser's own way of choosing a word,
      // #    and taking it to mean "cover" would make it impossible to
      // #    pick a word to colour — which is the whole of the bar above
      // ============================================================
      clearTimeout(pressing);
      pressing = setTimeout(() => { pressing = null; lastPress = null; startTyping(cell); }, DOUBLE_MS);
    });

    desk.addEventListener('dblclick', event => {
      const cell = event.target.closest(CELLS);
      if (!cell) return;
      // The first of the two presses set a cell going; it never ran
      if (pressing) { clearTimeout(pressing); pressing = null; }
      if (cell.isContentEditable) return;   // picking out a word, not covering
      event.preventDefault();
      // Already turned by the press listener, which counted the same two
      // presses; turning it here as well would turn it straight back
      if (Date.now() - coveredAt < 600) return;
      lastPress = null;
      turnOver(cell, !cell.classList.contains('covered'));
    });

    // Words are pasted as WORDS, as in the note. What the phone hands
    // over from another page is that page's markup, colour included, and
    // a sentence copied off a dark page arrived white on the white paper:
    // there, and saved, and invisible until the sheet was drawn again.
    // The file throws the markup away on the next read anyway
    desk.addEventListener('paste', event => {
      const cell = event.target.closest && event.target.closest(CELLS);
      if (!cell || !cell.isContentEditable) return;
      event.preventDefault();
      const words = event.clipboardData?.getData('text/plain') || '';
      document.execCommand('insertText', false, words);
    });

    desk.addEventListener('input', event => {
      const cell = event.target.closest(CELLS);
      const row = cell && cell.closest('tr[data-row]');
      if (row) store().editRow(row.dataset.row, cell.dataset.field, wordsOf(cell));
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
    // ============================================================
    // # 📱 ✋  A SELECTION MADE BY FINGER
    // # 🔗 ON A PHONE NO MOUSEUP EVER COMES. Words are picked by holding a
    // #    finger on them and dragging the two handles, and the page is
    // #    told only that the selection changed — so the bar, which
    // #    waited for a mouse button to come up, never appeared on the
    // #    phone at all. It now listens to the selection itself, once the
    // #    handles have stopped moving
    // ============================================================
    // The keyboard coming up or going, and the page sliding under it,
    // move what is visible — so the bar is set down again
    window.visualViewport?.addEventListener('resize', () => place());
    window.visualViewport?.addEventListener('scroll', () => place());

    let settling = null;
    document.addEventListener('selectionchange', () => {
      clearTimeout(settling);
      settling = setTimeout(() => {
        const sel = window.getSelection();
        if (editing() && sel && sel.rangeCount && !sel.isCollapsed) showBar();
        else if (bar && !(sel && sel.rangeCount && bar.contains(sel.anchorNode))) {
          // Gone only when the selection has truly gone — not while a
          // press on the bar itself is being made
          if (!sel || !sel.rangeCount || sel.isCollapsed) hideBar();
        }
      }, 250);
    });
  };

  const listenOnce = () => {
    document.addEventListener('mousedown', event => {
      if (menu && !menu.contains(event.target)) hideMenu();
      if (bar && !bar.contains(event.target) && !event.target.closest('.ctbl')) hideBar();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { hideMenu(); hideBar(); } });
    // Not while the menu is being typed into. Putting the caret in its
    // number box makes the phone scroll the box into view, and that scroll
    // used to shut the menu under the reader — box, keyboard and all —
    // before a digit could be written
    window.addEventListener('scroll', () => {
      if (!(menu && menu.contains(document.activeElement))) hideMenu();
      // The bar FOLLOWS the words and is not shut by a scroll. On the
      // iPhone the page scrolls by itself while the handles are dragged
      // and when the keyboard comes up, and that shut the bar the moment
      // it appeared. It goes when the selection goes, and not before
      if (bar) place();
    }, true);
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
    // # 📍 ↩️  FROM A PLACE IN THE BOOK BACK TO ITS ROW
    // # 🔤 JavaScript
    // # 🎯 Brings the row on screen and flashes it
    // # 🔗 The flash is on the ROW and not on one cell: a reader coming
    // #    back from the book is looking for the line they marked, and
    // #    the line is the row. And it fades, because a row left lit is
    // #    a row that still looks lit on the next jump, when it is no
    // #    longer the answer
    // ============================================================
    goToRow: rowId => {
      if (!stage) return false;
      const tr = stage.querySelector(`tr[data-row="${rowId}"]`);
      if (!tr) return false;
      stage.querySelectorAll('tr.hit').forEach(r => r.classList.remove('hit'));
      tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Forced to start over, so a second press on the same mark flashes
      // again instead of doing nothing visible
      void tr.offsetWidth;
      tr.classList.add('hit');
      clearTimeout(rowFlash);
      rowFlash = setTimeout(() => tr.classList.remove('hit'), 2600);
      return true;
    },

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
        const rows = store().rows();
        if (on) covered.set(rows.map(r => coverKey(r.id, 'text')), true);
        else covered.set(rows.flatMap(r => [coverKey(r.id, 'text'), coverKey(r.id, 'term')]), false);
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
