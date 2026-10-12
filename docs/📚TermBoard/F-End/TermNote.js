// ============================================================
// # 🗒️ ✍️  THE READER'S OWN NOTE ON A ROW
// # 🔤 JavaScript
// # 🎯 A sheet of their own beside any row: words they type, at the size
// #    and the direction they choose, with pictures pasted straight in
// # 🔗 THIS ONE IS WRITTEN TO, and that is the whole difference between
// #    it and the explanation window beside it. The explanation is the
// #    chapter speaking; this is the reader. So it saves — into the row
// #    itself, where it is moved with it, removed with it, merged with
// #    it, and carried to the phone like every other word here.
// #
// #    AND A PASTED PICTURE DOES NOT GO INTO THE CHAPTER FILE. A screen
// #    shot written in as letters is a quarter of a megabyte on a file
// #    that is read whole every time the chapter opens, and three of
// #    them would make the chapter slower to open than the book it came
// #    from. The picture goes up to the reader's own Drive and the note
// #    keeps its NAME — so a note with twenty pictures in it is still
// #    the size of writing.
// #
// #    The direction is kept in the row and the size in this browser,
// #    and the split is not arbitrary: which way a note READS is a fact
// #    about the words in it, true on the phone as well. How large it
// #    is drawn is this screen and these eyes
// ============================================================
(() => {
  const $ = id => document.getElementById(id);
  const store = () => window.MyTermChapterStore;
  const cloud = () => window.MyTermCloud;

  const pop = $('course-note');
  const title = $('note-title');
  const body = $('note-body');
  const closeBtn = $('note-close');
  const dirBtn = $('note-dir');
  const smallBtn = $('note-smaller'), bigBtn = $('note-bigger');
  const saidEl = $('note-said');
  if (!pop) return;

  const SIZE_KEY = 'myterm.note.size';
  const STEP = 0.1, LOW = 0.75, HIGH = 2.2;

  let who = null, mine = null, timer = null, busy = 0;

  const sizes = () => {
    try { return JSON.parse(localStorage.getItem(SIZE_KEY) || '{}') || {}; }
    catch { return {}; }
  };

  const applySize = () => {
    const v = mine ? Number(sizes()[mine]) || 1 : 1;
    body.style.setProperty('--note-scale', String(v));
    const pct = Math.round(v * 100) + '%';
    smallBtn.title = 'Smaller writing · ' + pct;
    bigBtn.title = 'Larger writing · ' + pct;
  };

  const bumpSize = way => {
    if (!mine) return;
    const map = sizes();
    const next = Math.min(HIGH, Math.max(LOW,
      Math.round(((Number(map[mine]) || 1) + way * STEP) * 100) / 100));
    if (next === 1) delete map[mine]; else map[mine] = next;
    try { localStorage.setItem(SIZE_KEY, JSON.stringify(map)); } catch {}
    applySize();
  };

  const rowNow = () => {
    if (!who || !store()) return null;
    for (const part of store().sections() || []) {
      const found = (store().rowsOf(part.id) || []).find(r => r.id === who);
      if (found) return found;
    }
    return null;
  };

  const plain = html => {
    const box = document.createElement('div');
    box.innerHTML = html || '';
    return box.textContent.replace(/\s+/g, ' ').trim();
  };

  const says = words => { saidEl.textContent = words || ''; };

  // ============================================================
  // # 🖼️ ⬇️  A PICTURE COMES DOWN ONCE
  // # 🔤 JavaScript
  // # 🎯 Turns every picture named in the note into one on the screen
  // # 🔗 Held by file name for as long as the page lives, because the
  // #    same picture is drawn again every time its note is opened —
  // #    and because a web address made for a downloaded file is only
  // #    good while somebody is holding it
  // ============================================================
  const shown = new Map();

  const showPictures = async () => {
    const wanted = [...body.querySelectorAll('img[data-file]:not([src])')];
    for (const picture of wanted) {
      const name = picture.dataset.file;
      if (!shown.has(name)) {
        const coming = cloud().readBlob(name)
          .then(blob => (blob ? URL.createObjectURL(blob) : ''))
          .catch(() => '');
        shown.set(name, coming);
      }
      const where = await shown.get(name);
      if (where) picture.src = where;
      else picture.replaceWith(document.createTextNode('[a picture that is no longer in your Drive]'));
    }
  };

  // ============================================================
  // # 📋 ⬆️  A PICTURE PASTED IN GOES UP
  // # 🔤 JavaScript
  // # 🎯 Takes a picture off the clipboard, sends it to Drive, and puts
  // #    it in the note where the caret was
  // # 🔗 THE PASTE IS REFUSED AND DONE BY HAND. Left to the browser, a
  // #    pasted picture arrives as a quarter of a megabyte of letters
  // #    inside the note — in the chapter file, in Drive, and down the
  // #    wire to the phone on every open. So the event is stopped, the
  // #    picture is sent up, and what is written in its place is the
  // #    name of a file.
  // #
  // #    A place-holder stands where it will be while it goes up, and
  // #    is replaced when it lands: a reader who pasted a picture and
  // #    saw nothing happen for four seconds pastes it again
  // ============================================================
  // ============================================================
  // # 🐢 ➡️ 🐇  WHY A PICTURE USED TO TAKE SO LONG
  // # 🔗 Three trips to Drive, one after the other, with nothing on the
  // #    screen until the last came back: a SEARCH for the Notes folder
  // #    on every paste (the slowest kind of question Drive is asked),
  // #    a request to start the upload, and then the picture itself at
  // #    full size — a phone's photo or screenshot is several megabytes.
  // #
  // #    Now the folder is looked up once per course and kept, and the
  // #    asking starts the moment a note is opened; the picture is cut
  // #    down to a sensible size before it goes; and it is put in the
  // #    note AT ONCE from the copy already on the device, faint until
  // #    Drive has it, so the reader never waits to see what they pasted
  // ============================================================
  const folders = new Map();

  const folder = () => {
    const board = window.MyTermBoardStore?.live?.();
    const id = window.MyTermCoursePage?.openId?.();
    const course = (board?.courses || []).find(c => c.id === id);
    if (!course?.folderId) return Promise.resolve(null);
    if (!folders.has(course.folderId)) {
      const asking = (async () =>
        await cloud().findChild(course.folderId, 'Notes', cloud().FOLDER).catch(() => null)
        || await cloud().makeFolder('Notes', course.folderId))();
      // A failed asking is forgotten, so the next paste asks again
      asking.catch(() => folders.delete(course.folderId));
      folders.set(course.folderId, asking);
    }
    return folders.get(course.folderId);
  };

  // The longest side a picture is kept at. It is drawn at a quarter of
  // the note's width to begin with, and at the whole width on a laptop
  // this is still sharp
  const LONGEST = 1600;

  const shrink = async file => {
    if (!/^image\/(png|jpeg|webp|heic|heif)$/i.test(file.type) || file.size < 300 * 1024) return file;
    try {
      const picture = await createImageBitmap(file);
      const scale = Math.min(1, LONGEST / Math.max(picture.width, picture.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(picture.width * scale);
      canvas.height = Math.round(picture.height * scale);
      const pen = canvas.getContext('2d');
      // JPEG has no see-through, so what was see-through becomes paper
      pen.fillStyle = '#ffffff';
      pen.fillRect(0, 0, canvas.width, canvas.height);
      pen.drawImage(picture, 0, 0, canvas.width, canvas.height);
      picture.close?.();
      const made = await new Promise(done => canvas.toBlob(done, 'image/jpeg', 0.85));
      return made && made.size < file.size ? made : file;
    } catch {
      return file;
    }
  };

  // The row a note belongs to, by its id — the note may have been shut,
  // or another opened, by the time a picture lands
  const rowById = id => {
    for (const part of store()?.sections() || []) {
      const found = (store().rowsOf(part.id) || []).find(r => r.id === id);
      if (found) return found;
    }
    return null;
  };

  // New pictures start at a quarter of the note's width, at the reader's
  // asking: small enough to stand several to a line
  const START_WIDTH = 25;

  const takePicture = async file => {
    const forRow = who;
    const picture = document.createElement('img');
    picture.className = 'cnote-sending';
    picture.src = URL.createObjectURL(file);
    picture.dataset.w = String(START_WIDTH);
    picture.style.width = START_WIDTH + '%';
    const sel = window.getSelection();
    if (sel && sel.rangeCount && body.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(picture);
      range.setStartAfter(picture);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      body.append(picture);
    }

    busy++;
    says('sending a picture up…');
    try {
      const [into, small] = await Promise.all([folder(), shrink(file)]);
      if (!into) throw new Error('no folder');
      const kind = small.type === 'image/jpeg' ? '.jpg'
        : file.name && /\.\w+$/.test(file.name) ? file.name.slice(file.name.lastIndexOf('.')) : '.png';
      const id = await cloud().uploadBlob(into, 'note-' + Date.now() + kind, small);
      picture.dataset.file = id;
      picture.classList.remove('cnote-sending');
      shown.set(id, Promise.resolve(picture.src));
      if (who === forRow) {
        // Taken out again while it was going up: the reader does not
        // want it, and it is not put back
        if (body.contains(picture)) save();
      } else {
        // The note was shut before Drive answered. It was written without
        // the picture, so the picture is added to the end of it now
        // rather than lost
        const row = rowById(forRow);
        if (row) store().editRow(forRow, 'note',
          (row.note || '') + `<img data-file="${id}" data-w="${START_WIDTH}">`);
      }
    } catch {
      picture.remove();
      says('that picture could not be sent up — it was not put in the note');
      setTimeout(() => says(''), 4000);
    } finally {
      busy--;
      if (!busy && !saidEl.textContent.startsWith('that picture')) says('');
    }
  };

  // ============================================================
  // # 💾 ⏳  WRITTEN DOWN A MOMENT AFTER THE TYPING STOPS
  // # 🔤 JavaScript
  // # 🎯 Hands the note to the row, which hands it to Drive on its own
  // #    unhurried clock
  // # 🔗 Held back on purpose: a letter at a time would be a write for
  // #    every keystroke. And it is flushed when the window is shut, so
  // #    nothing typed in the last half second is lost by closing it
  // ============================================================
  // What goes to the file: each picture as its name and its size, and
  // nothing this page put on it to show it or to mark it picked
  const written = () => {
    const copy = body.cloneNode(true);
    copy.querySelectorAll('img').forEach(p => {
      p.removeAttribute('src');
      p.removeAttribute('style');
      p.removeAttribute('class');
    });
    copy.querySelectorAll('.cnote-coming').forEach(p => p.remove());
    // A picture still on its way up has no name yet, and is written in
    // once it has one
    copy.querySelectorAll('img:not([data-file])').forEach(p => p.remove());
    return copy.innerHTML;
  };

  const save = () => {
    if (!who) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      // The pictures are written as their names and nothing else: the
      // address a picture is shown from belongs to this page, this time
      store().editRow(who, 'note', written());
    }, 450);
  };

  const flush = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    store().editRow(who, 'note', written());
  };

  const applyDir = () => {
    const row = rowNow();
    const way = row?.noteDir || 'ltr';
    body.dir = way;
    dirBtn.title = way === 'rtl' ? 'Write left to right' : 'Write right to left';
    dirBtn.textContent = way === 'rtl' ? '⇤' : '⇥';
  };

  const draw = () => {
    const row = rowNow();
    title.textContent = row
      ? (plain(row.term) || plain(row.termAr) || plain(row.ask) || 'This row')
      : 'This row';
    body.innerHTML = row?.note || '';
    fitPictures();
    applyDir();
    applySize();
    says('');
    body.scrollTop = 0;
    showPictures();
  };

  const shut = () => {
    hideSizer();
    flush();
    pop.hidden = true;
    who = null;
  };

  const open = rowId => {
    if (!rowId) return false;
    who = rowId;
    mine = (store()?.openId?.() || 'h') + ':' + rowId;
    draw();
    pop.hidden = false;
    // The folder pictures go into is looked for now, while the reader is
    // still reading, so the first paste does not wait for it
    folder().catch(() => {});
    body.focus();
    return true;
  };

  // ============================================================
  // # 🖼️ 📏  HOW BIG EACH PICTURE IS DRAWN
  // # 🔤 JavaScript
  // # 🎯 A press on a picture puts a row of sizes over it; the size
  // #    chosen is kept in the note with the picture
  // # 🔗 A PICTURE SITS IN THE LINE LIKE A WORD. Drawn as a block, every
  // #    picture took a whole line however small it was. Now two or
  // #    three small ones stand side by side, and a space typed between
  // #    them is a space on the page. The size is a share of the note's
  // #    width, so it is the same picture on the phone and the laptop
  // ============================================================
  const SIZES = [25, 33, 50, 75, 100];
  let picked = null, sizer = null;

  const fitPictures = () => body.querySelectorAll('img').forEach(p => {
    const wide = Number(p.dataset.w);
    p.style.width = wide ? wide + '%' : '';
  });

  const hideSizer = () => {
    sizer?.remove();
    sizer = null;
    picked?.classList.remove('cnote-picked');
    picked = null;
  };

  const placeSizer = () => {
    if (!sizer || !picked) return;
    const box = picked.getBoundingClientRect();
    const wide = sizer.offsetWidth, tall = sizer.offsetHeight;
    const over = box.top - tall - 6;
    sizer.style.top = (over >= 6 ? over : Math.min(window.innerHeight - tall - 6, box.top + 6)) + 'px';
    sizer.style.left = Math.min(window.innerWidth - wide - 6, Math.max(6, box.left)) + 'px';
  };

  const showSizer = picture => {
    hideSizer();
    picked = picture;
    picked.classList.add('cnote-picked');
    sizer = document.createElement('div');
    sizer.className = 'cnote-sizer';

    const now = () => Number(picked.dataset.w) || 100;
    const paint = () => sizer.querySelectorAll('[data-size]').forEach(b =>
      b.classList.toggle('on', Number(b.dataset.size) === now()));
    const set = want => {
      const wide = Math.min(100, Math.max(10, Math.round(want)));
      if (wide === 100) delete picked.dataset.w; else picked.dataset.w = String(wide);
      picked.style.width = wide === 100 ? '' : wide + '%';
      paint();
      save();
      placeSizer();
    };
    const button = (face, title, run, size) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = face;
      b.title = title;
      if (size) b.dataset.size = String(size);
      // Refused on the way down, so the caret stays in the note
      b.addEventListener('mousedown', event => event.preventDefault());
      b.addEventListener('click', run);
      sizer.append(b);
    };
    button('−', 'Smaller', () => set(now() - 10));
    SIZES.forEach(size => button(size + '%', 'As wide as ' + size + '% of the note', () => set(size), size));
    button('+', 'Larger', () => set(now() + 10));

    document.body.append(sizer);
    paint();
    placeSizer();
  };

  body.addEventListener('click', event => {
    const picture = event.target.closest('img');
    if (picture) showSizer(picture); else hideSizer();
  });
  body.addEventListener('scroll', placeSizer);
  window.addEventListener('resize', placeSizer);

  body.addEventListener('input', () => {
    // A picture typed or cut away takes its sizes with it
    if (picked && !body.contains(picked)) hideSizer();
    else placeSizer();
    save();
  });

  body.addEventListener('paste', event => {
    const items = [...(event.clipboardData?.items || [])];
    const pictures = items.filter(i => i.kind === 'file' && /^image\//.test(i.type));
    if (pictures.length) {
      event.preventDefault();
      pictures.forEach(i => { const file = i.getAsFile(); if (file) takePicture(file); });
      return;
    }
    // Words are pasted as WORDS. What a browser puts on the clipboard
    // from a web page is that page's markup, and none of it belongs in
    // a note — the store would throw it away on the next read anyway,
    // and the reader would watch their note change shape overnight
    event.preventDefault();
    const words = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, words);
  });

  dirBtn.onclick = () => {
    const row = rowNow();
    if (!row) return;
    store().editRow(who, 'noteDir', row.noteDir === 'rtl' ? 'ltr' : 'rtl');
    applyDir();
    body.focus();
  };

  smallBtn.onclick = () => bumpSize(-1);
  bigBtn.onclick = () => bumpSize(+1);
  closeBtn.onclick = shut;

  pop.addEventListener('mousedown', event => { if (event.target === pop) shut(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !pop.hidden) shut();
  });

  window.MyTermNote = {
    open,
    shut,
    isOpen: () => !pop.hidden,
    showing: () => who
  };
})();
