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
  const folder = async () => {
    const board = window.MyTermBoardStore?.live?.();
    const id = window.MyTermCoursePage?.openId?.();
    const course = (board?.courses || []).find(c => c.id === id);
    if (!course?.folderId) return null;
    return await cloud().findChild(course.folderId, 'Notes', cloud().FOLDER).catch(() => null)
      || await cloud().makeFolder('Notes', course.folderId);
  };

  const takePicture = async file => {
    const spot = document.createElement('span');
    spot.className = 'cnote-coming';
    spot.textContent = 'sending a picture up…';
    const sel = window.getSelection();
    if (sel && sel.rangeCount && body.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(spot);
    } else {
      body.append(spot);
    }

    busy++;
    says('sending a picture up…');
    try {
      const into = await folder();
      if (!into) throw new Error('no folder');
      const name = 'note-' + Date.now() + (file.name && /\.\w+$/.test(file.name)
        ? file.name.slice(file.name.lastIndexOf('.')) : '.png');
      const id = await cloud().uploadBlob(into, name, file);
      const picture = document.createElement('img');
      picture.dataset.file = id;
      picture.src = URL.createObjectURL(file);
      shown.set(id, Promise.resolve(picture.src));
      spot.replaceWith(picture);
      save();
    } catch {
      spot.replaceWith(document.createTextNode(''));
      says('that picture could not be sent up — it was not put in the note');
    } finally {
      busy--;
      if (!busy) says('');
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
  const save = () => {
    if (!who) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      // The pictures are written as their names and nothing else: the
      // address a picture is shown from belongs to this page, this time
      const copy = body.cloneNode(true);
      copy.querySelectorAll('img').forEach(p => p.removeAttribute('src'));
      copy.querySelectorAll('.cnote-coming').forEach(p => p.remove());
      store().editRow(who, 'note', copy.innerHTML);
    }, 450);
  };

  const flush = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    const copy = body.cloneNode(true);
    copy.querySelectorAll('img').forEach(p => p.removeAttribute('src'));
    copy.querySelectorAll('.cnote-coming').forEach(p => p.remove());
    store().editRow(who, 'note', copy.innerHTML);
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
    applyDir();
    applySize();
    says('');
    body.scrollTop = 0;
    showPictures();
  };

  const shut = () => {
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
    body.focus();
    return true;
  };

  body.addEventListener('input', save);

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
