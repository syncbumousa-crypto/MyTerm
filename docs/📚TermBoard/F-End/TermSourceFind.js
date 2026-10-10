// ============================================================
// # 🔎 📄  FINDING A PHRASE ON A PAGE
// # 🔤 JavaScript
// # 🎯 Reads the words out of one page of a PDF, and says where on it a
// #    stored phrase sits — as boxes in per cent of the page
// # 🔗 THE WORDS ARE READ FROM THE FILE AND NEVER STORED. The reader's
// #    own site keeps a 958 kilobyte list of every word of every page
// #    beside each chapter; we keep none. The PDF is the one thing that
// #    knows what is written on it, and a saved copy of its words is a
// #    second place for that truth — one that starts lying the day the
// #    file is replaced by a better scan, with nothing to say it has.
// #
// #    AND THE BOXES ARE PER CENT, NEVER PIXELS. The same page is drawn
// #    at a hundred widths here: two columns or one, the pane dragged
// #    wider, the window resized. A box in pixels is right at exactly
// #    one of those widths
// ============================================================
(() => {
  // What has been read out of which page, for as long as the tab lives.
  // Reading a page is milliseconds, but a reader jumping between twenty
  // terms on one page would pay it twenty times
  const read = new Map();   // 'sourceId#page' -> { words, text, place }

  // ============================================================
  // # 🧹 🔤  MAKING TWO TEXTS COMPARABLE
  // # 🔤 JavaScript
  // # 🎯 One way of writing, used on the page and on the anchor alike
  // # 🔗 THE SOFT HYPHEN IS THE WHOLE REASON THIS EXISTS. A book breaks
  // #    a word across a line end with one, so "informa­tion systems"
  // #    on the page is "information systems" in the anchor — and half
  // #    the phrases that cross a line would never be found. Quotes are
  // #    levelled for the same reason: a typesetter's curly quote and a
  // #    typed straight one are the same word to a reader
  // ============================================================
  const flatten = s => String(s == null ? '' : s)
    .replace(/­/g, '')                       // the soft hyphen the line break left behind
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9'"\-\s]/g, ' ')             // punctuation is not part of a phrase
    // EVERY HYPHEN GOES, AND THE SPACE EITHER SIDE OF IT WITH IT. The
    // book sets "components" across a line end as "compo-" then
    // "nents", and the file hands those over as two runs — so the page
    // reads "compo - nents" and the phrase stored as "interrelated
    // components" was simply not on it. Measured on page 10 of the
    // reader's own book, where one of four anchors failed for this.
    // Joining them also runs "decision-making" together into one word,
    // and that is fine: the SAME rule is applied to the phrase being
    // looked for, so the two still meet
    .replace(/\s*-\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // ============================================================
  // # 📐 🧩  WHERE EACH PIECE OF TEXT SITS
  // # 🔤 JavaScript
  // # 🎯 Turns one page of a PDF into runs of text with a box each, and
  // #    one flat string with a map back to them
  // # 🔗 The unit is the RUN as the file gives it, not the word. Cutting
  // #    runs into words means guessing where each letter ends, and the
  // #    guess is wrong for every proportional font — which is all of
  // #    them. A run is told exactly where it is, so the only guessing
  // #    left is INSIDE one run, over a few letters
  // ============================================================
  const readPage = async (doc, n) => {
    const page = await doc.getPage(n);
    const view = page.getViewport({ scale: 1 });
    const got = await page.getTextContent();
    const lib = window.pdfjsLib;

    const runs = [];
    got.items.forEach(item => {
      if (!item.str || !item.str.trim()) return;
      // Into the viewport's own frame, where y counts downward like the
      // screen does. The item's own transform counts upward from the
      // bottom of the page, which is nobody's idea of the top
      const m = lib.Util.transform(view.transform, item.transform);
      const high = Math.abs(item.height) || Math.hypot(m[2], m[3]);
      runs.push({
        str: item.str,
        x: (m[4] / view.width) * 100,
        y: ((m[5] - high) / view.height) * 100,
        w: (item.width / view.width) * 100,
        h: (high / view.height) * 100
      });
    });

    // One string for the whole page, and for every letter in it the run
    // it came from and how far into that run it is.
    //
    // THE JOIN ACROSS RUNS IS THE HARD PART. A word broken at a line
    // end leaves "compo-" at the end of one run and "nents" at the
    // start of the next, and flattening each run on its own can never
    // close that: the hyphen is in one piece and the rest of the word
    // in another. So the RAW end of the run before is what decides
    // whether a space goes in — measured on page 10 of the reader's own
    // book, where "interrelated components" was simply not findable
    let text = '';
    const place = [];
    let lastRaw = '';
    runs.forEach((run, i) => {
      const flat = flatten(run.str);
      const joins = /[-‐-―­]\s*$/.test(lastRaw);
      // Remembered BEFORE the empty ones are dropped, because the hyphen
      // at a line end is often a run all of its own — it flattens to
      // nothing, so skipping it early threw away the one mark that says
      // the next run finishes the word this one started. A run of pure
      // whitespace is passed over, so a stray one between the hyphen and
      // the rest of the word does not break the join either
      if (run.str.trim()) lastRaw = run.str;
      if (!flat) return;
      if (text && !joins) { text += ' '; place.push({ run: -1, at: 0, of: 1 }); }
      const start = text.length;
      text += flat;
      for (let k = start; k < text.length; k++) place.push({ run: i, at: k - start, of: flat.length });
      lastRaw = run.str;
    });

    return { runs, text, place };
  };

  // ============================================================
  // # 📦 🖍️  THE BOXES A MATCH COVERS
  // # 🔤 JavaScript
  // # 🎯 From a stretch of the flat page text to the rectangles over it
  // # 🔗 One box per RUN touched, and a run touched in part is cut in
  // #    part — by letter count, which is the one honest guess left:
  // #    the file says where the run is and how wide, and nothing says
  // #    where its seventh letter ends
  // ============================================================
  const boxesFor = (page, from, to) => {
    const hit = new Map();
    for (let i = from; i < to; i++) {
      const p = page.place[i];
      if (!p || p.run < 0) continue;
      const box = hit.get(p.run) || { first: p.at, last: p.at, of: p.of };
      box.first = Math.min(box.first, p.at);
      box.last = Math.max(box.last, p.at);
      hit.set(p.run, box);
    }
    return [...hit.entries()].map(([i, cut]) => {
      const run = page.runs[i];
      const a = cut.first / cut.of, b = (cut.last + 1) / cut.of;
      return {
        x: run.x + run.w * a,
        y: run.y,
        w: Math.max(run.w * (b - a), 0.2),
        h: run.h
      };
    });
  };

  window.MyTermFind = {
    flatten,

    // The words of one page, read once and kept for this tab
    page: async (doc, sourceId, n) => {
      const key = sourceId + '#' + n;
      if (read.has(key)) return read.get(key);
      const coming = readPage(doc, n);
      read.set(key, coming);
      coming.then(got => read.set(key, got), () => read.delete(key));
      return coming;
    },

    forget: sourceId => {
      [...read.keys()].forEach(k => { if (k.startsWith(sourceId + '#')) read.delete(k); });
    },

    // ============================================================
    // # 🎯 🔍  THE SEARCH ITSELF
    // # 🔤 JavaScript
    // # 🎯 Finds the stored phrase on one page and gives back its boxes
    // # 🔗 ON THE PAGE IT WAS STORED WITH, AND NO OTHER. Searching the
    // #    whole file finds the phrase somewhere else often enough to
    // #    matter — a heading repeated, a term defined twice — and it
    // #    costs reading all thirty-eight pages to answer one jump.
    // #
    // #    And a phrase that is not there gives back nothing, plainly.
    // #    The near miss is the dangerous answer: a reader taken to a
    // #    place that looks right believes it
    // ============================================================
    find: (page, anchor) => {
      const want = flatten(anchor);
      if (!want || !page?.text) return null;
      const at = page.text.indexOf(want);
      if (at < 0) return null;
      return { from: at, to: at + want.length, boxes: boxesFor(page, at, at + want.length) };
    }
  };
})();
