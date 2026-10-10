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

  const COLS = '<colgroup><col style="width:34px"><col style="width:31%"><col><col style="width:34px"></colgroup>';

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
    return `<td class="c${which === 'term' ? 'term' : 'def'}" contenteditable="true" dir="${here.dir}"`
      + ` data-field="${here[which]}" data-hintdir="${hintDir}" data-empty="${asAttr(hint)}">${words}</td>`;
  };

  const headHtml = () => '<tr>' + LANGS[lang].head.map(w => `<th>${w}</th>`).join('') + '</tr>';

  const rowHtml = (row, n) => {
    const on = store().isOn(row.id);
    const cls = [row.lead ? 'clead' : '', on ? 'done' : ''].filter(Boolean).join(' ');
    return `<tr data-row="${row.id}"${cls ? ` class="${cls}"` : ''}>`
      + `<td class="cno"><span class="cdel" data-off="${row.id}" title="Remove this row">✕</span>${n}</td>`
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

  const editing = () => {
    const node = document.activeElement;
    return node && node.closest && node.closest('.ctbl [contenteditable]') ? node : null;
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
      const off = event.target.closest('[data-off]');
      if (off) { store().dropRow(off.dataset.off); repaint(); }
    });

    desk.addEventListener('input', event => {
      const cell = event.target.closest('[contenteditable]');
      const row = cell && cell.closest('tr[data-row]');
      if (row) store().editRow(row.dataset.row, cell.dataset.field, cell.innerHTML);
    });

    // The paper is recut when the reader leaves it, not when they step
    // from one cell to the next — a recut between two cells would take
    // the cell they were aiming at out from under them
    desk.addEventListener('focusout', event => {
      if (!event.target.closest || !event.target.closest('[contenteditable]')) return;
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
  // # 🎯 Builds the desk, measures a sheet, cuts the rows into sheets,
  // #    and puts the reading and the way to add a row under the last
  // # 🔗 The height of a sheet is written in as a number of pixels and
  // #    not as a ratio of its width, because a width given in per cent
  // #    cannot be read back in CSS. On a phone the sheet is as wide as
  // #    the window allows and not as wide as the reader asked for, and
  // #    a sheet kept at the proportions of the asked-for width would be
  // #    a page and a half of empty white
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

  const layOut = () => {
    const keptTop = host.scrollTop;
    stage.textContent = '';

    // A sheet is as wide as a slot turns out to be, and only a real slot
    // on the real desk knows that. So one is put down, read, and taken
    // away again before anything is drawn
    const gauge = document.createElement('div');
    gauge.className = 'cpaper-slot';
    stage.append(gauge);
    const wide = gauge.clientWidth || 720;
    gauge.remove();

    const pageH = Math.round(wide * 297 / 210);
    stage.style.setProperty('--page-h', pageH + 'px');
    probe.style.width = wide + 'px';

    const rows = store().rows();
    const units = rows.map((row, i) => ({ row, n: i + 1, cid: row.cid, lead: row.lead }));
    const pages = units.length ? splitPages(units, pageH) : [];

    if (!pages.length) lay(blankSheet());
    pages.forEach((page, i) => lay(sheetOf(page, i + 1, pages.length)));

    // The reading and the way to add a row belong on the desk, not on
    // the paper — but kept to the width of a sheet, or a button stretches
    // across the whole dark ground and reads as a bar, not a button
    const foot = document.createElement('div');
    foot.className = 'cpaper-slot';
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
      const cells = stage.querySelectorAll('.ctbl tr[data-row] td.cterm');
      cells[cells.length - 1]?.focus();
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
