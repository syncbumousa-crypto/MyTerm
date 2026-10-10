// ============================================================
// # 📖 🪟  THE SOURCES BESIDE THE SUMMARY
// # 🔤 JavaScript
// # 🎯 The left of the screen: the books a chapter is written from, one
// #    column each, with handles that say how much room each gets
// # 🔗 THE SUMMARY STAYS ON THE RIGHT AND THE SOURCES COME IN ON THE
// #    LEFT, which is the reader's own arrangement and not a guess. What
// #    is being made is on the side the eye comes back to; what it is
// #    being made from is on the side it leaves.
// #
// #    Every width here is a FRACTION and never a pixel count. A reader
// #    who sets the book to 600px on a wide screen and opens the same
// #    page on a laptop gets a book that has eaten the summary; a reader
// #    who sets it to 45% gets 45% of whatever screen they are on.
// #
// #    And the widths are a preference of THIS reader on THIS machine,
// #    so they stay in the browser. Sending them to Drive would mean the
// #    laptop reaching over to decide how wide the book is on the phone
// ============================================================
(() => {
  const $ = id => document.getElementById(id);
  const sources = () => window.MyTermSources;

  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // How far beyond the screen a page is drawn, and how far beyond that
  // it is kept. Two numbers and not one on purpose: with a single edge,
  // a page sitting exactly on it is drawn and dropped and drawn again on
  // every small scroll — the reader sees it flicker while standing still
  const DRAW_EDGE = 0.6, KEEP_EDGE = 1.6;

  let page = null, split = null, pane = null, cols = null;
  let onResize = () => {};
  let shown = { book: null, tb: null };   // which source is in each column
  const books = new Map();                // sourceId -> the opened pdf

  // ============================================================
  // # 📐 ↔️  THE HANDLES
  // # 🔤 JavaScript
  // # 🎯 Drag one and the two columns beside it share the room
  // # 🔗 The fraction is measured from the left edge of the handle's own
  // #    HOST and not from the window: the inner handle lives inside the
  // #    sources pane, and measured against the window it would jump the
  // #    moment the outer handle moved. And it is held between 15% and
  // #    85% so one drag cannot make a column disappear — there is a
  // #    button for making the sources go, and it is not this
  // ============================================================
  const GRIPS = {
    'course-grip-main': { key: 'myterm.read.srcW', css: '--srcW' },
    'course-grip-cols': { key: 'myterm.read.tbW', css: '--tbW' }
  };

  const setFrac = (gripId, frac) => {
    const grip = $(gripId);
    if (!grip) return;
    grip.parentElement.style.setProperty(GRIPS[gripId].css, (frac * 100).toFixed(2) + '%');
  };

  const readFrac = gripId => {
    let was = NaN;
    try { was = parseFloat(localStorage.getItem(GRIPS[gripId].key)); } catch { was = NaN; }
    return (was >= 0.15 && was <= 0.85) ? was : 0.5;
  };

  const keepFrac = (gripId, frac) => {
    try { localStorage.setItem(GRIPS[gripId].key, String(frac)); } catch { /* a locked browser */ }
  };

  const armGrip = gripId => {
    const grip = $(gripId);
    if (!grip || grip.dataset.armed) return;
    grip.dataset.armed = '1';
    setFrac(gripId, readFrac(gripId));

    grip.onpointerdown = down => {
      down.preventDefault();
      // Capture keeps the drag on the handle when the pointer runs off
      // it, which it does at once. But it THROWS when the pointer is not
      // one the browser is tracking, and an exception here would end the
      // drag before a single listener was added — the handle would then
      // answer a press by doing nothing at all
      try { grip.setPointerCapture(down.pointerId); } catch { /* drag on without it */ }
      grip.classList.add('on');
      document.body.classList.add('cdragging');
      let frac = readFrac(gripId);

      const move = ev => {
        const box = grip.parentElement.getBoundingClientRect();
        if (!box.width) return;
        frac = Math.min(0.85, Math.max(0.15, (ev.clientX - box.left) / box.width));
        setFrac(gripId, frac);
      };
      const up = () => {
        grip.classList.remove('on');
        document.body.classList.remove('cdragging');
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        keepFrac(gripId, frac);
        // The summary is narrower or wider now, so the sheet is cut
        // again; and the book pages changed height, so what is on screen
        // is not what was on screen
        onResize();
        liveAll();
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    };

    // Two presses put it back in the middle. A handle dragged to one end
    // by accident is otherwise a thing to be dragged carefully back
    grip.ondblclick = () => {
      setFrac(gripId, 0.5);
      keepFrac(gripId, 0.5);
      onResize();
      liveAll();
    };
  };

  // ============================================================
  // # 🧾 📄  DRAWING A PDF
  // # 🔤 JavaScript
  // # 🎯 Every page of the file gets its place in the column at once,
  // #    and only the pages near the screen are actually drawn
  // # 🔗 THE PLACE IS MADE BEFORE THE PAGE IS DRAWN, and that is the
  // #    whole trick. An empty box with no height leaves six hundred
  // #    pages stacked on one point: every one of them then counts as
  // #    near the screen, so every one is drawn, and a reader opening a
  // #    textbook watches the tab die. The shape of page one is measured
  // #    once and every box is given it, so the column has its full
  // #    height from the first moment and the scrollbar tells the truth
  // ============================================================
  let pdfReady = null;
  const needPdfJs = () => {
    if (pdfReady) return pdfReady;
    pdfReady = new Promise((done, fail) => {
      if (window.pdfjsLib) return done(window.pdfjsLib);
      const tag = document.createElement('script');
      tag.src = PDFJS;
      tag.onload = () => {
        if (!window.pdfjsLib) return fail(new Error('the PDF reader did not load'));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        done(window.pdfjsLib);
      };
      tag.onerror = () => fail(new Error('the PDF reader could not be fetched'));
      document.head.append(tag);
    });
    return pdfReady;
  };

  const openBook = async source => {
    if (books.has(source.id)) return books.get(source.id);
    const coming = (async () => {
      const lib = await needPdfJs();
      const blob = await sources().bytesOf(source.id);
      if (!blob) throw new Error('the file is not in your Drive any more');
      const doc = await lib.getDocument({ data: await blob.arrayBuffer() }).promise;
      const first = await doc.getPage(1);
      const size = first.getViewport({ scale: 1 });
      return { doc, wide: size.width, tall: size.height };
    })();
    books.set(source.id, coming);
    coming.catch(() => books.delete(source.id));
    return coming;
  };

  const drawPage = async (book, slot) => {
    if (slot.dataset.drawn || slot.dataset.drawing) return;
    slot.dataset.drawing = '1';
    try {
      const n = Number(slot.dataset.page);
      const sheet = await book.doc.getPage(n);
      const room = slot.clientWidth;
      if (!room) { delete slot.dataset.drawing; return; }

      // Drawn at the screen's own grain, and no finer. A retina screen
      // wants two canvas pixels per screen pixel; three would be a
      // quarter again of the memory for nothing anybody can see
      const grain = Math.min(2, window.devicePixelRatio || 1);
      const view = sheet.getViewport({ scale: (room / book.wide) * grain });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(view.width);
      canvas.height = Math.round(view.height);
      canvas.className = 'csrc-canvas';
      await sheet.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport: view }).promise;

      slot.textContent = '';
      slot.append(canvas);
      slot.dataset.drawn = '1';
    } catch {
      slot.dataset.drawn = '1';   // a page that cannot be drawn is not retried on every scroll
      slot.classList.add('bad');
    } finally {
      delete slot.dataset.drawing;
    }
  };

  const clearPage = slot => {
    if (!slot.dataset.drawn) return;
    slot.textContent = '';
    delete slot.dataset.drawn;
    slot.classList.remove('bad');
  };

  // Which pages are near enough to be worth drawing. Measured off the
  // stack's own scroll and the height of one slot, not off every slot's
  // box: asking six hundred boxes where they are, on every scroll frame,
  // is the thing the live window exists to avoid
  const liveOne = which => {
    const stack = $('src-stack-' + which);
    const book = stack && stack._book;
    if (!stack || !book) return;
    const slots = stack.children, many = slots.length;
    const tall = stack.clientHeight;
    if (!many) return;
    if (!tall) { for (let i = 0; i < many; i++) clearPage(slots[i]); return; }

    const step = slots[0].getBoundingClientRect().height + 14;  // the gap between them
    if (step < 2) return;
    const top = stack.scrollTop;

    const drawA = Math.max(0, Math.floor((top - tall * DRAW_EDGE) / step));
    const drawB = Math.min(many - 1, Math.ceil((top + tall * (1 + DRAW_EDGE)) / step));
    const keepA = Math.max(0, Math.floor((top - tall * KEEP_EDGE) / step));
    const keepB = Math.min(many - 1, Math.ceil((top + tall * (1 + KEEP_EDGE)) / step));

    for (let i = drawA; i <= drawB; i++) drawPage(book, slots[i]);
    for (let i = 0; i < keepA; i++) clearPage(slots[i]);
    for (let i = keepB + 1; i < many; i++) clearPage(slots[i]);
  };

  let liveSoon = null;
  const liveAll = () => {
    if (liveSoon) return;
    liveSoon = requestAnimationFrame(() => { liveSoon = null; ['book', 'tb'].forEach(liveOne); });
  };

  // ============================================================
  // # 🧱 🗂️  ONE COLUMN
  // # 🔤 JavaScript
  // # 🎯 A head with the book's name, and the stack of its pages
  // # 🔗 The name is pressed to change it, like a part on the strip. The
  // #    same thing in two places should be done the same way, or a
  // #    reader has to remember which of them answers a press
  // ============================================================
  const fillColumn = async which => {
    const col = $('src-col-' + which);
    const stack = $('src-stack-' + which);
    const head = $('src-name-' + which);
    const count = $('src-pages-' + which);
    if (!col || !stack) return;

    const source = shown[which];
    col.hidden = !source;
    if (!source) { stack.textContent = ''; stack._book = null; return; }

    head.textContent = source.name;
    count.textContent = '';
    stack.textContent = '';
    stack._book = null;

    const waiting = document.createElement('p');
    waiting.className = 'csrc-saying';
    waiting.textContent = 'Opening the book…';
    stack.append(waiting);

    let book;
    try { book = await openBook(source); }
    catch (why) {
      waiting.textContent = String(why.message || why);
      waiting.classList.add('bad');
      return;
    }
    if (shown[which]?.id !== source.id) return;   // the reader moved on while it opened

    stack.textContent = '';
    stack._book = book;
    count.textContent = book.doc.numPages + ' pages';

    for (let n = 1; n <= book.doc.numPages; n++) {
      const slot = document.createElement('div');
      slot.className = 'csrc-page';
      slot.dataset.page = n;
      slot.style.aspectRatio = book.wide + ' / ' + book.tall;
      stack.append(slot);
    }
    liveAll();
  };

  // ============================================================
  // # ➕ 📚  ADDING ONE
  // # 🔤 JavaScript
  // # 🎯 Book or test bank, then the file, then a bar while it goes up
  // # 🔗 The bar is not decoration. A forty megabyte book on a slow line
  // #    is two minutes of a page that looks stopped, and a reader who
  // #    cannot tell a slow upload from a dead one presses the button
  // #    again — and then there are two books in the Drive
  // ============================================================
  let picking = null;
  const shutPick = () => { picking?.remove(); picking = null; };

  const askKind = near => {
    shutPick();
    picking = document.createElement('div');
    picking.className = 'cmenu cpick';
    picking.onclick = e => e.stopPropagation();

    [['book', 'Book', 'The book it is written from'],
     ['tb', 'TB', 'A test bank to read beside it']].forEach(([kind, title, why]) => {
      const one = document.createElement('button');
      one.type = 'button';
      one.className = 'cpick-one';
      const name = document.createElement('b');
      name.textContent = title;
      const line = document.createElement('span');
      line.textContent = why;
      one.append(name, line);
      one.onclick = () => { shutPick(); pickFile(kind); };
      picking.append(one);
    });

    document.body.append(picking);
    const spot = near.getBoundingClientRect();
    const tall = picking.offsetHeight, wide = picking.offsetWidth;
    picking.style.left = Math.min(Math.round(spot.left), window.innerWidth - wide - 8) + 'px';
    picking.style.top = Math.min(Math.round(spot.bottom + 6), window.innerHeight - tall - 8) + 'px';
  };

  document.addEventListener('mousedown', e => {
    if (picking && !picking.contains(e.target)) shutPick();
  });

  const pickFile = kind => {
    const box = document.createElement('input');
    box.type = 'file';
    box.accept = 'application/pdf,.pdf';
    box.onchange = () => { const f = box.files?.[0]; if (f) sendUp(f, kind); };
    box.click();
  };

  const sendUp = async (file, kind) => {
    const bar = $('course-src-bar');
    const fill = $('course-src-fill');
    const says = $('course-src-says');
    bar.hidden = false;
    fill.style.width = '0%';
    says.textContent = 'Sending ' + file.name + '…';

    try {
      await sources().add(file, kind, part => {
        fill.style.width = Math.round(part * 100) + '%';
        says.textContent = Math.round(part * 100) + '% of ' + file.name;
      });
      bar.hidden = true;
      draw();
    } catch (why) {
      fill.style.width = '0%';
      says.textContent = String(why.message || why);
      bar.classList.add('bad');
      setTimeout(() => { bar.hidden = true; bar.classList.remove('bad'); }, 6000);
    }
  };

  // ============================================================
  // # ✏️ 🗑️  RENAMING ONE, AND TAKING ONE OUT
  // # 🔤 JavaScript
  // # 🎯 The name becomes a box where it stands, and the removal asks in
  // #    a panel beside the button
  // # 🔗 NOT prompt AND NOT confirm. Those two stop the whole page dead
  // #    — every upload, every save on its way to Drive, every other
  // #    window of this site — until somebody answers a grey box that
  // #    looks like it came from the browser and not from here. The rest
  // #    of this page asks its questions in place, and so does this
  // ============================================================
  const renameHere = which => {
    const source = shown[which];
    const head = $('src-name-' + which);
    if (!source || !head || head.dataset.asking) return;
    head.dataset.asking = '1';

    const box = document.createElement('input');
    box.type = 'text';
    box.className = 'csrc-rename';
    box.value = source.name;

    const done = keep => {
      delete head.dataset.asking;
      if (keep) sources().rename(source.id, box.value);
      box.remove();
      head.hidden = false;
      draw();
      head.textContent = sources().one(source.id)?.name || source.name;
    };

    box.onkeydown = e => {
      if (e.key === 'Enter') { e.preventDefault(); done(true); }
      if (e.key === 'Escape') { e.preventDefault(); done(false); }
    };
    box.onblur = () => done(true);

    head.hidden = true;
    head.after(box);
    box.focus();
    box.select();
  };

  const askDrop = (which, near) => {
    shutPick();
    const source = shown[which];
    if (!source) return;

    picking = document.createElement('div');
    picking.className = 'cmenu asking cdrop';
    picking.onclick = e => e.stopPropagation();

    const ask = document.createElement('p');
    ask.className = 'cmenu-ask';
    ask.textContent = 'Take “' + source.name + '” out?';

    // Said plainly, because it is the part a reader would not guess and
    // the part that decides the answer: the file is not destroyed, so
    // this is undoable — in Drive, where undo for a file actually lives
    const why = document.createElement('p');
    why.className = 'cmenu-why';
    why.textContent = 'The PDF goes to your Drive bin, so you can get it back from there.';

    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'cpace-keep';
    no.textContent = 'Keep it';
    no.onclick = shutPick;

    const yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'cpace-drop sure';
    yes.textContent = 'Take it out';
    yes.onclick = async () => {
      shutPick();
      await sources().drop(source.id);
      books.delete(source.id);
      draw();
    };

    const pair = document.createElement('div');
    pair.className = 'cpace-pair';
    pair.append(no, yes);
    picking.append(ask, why, pair);

    document.body.append(picking);
    const spot = near.getBoundingClientRect();
    const tall = picking.offsetHeight, wide = picking.offsetWidth;
    picking.style.left = Math.min(Math.round(spot.left), window.innerWidth - wide - 8) + 'px';
    picking.style.top = Math.min(Math.round(spot.bottom + 6), window.innerHeight - tall - 8) + 'px';
  };

  // ============================================================
  // # 🎨 🔑  WHAT THE COLOURS MEAN
  // # 🔤 JavaScript
  // # 🎯 The key above the books: a swatch and the words for it
  // # 🔗 It is above the books and not under them because it is read
  // #    once, at the start, and never again — a thing read once belongs
  // #    where the eye first lands, not where it has to be hunted for
  // ============================================================
  const KEYS = [
    ['term', 'where the term is'],
    ['def', 'where its meaning is'],
    ['ask', 'where a question is'],
    ['out', 'not required']
  ];

  const drawKeys = () => {
    const box = $('course-src-keys');
    if (!box) return;
    box.textContent = '';
    KEYS.forEach(([what, words]) => {
      const one = document.createElement('span');
      one.className = 'csrc-key';
      const chip = document.createElement('i');
      chip.className = 'csrc-chip ' + what;
      const say = document.createElement('span');
      say.textContent = words;
      one.append(chip, say);
      box.append(one);
    });
  };

  // ============================================================
  // # 🖌️ 🪟  DRAWING THE PANE
  // # 🔤 JavaScript
  // # 🎯 Which book is in which column, and how many columns there are
  // # 🔗 ONE SOURCE MEANS ONE COLUMN AND NO HANDLE. A second column kept
  // #    standing empty beside the book, with a handle between them,
  // #    is half the room given to nothing and a control that moves the
  // #    edge of nothing
  // ============================================================
  const draw = () => {
    if (!pane || pane.hidden) return;
    const all = sources()?.all?.() || [];
    const book = all.find(s => s.kind === 'book') || null;
    const tb = all.find(s => s.kind === 'tb') || null;

    const was = { book: shown.book?.id, tb: shown.tb?.id };
    shown = { book, tb };

    cols.classList.toggle('two', !!book && !!tb);
    const grip = $('course-grip-cols');
    if (grip) grip.hidden = !(book && tb);

    const none = $('course-src-none');
    if (none) none.hidden = !!(book || tb);

    if (was.book !== book?.id) fillColumn('book');
    if (was.tb !== tb?.id) fillColumn('tb');
    liveAll();
  };

  // ============================================================
  // # 🚪 👁️  OPENING AND SHUTTING
  // # 🔤 JavaScript
  // # 🎯 The sources button: the pane comes in from the left, or goes
  // # 🔗 Shutting it DROPS EVERY DRAWN PAGE. A hidden column is still a
  // #    few hundred canvases holding onto memory for a reader who has
  // #    said they do not want to look at them
  // ============================================================
  const show = async (board, course) => {
    if (!pane) return false;
    pane.hidden = false;
    // THE HANDLE IS A GRID ITEM, so a hidden one does not leave its track
    // empty — it gives the track away and everything after it slides one
    // place along. Left hidden, the summary sat in the handle's ten
    // pixels and was measured at nothing while the page looked almost
    // right: a pane on the left, and a summary that was not there
    $('course-grip-main').hidden = false;
    page.classList.add('sourcing');
    armGrip('course-grip-main');
    armGrip('course-grip-cols');
    drawKeys();

    const says = $('course-src-says');
    const bar = $('course-src-bar');
    try {
      bar.hidden = false;
      says.textContent = 'Looking for your books…';
      $('course-src-fill').style.width = '100%';
      await sources().open(board, course);
      bar.hidden = true;
    } catch {
      says.textContent = 'Could not read your sources from Drive.';
      bar.classList.add('bad');
    }

    draw();
    onResize();
    return true;
  };

  const hide = () => {
    if (!pane) return;
    pane.hidden = true;
    $('course-grip-main').hidden = true;
    page.classList.remove('sourcing');
    ['book', 'tb'].forEach(which => {
      const stack = $('src-stack-' + which);
      if (stack) [...stack.children].forEach(clearPage);
    });
    onResize();
  };

  window.MyTermSourcePane = {
    // Told where it lives and what to call when the room changes, so
    // this file never has to know the course page's own names
    arm: (onRoomChange) => {
      page = $('course');
      split = $('course-split');
      pane = $('course-sources');
      cols = $('course-src-cols');
      onResize = onRoomChange || (() => {});
      if (!pane) return false;

      $('course-src-add').onclick = e => { e.stopPropagation(); askKind(e.currentTarget); };

      ['book', 'tb'].forEach(which => {
        const stack = $('src-stack-' + which);
        if (stack) stack.addEventListener('scroll', liveAll, { passive: true });

        const name = $('src-name-' + which);
        if (name) name.onclick = () => renameHere(which);

        const off = $('src-off-' + which);
        if (off) off.onclick = e => { e.stopPropagation(); askDrop(which, e.currentTarget); };
      });

      window.addEventListener('resize', liveAll);
      return true;
    },

    open: show,
    shut: hide,
    isOpen: () => !!pane && !pane.hidden,
    redraw: draw,
    // The bell rang on another device: the list may have a book this one
    // has never seen
    refresh: async () => { await sources()?.refresh?.(); draw(); }
  };
})();
