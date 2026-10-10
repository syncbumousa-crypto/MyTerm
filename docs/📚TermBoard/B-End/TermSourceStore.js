// ============================================================
// # 📕 🗄️  THE BOOKS A COURSE IS WRITTEN FROM
// # 🔤 JavaScript
// # 🎯 The list of a course's sources, the file each one is, and the way
// #    one is added, renamed or taken away
// # 🔗 A SOURCE BELONGS TO THE COURSE AND NOT TO THE CHAPTER, and that
// #    is the whole shape of this file. A textbook is one book for all
// #    fourteen chapters: held on the chapter it would be sent up
// #    fourteen times, sit in Drive fourteen times, and be downloaded
// #    again every time the reader moved to the next chapter. Held on
// #    the course it is sent once and every chapter opens the same file.
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
    fileId: typeof s.fileId === 'string' ? s.fileId : null,
    size: Math.max(0, Number(s.size) || 0),
    // Crossed out, not torn out, for the reason everything here is: the
    // other device still has it, and a merge would walk it back in
    deleted: s.deleted === true,
    updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : null
  });

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

    let listId = course.sourcesId || null;
    let list = listId ? shapeList(await cloud().readFile(listId).catch(() => null)) : null;

    if (!list) {
      listId = await cloud().createJson(course.folderId, 'sources.json', { app: 'MyTerm', sources: [] });
      course.sourcesId = listId;
      course.updatedAt = now();
      window.MyTermBoardStore?.change?.(board);
      list = { app: 'MyTerm', sources: [] };
    }

    open = { course, listId, list };
    return open;
  };

  // The folder the books themselves go in. Made on the first upload and
  // not before: a course with no sources should not leave an empty
  // folder in somebody's Drive explaining itself
  async function sourcesFolder() {
    if (open.course.sourcesFolderId) return open.course.sourcesFolderId;
    const id = await cloud().makeFolder('Sources', open.course.folderId);
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

    rename: (id, name) => {
      if (!open) return false;
      const source = open.list.sources.find(s => s.id === id);
      const want = String(name || '').trim();
      if (!source || !want || source.name === want) return false;
      source.name = want;
      source.updatedAt = now();
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
