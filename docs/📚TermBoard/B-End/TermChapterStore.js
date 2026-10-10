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
  // # 🖍️ 🧼  THE MARKS ALLOWED ON THE PAPER
  // # 🔤 JavaScript
  // # 🎯 Keeps only the handful of marks a summary is written with, and
  // #    throws away every other scrap of markup
  // # 🔗 The cells are written in by hand, so what lands in them is
  // #    whatever the browser made of a paste — a whole stylesheet from
  // #    a web page, a table from a document, an image that would be
  // #    fetched from somebody else's server every time the chapter
  // #    opened. The cleaning is done HERE, at the edge where words
  // #    enter and leave the file, and not in the screen that draws
  // #    them: a second device reading the file was never asked to
  // #    trust what this one wrote.
  // #
  // #    The scrap is parsed in a document of its own, never in this
  // #    one, so nothing in it is ever fetched or run on the way
  // ============================================================
  const KEEP = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', BR: 'br', SPAN: 'span' };
  const MARKS = new Set(['hl', 'pa', 'pb', 'bx']);
  // These few are thrown away WITH what is inside them. Everywhere else
  // the rule is the opposite — lose the wrapper, keep the words — but
  // what is inside these is not words: it is a stylesheet, or a program,
  // or a page. Copying a web page into a cell put four hundred lines of
  // somebody's CSS into it as plain text, which is harmless and useless
  const DROP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'HEAD', 'TITLE']);
  const BREAKS = new Set(['DIV', 'P', 'LI', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE']);

  const copyInto = (from, into, doc) => {
    from.childNodes.forEach(node => {
      if (node.nodeType === 3) { into.append(doc.createTextNode(node.nodeValue)); return; }
      if (node.nodeType !== 1 || DROP.has(node.tagName)) return;

      const tag = KEEP[node.tagName];
      // An unknown wrapper loses the wrapper and keeps the words. Dropping
      // the words with it would quietly eat a pasted paragraph. But a
      // wrapper that stood on its own line leaves a line break behind it:
      // without that, three pasted paragraphs arrive as one long word
      if (!tag) {
        copyInto(node, into, doc);
        if (BREAKS.has(node.tagName)) into.append(doc.createElement('br'));
        return;
      }

      const made = doc.createElement(tag);
      if (tag === 'span') {
        const mark = [...node.classList].find(c => MARKS.has(c));
        if (!mark) { copyInto(node, into, doc); return; }
        made.className = mark;
      }
      if (tag !== 'br') copyInto(node, made, doc);
      into.append(made);
    });
  };

  const clean = html => {
    if (typeof html !== 'string' || !html) return '';
    const doc = document.implementation.createHTMLDocument('');
    const from = doc.createElement('div');
    from.innerHTML = html;
    const into = doc.createElement('div');
    copyInto(from, into, doc);
    // The last paragraph leaves a break behind it with nothing after it,
    // and a cell that ends in an empty line is a cell a row taller than
    // it needs to be — and the sheet is cut by measured height
    while (into.lastChild && into.lastChild.nodeName === 'BR') into.lastChild.remove();
    return into.innerHTML;
  };

  // ============================================================
  // # 🧱 📐  THE SHAPE OF WHAT IS READ
  // # 🔤 JavaScript
  // # 🎯 Names every field a row and a mark may carry
  // # 🔗 A field not named here is dropped on the next read. It has
  // #    already cost once: hours were added to a chapter, written, and
  // #    gone by the next open, because the shape had not been told
  // ============================================================
  // Rows written before there was a place to keep carry none, and a row
  // that arrives without one must not jump to the front: it keeps the
  // position it was read in, which is the position it was written in
  const settleOrder = rows => {
    rows.forEach((r, i) => { if (r.order === null) r.order = i; });
    rows.sort((a, b) => a.order - b.order);
    return rows;
  };

  // THE TWO LANGUAGES ARE FOUR FIELDS ON ONE ROW — not two rows, not two
  // files, not two chapters. A row IS the one idea; Arabic and English
  // are two ways of saying it, and they must tick together, move
  // together and be removed together. Split them into two rows and the
  // day a reader reorders the English half, the Arabic half stays where
  // it was. The plain names are the English ones so that every chapter
  // written before this day keeps every word it had
  const WORDS = new Set(['term', 'termAr', 'text', 'textAr']);

  const shapeRows = list => settleOrder(Array.isArray(list)
    ? list.filter(r => r && typeof r === 'object').map(r => ({
        id: typeof r.id === 'string' ? r.id : newRowId(),
        no: typeof r.no === 'string' ? r.no : '',
        term: clean(r.term),
        text: clean(r.text),
        termAr: clean(r.termAr),
        textAr: clean(r.textAr),
        // Which table this row sits in, where it sits, and whether it is
        // the row its table is built around
        cid: Math.max(1, Math.trunc(Number(r.cid)) || 1),
        order: Number.isFinite(Number(r.order)) ? Number(r.order) : null,
        lead: r.lead === true,
        // Two clocks, on purpose — see mergeRows below
        updatedAt: r.updatedAt ?? null,
        movedAt: r.movedAt ?? null,
        deleted: r.deleted === true
      }))
    : []);

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

  // ============================================================
  // # ⏱️ ⏱️  TWO CLOCKS ON ONE ROW
  // # 🔤 JavaScript
  // # 🎯 Folds a row that came in with the one already here, taking its
  // #    WORDS from whichever was written in later and its PLACE from
  // #    whichever was moved later
  // # 🔗 One clock is not enough once rows can be reordered. Moving a
  // #    row shifts the position of every row between here and there,
  // #    so a move touches twenty rows; with a single clock that move
  // #    would also be the newest thing said about all twenty, and a
  // #    sentence the other device typed into one of them a minute
  // #    earlier would be overwritten by a row merely sliding past it.
  // #    So moving stamps movedAt and typing stamps updatedAt, and the
  // #    two never read each other's stamp
  // ============================================================
  const pickWords = (mine, theirs) =>
    (theirs.updatedAt && (!mine.updatedAt || theirs.updatedAt > mine.updatedAt)) ? theirs : mine;

  const pickPlace = (mine, theirs) =>
    (theirs.movedAt && (!mine.movedAt || theirs.movedAt > mine.movedAt)) ? theirs : mine;

  const foldRow = (mine, theirs) => {
    const w = pickWords(mine, theirs), p = pickPlace(mine, theirs);
    return {
      id: mine.id,
      no: w.no, updatedAt: w.updatedAt,
      // All four words move together, by the one clock. Taking each
      // language by its own clock would let a device that only ever
      // reads English drag the Arabic back with it
      term: w.term, text: w.text, termAr: w.termAr, textAr: w.textAr,
      cid: p.cid, order: p.order, lead: p.lead, movedAt: p.movedAt,
      // A removal is never undone from here, so once either side has
      // buried a row it stays buried. The other reading is worse: a
      // device that had not yet heard of the removal would raise it
      deleted: mine.deleted || theirs.deleted
    };
  };

  const mergeRows = (mine, theirs) => {
    const byId = new Map(mine.map(r => [r.id, r]));
    theirs.forEach(r => byId.set(r.id, byId.has(r.id) ? foldRow(byId.get(r.id), r) : r));
    return settleOrder([...byId.values()]);
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
  // # 🗃️ 🔢  WHICH TABLE A ROW SITS IN
  // # 🔤 JavaScript
  // # 🎯 Splits a table in two, joins one to its neighbour, moves a row,
  // #    and names the row a table is built around
  // # 🔗 cid IS A PROPERTY OF THE POSITION, NOT OF THE ROW. Consecutive
  // #    rows that share a cid are one table, so if a cid travelled with
  // #    a row into the middle of another table it would cut that table
  // #    in two and show a split nobody asked for. So the cids are read
  // #    off the positions before a move and written back onto them
  // #    after it: the row that travelled becomes a member of the table
  // #    it landed in, which is what the eye sees and expects
  // ============================================================
  const nextCid = rows => rows.reduce((m, r) => Math.max(m, r.cid), 0) + 1;

  const headOf = (rows, i) => { let s = i; while (s > 0 && rows[s - 1].cid === rows[i].cid) s--; return s; };
  const tailOf = (rows, i) => { let e = i; while (e < rows.length - 1 && rows[e + 1].cid === rows[i].cid) e++; return e; };

  const splitAt = (rows, i) => {
    const was = rows[i].cid, fresh = nextCid(rows);
    for (let k = i; k < rows.length && rows[k].cid === was; k++) rows[k].cid = fresh;
  };

  const joinAt = (rows, i, way) => {
    const s = headOf(rows, i), e = tailOf(rows, i);
    const at = way < 0 ? s - 1 : e + 1;
    if (at < 0 || at >= rows.length) return false;
    const was = rows[i].cid, into = rows[at].cid;
    for (let k = s; k < rows.length && rows[k].cid === was; k++) rows[k].cid = into;
    return true;
  };

  // A primary row heads its table. That is not a rule applied once when
  // one is named — it is kept true after every move, because a row that
  // travels adopts the table it lands in and could land halfway down one
  const keepLeads = rows => rows.forEach((r, i) => {
    if (r.lead && i > 0 && rows[i - 1].cid === r.cid) splitAt(rows, i);
  });

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

  const wrote = () => { contentDirty = true; tellStatus('waiting'); later(); };

  // Every position change ends here: positions are renumbered from where
  // the rows now stand, and only the rows that actually moved get a new
  // movedAt — a stamp on a row that did not move is a stamp that would
  // beat the other device's typing for nothing
  const placed = (rows, before) => {
    const at = now();
    rows.forEach((r, i) => {
      const was = before.get(r.id);
      const slid = r.order !== i;
      r.order = i;
      if (!was || slid || was.cid !== r.cid || was.lead !== r.lead) r.movedAt = at;
    });
    wrote();
  };

  const snapshot = rows => new Map(rows.map(r => [r.id, { order: r.order, cid: r.cid, lead: r.lead }]));

  const sectionOf = () => open?.content.sections[0] ?? null;

  // Sorted every time, never trusted to the order of the array in the
  // file. The position is the order field and nothing else: a move
  // rewrites those numbers and leaves the array where it was, and a
  // reader who had been handed the array would have seen the move undo
  // itself on the next draw
  const livingRows = () => (sectionOf()?.rows || []).filter(r => !r.deleted).sort((a, b) => a.order - b.order);
  const indexOf = (rows, rowId) => rows.findIndex(r => r.id === rowId);

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

    // The rows as they stand: alive, in order, and the same objects the
    // file holds — the screen draws from these and must not copy them
    rows: () => livingRows(),

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
      const section = open.content.sections.find(s => s.id === sectionId) || sectionOf();
      if (!section) return null;
      const living = livingRows();
      const row = {
        id: newRowId(), no: '', term: '', text: '', termAr: '', textAr: '',
        // It joins the table at the end rather than starting a new one:
        // a reader adding a row is carrying on, not opening a chapter
        cid: living.length ? living[living.length - 1].cid : 1,
        order: living.length,
        lead: false,
        updatedAt: now(), movedAt: now(), deleted: false
      };
      section.rows.push(row);
      wrote();
      return row;
    },

    editRow: (rowId, field, value) => {
      if (!open) return;
      for (const section of open.content.sections) {
        const row = section.rows.find(r => r.id === rowId);
        if (!row) continue;
        const next = WORDS.has(field) ? clean(value) : value;
        if (row[field] === next) return;
        row[field] = next;
        row.updatedAt = now();
        wrote();
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
        wrote();
        return;
      }
    },

    // One step up or down. The cids are lifted off the positions first
    // and laid back on them after, so no table is split by a row walking
    // through it — and any primary row that ended up mid-table is made
    // the head of its own again
    move: (rowId, way) => {
      if (!open) return false;
      const rows = livingRows();
      const from = indexOf(rows, rowId), to = from + (way < 0 ? -1 : 1);
      if (from < 0 || to < 0 || to >= rows.length) return false;

      const before = snapshot(rows);
      const cids = rows.map(r => r.cid);
      rows.splice(to, 0, rows.splice(from, 1)[0]);
      rows.forEach((r, i) => { r.cid = cids[i]; });
      keepLeads(rows);
      placed(rows, before);
      return true;
    },

    lead: (rowId, on) => {
      if (!open) return false;
      const rows = livingRows();
      const i = indexOf(rows, rowId);
      if (i < 0) return false;

      const before = snapshot(rows);
      rows[i].lead = Boolean(on);
      if (rows[i].lead) splitAt(rows, i);
      placed(rows, before);
      return true;
    },

    split: rowId => {
      if (!open) return false;
      const rows = livingRows();
      const i = indexOf(rows, rowId);
      if (i <= 0 || headOf(rows, i) === i) return false;

      const before = snapshot(rows);
      splitAt(rows, i);
      placed(rows, before);
      return true;
    },

    join: (rowId, way) => {
      if (!open) return false;
      const rows = livingRows();
      const i = indexOf(rows, rowId);
      if (i < 0) return false;

      const before = snapshot(rows);
      if (!joinAt(rows, i, way)) return false;
      keepLeads(rows);
      placed(rows, before);
      return true;
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
