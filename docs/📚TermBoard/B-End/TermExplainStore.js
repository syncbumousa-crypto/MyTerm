// ============================================================
// # 📖 🗄️  THE THIRD FILE OF A CHAPTER
// # 🔤 JavaScript
// # 🎯 Holds the long explanation of every row, in both languages, and
// #    is not fetched until the first one is asked for
// # 🔗 THE SPLIT THAT BUILT THE CHAPTER, ONE STEP FURTHER. content.json
// #    is heavy and rarely changes; state.json is tiny and changes every
// #    few seconds; and an explanation is heavier than either and read
// #    rarer than both. One chapter's explanations are three hundred
// #    kilobytes next to a content file of three hundred and thirty —
// #    so keeping them together would double what is downloaded every
// #    time a chapter is opened, to serve a reader who opens none of
// #    them that evening.
// #
// #    So it is a file of its own, fetched on the first press of a row's
// #    ⋯ and not before, and held for as long as the chapter is open.
// #
// #    AND IT MERGES LIKE EVERYTHING ELSE HERE: per row, by when it was
// #    last touched, with removals kept as tombstones. Two devices
// #    writing explanations on different rows keep both
// ============================================================
(() => {
  const cloud = () => window.MyTermCloud;
  const QUIET = 1200;
  const now = () => new Date().toISOString();

  // ============================================================
  // # 🧼 📖  THE GATE AN EXPLANATION PASSES THROUGH
  // # 🔤 JavaScript
  // # 🎯 Keeps the handful of shapes an explanation is written with, and
  // #    throws away every other scrap of markup
  // # 🔗 THE LIST IS MEASURED, NOT GUESSED. It is every tag, every class
  // #    and every attribute that appears in the reader's own five
  // #    chapters, counted: 12,660 bold, 3,472 paragraphs, 516 figures,
  // #    8 tables, and eight class names. A list written from memory
  // #    would quietly drop whichever of them was forgotten — and that
  // #    is exactly how ten colours were lost from the summary cells
  // #    while every one of them worked on screen.
  // #
  // #    An explanation is NOT a cell. A cell is a line of words with a
  // #    mark or two on it; an explanation is a small article with
  // #    paragraphs, figures and a table. So it has its own gate, and
  // #    the cell's gate stays as narrow as it was
  // ============================================================
  const KEEP = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', BR: 'br',
                 P: 'p', DIV: 'div', SPAN: 'span',
                 FIGURE: 'figure', FIGCAPTION: 'figcaption', IMG: 'img',
                 TABLE: 'table', THEAD: 'thead', TBODY: 'tbody',
                 TR: 'tr', TD: 'td', TH: 'th',
                 UL: 'ul', OL: 'ol', LI: 'li' };

  const CLASSES = new Set(['epKey', 'epTrap', 'epFig', 'epFigSrc',
                           'epWidget', 'epPhoto', 'epPhotoRow', 'epTbl']);

  const DROP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME',
                        'OBJECT', 'EMBED', 'HEAD', 'TITLE']);

  const copyInto = (from, into, doc) => {
    from.childNodes.forEach(node => {
      if (node.nodeType === 3) { into.append(doc.createTextNode(node.nodeValue)); return; }
      if (node.nodeType !== 1 || DROP.has(node.tagName)) return;

      // A picture is the NAME of a file in the reader's own Drive and
      // nothing else. An address on somebody's server is fetched from
      // there every time the window opens and is gone the day that
      // server is; letters are a quarter of a megabyte in a file that
      // is downloaded whole
      if (node.tagName === 'IMG') {
        const file = node.getAttribute('data-file');
        if (!file || !/^[\w-]{6,80}$/.test(file)) return;
        const made = doc.createElement('img');
        made.setAttribute('data-file', file);
        const alt = node.getAttribute('alt');
        if (alt) made.setAttribute('alt', alt.slice(0, 400));
        into.append(made);
        return;
      }

      const tag = KEEP[node.tagName];
      if (!tag) { copyInto(node, into, doc); return; }

      const made = doc.createElement(tag);
      const mine = [...node.classList].filter(c => CLASSES.has(c));
      if (mine.length) made.className = mine.join(' ');
      // The one thing a page of this site cannot build: an interactive
      // picture. Its place is kept and SAID, so a reader meeting a
      // chapter that had one knows something stood here
      if (mine.includes('epWidget')) {
        const what = node.getAttribute('data-widget');
        if (what) made.setAttribute('data-widget', String(what).slice(0, 60));
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
    return into.innerHTML;
  };

  // ============================================================
  // # 🧱 📐  THE SHAPE OF WHAT IS READ
  // # 🔤 JavaScript
  // # 🎯 Names every field an explanation may carry
  // # 🔗 A field not named here is dropped on the next read — the rule
  // #    that has already cost this project twice
  // ============================================================
  const shapeOne = e => ({
    ar: clean(e.ar),
    en: clean(e.en),
    at: typeof e.at === 'string' ? e.at : null,
    deleted: e.deleted === true
  });

  const shapeDoc = doc => {
    const rows = {};
    const given = doc && typeof doc.rows === 'object' && doc.rows ? doc.rows : {};
    Object.keys(given).forEach(id => {
      if (typeof id !== 'string' || !given[id] || typeof given[id] !== 'object') return;
      rows[id] = shapeOne(given[id]);
    });
    return { app: 'MyTerm', kind: 'explain', chapter: doc?.chapter ?? null, rows };
  };

  // Theirs wins where it is newer, ours where it is. Per row, by its own
  // clock — the same merge the rows themselves get
  const merge = (mine, theirs) => {
    const out = { ...mine.rows };
    Object.entries(theirs.rows).forEach(([id, one]) => {
      const here = out[id];
      if (!here || !here.at || (one.at && one.at > here.at)) out[id] = one;
    });
    return { ...mine, rows: out };
  };

  let open = null, timer = null, dirty = false, coming = null;

  const later = () => { clearTimeout(timer); timer = setTimeout(push, QUIET); };

  const push = async () => {
    if (!open || !dirty) return;
    dirty = false;
    try {
      if (!open.fileId) {
        open.fileId = await cloud().createJson(open.chapter.folderId, 'explain.json', open.doc);
        open.chapter.explainId = open.fileId;
        window.MyTermBoardStore?.touchCourse?.(open.courseId);
        window.MyTermBoardStore?.change?.(window.MyTermBoardStore.live());
      } else {
        await cloud().writeFile(open.fileId, open.doc);
      }
    } catch {
      dirty = true;
    }
  };

  // ============================================================
  // # ⏬ 💤  FETCHED ON THE FIRST ASKING AND NOT BEFORE
  // # 🔤 JavaScript
  // # 🎯 Reads the chapter's explanations once, when one of them is
  // #    first wanted, and holds them while the chapter is open
  // # 🔗 ONE PROMISE AND NOT ONE ANSWER. A reader pressing two rows
  // #    quickly would otherwise start two downloads of the same three
  // #    hundred kilobytes — so what is kept is the FETCH, and the
  // #    second asker waits on the first one's.
  // #
  // #    A chapter with no file yet is not a failure: it is a chapter
  // #    nobody has written an explanation in. It answers empty and
  // #    makes nothing, and the file is made by the first write
  // ============================================================
  const ready = async (courseId, chapter) => {
    if (open && open.chapter.id === chapter.id) return coming;
    clearTimeout(timer);
    await push();
    open = { courseId, chapter, fileId: chapter.explainId || null,
             doc: { app: 'MyTerm', kind: 'explain', chapter: chapter.id, rows: {} } };
    dirty = false;

    coming = (async () => {
      let id = open.fileId;
      // The id written beside the chapter is only a GUESS about Drive:
      // the file can be trashed, and a field the paper does not know how
      // to keep is lost on a read. So before making anything, LOOK
      let doc = id ? await cloud().readFile(id).catch(() => null) : null;
      if (!doc && chapter.folderId) {
        id = await cloud().findChild(chapter.folderId, 'explain.json').catch(() => null);
        doc = id ? await cloud().readFile(id).catch(() => null) : null;
      }
      if (doc) { open.fileId = id; open.doc = shapeDoc(doc); open.chapter.explainId = id; }
      return open.doc;
    })();
    return coming;
  };

  window.MyTermExplainStore = {
    ready,
    openId: () => open?.chapter?.id ?? null,

    of: rowId => {
      const one = open?.doc.rows[rowId];
      return one && !one.deleted ? { ar: one.ar, en: one.en } : null;
    },

    put: (rowId, words) => {
      if (!open || !rowId || !words) return false;
      open.doc.rows[rowId] = shapeOne({ ar: words.ar, en: words.en, at: now() });
      dirty = true;
      later();
      return true;
    },

    drop: rowId => {
      if (!open || !open.doc.rows[rowId]) return false;
      open.doc.rows[rowId] = { ar: '', en: '', at: now(), deleted: true };
      dirty = true;
      later();
      return true;
    },

    // How many rows have one, for whoever is counting
    counts: () => {
      const living = Object.values(open?.doc.rows || {}).filter(e => !e.deleted);
      return { rows: living.length,
               ar: living.filter(e => e.ar).length,
               en: living.filter(e => e.en).length };
    },

    refresh: async () => {
      if (!open || !open.fileId) return null;
      const doc = await cloud().readFile(open.fileId).catch(() => null);
      if (!doc) return null;
      open.doc = merge(open.doc, shapeDoc(doc));
      return open.doc;
    },

    shut: async () => { clearTimeout(timer); await push(); open = null; coming = null; }
  };
})();
