// ============================================================
// # 📔 ⏱️  THE RECORD OF WHAT WAS FINISHED, DAY BY DAY
// # 🔤 JavaScript
// # 🎯 Holds one file in the reader's Drive: every piece of work they
// #    finished, on the day they finished it, and which of those days
// #    they have asked to be left out of their average
// # 🔗 IT MEASURES WHAT WAS DONE, NOT TIME AT THE SCREEN. A page left
// #    open measures a page left open. Every item carries a weight in
// #    minutes decided beforehand, and a day is worth the weight of
// #    what was finished in it -- which is the reader's own engine,
// #    carried over rather than re-invented.
// #
// #    IT SITS AT TERM LEVEL, beside the term paper and not inside any
// #    course, because the average is one fact about the reader and
// #    not five facts about five courses. A file per course could not
// #    answer "how much do I get through in a day" without reading
// #    them all
// ============================================================
(() => {
  const QUIET = 900;
  const cloud = () => window.MyTermCloud;
  const board = () => window.MyTermBoardStore;

  const NAME = 'days.json';
  const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

  // ============================================================
  // # 🧾 ⚖️  AN ENTRY IS AN EVENT, NOT A STATE
  // # 🔤 JavaScript
  // # 🎯 The shape of one piece of finished work
  // # 🔗 It carries the TIME it happened, and that time is its name:
  // #    an event cannot be edited afterwards, only recorded or not.
  // #    This is what lets two devices be put together by taking
  // #    EVERYTHING rather than choosing a winner -- a day studied on
  // #    the laptop and on the phone adds up, instead of one of them
  // #    quietly erasing the other's afternoon.
  // #
  // #    AND THE COUNT IS STORED, NOT DERIVED. Their board recovers it
  // #    by dividing the minutes by the weight, which is true only
  // #    while no weight ever changes -- the day a card is worth
  // #    something else, every old row starts lying about how many
  // #    things were in it. The count is as much a fact as the minutes
  // ============================================================
  const num = (v, max) => {
    const n = Number(v);
    if (!isFinite(n)) return 0;
    return Math.max(-max, Math.min(max, n));
  };

  const shapeEntry = e => ({
    t: Math.max(0, Math.trunc(Number(e?.t)) || 0),
    c: typeof e?.c === 'string' ? e.c : '',          // the course's id
    h: typeof e?.h === 'string' ? e.h : '',          // the chapter's id, '' if it is gone
    s: typeof e?.s === 'string' ? e.s : '',          // the part's id
    n: Math.trunc(num(e?.n, 100000)),                // how many things
    m: Math.round(num(e?.m, 100000) * 100) / 100     // and how many minutes they were worth
  });

  // An exclusion IS a state: it is turned on and off, so it carries a
  // stamp and the later word wins. The entries above carry no stamp for
  // exactly the opposite reason
  const shapeOut = given => {
    const out = {};
    Object.keys(given && typeof given === 'object' ? given : {}).forEach(id => {
      if (typeof id !== 'string' || id.length > 40) return;
      const v = given[id];
      if (!v || typeof v !== 'object') return;
      out[id] = { off: v.off === true, at: typeof v.at === 'string' ? v.at : '' };
    });
    return out;
  };

  const shapeDoc = doc => {
    const days = {};
    const given = doc && typeof doc.days === 'object' && doc.days ? doc.days : {};
    Object.keys(given).forEach(key => {
      if (!DAY_KEY.test(key)) return;
      const list = Array.isArray(given[key]?.e) ? given[key].e : [];
      days[key] = { e: list.filter(e => e && typeof e === 'object').map(shapeEntry) };
    });
    return { app: 'MyTerm', kind: 'days', v: 1, days, out: shapeOut(doc?.out),
             updatedAt: typeof doc?.updatedAt === 'string' ? doc.updatedAt : null };
  };

  // ============================================================
  // # 🤝 ➕  TWO DEVICES ARE ADDED, NOT CHOSEN BETWEEN
  // # 🔤 JavaScript
  // # 🎯 Puts two copies of the record together
  // # 🔗 Every other paper on this board merges by picking the newer of
  // #    two versions of one thing. This one must not: a day is not a
  // #    version of anything, it is a pile of things that happened, and
  // #    picking the newer pile throws away an afternoon's work. So the
  // #    entries are UNITED.
  // #
  // #    United by what? Not by the time alone -- the engine credits
  // #    several parts of a chapter in the same millisecond, and they
  // #    are different events. By the time AND what it was: the course,
  // #    the chapter and the part together
  // ============================================================
  const nameOf = e => e.t + '|' + e.c + '|' + e.h + '|' + e.s;

  const merge = (mine, theirs) => {
    const days = {};
    const keys = new Set([...Object.keys(mine.days), ...Object.keys(theirs.days)]);
    keys.forEach(key => {
      const seen = new Map();
      (mine.days[key]?.e || []).forEach(e => seen.set(nameOf(e), e));
      (theirs.days[key]?.e || []).forEach(e => { if (!seen.has(nameOf(e))) seen.set(nameOf(e), e); });
      days[key] = { e: [...seen.values()].sort((a, b) => a.t - b.t) };
    });

    const out = { ...mine.out };
    Object.entries(theirs.out).forEach(([id, state]) => {
      const here = out[id];
      if (!here || (state.at || '') > (here.at || '')) out[id] = state;
    });

    return { app: 'MyTerm', kind: 'days', v: 1, days, out,
             updatedAt: (mine.updatedAt || '') > (theirs.updatedAt || '') ? mine.updatedAt : theirs.updatedAt };
  };

  let doc = null, fileId = null, coming = null, timer = null, dirty = false, sending = false;

  const stamp = () => new Date().toISOString();
  const later = () => { clearTimeout(timer); timer = setTimeout(push, QUIET); };

  // ============================================================
  // # ⬆️ 💾  WRITING IT BACK
  // # 🔤 JavaScript
  // # 🎯 Makes the file the first time there is something to put in it,
  // #    and writes it after a short quiet after that
  // # 🔗 NOTHING IS MADE UNTIL THERE IS SOMETHING TO SAY. A reader who
  // #    has not finished anything yet gets no file at all, rather than
  // #    an empty one in their Drive with a date on it.
  // #
  // #    And what is in Drive is read again before it is overwritten:
  // #    the phone may have written while this page was open, and the
  // #    one thing this file must never do is lose a day
  // ============================================================
  let penHeld = true;   // put down when another page takes this seat

  const push = async () => {
    // Frozen rather than failed: what is unsaved stays marked unsaved,
    // so the page that takes the seat back saves it rather than losing it
    if (!penHeld) return;
    if (!doc || !dirty || sending) return;
    sending = true;
    dirty = false;
    try {
      if (!fileId) {
        const home = await board()?.homeFolder?.();
        if (!home) { dirty = true; return; }
        doc.updatedAt = stamp();
        fileId = await cloud().createJson(home, NAME, doc);
        const live = board()?.live?.();
        if (live) { live.daysId = fileId; board().change(live); }
      } else {
        const theirs = await cloud().readFile(fileId).catch(() => null);
        if (theirs) doc = merge(doc, shapeDoc(theirs));
        doc.updatedAt = stamp();
        await cloud().writeFile(fileId, doc);
      }
    } catch {
      dirty = true;
    } finally {
      sending = false;
    }
  };

  // ============================================================
  // # ⬇️ 🔎  FOUND BEFORE IT IS MADE
  // # 🔤 JavaScript
  // # 🎯 Reads the record once per session
  // # 🔗 The id written on the term paper is a GUESS about Drive — a
  // #    file can be put in the trash, and a field the paper does not
  // #    name is lost on a read. So if the id gives nothing, the folder
  // #    is asked by name before anything is made. Skipping that look
  // #    is how a second, empty file ends up beside the full one
  // ============================================================
  const ready = async () => {
    if (coming) return coming;
    coming = (async () => {
      doc = { app: 'MyTerm', kind: 'days', v: 1, days: {}, out: {}, updatedAt: null };
      const paper = board()?.board?.();
      let id = typeof paper?.daysId === 'string' ? paper.daysId : null;
      let found = id ? await cloud().readFile(id).catch(() => null) : null;
      if (!found) {
        const home = await board()?.homeFolder?.();
        id = home ? await cloud().findChild(home, NAME).catch(() => null) : null;
        found = id ? await cloud().readFile(id).catch(() => null) : null;
      }
      if (found) {
        fileId = id;
        doc = shapeDoc(found);
        const live = board()?.live?.();
        if (live && live.daysId !== id) { live.daysId = id; board().change(live); }
      }
      return doc;
    })();
    return coming;
  };

  const today = () => {
    const d = new Date(), p = n => (n < 10 ? '0' : '') + n;
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };

  // ============================================================
  // # 📊 ➗  THE AVERAGE, AND WHAT IS LEFT OUT OF IT
  // # 🔤 JavaScript
  // # 🎯 Adds the days up and answers how much a day of study is worth
  // # 🔗 THE TOTAL IS ADDED UP FROM THE ENTRIES AND NEVER STORED BESIDE
  // #    THEM. Their board keeps both, and the two have drifted 41.5
  // #    minutes apart on the reader's own data: an untick appends its
  // #    negative entry, the stored total is then clamped at zero, and
  // #    from that moment the sum and the total disagree while the
  // #    average on screen reads higher than the truth. One fact,
  // #    measured once.
  // #
  // #    AND THE AVERAGE IS OVER DAYS STUDIED, NOT DAYS PASSED. "You'll
  // #    finish in 42 days" then means 42 days of study -- the same
  // #    thing the line above it means. Divided by calendar days, two
  // #    sentences side by side would be counting different days
  // ============================================================
  const dayRows = key => {
    const list = doc?.days[key]?.e || [];
    const dayOff = doc?.out[key]?.off === true;
    return list.map((e, i) => {
      const id = key + '#' + i;
      return { id, i, off: dayOff || doc?.out[id]?.off === true,
               c: e.c, h: e.h, s: e.s, n: e.n, m: e.m, t: e.t };
    });
  };

  const stats = () => {
    const list = [];
    let sum = 0, studied = 0;
    Object.keys(doc?.days || {}).sort().reverse().forEach(key => {
      const rows = dayRows(key);
      const total = rows.reduce((a, r) => a + r.m, 0);
      // A day left out counts as nothing; so does a single entry left out
      const counted = Math.max(0, rows.reduce((a, r) => a + (r.off ? 0 : r.m), 0));
      list.push({ key, off: doc?.out[key]?.off === true, total, counted, rows });
      if (counted > 0) { sum += counted; studied++; }
    });
    return { avg: studied ? sum / studied : null, days: studied, total: sum, list };
  };

  window.MyTermDaysStore = {
    ready,
    hold: on => { penHeld = on !== false; },
    has: () => Boolean(fileId),
    fileId: () => fileId,
    today,

    // ONE PIECE OF FINISHED WORK, on the day it was finished. The minutes
    // may be negative: a reader who takes a tick back gets its weight
    // taken back too, or ticking and unticking would be a way to inflate
    // a day without doing anything
    add: ({ c, h, s, n, m }, when) => {
      if (!doc) return false;
      if (!m && !n) return false;
      const key = DAY_KEY.test(String(when || '')) ? String(when) : today();
      const e = shapeEntry({ t: Date.now(), c, h, s, n, m });
      (doc.days[key] = doc.days[key] || { e: [] }).e.push(e);
      dirty = true; later();
      return true;
    },

    // Every day, newest first, each with the pieces that made it up
    days: () => stats().list,
    stats,

    // What a day, or one piece of it, is worth — and whether it counts.
    // The id of a piece is `<day>#<its place in that day>`
    isOut: id => doc?.out[id]?.off === true,
    exclude: (id, off) => {
      if (!doc || typeof id !== 'string') return false;
      doc.out[id] = { off: off !== false, at: stamp() };
      dirty = true; later();
      return true;
    },

    flush: () => { clearTimeout(timer); return push(); },
    busy: () => dirty || sending,

    // For a guard, and for anything that must see the paper as it stands
    doc: () => doc,
    merge: (a, b) => merge(shapeDoc(a), shapeDoc(b)),
    shape: shapeDoc
  };
})();
