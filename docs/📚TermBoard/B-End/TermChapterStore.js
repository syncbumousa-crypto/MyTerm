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
  // ============================================================
  // EVERY COLOUR THE BAR OFFERS MUST BE NAMED HERE
  //
  // This list is the gate the words pass through on their way INTO the
  // file, and a class not on it is quietly unwrapped — the words kept,
  // the colour gone. So a colour added to the bar and not added here is
  // a colour that works perfectly on screen and is lost the moment the
  // row is saved, with nothing anywhere saying why. It happened: the
  // five grounds and five inks were given to the bar while this list
  // still named four classes, and every one of the new seven was thrown
  // away on the way out.
  //
  // `bx` is kept though no button offers it any more: summaries already
  // written carry it, and this gate decides what SURVIVES, not what can
  // still be made
  // ============================================================
  const MARKS = new Set(['hl', 'hlg', 'hlb', 'hlp', 'hlo',
                         'pa', 'pb', 'tcb', 'tco', 'tcp', 'bx']);
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

      // A picture is let through only while a note is being cleaned, and
      // only ever as the name of a file in the reader's own Drive
      if (node.tagName === 'IMG') {
        const file = node.getAttribute('data-file');
        if (!keepPictures || !file || !/^[\w-]{6,80}$/.test(file)) return;
        const made = doc.createElement('img');
        made.setAttribute('data-file', file);
        // How wide the reader drew it, as a share of the note. A number
        // and nothing else: anything else is not a size
        const wide = Number(node.getAttribute('data-w'));
        if (Number.isInteger(wide) && wide >= 10 && wide < 100) made.setAttribute('data-w', String(wide));
        into.append(made);
        return;
      }

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

  // ============================================================
  // # 🖼️ 🗒️  A NOTE MAY HOLD PICTURES; A CELL MAY NOT
  // # 🔤 JavaScript
  // # 🎯 The same gate as a cell's, with one thing more let through: a
  // #    picture, named by its file in Drive and by nothing else
  // # 🔗 NO `src` SURVIVES. A pasted picture arrives either as letters
  // #    (a quarter of a megabyte on a file read whole on every open)
  // #    or as an address on somebody else's server (fetched every time
  // #    the note is opened, and gone the day that server is). Neither
  // #    is kept. The picture goes up to Drive and what is written here
  // #    is its NAME there — so the file stays the size of writing, and
  // #    the picture is the reader's own, in their own Drive
  // ============================================================
  let keepPictures = false;

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

  const cleanNote = html => {
    keepPictures = true;
    try { return clean(html); } finally { keepPictures = false; }
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
  const WORDS = new Set(['term', 'termAr', 'text', 'textAr', 'ask']);

  // ============================================================
  // # ⚓ 📄  A PLACE IN A BOOK IS A PHRASE, NOT A RECTANGLE
  // # 🔤 JavaScript
  // # 🎯 The shape of one link from a row to a spot in a source, and
  // #    what makes one fit to keep
  // # 🔗 THE ANCHOR IS THE WORDS THEMSELVES. A rectangle of x and y is
  // #    wrong the moment the page is drawn at another width, wrong
  // #    again on a screen of another density, and wrong for good the
  // #    day the file is replaced by a better scan — which is a thing
  // #    that happens. A phrase is found again in the new file with no
  // #    work at all, and it can be read by a person: "consists of all
  // #    the hardware and software" says where it points; {x:31.9,
  // #    y:40.2} says nothing to anybody.
  // #
  // #    AND FEWER THAN FIVE WORDS IS REFUSED. A short phrase matches
  // #    by accident somewhere else on the page, and a jump to the
  // #    wrong place is worse than no jump: the reader believes it
  // ============================================================
  const WHATS = ['term', 'text', 'ask'];
  const LEAST_WORDS = 5;

  // Plain words, never markup. An anchor is matched against the text
  // the PDF reader gets out of the page, and that text has no tags in it
  const plainWords = s => String(s == null ? '' : s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const longEnough = anchor => plainWords(anchor).split(' ').filter(Boolean).length >= LEAST_WORDS;

  const shapeLinks = list => Array.isArray(list)
    ? list.filter(l => l && typeof l === 'object' && typeof l.src === 'string').map(l => ({
        id: typeof l.id === 'string' ? l.id : 'k-' + Math.random().toString(36).slice(2, 8),
        src: l.src,
        page: Math.max(1, Math.trunc(Number(l.page)) || 1),
        anchor: plainWords(l.anchor),
        what: WHATS.includes(l.what) ? l.what : 'term',
        at: typeof l.at === 'string' ? l.at : null,
        deleted: l.deleted === true
      }))
    : [];

  // ============================================================
  // # 🎯 🔗  A QUESTION AND WHAT IT IS ABOUT
  // # 🔤 JavaScript
  // # 🎯 The rows of this chapter that a bank question tests
  // # 🔗 KEPT ON THE QUESTION AND NOT ON THE ROW, because that is the
  // #    direction the knowledge runs: whoever writes a question knows
  // #    what it is testing, and nobody looking at a term can say which
  // #    of a hundred questions will reach for it. The other direction
  // #    is worked out by reading, which is what a computer is for.
  // #
  // #    One place for the fact, and a second place would be two lists
  // #    to keep in step — and they would part on the first question
  // #    written on the other device
  // ============================================================
  const shapeAbout = list => Array.isArray(list)
    ? list.filter(a => a && typeof a === 'object' && typeof a.row === 'string').map(a => ({
        id: typeof a.id === 'string' ? a.id : 'a-' + Math.random().toString(36).slice(2, 8),
        row: a.row,
        at: typeof a.at === 'string' ? a.at : null,
        deleted: a.deleted === true
      }))
    : [];

  const TINTS = ['yellow', 'green', 'blue'];

  const shapeRows = list => settleOrder(Array.isArray(list)
    ? list.filter(r => r && typeof r === 'object').map(r => ({
        id: typeof r.id === 'string' ? r.id : newRowId(),
        no: typeof r.no === 'string' ? r.no : '',
        term: clean(r.term),
        text: clean(r.text),
        termAr: clean(r.termAr),
        textAr: clean(r.textAr),
        // Whether this term is asked of you at all. A term outside the
        // syllabus is a fact about the COURSE, not about this reader —
        // it is as true on the phone as on the laptop — so it lives in
        // the chapter's own file beside the words, not with the ticks
        outside: r.outside === true,
        // A colour the reader laid on the term to find it again. Belongs
        // to the course file for the same reason the stripe does: it is
        // the same summary on the phone and on the laptop
        tint: TINTS.includes(r.tint) ? r.tint : '',
        // A ROW IN A TEST BANK IS STILL A ROW. It carries a question, a
        // list of answers to choose from, and which of them is right —
        // three more fields on the same shape, empty on every other
        // row. One shape means moving, swapping, removing, the two
        // clocks and the merge all work on questions without a line of
        // their own, and a bank can be turned into a list or back
        // without anything being converted
        ask: clean(r.ask),
        pick: Array.isArray(r.pick) ? r.pick.map(clean) : [],
        // ============================================================
        // THE READER'S OWN NOTE ON THIS ROW
        //
        // Their writing and not the course's: a reminder, a worked
        // example, a picture of a page. It travels with the row because
        // it is ABOUT the row — moved with it, removed with it, merged
        // with it, and carried to the phone like everything else here.
        //
        // Pictures pasted into it are NOT kept in this file. A single
        // screen shot written in as letters is a quarter of a megabyte
        // on a file that is read whole on every open; the picture goes
        // to Drive and the note keeps its name. So this field stays the
        // size of writing, however many pictures are in it
        // ============================================================
        note: cleanNote(r.note),
        noteDir: r.noteDir === 'rtl' || r.noteDir === 'ltr' ? r.noteDir : '',
        // MINUS ONE MEANS NOTHING IS MARKED, and that is why it is not
        // simply zero. Zero is a real answer — the first one — so a
        // question whose right answer was never chosen, or was chosen
        // and then deleted, would quietly stand there calling its first
        // choice the truth, and mark the reader wrong for the rest
        right: Number.isFinite(Number(r.right)) ? Math.max(-1, Math.trunc(Number(r.right))) : -1,
        // Where this row is in the books of its course. A list and not a
        // pair of fields: one term can have its name in one place and
        // its meaning in another, and a question can be answered in two
        srcs: shapeLinks(r.srcs),
        // Which rows of this chapter a question is ABOUT. A bank
        // question is not a source and has no page: it is another row,
        // and what joins them is that answering one proves you know the
        // other. So it is its own list and not a link into a file
        about: shapeAbout(r.about),
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

  // HOW LONG A PART TAKES IS A RULE, NOT A NUMBER. The reader says what
  // one row costs them, or what one page costs them, and the minutes
  // are worked out from that and from what is actually in the part. A
  // number typed once would be a number that stopped being true the
  // next time a row was added — and the whole point of asking is to
  // know how much is left
  // A bank is paced by the QUESTION. It is not a third way of measuring
  // the same thing: a row and a page are two cuts of something read end
  // to end, and a bank is neither read nor paged
  const PACES = ['row', 'page', 'ask'];

  // A part is read and a bank is answered. It is the one field that
  // decides which of the two is drawn under the strip, and it is on the
  // SECTION and not on the rows — because a bank is a bank whether it
  // has three questions in it or none, and a part with no rows is still
  // a part waiting to be written
  // ============================================================
  // A THIRD KIND: A STACK OF SHEETS
  //
  // A part is read and a bank is answered — and a RULES part is
  // neither. It holds drawn pages: a law in its box, a practice card
  // with its folded solution. They are not rows and they are not in
  // this file at all; they live in the chapter's fourth file, and the
  // section here only says which stack of them it shows (`group`).
  //
  // Paced by the card and not by the row: one problem is a sitting of
  // work whatever its length, the same reason a bank is paced by the
  // question
  // ============================================================
  const KINDS = ['part', 'tb', 'rules'];

  const shapeSections = list => Array.isArray(list)
    ? list.filter(s => s && typeof s === 'object').map(s => ({
        id: typeof s.id === 'string' ? s.id : 'terms',
        name: typeof s.name === 'string' ? s.name : 'Terms',
        kind: KINDS.includes(s.kind) ? s.kind : 'part',
        // Which stack of sheets this part shows. Empty for every other
        // kind, and NAMED HERE or it is dropped on the next read —
        // and a rules part that forgets its stack shows nothing at all
        group: typeof s.group === 'string' ? s.group : '',
        per: PACES.includes(s.per) ? s.per : 'row',
        each: Math.max(0, Number(s.each) || 0),
        // ============================================================
        // HOW MANY THINGS ARE IN A PART THAT HAS NO ROWS
        // A rules part's units are its practice cards, and those live in
        // a file of their own — so the part itself reported a size of
        // ZERO, and `rows * each` made every drawn page in ACCT210 and
        // FIN250 worth nothing at all. Their own board puts chapter 14
        // at 1325 minutes; this one said 225, and no card the reader
        // ticked could move the bar by a minute. Counted once when the
        // sheets are first read, and kept here afterwards so a chapter
        // nobody has opened still knows its own size
        // ============================================================
        units: Math.max(0, Math.trunc(Number(s.units)) || 0),
        // A PART IS CROSSED OUT, NOT TORN OUT, for the same reason a row
        // is. The merge pushes back any section the other device still
        // has and this one does not — so a part really taken out of the
        // file would walk back in, with everything in it, at the next
        // ring of the bell. And its own clock, so the later of the two
        // devices decides its name, its pace and whether it is gone
        deleted: s.deleted === true,
        updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : null,
        rows: shapeRows(s.rows)
      }))
    : [{ id: 'terms', name: 'Terms', kind: 'part', per: 'row', each: 0,
         deleted: false, updatedAt: null, rows: [] }];

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
        out[id] = { on: m.on === true, at: typeof m.at === 'string' ? m.at : null,
                    was: m.was === 'ok' || m.was === 'no' ? m.was : null,
                    when: typeof m.when === 'string' ? m.when : null };
      });
    }
    return out;
  };

  // ============================================================
  // # 🪧 📈  HOW MUCH OF THIS CHAPTER WAS ALREADY COUNTED
  // # 🔤 JavaScript
  // # 🎯 The number of finished items in each part, as of the last time
  // #    the day's record was written
  // # 🔗 IT LIVES WITH THE MARKS IT DESCRIBES, in the same small file
  // #    and written in the same write. Kept anywhere else it would
  // #    drift from them: a chapter copied without it would credit its
  // #    whole history to one day, and a chapter deleted would leave it
  // #    behind.
  // #
  // #    AND null IS NOT THE SAME AS EMPTY. null means this chapter has
  // #    never been counted, so whatever is already ticked is the
  // #    BASELINE and is credited to no day at all -- otherwise every
  // #    item the reader ever finished lands on the day this shipped,
  // #    as one impossible afternoon. An empty object means it has been
  // #    counted and nothing was ticked, and the next tick does count.
  // #    Their own engine learned this the hard way; it is carried
  // ============================================================
  const shapeSeen = given => {
    if (!given || typeof given !== 'object') return null;
    const out = {};
    Object.keys(given).forEach(id => {
      if (typeof id === 'string' && id.length <= 40) out[id] = Math.max(0, Math.trunc(Number(given[id])) || 0);
    });
    return out;
  };

  // ============================================================
  // # 🙈 💾  WHICH CELLS ARE COVERED, KEPT
  // # 🔤 JavaScript
  // # 🎯 The reader's covers, by row and column, each with its own clock
  // # 🔗 KEPT, AND KEPT HERE, at the reader's own asking: a sheet
  // #    half-covered for a test is to be found that way again after a
  // #    reload and on the other device. It is a thing about the reader
  // #    and not the course, so it goes with the ticks and not in the
  // #    words. A cover taken off is kept as off, with its time, so the
  // #    other device's older "on" cannot bring it back on the merge
  // ============================================================
  const shapeCovers = given => {
    const out = {};
    if (given && typeof given === 'object') {
      Object.keys(given).forEach(key => {
        const c = given[key];
        if (!c || typeof c !== 'object' || !/^[^:]{1,60}:(term|text)$/.test(key)) return;
        out[key] = { on: c.on === true, at: typeof c.at === 'string' ? c.at : null };
      });
    }
    return out;
  };

  const shapeState = doc => ({ app: 'MyTerm', marks: shapeMarks(doc?.marks),
                               covers: shapeCovers(doc?.covers),
                               seen: shapeSeen(doc?.seen), updatedAt: doc?.updatedAt ?? null });

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

  // ============================================================
  // # 🔗 📖  WHERE A ROW IS IN THE BOOK
  // # 🔤 JavaScript
  // # 🎯 Folds two devices' lists of places into one, by the id of each
  // #    place and its own stamp
  // # 🔗 A PLACE REMOVED IS CROSSED OUT, NEVER LIFTED OUT — the rule
  // #    this whole file is built on. Lifted out, it is a place the
  // #    other device still has, so the next merge puts it back and the
  // #    reader removes it twice, three times, for ever
  // ============================================================
  const foldLinks = (mine, theirs) => {
    const byId = new Map((mine || []).map(l => [l.id, l]));
    (theirs || []).forEach(t => {
      const m = byId.get(t.id);
      if (!m) { byId.set(t.id, t); return; }
      const newer = t.at && (!m.at || t.at > m.at);
      byId.set(t.id, { ...(newer ? t : m), deleted: m.deleted || t.deleted });
    });
    return [...byId.values()];
  };

  const foldRow = (mine, theirs) => {
    const w = pickWords(mine, theirs), p = pickPlace(mine, theirs);
    return {
      id: mine.id,
      no: w.no, updatedAt: w.updatedAt,
      // All four words move together, by the one clock. Taking each
      // language by its own clock would let a device that only ever
      // reads English drag the Arabic back with it
      term: w.term, text: w.text, termAr: w.termAr, textAr: w.textAr,
      outside: w.outside, tint: w.tint, ask: w.ask, pick: w.pick, right: w.right,
      cid: p.cid, order: p.order, lead: p.lead, movedAt: p.movedAt,
      // EACH LINK BY ITS OWN CLOCK, not by the row's. A reader who adds
      // one place in the book on the laptop and another on the phone
      // must end with two: taken as one field under the words' clock,
      // whichever device typed last would erase the other's work
      srcs: foldLinks(mine.srcs, theirs.srcs),
      about: foldLinks(mine.about, theirs.about),
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

  // ============================================================
  // # ⚖️ 🧮  WHAT A FINISHED ITEM IS WORTH
  // # 🔤 JavaScript
  // # 🎯 Minutes for one ticked item of a part
  // # 🔗 IT IS `each` -- THE PRICE THE BOARD ALREADY CHARGES. The strip
  // #    under every chapter is drawn from `rows * each`, and the hours
  // #    a course is said to be worth come from the same number. A
  // #    second weight of my own beside it would be two measurements of
  // #    one fact, and they had already drifted: the board prices a
  // #    MIS250 term at a minute and a half and my own default said
  // #    two, so the bar and the day would have disagreed about the
  // #    same tick, forever, with neither of them wrong on its face.
  // #
  // #    It matters more than tidiness here: "you'll finish in N days"
  // #    divides the work LEFT by what a day is worth. Measure those
  // #    two in different currencies and the sentence means nothing.
  // #
  // #    A part priced by the PAGE is the exception -- a row has no
  // #    price of its own there -- and one never priced falls back to
  // #    what its kind is worth in the reader's own engine
  // ============================================================
  const rateOf = s => {
    if (!s) return 0;
    if (s.per !== 'page' && Number(s.each) > 0) return Number(s.each);
    if (s.kind === 'tb') return 0.5;
    if (s.kind === 'rules') return 20;
    return /^\s*question/i.test(s.name || '') ? 1.5 : 2;
  };

  // How many things are finished in one part right now. A rules part is
  // counted by its TICKS and not by its sheets: a law sheet is the page
  // you work from and carries no tick at all, and an empty seat is not a
  // card. Counting the sheets instead once turned fourteen cards into
  // thirty-three and doubled the hours a chapter claimed
  const doneIn = s => {
    if (!open) return 0;
    if (s.kind === 'rules') {
      const head = 's-' + (s.group || ' ') + ':';
      return Object.keys(open.state.marks)
        .filter(k => k.indexOf(head) === 0 && open.state.marks[k]?.on === true).length;
    }
    return s.rows.filter(r => !r.deleted && open.state.marks[r.id]?.on === true).length;
  };

  // How many things a part holds: its rows, or — for a part whose work
  // is drawn pages rather than rows — the number of cards it was told
  // it has. Never the sheets: a law sheet carries no tick
  const unitsOf = s => (s.kind === 'rules'
    ? Math.max(0, Number(s.units) || 0)
    : s.rows.filter(r => !r.deleted).length);

  // ============================================================
  // # 📔 ➕  THE DAY'S RECORD, SETTLED BEFORE THE STATE IS WRITTEN
  // # 🔤 JavaScript
  // # 🎯 Works out what was finished since the last count and hands it
  // #    to the record of the days
  // # 🔗 THE NEW MARK GOES OUT IN THE SAME WRITE AS THE TICKS IT
  // #    DESCRIBES. Written a moment apart, a failure between the two
  // #    would leave Drive holding ticks that were never counted, or a
  // #    count of ticks that are not there -- and the next open would
  // #    credit the same afternoon twice.
  // #
  // #    The difference is SIGNED. A reader who takes a tick back gets
  // #    its minutes taken back, or ticking and unticking would be a
  // #    way to inflate a day without doing anything
  // ============================================================
  const weighToday = () => {
    if (!open) return null;
    const fresh = {};
    livingSections().forEach(s => { fresh[s.id] = doneIn(s); });

    const seen = open.state.seen;
    if (!seen) return { fresh, credits: [], baseline: true };

    const credits = [];
    livingSections().forEach(s => {
      const d = fresh[s.id] - Math.max(0, Number(seen[s.id]) || 0);
      if (!d) return;
      credits.push({ c: open.course.id, h: open.chapter.id, s: s.id,
                     n: d, m: Math.round(d * rateOf(s) * 100) / 100 });
    });
    return { fresh, credits, baseline: false };
  };

  async function push() {
    if (sending || !open || (!contentDirty && !stateDirty)) return;
    sending = true;
    dirty = false;
    const wantedContent = contentDirty, wantedState = stateDirty;
    contentDirty = stateDirty = false;
    tellStatus('saving');

    // Weighed before anything is written, because the new high-water
    // mark has to travel in the same write as the ticks it counts
    const weighed = weighToday();
    const wasSeen = open.state.seen;
    const mustState = Boolean(weighed && (weighed.baseline || weighed.credits.length));
    if (weighed) open.state.seen = weighed.fresh;

    try {
      if (wantedContent && open.chapter.contentId) {
        open.content.version = (Number(open.content.version) || 1) + 1;
        await cloud().writeFile(open.chapter.contentId, open.content);
        open.chapter.contentVersion = open.content.version;
        cacheWrite(open.chapter.id, open.content);
      }

      if ((wantedState || mustState) && open.chapter.stateId) {
        open.state.updatedAt = now();
        await cloud().writeFile(open.chapter.stateId, open.state);
      }

      // AND ONLY NOW. The mark is safely in Drive, so the same work
      // cannot be counted a second time if this next part fails; the
      // record of the days keeps its own unsent flag and tries again.
      // Of the two ways to be wrong, a day missing minutes it earned is
      // a smaller lie than a day claiming minutes nobody worked
      if (weighed && weighed.credits.length) {
        const days = window.MyTermDaysStore;
        if (days) {
          await days.ready().catch(() => {});
          weighed.credits.forEach(one => days.add(one));
        }
      }

      // How many rows this chapter has and how many are learnt, written
      // BESIDE the chapter in the course paper. The paper is read on
      // every open anyway, so every chapter's tab can show how far it
      // has got — including the ones nobody has opened on this device.
      // Without it the only honest bar would be the open chapter's, and
      // a strip of tabs where one says something and the rest say
      // nothing is a strip that looks broken
      const tally = window.MyTermChapterStore.counts();
      open.chapter.rows = tally.rows;
      open.chapter.learnt = tally.learnt;
      open.chapter.good = tally.good;
      open.chapter.bad = tally.bad;

      // ============================================================
      // THE HOURS ARE WRITTEN HERE, WHERE THE TICKS ARE
      //
      // They were worked out only by the course screen, and only for
      // the chapter it had open — so every chapter the reader had not
      // opened on that screen kept a `doneMinutes` of zero while its
      // `learnt` said ninety-five. The board then drew a full bar's
      // worth of work as an empty bar, and the two numbers sat on the
      // same card disagreeing with each other.
      //
      // Measured with the same price the day's record is credited at,
      // so the strip, the hours and the average can never drift apart
      // ============================================================
      let all = 0, did = 0;
      livingSections().forEach(s => {
        const rate = rateOf(s);
        all += unitsOf(s) * rate;
        did += doneIn(s) * rate;
      });
      open.chapter.minutes = all;
      open.chapter.doneMinutes = Math.min(all, did);
      window.MyTermBoardStore?.touchCourse?.(open.course.id);
      window.MyTermBoardStore?.change?.(board);

      tellStatus('saved');
      window.MyTermBell?.ring(Date.now());
    } catch {
      contentDirty = contentDirty || wantedContent;
      stateDirty = stateDirty || wantedState;
      // The high-water mark goes back to what Drive still holds. Left
      // where it was moved to, the work it stands for would never be
      // counted: the next try would see no difference and credit
      // nothing, and an afternoon would vanish because a write failed
      open.state.seen = wasSeen;
      if (mustState) stateDirty = true;
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

  const moveRowTo = (rowId, to) => {
    if (!open) return false;
    const rows = livingRows();
    const from = indexOf(rows, rowId);
    if (from < 0 || to < 0 || to >= rows.length || to === from) return false;

    const before = snapshot(rows);
    const cids = rows.map(r => r.cid);
    rows.splice(to, 0, rows.splice(from, 1)[0]);
    rows.forEach((r, i) => { r.cid = cids[i]; });
    keepLeads(rows);
    placed(rows, before);
    return true;
  };

  const swapRowWith = (rowId, other) => {
    if (!open) return false;
    const rows = livingRows();
    const here = indexOf(rows, rowId);
    if (here < 0 || other < 0 || other >= rows.length || other === here) return false;

    const before = snapshot(rows);
    const a = rows[here], b = rows[other];
    rows[here] = b;
    rows[other] = a;
    // And the two trade their table numbers straight back, because a cid
    // is the table a POSITION is in and not a thing a row carries about
    const kept = a.cid;
    a.cid = b.cid;
    b.cid = kept;
    keepLeads(rows);
    placed(rows, before);
    return true;
  };

  // ============================================================
  // # 🗂️ 📑  THE PARTS OF A CHAPTER
  // # 🔤 JavaScript
  // # 🎯 A chapter holds more than one list — its terms, and whatever
  // #    else is written for it — and one of them is on the paper
  // # 🔗 The shape has carried sections since the day it was written;
  // #    only the first was ever drawn. Nothing about the file changes
  // #    here, and every chapter written before today opens with its one
  // #    section exactly as it was.
  // #
  // #    WHICH section is open is not kept in the file. It is a thing
  // #    about this reader at this moment, like which chapter is open,
  // #    and writing it to Drive would mean the laptop reaching over to
  // #    change what the phone is looking at
  // ============================================================
  let chosen = null;

  // Words, not markup. A cell holding nothing but an empty mark left by
  // a highlight that was taken off again is a cell with nothing in it,
  // and counting it as written would make a part look finished because
  // somebody had once dragged over it
  const hasWords = html => /[^\s]/.test(String(html || '').replace(/<[^>]*>/g, ''));

  const livingSections = () => (open?.content.sections || []).filter(s => !s.deleted);

  const sectionOf = () => {
    const all = livingSections();
    if (!all.length) return null;
    return all.find(s => s.id === chosen) || all[0];
  };

  // Sorted every time, never trusted to the order of the array in the
  // file. The position is the order field and nothing else: a move
  // rewrites those numbers and leaves the array where it was, and a
  // reader who had been handed the array would have seen the move undo
  // itself on the next draw
  const livingRows = () => (sectionOf()?.rows || []).filter(r => !r.deleted).sort((a, b) => a.order - b.order);
  const indexOf = (rows, rowId) => rows.findIndex(r => r.id === rowId);

  // ============================================================
  // # 🟩 🟥  WHAT THE BANK SAYS ABOUT EACH ROW
  // # 🔤 JavaScript
  // # 🎯 One word per row — 'ok', 'no', or nothing: whether the bank has
  // #    asked you about it and how you did
  // # 🔗 A TICK IS YOUR OWN OPINION OF YOURSELF; THIS IS NOT. A row is
  // #    ticked by the reader and nobody checks it, so a strip made of
  // #    ticks alone says exactly what the reader believes and nothing
  // #    about whether it is true. The bank is the other half: it asked,
  // #    and the answer was right or it was wrong.
  // #
  // #    AND WRONG OUTRANKS RIGHT. Two questions on one term, one missed
  // #    and one got, is a term you do not have yet — reading it the
  // #    other way would let a term be painted green by its easy
  // #    question while its hard one is still being failed.
  // #
  // #    The answer is carried from the question to every row it is
  // #    about, because that is where the reader looks: nobody opens a
  // #    bank to ask how the bank is going
  // ============================================================
  const bankSaid = () => {
    const said = new Map();
    const say = (id, was) => { if (said.get(id) !== 'no') said.set(id, was); };
    (open?.content.sections || []).forEach(section => {
      if (section.kind !== 'tb' || section.deleted) return;
      section.rows.forEach(q => {
        if (q.deleted) return;
        const was = open.state.marks[q.id]?.was;
        if (was !== 'ok' && was !== 'no') return;
        say(q.id, was);
        q.about.forEach(a => { if (!a.deleted) say(a.row, was); });
      });
    });
    return said;
  };

  window.MyTermChapterStore = {
    watch: fn => { tellStatus = fn || (() => {}); },

    hold: on => { penHeld = on !== false; },

    openId: () => open?.chapter?.id ?? null,

    // Returns null when something could not be read — never an empty
    // chapter. Empty is a fact about the reader; failure is our fault,
    // and a page that cannot tell them apart will offer to start again
    // over work that is sitting safely in Drive
    open: async (wholeBoard, course, chapter) => {
      // ============================================================
      // WHAT IS NOT YET WRITTEN DOWN IS WRITTEN DOWN FIRST
      //
      // Everything typed here is saved a moment after the typing stops.
      // Opening another chapter used to clear the two marks that say
      // "this has not been saved" and walk away — so a tick, a word, a
      // place, anything done in the second before the reader pressed
      // the next chapter's tab was gone, with nothing anywhere saying
      // so. It cost twenty links while this was being built, and those
      // could be made again; a reader's sentence cannot.
      //
      // The wait is the length of one small write, and only when there
      // is something to write
      // ============================================================
      await push().catch(() => {});

      board = wholeBoard;
      open = null;
      chosen = null;
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

      // ============================================================
      // THE BASELINE IS TAKEN WHEN THE CHAPTER IS OPENED, NOT AT THE
      // FIRST TICK
      //
      // A chapter this engine has never counted has a whole history of
      // ticks in it, and none of them happened today. So what is ticked
      // the moment it opens is the line to measure from.
      //
      // Taken later — at the first push, which is caused by the first
      // tick — that tick is INSIDE the baseline and is silently never
      // counted. One swallowed item per chapter, and the only sign is a
      // day quietly worth two minutes less than it was. The guard found
      // it on the first run; their own engine takes it on load too
      // ============================================================
      if (!open.state.seen) {
        const seen = {};
        livingSections().forEach(s => { seen[s.id] = doneIn(s); });
        open.state.seen = seen;
        stateDirty = true;
        later();
      }

      // ============================================================
      // THE SUMMARY BESIDE THE CHAPTER IS BROUGHT UP TO DATE ON OPEN
      //
      // The strip over the page reads the OPEN chapter from its rows and
      // every other chapter from the tally written beside it — and that
      // tally is only as fresh as the last time the chapter was saved.
      // So a chapter could stand at full while you were in it and at a
      // third the moment you left, with both numbers honestly reported
      // and one of them years out of date. The reader saw exactly that:
      // "the one I was just in went from full to half".
      //
      // Reading the chapter is the one moment its real numbers are in
      // hand for nothing, so that is when they are written down
      // ============================================================
      const fresh = window.MyTermChapterStore.counts();
      const ch = open.chapter;
      if (ch.rows !== fresh.rows || ch.learnt !== fresh.learnt
          || ch.good !== fresh.good || ch.bad !== fresh.bad) {
        ch.rows = fresh.rows; ch.learnt = fresh.learnt;
        ch.good = fresh.good; ch.bad = fresh.bad;
        window.MyTermBoardStore?.touchCourse?.(course.id);
        window.MyTermBoardStore?.change?.(board);
      }
      return open;
    },

    content: () => open?.content ?? null,
    state: () => open?.state ?? null,

    // The rows as they stand: alive, in order, and the same objects the
    // file holds — the screen draws from these and must not copy them
    rows: () => livingRows(),

    isOn: rowId => open?.state.marks[rowId]?.on === true,

    isCovered: key => open?.state.covers?.[key]?.on === true,

    // Many cells in one write, for covering a whole sheet at once
    cover: (keys, on) => {
      if (!open || !keys || !keys.length) return;
      if (!open.state.covers) open.state.covers = {};
      const at = now();
      let moved = 0;
      keys.forEach(key => {
        if ((open.state.covers[key]?.on === true) === Boolean(on)) return;
        open.state.covers[key] = { on: Boolean(on), at };
        moved++;
      });
      if (!moved) return;
      stateDirty = true;
      tellStatus('waiting');
      later();
    },

    mark: (rowId, on) => {
      if (!open) return;
      // The tick and the last answer live in the same little object, and
      // each of the two writes only its own half. Written whole, ticking
      // a row off would quietly throw away how it went in the last exam
      const was = open.state.marks[rowId] || {};
      open.state.marks[rowId] = { on: Boolean(on), at: now(),
                                  was: was.was ?? null, when: was.when ?? null };
      stateDirty = true;
      tellStatus('waiting');
      later();
    },

    // ============================================================
    // # ✅ 🧩  A WHOLE PART AT ONCE
    // # 🔤 JavaScript
    // # 🎯 Ticks every row of one part, or clears every one of them, and
    // #    says how many actually changed
    // # 🔗 ONE WRITE AND NOT FORTY-FOUR. Marking a row at a time through
    // #    the single-row door would push the save back by its own delay
    // #    on every row, so a part of a hundred would hold the file open
    // #    for as long as the loop ran and send it all in one go at the
    // #    end anyway — with a hundred status changes flickering past on
    // #    the way.
    // #
    // #    The last answer is kept, exactly as the single-row door keeps
    // #    it: ticking a part off must not throw away how its questions
    // #    went in the last exam
    // ============================================================
    markAll: (sectionId, on) => {
      if (!open) return 0;
      const section = open.content.sections.find(s => s.id === sectionId);
      if (!section) return 0;
      let moved = 0;
      section.rows.filter(r => !r.deleted).forEach(row => {
        const was = open.state.marks[row.id] || {};
        if ((was.on === true) === Boolean(on)) return;
        open.state.marks[row.id] = { on: Boolean(on), at: now(),
                                     was: was.was ?? null, when: was.when ?? null };
        moved++;
      });
      if (!moved) return 0;
      stateDirty = true;
      tellStatus('waiting');
      later();
      return moved;
    },

    // Which part of the chapter is on the paper, what parts there are,
    // and the way to start another one. The counts are read from the
    // rows themselves every time: a part that kept its own tally would
    // be a second place for the truth, and the two would part on the
    // first row added anywhere else
    // Three readings per part, and they answer three different questions.
    // WRITTEN is how much of it has been set down — a row with a term
    // and a meaning in it, in either language. LEARNT is how much of it
    // you have ticked off. GOOD and BAD are what the bank says about it,
    // which is the one reading you do not give yourself
    sections: () => {
      const said = bankSaid();
      return livingSections().map(s => {
        const living = s.rows.filter(r => !r.deleted);
        // A rules part counts its CARDS, which are not rows and not
        // here. Reported as rows it had none, so every measurement
        // downstream — its hours, its share of the chapter, the bar on
        // the board — came out zero for the heaviest part of the two
        // numerical courses
        const sheets = s.kind === 'rules';
        return {
          id: s.id, name: s.name, kind: s.kind, group: s.group, per: s.per, each: s.each,
          rows: sheets ? unitsOf(s) : living.length,
          written: sheets ? unitsOf(s)
                 : living.filter(r => hasWords(r.term || r.termAr) && hasWords(r.text || r.textAr)).length,
          learnt: sheets ? doneIn(s)
                : living.filter(r => open.state.marks[r.id]?.on === true).length,
          good: living.filter(r => said.get(r.id) === 'ok').length,
          bad: living.filter(r => said.get(r.id) === 'no').length
        };
      });
    },

    // ============================================================
    // # 📐 📄  TOLD HOW BIG ITS DRAWN PARTS ARE
    // # 🔤 JavaScript
    // # 🎯 Takes the number of practice cards in each stack of sheets
    // #    and keeps it on the part it belongs to
    // # 🔗 The sheets are a file of their own and are read only when one
    // #    is opened, so the chapter cannot count them for itself. It is
    // #    told once and remembers: written into the chapter's own file,
    // #    a part knows its size on every device afterwards, including
    // #    the ones that never open it.
    // #
    // #    FILLED CARDS ONLY — not sheets. A law sheet is the page you
    // #    work from and an empty seat is not a card; counting those
    // #    once turned fourteen cards into thirty-three
    // ============================================================
    sizeRules: counts => {
      if (!open || !counts) return false;
      let moved = false;
      livingSections().forEach(s => {
        if (s.kind !== 'rules' || !s.group) return;
        const n = Math.max(0, Math.trunc(Number(counts[s.group])) || 0);
        if (n === s.units) return;
        s.units = n;
        moved = true;
      });
      if (moved) wrote();
      return moved;
    },

    // The rows of one part, for whoever needs to measure them. Handed
    // out as the living ones in order, the same list the paper draws
    rowsOf: id => {
      const section = (open?.content.sections || []).find(s => s.id === id);
      return section ? section.rows.filter(r => !r.deleted).sort((a, b) => a.order - b.order) : [];
    },

    setPace: (id, per, each) => {
      if (!open) return false;
      const section = open.content.sections.find(s => s.id === id);
      if (!section) return false;
      // A bank is paced BY THE QUESTION and by nothing else. Rows and
      // pages are two ways of measuring something read end to end, and
      // a bank is neither read nor paged — one question is one sitting
      // of work whatever its length
      section.per = section.kind === 'tb' ? 'ask' : (PACES.includes(per) ? per : 'row');
      section.each = Math.max(0, Number(each) || 0);
      section.updatedAt = now();
      wrote();
      return true;
    },

    // ============================================================
    // # 🗑️ 🧩  TAKING A PART OUT
    // # 🔤 JavaScript
    // # 🎯 Crosses out a whole part and everything in it, and refuses to
    // #    take out the last one
    // # 🔗 A chapter with no part at all has nowhere to put the next row
    // #    — addRow would have no section to push into and would answer
    // #    a press with nothing. So the last one standing is refused,
    // #    and the reader is told why rather than watching a button
    // #    do nothing.
    // #
    // #    The rows are left exactly as they are, not crossed out one by
    // #    one. They are in a part that is gone, which is already the
    // #    whole truth, and touching twenty rows' clocks would hand this
    // #    device the winning word on twenty sentences it never typed
    // ============================================================
    dropSection: id => {
      if (!open) return false;
      const living = livingSections();
      if (living.length < 2) return false;
      const section = living.find(s => s.id === id);
      if (!section) return false;

      section.deleted = true;
      section.updatedAt = now();
      // Somewhere to stand once the ground goes: the neighbour on the
      // left, or the first one if this was the leftmost
      if (chosen === id) {
        const at = living.findIndex(s => s.id === id);
        chosen = (living[at - 1] || living[at + 1]).id;
      }
      wrote();
      return true;
    },

    openSection: () => sectionOf()?.id ?? null,

    useSection: id => { chosen = id; },

    addSection: (name, kind, group) => {
      if (!open) return null;
      const sort = KINDS.includes(kind) ? kind : 'part';
      const count = livingSections().filter(s => s.kind === sort).length + 1;
      const title = String(name || '').trim() ||
        (sort === 'tb' ? 'TB ' + count : sort === 'rules' ? 'Rules ' + count : 'Part ' + count);
      const section = { id: 'p-' + Math.random().toString(36).slice(2, 8), name: title,
                        kind: sort, group: sort === 'rules' ? String(group || '') : '',
                        // a bank is paced by the question and a stack of
                        // sheets by the card: neither is read by the row
                        per: sort === 'part' ? 'row' : 'ask', each: 0,
                        deleted: false, updatedAt: now(), rows: [] };
      open.content.sections.push(section);
      chosen = section.id;
      wrote();
      return section;
    },

    renameSection: (id, name) => {
      if (!open) return false;
      const section = open.content.sections.find(s => s.id === id);
      const want = String(name || '').trim();
      // An empty name is refused by keeping the old one: a part called
      // nothing is a box on the strip that cannot be told from the next
      if (!section || !want || section.name === want) return false;
      section.name = want;
      section.updatedAt = now();
      wrote();
      return true;
    },

    // What was answered last time this question was asked. It belongs
    // with the ticks and not with the words: it is a thing about the
    // reader, it changes every few seconds while an exam is running,
    // and it has no business rewriting the questions to say so
    answered: (rowId, ok) => {
      if (!open) return;
      const was = open.state.marks[rowId] || {};
      open.state.marks[rowId] = { on: was.on === true, at: was.at ?? null,
                                  was: ok ? 'ok' : 'no', when: now() };
      stateDirty = true;
      tellStatus('waiting');
      later();
    },

    // The whole chapter, every part of it — this is what the chapter's
    // own tab on the strip shows, and what is written beside the chapter
    // so the other chapters' tabs can show it without being opened
    counts: () => {
      const said = bankSaid();
      let rows = 0, learnt = 0, good = 0, bad = 0;
      livingSections().forEach(s => s.rows.forEach(r => {
        if (r.deleted) return;
        rows++;
        if (open.state.marks[r.id]?.on === true) learnt++;
        if (said.get(r.id) === 'ok') good++;
        else if (said.get(r.id) === 'no') bad++;
      }));
      return { rows, learnt, good, bad };
    },

    addRow: () => {
      if (!open) return null;
      const section = sectionOf();
      if (!section) return null;
      const living = livingRows();
      const row = {
        id: newRowId(), no: '', term: '', text: '', termAr: '', textAr: '', outside: false, tint: '',
        ask: '', pick: [], right: -1, srcs: [], about: [], note: '', noteDir: '',
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
        const next = field === 'note' ? cleanNote(value) : WORDS.has(field) ? clean(value) : value;
        if (row[field] === next) return;
        row[field] = next;
        row.updatedAt = now();
        wrote();
        return;
      }
    },

    // Asked of you, or there for the interest of it. It goes by the
    // same clock as the words because it is one of them: it says what
    // this term IS to the course, which is as true on the other device
    // as on this one — unlike a tick, which says what you have done
    // The answers a question offers, and which of them is right. They
    // are written together because they only mean anything together:
    // an index into a list that has changed under it points at the
    // wrong answer, and nothing on screen would say so
    setChoices: (rowId, pick, right) => {
      if (!open) return false;
      for (const section of open.content.sections) {
        const row = section.rows.find(r => r.id === rowId);
        if (!row) continue;
        row.pick = (Array.isArray(pick) ? pick : []).map(clean);
        row.right = Math.max(-1, Math.min(row.pick.length - 1, Math.trunc(Number(right))));
        if (!Number.isFinite(row.right)) row.right = -1;
        row.updatedAt = now();
        wrote();
        return true;
      }
      return false;
    },

    // ============================================================
    // # 🔗 📖  LINKING A ROW TO ITS PLACE
    // # 🔤 JavaScript
    // # 🎯 Adding a place, taking one away, reading a row's places, and
    // #    finding every place that falls on one page of one source
    // # 🔗 The last of those is what the jump BACK is built on: a press
    // #    on a lit passage has to find its row, and asking every row
    // #    in the chapter for its links is the same question asked
    // #    backwards — so it is answered here, once, where the rows are
    // ============================================================
    link: (rowId, where) => {
      if (!open || !where || typeof where.src !== 'string') return null;
      // Refused here and not at the edge of the screen, so no caller can
      // put a place in the file that cannot be found again
      if (!longEnough(where.anchor)) return null;

      for (const section of open.content.sections) {
        const row = section.rows.find(r => r.id === rowId);
        if (!row) continue;
        const made = {
          id: 'k-' + Math.random().toString(36).slice(2, 8),
          src: where.src,
          page: Math.max(1, Math.trunc(Number(where.page)) || 1),
          anchor: plainWords(where.anchor),
          what: WHATS.includes(where.what) ? where.what : 'term',
          at: now(), deleted: false
        };
        // The same spot twice is one spot. A reader marking a passage
        // they already marked should end with what they already had,
        // not with two lights on one line of the book
        const same = row.srcs.find(l => !l.deleted && l.src === made.src
          && l.page === made.page && l.what === made.what && l.anchor === made.anchor);
        if (same) return { ...same };
        row.srcs.push(made);
        wrote();
        return { ...made };
      }
      return null;
    },

    unlink: (rowId, linkId) => {
      if (!open) return false;
      for (const section of open.content.sections) {
        const row = section.rows.find(r => r.id === rowId);
        if (!row) continue;
        const link = row.srcs.find(l => l.id === linkId);
        if (!link || link.deleted) return false;
        link.deleted = true;
        link.at = now();
        wrote();
        return true;
      }
      return false;
    },

    // ============================================================
    // # 🎯 🔗  WHICH QUESTION IS ABOUT WHICH ROW
    // # 🔤 JavaScript
    // # 🎯 Naming what a question tests, and reading it back from
    // #    either end
    // # 🔗 Written on the question only. Read from the other end by
    // #    walking the rows — which costs nothing a reader can feel and
    // #    saves the one thing nothing can fix: two lists of the same
    // #    fact drifting apart
    // ============================================================
    about: (questionId, rowId) => {
      if (!open || !rowId || questionId === rowId) return null;
      for (const section of open.content.sections) {
        const q = section.rows.find(r => r.id === questionId);
        if (!q) continue;
        const same = q.about.find(a => !a.deleted && a.row === rowId);
        if (same) return { ...same };
        const made = { id: 'a-' + Math.random().toString(36).slice(2, 8),
                       row: rowId, at: now(), deleted: false };
        q.about.push(made);
        wrote();
        return { ...made };
      }
      return null;
    },

    unabout: (questionId, aboutId) => {
      if (!open) return false;
      for (const section of open.content.sections) {
        const q = section.rows.find(r => r.id === questionId);
        if (!q) continue;
        const one = q.about.find(a => a.id === aboutId);
        if (!one || one.deleted) return false;
        one.deleted = true;
        one.at = now();
        wrote();
        return true;
      }
      return false;
    },

    // What this question is about — the rows themselves, not just ids,
    // because every caller wants their words
    aboutOf: questionId => {
      const out = [];
      const all = new Map();
      (open?.content.sections || []).forEach(s => s.rows.forEach(r => all.set(r.id, { row: r, section: s })));
      const q = all.get(questionId)?.row;
      if (!q) return out;
      q.about.filter(a => !a.deleted).forEach(a => {
        const found = all.get(a.row);
        if (!found || found.row.deleted) return;
        out.push({ id: a.id, row: a.row, section: found.section.id,
                   no: found.row.no, term: found.row.term, termAr: found.row.termAr });
      });
      return out;
    },

    // And the other way: every question that names this row
    testedBy: rowId => {
      const out = [];
      (open?.content.sections || []).forEach(section => {
        if (section.kind !== 'tb' || section.deleted) return;
        section.rows.forEach(q => {
          if (q.deleted) return;
          const hit = q.about.find(a => !a.deleted && a.row === rowId);
          if (hit) out.push({ id: q.id, section: section.id, no: q.no, ask: q.ask,
                              pick: q.pick, right: q.right, link: hit.id });
        });
      });
      return out;
    },

    linksOf: rowId => {
      for (const section of open?.content.sections || []) {
        const row = section.rows.find(r => r.id === rowId);
        if (row) return row.srcs.filter(l => !l.deleted).map(l => ({ ...l }));
      }
      return [];
    },

    // Every place on one page of one source, with the row each belongs
    // to — the whole of what a drawn page needs, in one pass
    linksOn: (srcId, page) => {
      const out = [];
      const want = Math.max(1, Math.trunc(Number(page)) || 1);
      (open?.content.sections || []).forEach(section => {
        section.rows.forEach(row => {
          if (row.deleted) return;
          row.srcs.forEach(l => {
            if (l.deleted || l.src !== srcId || l.page !== want) return;
            out.push({ ...l, row: row.id, section: section.id, no: row.no });
          });
        });
      });
      return out;
    },

    outside: (rowId, on) => {
      if (!open) return false;
      for (const section of open.content.sections) {
        const row = section.rows.find(r => r.id === rowId);
        if (!row) continue;
        if (row.outside === Boolean(on)) return true;
        row.outside = Boolean(on);
        row.updatedAt = now();
        wrote();
        return true;
      }
      return false;
    },

    // One colour or none. Asking for the colour it already wears takes it
    // off again, so the menu needs no item of its own for clearing
    tint: (rowId, colour) => {
      if (!open) return false;
      const want = TINTS.includes(colour) ? colour : '';
      for (const section of open.content.sections) {
        const row = section.rows.find(r => r.id === rowId);
        if (!row) continue;
        if (row.tint === want) return true;
        row.tint = want;
        row.updatedAt = now();
        wrote();
        return true;
      }
      return false;
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

    // ============================================================
    // # 🔀 ↔️  TWO WAYS TO SEND A ROW SOMEWHERE ELSE
    // # 🔤 JavaScript
    // # 🎯 Moving a row to a number, and trading two rows for each other
    // # 🔗 THEY ARE NOT THE SAME THING AND THE DIFFERENCE IS WHAT
    // #    HAPPENS TO EVERYTHING IN BETWEEN. Moving row 4 to 9 pulls it
    // #    out and pushes it back in, so 5 to 9 each slide up one.
    // #    Trading 4 with 9 leaves 5 to 8 exactly where they were.
    // #    A reader who wanted one and got the other has had eight rows
    // #    renumbered without asking, so the screen says which is which
    // #    at the moment of choosing — the names alone do not carry it.
    // #
    // #    Both lift the table numbers off the POSITIONS and lay them
    // #    back on afterwards, so no table is split by a row walking
    // #    through it, and any primary row that ended up mid-table is
    // #    made the head of its own again
    // ============================================================
    move: (rowId, way) => moveRowTo(rowId, indexOf(livingRows(), rowId) + (way < 0 ? -1 : 1)),

    moveTo: moveRowTo,
    swap: swapRowWith,

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
      if (stateDoc) {
        const theirs = shapeState(stateDoc);
        open.state.marks = mergeMarks(open.state.marks, theirs.marks);
        // The same rule folds the covers: the later word on each cell wins
        open.state.covers = mergeMarks(open.state.covers || {}, theirs.covers);
      }

      const theirVersion = Number(open.chapter.contentVersion) || 1;
      if (theirVersion !== open.content.version) {
        const doc = await cloud().readFile(open.chapter.contentId).catch(() => null);
        if (doc) {
          const incoming = shapeContent(doc);
          incoming.sections.forEach(section => {
            const mine = open.content.sections.find(s => s.id === section.id);
            if (!mine) { open.content.sections.push(section); return; }

            mine.rows = mergeRows(mine.rows, section.rows);
            // THE PART'S OWN FIELDS FOLLOW ITS OWN CLOCK, like a row's.
            // Merging only the rows was quietly dropping everything else
            // the other device had done to it: a part renamed on the
            // phone, its pace set there, or the part taken out there,
            // all reached this device and were thrown away
            const newer = section.updatedAt &&
                          (!mine.updatedAt || section.updatedAt > mine.updatedAt);
            if (!newer) return;
            mine.name = section.name;
            mine.kind = section.kind;
            mine.per = section.per;
            mine.each = section.each;
            mine.deleted = section.deleted;
            mine.updatedAt = section.updatedAt;
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
