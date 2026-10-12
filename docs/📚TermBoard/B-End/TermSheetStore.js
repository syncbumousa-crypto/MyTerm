// ============================================================
// # 📄 🗄️  THE SHEETS A CHAPTER IS PRACTISED FROM
// # 🔤 JavaScript
// # 🎯 A chapter's law sheets and practice cards: read on the first
// #    opening of a Rules part, written back a whole page at a time
// # 🔗 A SHEET IS NOT A ROW. Everything else a chapter holds is four
// #    fields drawn into a cell; a sheet is a PAGE that was drawn — a
// #    law in its box with its number, its icon, its coloured letters
// #    and its compound fraction, or a card holding the book's wording,
// #    a shorter one, a folded solution and a table of givens.
// #
// #    So it is kept as the markup it was written as, and what is kept
// #    beside it is only what this site needs to know where it goes and
// #    how to treat it. The fourth file of a chapter, for the reason
// #    the third one exists: content.json is read on every opening and
// #    must stay light, and these are fifty to four hundred kilobytes
// ============================================================
(() => {
  const cloud = () => window.MyTermCloud;
  const now = () => new Date().toISOString();
  const QUIET = 1200;

  // ============================================================
  // # 🚪 🧼  THE GATE
  // # 🔤 JavaScript
  // # 🎯 Keeps every shape these pages are written with, and nothing else
  // # 🔗 THE LIST IS MEASURED, NOT REMEMBERED. It is every tag, class
  // #    and attribute that appears in the reader's eight chapters,
  // #    counted: 10,098 bold, 9,426 spans, 4,898 cells, 423 cards,
  // #    199 equations, 93 class names, 9 attributes. A list written
  // #    from memory drops whatever was forgotten — in silence, which
  // #    is how ten colours were lost from the summary cells while
  // #    every one of them worked on screen.
  // #
  // #    A SHEET IS NOT A CELL AND NOT AN EXPLANATION. A cell is a line
  // #    with a mark or two; an explanation is a small article. A sheet
  // #    is a drawn page with grids, fractions and financial statements
  // #    in it. So it has its own gate, and the other two stay as
  // #    narrow as they were
  // ============================================================
  const KEEP = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', BR: 'br', HR: 'hr',
                 DIV: 'div', SPAN: 'span', SMALL: 'small', SUP: 'sup', SUB: 'sub',
                 TABLE: 'table', THEAD: 'thead', TBODY: 'tbody', CAPTION: 'caption',
                 TR: 'tr', TD: 'td', TH: 'th' };

  // The ninety-three, in the families they belong to — so a reader of
  // this list can see what each one is for, and so a family that grows
  // is added where it is looked for
  const CLASSES = new Set([
    // the sheet and its head
    'eqPage', 'eqHead', 'lawGrid', 'eqRule', 'pairGap', 'wrap', 'grp', 'sec',
    // a law in its box
    'lawBox', 'lawDerived', 'lawNo', 'lawEq', 'lawNote', 'lawIco',
    'frac', 'fnum', 'fden', 'lhs', 'lhsRow',
    // the letters of a law, each in its own colour
    'tt', 'ttNote', 'v-a', 'v-b', 'v-c', 'v-d', 'v-e', 'v-f', 'v-g',
    // a practice card
    'qcard', 'qh', 'qb', 'qAns', 'qSwitch', 'qFull', 'qSimple',
    'sFull', 'sSimple', 'ansToggle', 'ansBody', 'aShow', 'aHide',
    'given', 'ask', 'note', 'miss', 'lbl', 'exp',
    // a table of givens
    'qTable', 'qTableWrap', 'qTSec', 'c1', 'c2', 'c3', 'n', 'u', 'd', 'r',
    'in1', 'in2', 'an', 'lc', 'lcOp', 'dt', 'cr', 'tot', 'no', 'yes',
    // the financial statements, the journal and the cash flows
    'finStmt', 'finStmtWrap', 'fsKey', 'fsTitle', 'fsCo', 'fsWhen', 'acct',
    'je', 'jeWrap', 'jeSep', 'taxTag',
    'cf-in', 'cf-out', 'cf-op', 'cf-inv', 'cf-fin',
    // a decision tree
    'treeArm', 'treeLbl', 'treeEnd',
    // which language this piece is, and where it came from
    'arOnly', 'enOnly', 'srcNote', 'srcLink', 'lgAlt',
    // two that wandered in from the explanation pages, and are theirs
    'epTbl', 'epPhoto'
  ]);

  // Said out loud rather than passed through: each of these makes the
  // page DO something, and a page that carries one the site does not
  // answer is a page with a dead control on it
  const ATTRS = new Set(['data-ans', 'data-tb', 'data-icon', 'data-kind',
                         'data-anchor', 'data-calc', 'data-tree', 'colspan', 'rowspan']);

  // ============================================================
  // AN INLINE STYLE IS LET THROUGH BY ITS PROPERTY, NOT BY ITS WORD
  //
  // There are twenty-nine of them in eight chapters and eight distinct
  // values, every one of them layout: a caption's placement, and where
  // a cell sits in its grid. None is decoration and none can be done
  // another way, so they are kept.
  //
  // But `style` is the one attribute that can carry anything at all —
  // a pasted page's whole look, a picture fetched from somebody's
  // server, a box that floats over the rest of the site. So the
  // property is read and the declaration is kept only if it is one of
  // the seven these pages actually use
  // ============================================================
  const STYLE_OK = new Set(['caption-side', 'text-align', 'font-size',
                            'padding-bottom', 'color', '--cols', 'grid-column']);

  const DROP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME',
                        'OBJECT', 'EMBED', 'HEAD', 'TITLE', 'LINK', 'META', 'IMG']);

  const cleanStyle = text => String(text || '').split(';')
    .map(one => one.trim())
    .filter(Boolean)
    .filter(one => {
      const at = one.indexOf(':');
      if (at < 0) return false;
      const prop = one.slice(0, at).trim().toLowerCase();
      // url() is refused wherever it appears: it is the one thing a
      // declaration can hold that reaches off this page
      return STYLE_OK.has(prop) && !/url\s*\(/i.test(one);
    })
    .join('; ');

  const copyInto = (from, into, doc) => {
    from.childNodes.forEach(node => {
      if (node.nodeType === 3) { into.append(doc.createTextNode(node.nodeValue)); return; }
      if (node.nodeType !== 1 || DROP.has(node.tagName)) return;

      const tag = KEEP[node.tagName];
      // The wrapper goes and the words stay — the rule everywhere here
      if (!tag) { copyInto(node, into, doc); return; }

      const made = doc.createElement(tag);
      const mine = [...node.classList].filter(c => CLASSES.has(c));
      if (mine.length) made.className = mine.join(' ');

      // ============================================================
      // AN ATTRIBUTE IS KEPT WHOLE, AND THE LENGTH IS MEASURED
      //
      // Every attribute on these pages is a word or a number — eight
      // letters at most — except one. `data-calc` carries the whole
      // description of a calculator problem: its mode, its figures,
      // what to solve for, and the keystrokes written out with the key
      // names marked up inside it. The longest is 778 characters.
      //
      // Cut at a hundred and twenty, every one of the twenty-three
      // would have arrived as half a sentence of JSON — and the guard
      // would still have said the attribute was there, because it was
      // counting NAMES. It is counting values now, and the cap is set
      // above the longest that exists rather than at a round number
      // ============================================================
      ATTRS.forEach(name => {
        const had = node.getAttribute(name);
        if (had !== null) made.setAttribute(name, String(had).slice(0, 2000));
      });

      const style = cleanStyle(node.getAttribute('style'));
      if (style) made.setAttribute('style', style);

      if (tag !== 'br' && tag !== 'hr') copyInto(node, made, doc);
      into.append(made);
    });
  };

  const clean = html => {
    if (typeof html !== 'string' || !html) return '';
    // Parsed in a document of its own, never in this one, so nothing in
    // it is fetched or run on the way past
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
  // # 🎯 Names every field a sheet may carry
  // # 🔗 A field not named here is dropped on the next read — the rule
  // #    that has already cost this project three times.
  // #
  // #    AND `at` IS NOT A SORT ORDER, IT IS THE SHEET'S PLACE. Two
  // #    hundred and thirty positions in these two courses are
  // #    deliberately empty — a bank question not written up yet, a
  // #    card taken out with its seat kept. The reader's ink is keyed
  // #    by that number, and so is the box they tick; renumber on the
  // #    filled ones alone and their ink moves to another card
  // ============================================================
  const KINDS = ['law', 'card'];

  const shapeOne = s => ({
    group: typeof s.group === 'string' ? s.group : 'rules1',
    at: Math.max(0, Math.trunc(Number(s.at)) || 0),
    kind: KINDS.includes(s.kind) ? s.kind : 'card',
    html: clean(s.html),
    tb: typeof s.tb === 'string' ? s.tb : '',
    calc: s.calc === true,
    at_: undefined,
    updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : null,
    deleted: s.deleted === true
  });

  // The name each stack of sheets goes by on the strip — "Annuities",
  // "Mixed Streams". It belongs to the chapter and not to any one sheet
  const shapeLabels = given => {
    const out = {};
    Object.keys(given && typeof given === 'object' ? given : {}).forEach(k => {
      if (/^[\w-]{1,24}$/.test(k) && typeof given[k] === 'string') out[k] = given[k].slice(0, 80);
    });
    return out;
  };

  const shapeDoc = doc => {
    const sheets = {};
    const given = doc && typeof doc.sheets === 'object' && doc.sheets ? doc.sheets : {};
    Object.keys(given).forEach(id => {
      if (typeof id !== 'string' || !given[id] || typeof given[id] !== 'object') return;
      const one = shapeOne(given[id]);
      delete one.at_;
      sheets[id] = one;
    });
    return { app: 'MyTerm', kind: 'sheets', chapter: doc?.chapter ?? null,
             labels: shapeLabels(doc?.labels), sheets };
  };

  // The key is the group and the place inside it, because together they
  // ARE the sheet: that is what the reader's ink and tick are keyed by
  const keyOf = (group, at) => String(group) + ':' + Math.max(0, Math.trunc(Number(at)) || 0);

  const merge = (mine, theirs) => {
    const out = { ...mine.sheets };
    Object.entries(theirs.sheets).forEach(([id, one]) => {
      const here = out[id];
      if (!here || !here.updatedAt || (one.updatedAt && one.updatedAt > here.updatedAt)) out[id] = one;
    });
    return { ...mine, sheets: out, labels: { ...mine.labels, ...theirs.labels } };
  };

  let open = null, timer = null, dirty = false, coming = null;

  const later = () => { clearTimeout(timer); timer = setTimeout(push, QUIET); };

  const push = async () => {
    if (!open || !dirty) return;
    dirty = false;
    try {
      if (!open.fileId) {
        open.fileId = await cloud().createJson(open.chapter.folderId, 'sheets.json', open.doc);
        open.chapter.sheetsId = open.fileId;
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
  // # ⏬ 💤  FETCHED WHEN A RULES PART IS FIRST OPENED
  // # 🔤 JavaScript
  // # 🎯 Reads the chapter's sheets once, when one of them is wanted
  // # 🔗 ONE PROMISE AND NOT ONE ANSWER, for the reason the explanations
  // #    keep one: two presses in a second would otherwise start two
  // #    downloads of the same four hundred kilobytes.
  // #
  // #    A chapter with no file is not a failure — it is a chapter with
  // #    no laws in it. It answers empty and makes nothing
  // ============================================================
  const ready = async (courseId, chapter) => {
    if (open && open.chapter.id === chapter.id) return coming;
    clearTimeout(timer);
    await push();
    open = { courseId, chapter, fileId: chapter.sheetsId || null,
             doc: { app: 'MyTerm', kind: 'sheets', chapter: chapter.id, labels: {}, sheets: {} } };
    dirty = false;

    coming = (async () => {
      let id = open.fileId;
      // The id beside the chapter is a GUESS about Drive: a file can be
      // trashed, and a field the paper does not keep is lost on a read.
      // So before making anything, LOOK
      let doc = id ? await cloud().readFile(id).catch(() => null) : null;
      if (!doc && chapter.folderId) {
        id = await cloud().findChild(chapter.folderId, 'sheets.json').catch(() => null);
        doc = id ? await cloud().readFile(id).catch(() => null) : null;
      }
      if (doc) { open.fileId = id; open.doc = shapeDoc(doc); open.chapter.sheetsId = id; }

      // ============================================================
      // AND THE CHAPTER IS TOLD HOW BIG ITS STACKS ARE
      // A rules part has no rows, so it reported a size of zero and
      // every drawn page in the two numerical courses was worth no
      // minutes at all. Only this file knows the answer, and only once
      // it has been read -- so the moment it is read, the chapter is
      // told, and it keeps the number in its own file afterwards.
      // FILLED CARDS ONLY: a law sheet is the page you work from
      // ============================================================
      const cards = {};
      Object.values(open.doc.sheets).forEach(s => {
        if (s.deleted || s.kind !== 'card' || !s.html) return;
        cards[s.group] = (cards[s.group] || 0) + 1;
      });
      if (window.MyTermChapterStore?.openId?.() === open.chapter.id) {
        window.MyTermChapterStore.sizeRules(cards);
      }
      return open.doc;
    })();
    return coming;
  };

  window.MyTermSheetStore = {
    ready,
    openId: () => open?.chapter?.id ?? null,

    // What the gate would make of a piece of markup, without writing it
    // anywhere. The guard measures with this, and so can anything else
    gate: clean,

    labels: () => ({ ...(open?.doc.labels || {}) }),
    nameGroup: (group, name) => {
      if (!open || !/^[\w-]{1,24}$/.test(String(group))) return false;
      open.doc.labels[group] = String(name || '').slice(0, 80);
      dirty = true; later();
      return true;
    },

    // Every sheet of one stack, IN ITS PLACES — the empty seats are not
    // filled in and not skipped over; they simply are not there, and
    // the number each sheet carries says where it sits
    of: group => Object.values(open?.doc.sheets || {})
      .filter(s => !s.deleted && s.group === group)
      .sort((a, b) => a.at - b.at)
      .map(s => ({ ...s })),

    one: (group, at) => {
      const s = open?.doc.sheets[keyOf(group, at)];
      return s && !s.deleted ? { ...s } : null;
    },

    groups: () => [...new Set(Object.values(open?.doc.sheets || {})
      .filter(s => !s.deleted).map(s => s.group))].sort(),

    put: (group, at, what) => {
      if (!open || !what) return false;
      const key = keyOf(group, at);
      open.doc.sheets[key] = shapeOne({ ...what, group, at, updatedAt: now() });
      delete open.doc.sheets[key].at_;
      dirty = true; later();
      return true;
    },

    drop: (group, at) => {
      const key = keyOf(group, at);
      if (!open || !open.doc.sheets[key]) return false;
      // Crossed out, never torn out: the seat keeps its number
      open.doc.sheets[key] = { ...open.doc.sheets[key], html: '', updatedAt: now(), deleted: true };
      dirty = true; later();
      return true;
    },

    // ============================================================
    // WHAT IS COUNTED IS THE FILLED CARDS, AND NOTHING ELSE
    //
    // A law sheet is reference — there is nothing on it to tick. An
    // empty seat is not a piece of work. Counted raw, a stack of
    // fourteen cards reported thirty-three, which doubled the time the
    // chapter claimed and spoiled "done of all". The reader found it,
    // not the guard
    // ============================================================
    counts: () => {
      const living = Object.values(open?.doc.sheets || {}).filter(s => !s.deleted && s.html);
      const cards = living.filter(s => s.kind === 'card');
      return { sheets: living.length, laws: living.length - cards.length,
               cards: cards.length, minutes: cards.length * 20 };
    },

    refresh: async () => {
      if (!open?.fileId) return;
      const theirs = await cloud().readFile(open.fileId).catch(() => null);
      if (!theirs) return;
      open.doc = dirty ? merge(open.doc, shapeDoc(theirs)) : shapeDoc(theirs);
    },

    shut: async () => { clearTimeout(timer); await push(); open = null; coming = null; }
  };
})();
