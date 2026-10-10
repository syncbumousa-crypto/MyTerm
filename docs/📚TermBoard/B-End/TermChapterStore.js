// ============================================================
// # 📚 🗄️  THE TWO FILES OF A CHAPTER
// # 🔤 JavaScript
// # 🎯 Nothing here shows on screen. It gives every chapter a folder of
// #    its own holding two files, and hands the page what is in them
// # 🔗 THE SPLIT IS THE WHOLE DESIGN. A chapter's CONTENT — its terms,
// #    and later its questions and its laws — is large and changes on
// #    the day it is written and almost never after. What a reader has
// #    TICKED is a few hundred bytes and changes every few seconds. Put
// #    them in one file and every tick rewrites the whole chapter, and
// #    the phone downloads it again to learn one box was checked.
// #
// #    So: content.json carries a version number, and the number is also
// #    written beside the chapter in course.json — which is read anyway.
// #    A device whose cached copy is already at that version does not
// #    fetch the content at all. state.json is tiny, is read on every
// #    open, and is the only thing written while reading.
// #
// #    Both merge the way everything here merges: per item, by when it
// #    was last touched, with removals kept as tombstones. Two devices
// #    ticking different rows at once keep both ticks
// ============================================================
(() => {
  const cloud = () => window.MyTermCloud;
  const QUIET = 900;

  const now = () => new Date().toISOString();
  const newRowId = () => 'r-' + Math.random().toString(36).slice(2, 8);

  // ============================================================
  // # 🧱 📐  THE SHAPE OF WHAT IS READ
  // # 🔤 JavaScript
  // # 🎯 Names every field a row and a mark may carry
  // # 🔗 A field not named here is dropped on the next read. It has
  // #    already cost once: hours were added to a chapter, written, and
  // #    gone by the next open, because the shape had not been told
  // ============================================================
  const shapeRows = list => Array.isArray(list)
    ? list.filter(r => r && typeof r === 'object').map(r => ({
        id: typeof r.id === 'string' ? r.id : newRowId(),
        no: typeof r.no === 'string' ? r.no : '',
        term: typeof r.term === 'string' ? r.term : '',
        text: typeof r.text === 'string' ? r.text : '',
        updatedAt: r.updatedAt ?? null,
        deleted: r.deleted === true
      }))
    : [];

  const shapeSections = list => Array.isArray(list)
    ? list.filter(s => s && typeof s === 'object').map(s => ({
        id: typeof s.id === 'string' ? s.id : 'terms',
        name: typeof s.name === 'string' ? s.name : 'Terms',
        rows: shapeRows(s.rows)
      }))
    : [{ id: 'terms', name: 'Terms', rows: [] }];

  const shapeContent = doc => ({
    app: 'MyTerm',
    version: Math.max(1, Number(doc?.version) || 1),
    sections: shapeSections(doc?.sections)
  });

  const shapeMarks = marks => {
    const out = {};
    if (marks && typeof marks === 'object') {
      Object.keys(marks).forEach(id => {
        const m = marks[id];
        if (!m || typeof m !== 'object') return;
        out[id] = { on: m.on === true, at: typeof m.at === 'string' ? m.at : null };
      });
    }
    return out;
  };

  const shapeState = doc => ({ app: 'MyTerm', marks: shapeMarks(doc?.marks), updatedAt: doc?.updatedAt ?? null });

  // Last touched wins, per row and per mark — never per file. Whole file
  // wins would mean the slower device's work vanishing without a word
  const newer = (mine, theirs) => {
    if (!mine?.updatedAt) return theirs;
    if (!theirs?.updatedAt) return mine;
    return theirs.updatedAt > mine.updatedAt ? theirs : mine;
  };

  const mergeRows = (mine, theirs) => {
    const byId = new Map(mine.map(r => [r.id, r]));
    theirs.forEach(r => byId.set(r.id, byId.has(r.id) ? newer(byId.get(r.id), r) : r));
    return [...byId.values()];
  };

  const mergeMarks = (mine, theirs) => {
    const out = { ...mine };
    Object.keys(theirs).forEach(id => {
      const a = out[id], b = theirs[id];
      if (!a || !a.at || (b.at && b.at > a.at)) out[id] = b;
    });
    return out;
  };

  // ============================================================
  // # 💾 🏠  THE COPY KEPT BESIDE THE READER
  // # 🔤 JavaScript
  // # 🎯 Holds the content of chapters already read, so opening one
  // #    again costs nothing
  // # 🔗 Kept by version: a copy whose version is behind what course.json
  // #    says is thrown away unread. And a browser that refuses to store
  // #    anything simply reads from Drive every time, which is slower and
  // #    still correct — nothing here may ever be the only copy
  // ============================================================
  const cacheKey = id => 'myterm.chapter.' + id;

  const cacheRead = (id, version) => {
    try {
      const kept = JSON.parse(localStorage.getItem(cacheKey(id)) || 'null');
      return kept && kept.version === version ? shapeContent(kept) : null;
    } catch { return null; }
  };

  const cacheWrite = (id, content) => {
    try { localStorage.setItem(cacheKey(id), JSON.stringify(content)); } catch {}
  };

  // ============================================================
  // # 📂 🧭  FINDING THE TWO FILES, OR MAKING THEM
  // # 🔤 JavaScript
  // # 🎯 Gives a chapter a folder inside its course's folder, with the
  // #    two files in it, and writes their ids beside the chapter
  // # 🔗 The ids are written down so that opening a chapter a second
  // #    time asks Drive for nothing but the files themselves. A chapter
  // #    whose folder could not be made keeps no ids and is tried again
  // #    next time, so a refused call never loses what was read
  // ============================================================
  let board = null, open = null, timer = null, dirty = false, sending = false;
  let tellStatus = () => {};

  async function settle(course, chapter) {
    if (!course?.folderId) return false;

    const title = (chapter.name || 'Untitled chapter').trim() || 'Untitled chapter';

    if (!chapter.folderId) {
      chapter.folderId = await cloud().makeFolder(title, course.folderId);
      chapter.folderName = title;
    } else if (chapter.folderName !== title) {
      await cloud().rename(chapter.folderId, title);
      chapter.folderName = title;
    }

    if (!chapter.contentId) {
      chapter.contentId = await cloud().createJson(chapter.folderId, 'content.json',
        { app: 'MyTerm', version: 1, sections: [{ id: 'terms', name: 'Terms', rows: [] }] });
      chapter.contentVersion = 1;
    }

    if (!chapter.stateId) {
      chapter.stateId = await cloud().createJson(chapter.folderId, 'state.json',
        { app: 'MyTerm', marks: {}, updatedAt: now() });
    }

    return true;
  }

  // ============================================================
  // # 🚚 ⏳  SENDING, ONCE THE READER HAS STOPPED
  // # 🔤 JavaScript
  // # 🎯 Writes whichever of the two files changed, after nine tenths of
  // #    a second of quiet, and rings the bell so the other device looks
  // # 🔗 Writing on every tick would send one file per box checked. And
  // #    a failed write leaves the work marked unsent rather than lost:
  // #    the next change tries again, and the reader is told meanwhile
  // ============================================================
  let contentDirty = false, stateDirty = false;

  async function push() {
    if (sending || !open || (!contentDirty && !stateDirty)) return;
    sending = true;
    dirty = false;
    const wantedContent = contentDirty, wantedState = stateDirty;
    contentDirty = stateDirty = false;
    tellStatus('saving');

    try {
      if (wantedContent && open.chapter.contentId) {
        open.content.version = (Number(open.content.version) || 1) + 1;
        await cloud().writeFile(open.chapter.contentId, open.content);
        open.chapter.contentVersion = open.content.version;
        cacheWrite(open.chapter.id, open.content);
        // The version beside the chapter is what lets every other device
        // skip the download, so the course paper must hear about it
        window.MyTermBoardStore?.touchCourse?.(open.course.id);
        window.MyTermBoardStore?.change?.(board);
      }

      if (wantedState && open.chapter.stateId) {
        open.state.updatedAt = now();
        await cloud().writeFile(open.chapter.stateId, open.state);
      }

      tellStatus('saved');
      window.MyTermBell?.ring(Date.now());
    } catch {
      contentDirty = contentDirty || wantedContent;
      stateDirty = stateDirty || wantedState;
      dirty = true;
      tellStatus('failed');
    } finally {
      sending = false;
    }
  }

  const later = () => { clearTimeout(timer); timer = setTimeout(push, QUIET); };

  window.MyTermChapterStore = {
    watch: fn => { tellStatus = fn || (() => {}); },

    openId: () => open?.chapter?.id ?? null,

    // Returns null when something could not be read — never an empty
    // chapter. Empty is a fact about the reader; failure is our fault,
    // and a page that cannot tell them apart will offer to start again
    // over work that is sitting safely in Drive
    open: async (wholeBoard, course, chapter) => {
      board = wholeBoard;
      open = null;
      clearTimeout(timer);
      contentDirty = stateDirty = false;

      if (!(await settle(course, chapter).catch(() => false))) return null;

      let content = cacheRead(chapter.id, chapter.contentVersion);
      if (!content) {
        const doc = await cloud().readFile(chapter.contentId).catch(() => null);
        if (!doc) return null;
        content = shapeContent(doc);
        chapter.contentVersion = content.version;
        cacheWrite(chapter.id, content);
      }

      const stateDoc = await cloud().readFile(chapter.stateId).catch(() => null);
      if (!stateDoc) return null;

      open = { course, chapter, content, state: shapeState(stateDoc) };
      return open;
    },

    content: () => open?.content ?? null,
    state: () => open?.state ?? null,

    isOn: rowId => open?.state.marks[rowId]?.on === true,

    mark: (rowId, on) => {
      if (!open) return;
      open.state.marks[rowId] = { on: Boolean(on), at: now() };
      stateDirty = true;
      tellStatus('waiting');
      later();
    },

    addRow: sectionId => {
      if (!open) return null;
      const section = open.content.sections.find(s => s.id === sectionId) || open.content.sections[0];
      if (!section) return null;
      const row = { id: newRowId(), no: String(section.rows.filter(r => !r.deleted).length + 1),
                    term: '', text: '', updatedAt: now(), deleted: false };
      section.rows.push(row);
      contentDirty = true;
      tellStatus('waiting');
      later();
      return row;
    },

    editRow: (rowId, field, value) => {
      if (!open) return;
      for (const section of open.content.sections) {
        const row = section.rows.find(r => r.id === rowId);
        if (!row) continue;
        row[field] = value;
        row.updatedAt = now();
        contentDirty = true;
        tellStatus('waiting');
        later();
        return;
      }
    },

    dropRow: rowId => {
      if (!open) return;
      for (const section of open.content.sections) {
        const row = section.rows.find(r => r.id === rowId);
        if (!row) continue;
        row.deleted = true;
        row.updatedAt = now();
        contentDirty = true;
        tellStatus('waiting');
        later();
        return;
      }
    },

    // The bell rang: read the two files again and fold what came in with
    // what is here. Anything typed on this device and not yet sent wins
    // nothing by default — it is merged row by row, like everywhere else
    refresh: async () => {
      if (!open) return null;
      const stateDoc = await cloud().readFile(open.chapter.stateId).catch(() => null);
      if (stateDoc) open.state.marks = mergeMarks(open.state.marks, shapeState(stateDoc).marks);

      const theirVersion = Number(open.chapter.contentVersion) || 1;
      if (theirVersion !== open.content.version) {
        const doc = await cloud().readFile(open.chapter.contentId).catch(() => null);
        if (doc) {
          const incoming = shapeContent(doc);
          incoming.sections.forEach(section => {
            const mine = open.content.sections.find(s => s.id === section.id);
            if (mine) mine.rows = mergeRows(mine.rows, section.rows);
            else open.content.sections.push(section);
          });
          open.content.version = incoming.version;
          cacheWrite(open.chapter.id, open.content);
        }
      }
      return open;
    },

    shut: () => { clearTimeout(timer); push(); open = null; }
  };
})();
