// ============================================================
// # 📕 🗄️  THE BOOKS A COURSE IS WRITTEN FROM
// # 🔤 JavaScript
// # 🎯 The list of a course's sources, the file each one is, and the way
// #    one is added, renamed or taken away
// # 🔗 THE LIST IS THE COURSE'S AND EACH BOOK NAMES ITS CHAPTER, and
// #    that is the whole shape of this file. The LIST is one per course
// #    because a textbook held on the chapter would be sent up fourteen
// #    times, sit in Drive fourteen times, and be downloaded again every
// #    time the reader moved on. But a BOOK is not the course's: a term
// #    of five chapters has five chapter books and five chapter banks in
// #    the one list, and asked for "the book" the list hands back the
// #    first — so every chapter showed chapter one's pages, with the open
// #    chapter's own marks drawn on them. So each one says where it
// #    belongs, and an empty `chapter` means the whole course.
// #
// #    And the bytes are NEVER in the JSON. The list is a few hundred
// #    letters and is read on every open; a book is forty megabytes and
// #    is read when somebody looks at it. One file for the list, one
// #    Drive file per book, and the list holds nothing but its id
// ============================================================
(() => {
  const cloud = () => window.MyTermCloud;
  const KINDS = ['book', 'tb'];
  const now = () => new Date().toISOString();

  // What is open, per course. The bytes are kept here and not asked for
  // twice: a reader who shuts the pane and opens it again is looking at
  // the same book, and forty megabytes is not a thing to fetch twice
  let open = null;         // { course, listId, list }
  const bytes = new Map(); // fileId -> Blob
  let sending = null;      // the one upload that is going, if any

  const shapeOne = s => ({
    id: typeof s.id === 'string' ? s.id : 's-' + Math.random().toString(36).slice(2, 8),
    name: typeof s.name === 'string' ? s.name : 'Untitled',
    kind: KINDS.includes(s.kind) ? s.kind : 'book',
    // ============================================================
    // WHICH CHAPTER THIS BOOK BELONGS TO
    //
    // The list is the COURSE's, because a course is where Drive keeps
    // one folder and one list — but a book belongs to a CHAPTER. A term
    // of five chapters has five books and five banks in one list, and
    // without this the pane shows whichever came first for every
    // chapter alike: the reader opens chapter six and is handed chapter
    // one's book, with chapter six's marks drawn on its pages.
    //
    // EMPTY MEANS THE WHOLE COURSE, and that is the right answer for
    // everything written before this field existed, and for a book that
    // really does serve every chapter: it shows up wherever you are
    // ============================================================
    chapter: typeof s.chapter === 'string' ? s.chapter : '',
    fileId: typeof s.fileId === 'string' ? s.fileId : null,
    size: Math.max(0, Number(s.size) || 0),
    // Crossed out, not torn out, for the reason everything here is: the
    // other device still has it, and a merge would walk it back in
    deleted: s.deleted === true,
    updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : null,
    skip: shapeSkips(s.skip)
  });

  // ============================================================
  // # 🚧 📄  THE PARTS OF A BOOK THAT ARE NOT ASKED OF YOU
  // # 🔤 JavaScript
  // # 🎯 Stretches of a page — an opening story, a sidebar, a closing
  // #    case — marked so they are seen and not studied
  // # 🔗 IT IS A STRETCH OF WORDS, NOT A PAGE. A sidebar takes most of
  // #    a page and a closing case runs across three, ending partway
  // #    down the last — and greying whole pages would either cover
  // #    what is required or leave what is not.
  // #
  // #    AND IT IS MARKED ON THE PAGE, not written in a rule somewhere.
  // #    The reader's own words for why: a written rule is forgotten,
  // #    and a shading on the page is not. It is there to be seen while
  // #    reading, so none of it is studied, and seen again while
  // #    summarising, so nothing is taken from it.
  // #
  // #    Two anchors and not an index: the first words of the stretch
  // #    and its last. Their own file holds word NUMBERS into a list of
  // #    words that only their file has — ours are read out of the PDF
  // #    and numbered differently, so an index would point nowhere.
  // #    Words find their place in any copy of the book
  // ============================================================
  const shapeSkips = list => Array.isArray(list)
    ? list.filter(k => k && typeof k === 'object').map(k => ({
        id: typeof k.id === 'string' ? k.id : 'x-' + Math.random().toString(36).slice(2, 8),
        page: Math.max(1, Math.trunc(Number(k.page)) || 1),
        // A whole page, for the front matter that is all of it
        all: k.all === true,
        from: typeof k.from === 'string' ? k.from : '',
        to: typeof k.to === 'string' ? k.to : '',
        why: typeof k.why === 'string' ? k.why : '',
        at: typeof k.at === 'string' ? k.at : null,
        deleted: k.deleted === true
      }))
    : [];

  const shapeList = doc => ({
    app: 'MyTerm',
    sources: Array.isArray(doc?.sources)
      ? doc.sources.filter(s => s && typeof s === 'object').map(shapeOne) : []
  });

  const living = () => (open?.list.sources || []).filter(s => !s.deleted);

  // ============================================================
  // # 💾 ⏱️  SAVING
  // # 🔤 JavaScript
  // # 🎯 Writes the list back, and not on every keystroke
  // # 🔗 The same wait the chapter uses, for the same reason: a reader
  // #    renaming a book types eight letters, and eight writes to Drive
  // #    for one rename is eight chances to half-arrive
  // ============================================================
  const QUIET = 900;
  let timer = null, dirty = false, tellStatus = () => {};

  async function push() {
    if (!open || !dirty) return;
    dirty = false;
    try {
      tellStatus('saving');
      await cloud().writeFile(open.listId, open.list);
      tellStatus('saved');
    } catch {
      dirty = true;
      tellStatus('failed');
    }
  }

  const wrote = () => {
    dirty = true;
    tellStatus('waiting');
    clearTimeout(timer);
    timer = setTimeout(push, QUIET);
  };

  // ============================================================
  // # 📂 🔑  OPENING THE LIST
  // # 🔤 JavaScript
  // # 🎯 Finds the course's source list, or makes an empty one the first
  // #    time anybody asks
  // # 🔗 The id is written beside the course in the term paper, the same
  // #    way a chapter's two files are — so it is found without searching
  // #    Drive, and a course that has never had a source costs one field
  // #    holding null and not a folder standing empty
  // ============================================================
  const openCourse = async (board, course) => {
    if (open && open.course.id === course.id) return open;
    await push();

    // Three steps, and the middle one is the one that matters. The id
    // we wrote down is only a GUESS about Drive — the user can trash the
    // file, and a field the term paper does not know how to keep is lost
    // on the next read. So before making anything, LOOK: a list already
    // sitting in the course folder is this course's list, whatever this
    // device happens to remember. Without the look, a lost id quietly
    // makes a second empty list beside the full one, and every book in
    // the first simply stops being seen
    let listId = course.sourcesId || null;
    let doc = listId ? await cloud().readFile(listId).catch(() => null) : null;

    if (!doc) {
      listId = await cloud().findChild(course.folderId, 'sources.json').catch(() => null);
      doc = listId ? await cloud().readFile(listId).catch(() => null) : null;
    }

    if (!doc) {
      listId = await cloud().createJson(course.folderId, 'sources.json', { app: 'MyTerm', sources: [] });
      doc = { app: 'MyTerm', sources: [] };
    }

    if (course.sourcesId !== listId) {
      course.sourcesId = listId;
      course.updatedAt = now();
      window.MyTermBoardStore?.change?.(board);
    }

    open = { course, listId, list: shapeList(doc) };

    // Everything sent up before a book could say which chapter it was
    // for. Read off their names now, once, and written back
    let settled = 0;
    open.list.sources.forEach(s => { if (!s.chapter && settleChapter(s)) settled++; });
    if (settled) wrote();

    return open;
  };

  // ============================================================
  // # 🔢 📑  WHICH CHAPTER A BOOK IS FOR, READ OFF ITS NAME
  // # 🔤 JavaScript
  // # 🎯 Ten books were sent up before a book could say which chapter it
  // #    belonged to, and every one of them says it in its own name:
  // #    "MIS250 Ch3 TB", "MIS250-Ch4-Book"
  // # 🔗 THE NAME IS THE CONTROL, and that is the point of doing it this
  // #    way rather than with a button. A book sitting under the wrong
  // #    chapter is moved by renaming it — which the head of the column
  // #    already does, with one press — instead of by a control added
  // #    for the one week after a repair and then never used again.
  // #
  // #    A NAME WITH NO CHAPTER IN IT MEANS THE WHOLE COURSE, and so
  // #    does a name with two of them. Nothing is guessed at: where the
  // #    name does not say, the book goes on every chapter's shelf,
  // #    which is exactly where it was before any of this
  // ============================================================
  const chapterNumberIn = name => {
    const found = new Set();
    // Written as (?:chapter|ch) and not as ch(?:apter)? on purpose: the
    // second spells the three letters "ch(" , and the site's own guard
    // reads a file looking for names it calls without defining. It saw
    // a call to a function called "ch". A pattern that reads as code to
    // anything that looks at the file is a pattern written wrong
    const re = /(?:chapter|ch)\s*-?\s*(\d{1,2})(?!\d)/gi;
    let hit;
    while ((hit = re.exec(String(name || '')))) found.add(Number(hit[1]));
    return found.size === 1 ? [...found][0] : null;
  };

  const settleChapter = source => {
    const was = source.chapter;
    const want = chapterNumberIn(source.name);
    source.chapter = '';

    if (want !== null) {
      const fits = (open?.course.chapters || [])
        .filter(h => h && !h.deleted && chapterNumberIn(h.name) === want);
      // AN EMPTY CHAPTER IS NOT WHERE A BOOK LIVES. Two tabs can carry
      // the same number — a half-made one left behind beside the real
      // one — and the one with ROWS in it is the real one.
      //
      // ROWS AND NOT PARTS, and that was measured the hard way: the tab
      // left behind in the reader's own course has two parts in it and
      // not one row. A part is a box somebody made and may never have
      // filled; a row is a term read out of a book. Counting parts
      // called the empty tab real, the two chapters tied, and both of
      // chapter two's files stayed on every shelf — the very thing
      // this is here to end
      const real = fits.filter(h => (h.rows || 0) > 0);
      const only = real.length === 1 ? real[0] : (fits.length === 1 ? fits[0] : null);
      if (only) source.chapter = only.id;
    }

    if (source.chapter === was) return false;
    source.updatedAt = now();
    return true;
  };

  // The folder the books themselves go in. Made on the first upload and
  // not before: a course with no sources should not leave an empty
  // folder in somebody's Drive explaining itself
  const FOLDER_TYPE = 'application/vnd.google-apps.folder';

  async function sourcesFolder() {
    if (open.course.sourcesFolderId) return open.course.sourcesFolderId;
    // Looked for before it is made, for the same reason as the list: a
    // forgotten id would leave a second Sources folder beside the first
    const id = await cloud().findChild(open.course.folderId, 'Sources', FOLDER_TYPE).catch(() => null)
      || await cloud().makeFolder('Sources', open.course.folderId);
    open.course.sourcesFolderId = id;
    open.course.updatedAt = now();
    window.MyTermBoardStore?.change?.(window.MyTermBoardStore?.live?.());
    return id;
  }

  window.MyTermSources = {
    watch: fn => { tellStatus = fn || (() => {}); },

    openId: () => open?.course.id ?? null,
    open: openCourse,

    all: () => living().map(s => ({ ...s })),
    of: kind => living().filter(s => s.kind === kind).map(s => ({ ...s })),

    // What this chapter has, and what the whole course has. The second
    // is not a leftover: a single book that covers every chapter is a
    // real thing, and it belongs on every chapter's shelf
    forChapter: chapterId => living()
      .filter(s => !s.chapter || s.chapter === chapterId)
      .map(s => ({ ...s })),

    // Said out loud rather than guessed at: a book can be moved to the
    // chapter it belongs to without being sent up a second time
    belongsTo: (id, chapterId) => {
      if (!open) return false;
      const source = open.list.sources.find(s => s.id === id);
      if (!source) return false;
      source.chapter = typeof chapterId === 'string' ? chapterId : '';
      source.updatedAt = now();
      wrote();
      return true;
    },
    one: id => { const s = living().find(x => x.id === id); return s ? { ...s } : null; },

    // ============================================================
    // # ⬆️ 📕  ADDING A BOOK
    // # 🔤 JavaScript
    // # 🎯 Sends the file up, then writes it into the list
    // # 🔗 IN THAT ORDER, and never the other way about. A row written
    // #    first and a file that then fails to arrive is a book on the
    // #    strip that opens to nothing, on this device and on the phone,
    // #    for good — and nothing on screen would say why. Written after,
    // #    a failed upload leaves the list exactly as it was.
    // #
    // #    One at a time, too: two forty-megabyte books going up together
    // #    on a flat share of the line take twice as long to show the
    // #    first page as one after the other
    // ============================================================
    add: async (file, kind, onGoing) => {
      if (!open || !file) return null;
      if (sending) throw new Error('One book is already going up');

      const sort = KINDS.includes(kind) ? kind : 'book';
      sending = true;
      try {
        const into = await sourcesFolder();
        const fileId = await cloud().uploadBlob(into, file.name, file, onGoing);

        const source = shapeOne({
          id: 's-' + Math.random().toString(36).slice(2, 8),
          name: file.name.replace(/\.pdf$/i, ''),
          // A book added while a chapter is open is THAT chapter's book.
          // It is the only moment anyone knows which chapter it is for,
          // and asking would be asking a reader a question they have
          // already answered by being there
          chapter: window.MyTermChapterStore?.openId?.() || '',
          kind: sort, fileId, size: file.size, deleted: false, updatedAt: now()
        });
        open.list.sources.push(source);
        // Kept here as well, so the book that was just sent up is the one
        // book that never has to come down again
        bytes.set(fileId, file);
        wrote();
        return { ...source };
      } finally {
        sending = false;
      }
    },

    // What is not asked of you in this source, on one page or on all
    skipsOn: (id, page) => {
      const source = living().find(s => s.id === id);
      const want = Math.max(1, Math.trunc(Number(page)) || 1);
      return (source?.skip || []).filter(k => !k.deleted && k.page === want).map(k => ({ ...k }));
    },

    addSkip: (id, where) => {
      if (!open || !where) return null;
      const source = open.list.sources.find(s => s.id === id);
      if (!source) return null;
      const made = shapeSkips([{ ...where, id: 'x-' + Math.random().toString(36).slice(2, 8), at: now() }])[0];
      // Nothing to find and not a whole page is a mark that can never
      // be drawn — refused here rather than left to puzzle somebody
      if (!made.all && !(made.from && made.to)) return null;
      source.skip.push(made);
      source.updatedAt = now();
      wrote();
      return { ...made };
    },

    rename: (id, name) => {
      if (!open) return false;
      const source = open.list.sources.find(s => s.id === id);
      const want = String(name || '').trim();
      if (!source || !want || source.name === want) return false;
      source.name = want;
      source.updatedAt = now();
      // The name says which chapter it is for, so a new name is a new
      // answer — including "no chapter at all", which puts it back on
      // every shelf. This is how a book is moved: there is no second
      // control to learn, and no way to rename it into a lie
      settleChapter(source);
      wrote();
      return true;
    },

    // The row goes, and the Drive file goes to the bin — not past it. A
    // book is the one thing here the reader did not make inside this
    // site, and Drive's own bin is the only place an undo can live
    drop: async id => {
      if (!open) return false;
      const source = open.list.sources.find(s => s.id === id);
      if (!source) return false;
      source.deleted = true;
      source.updatedAt = now();
      wrote();
      if (source.fileId) {
        bytes.delete(source.fileId);
        await cloud().dropFile(source.fileId).catch(() => false);
      }
      return true;
    },

    // ============================================================
    // # ⬇️ 📖  GETTING A BOOK BACK
    // # 🔤 JavaScript
    // # 🎯 The bytes of one source, from memory if they are there
    // # 🔗 Asked for twice at once — which is what two columns opening
    // #    together do — it must fetch once. So the PROMISE is what is
    // #    kept, not the answer: keeping the answer leaves the second
    // #    caller to start a second download while the first is still in
    // #    the air, and the reader waits twice for one book
    // ============================================================
    bytesOf: id => {
      const source = living().find(s => s.id === id);
      if (!source?.fileId) return Promise.resolve(null);
      if (bytes.has(source.fileId)) return Promise.resolve(bytes.get(source.fileId));

      const coming = cloud().readBlob(source.fileId).then(blob => {
        if (blob) bytes.set(source.fileId, blob);
        else bytes.delete(source.fileId);
        return blob;
      }, () => { bytes.delete(source.fileId); return null; });

      bytes.set(source.fileId, coming);
      return coming;
    },

    // The bell rang, or the pane was opened again: read the list and fold
    // it in. Each source carries its own clock, so the later word about
    // a name or a removal wins and neither device overwrites the other
    refresh: async () => {
      if (!open) return null;
      const doc = await cloud().readFile(open.listId).catch(() => null);
      if (!doc) return open;
      shapeList(doc).sources.forEach(theirs => {
        const mine = open.list.sources.find(s => s.id === theirs.id);
        if (!mine) { open.list.sources.push(theirs); return; }
        const newer = theirs.updatedAt && (!mine.updatedAt || theirs.updatedAt > mine.updatedAt);
        if (newer) Object.assign(mine, theirs);
      });
      return open;
    },

    shut: () => { clearTimeout(timer); push(); open = null; }
  };
})();
