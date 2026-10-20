// ============================================================
// # 🖊️ 🗄️  THE HANDWRITTEN SOLUTIONS — WHAT THEY ARE AND WHERE THEY LIVE
// # 🔤 JavaScript
// # 🎯 Holds the ink of every practice card as VECTORS, keeps it on the
// #    browser's own shelf so a reload loses nothing, and hands it to
// #    whoever draws. Drive comes later and is not pretended at here.
// # 🔗 A STROKE IS `{c, w, p:[x, y, pressure, …]}` AND NOTHING ELSE —
// #    the exact shape the reader's own machine already writes, so the
// #    notebooks he has filled there port across with a copy and not a
// #    conversion. Coordinates are WHOLE NUMBERS in a space twice the
// #    card's layout size, and pressure is one byte: a dense page of
// #    writing then stores under sixty kilobytes, which is what makes
// #    carrying it to Drive thinkable at all (measured on his machine:
// #    a PNG of the same page is four times that, and loses the
// #    pressure the pen was held with).
// #
// # 🔗 AND THE PAGE IS NEVER THE RECORD. The sheets are rebuilt from
// #    their stored markup whenever a part is opened, so ink inside
// #    that markup would be erased by the act of looking away. It lives
// #    here, and the pad injects it after every draw.
// #
// # 🔗 ONE RECORD PER CARD, keyed `<group>#<at>` — the same key the
// #    bank's verdict already uses for the same card, so there is one
// #    vocabulary for "which card" and not two.
// ============================================================
(() => {
  const VER = 4;              // the record's own shape
  const SC = 2;               // store space = CSS pixels × 2
  const QUIET = 900;          // written after this much silence, never mid-stroke

  // ============================================================
  // # 🏷️ 🖥️  WHICH MACHINE WROTE A SHEET
  // # 🔤 JavaScript
  // # 🎯 A short id for this browser, kept for as long as it lives
  // # 🔗 IT IS WHAT MAKES SYNCING CONFLICT-FREE LATER. An attempt sheet
  // #    belongs to the machine that started it, and a machine only
  // #    ever writes its own — so merging two devices is a UNION with
  // #    nothing to arbitrate, and no stroke can ever lose a race to
  // #    another device's copy. Worst case the reader finds two sheets,
  // #    one per machine, which is exactly what attempt sheets are for.
  // ============================================================
  const WHO = 'myterm.ink.who';
  const me = (() => {
    let id = null;
    try { id = localStorage.getItem(WHO); } catch {}
    if (!id) {
      id = 'd-' + Math.random().toString(36).slice(2, 8);
      try { localStorage.setItem(WHO, id); } catch {}
    }
    return id;
  })();

  const now = () => new Date().toISOString();
  const newId = () => 's-' + Math.random().toString(36).slice(2, 8);

  // ---------- the shelf: IndexedDB, because this is not small ----------
  // localStorage is where the sign-in key lives and it is a few megabytes
  // for the whole origin. One chapter of handwritten solutions can be
  // more than that on its own, and the reader's own machine has already
  // met the failure: a full box means the NEXT write fails, and the
  // write that fails might be the renewed key. So the ink never touches
  // it — IndexedDB is made for this and is asked for nothing else.
  const DB = 'mytermink', SHELF = 'pads';
  let shelf = null;
  const openShelf = () => {
    if (!shelf) {
      shelf = new Promise((done, fail) => {
        const ask = indexedDB.open(DB, 1);
        ask.onupgradeneeded = () => ask.result.createObjectStore(SHELF);
        ask.onsuccess = () => done(ask.result);
        ask.onerror = () => fail(ask.error);
      }).catch(() => null);
    }
    return shelf;
  };
  const idbShelf = {
    name: 'IndexedDB',
    get: async key => {
      const db = await openShelf();
      if (!db) return null;
      return new Promise(done => {
        try {
          const deal = db.transaction(SHELF, 'readonly');
          const ask = deal.objectStore(SHELF).get(key);
          deal.oncomplete = () => done(ask.result || null);
          deal.onerror = deal.onabort = () => done(null);
        } catch { done(null); }
      });
    },
    put: async (key, val) => {
      const db = await openShelf();
      if (!db) return false;
      return new Promise(done => {
        try {
          const deal = db.transaction(SHELF, 'readwrite');
          deal.objectStore(SHELF).put(val, key);
          deal.oncomplete = () => done(true);
          deal.onerror = deal.onabort = () => done(false);
        } catch { done(false); }
      });
    }
  };

  // ============================================================
  // THE SHELF IS A SEAM, AND THAT IS NOT A COURTESY TO TESTS
  //
  // MEASURED 2026-10-20: in the headless browser this project's guards
  // run in, `indexedDB.open` calls back NEITHER success NOR error — the
  // request simply never settles, so anything awaiting it waits for
  // ever and the guard reports "pending" with no fault named. It joins
  // `requestAnimationFrame` and `IntersectionObserver` on the list of
  // things that are dead in that runner.
  //
  // So the guard hands in a shelf of its own and measures the PROTOCOL
  // — what is written, when it is written, and whether the shelf and
  // memory agree — which is the part that can regress. That the browser
  // can keep a database is the browser's business, and it is proved
  // once in a real one; the guard says which shelf it used in its own
  // output so the two runs can never be mistaken for each other.
  //
  // And the seam is wanted again straight after: Drive is the next
  // shelf behind this one, and a store that can be handed a shelf can
  // be handed that one without being rewritten.
  // ============================================================
  let shelfImpl = idbShelf;

  const onShelf = async (how, run) => {
    // Kept so the two call shapes below read the same as the rest of the
    // project; `run` is given a tiny object with the two methods used
    const bridge = {
      get: key => shelfImpl.get(key),
      put: (val, key) => shelfImpl.put(key, val)
    };
    try { return await run(bridge); } catch { return null; }
  };

  let scope = '';             // '<courseId>/<chapterId>' — set when a chapter opens
  const pads = new Map();     // key → record, for the open chapter only
  const owed = new Set();     // keys written to but not yet on the shelf
  let timer = 0;
  let tellStatus = () => {};

  const shelfKey = key => scope + '/' + key;

  // A record that is wrong in any way still has to come back usable: a
  // reader's ink is read on the first open of a browser we have never
  // seen, and there is no second chance to fix a record we refused
  const shape = d => {
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
    const sh = Array.isArray(d.sh) ? d.sh : [];
    const sheets = sh.filter(s => s && typeof s === 'object').map(s => ({
      id: typeof s.id === 'string' && s.id ? s.id : newId(),
      by: typeof s.by === 'string' ? s.by : me,
      ts: s.ts >= 0 ? s.ts : 0,
      at: typeof s.at === 'string' ? s.at : '',
      s: (Array.isArray(s.s) ? s.s : []).filter(st => st && Array.isArray(st.p) && st.p.length >= 3)
        .map(st => ({
          c: typeof st.c === 'string' ? st.c : '#12141a',
          w: Number(st.w) > 0 ? Number(st.w) : 5.5,
          p: st.p.map(n => Math.round(Number(n) || 0))
        }))
    }));
    if (!sheets.length) sheets.push({ id: newId(), by: me, ts: 0, at: '', s: [] });
    return { v: VER, sc: SC, rev: Number(d.rev) > 0 ? Number(d.rev) : 1, sh: sheets };
  };

  // Which sheet this machine is looking at. LOCAL, never in the record:
  // two devices must not argue about which attempt is open, and that
  // argument is the only one a union cannot settle
  const openSheet = new Map();
  const at = key => {
    const d = pads.get(key);
    if (!d) return 0;
    const i = openSheet.get(key) || 0;
    return i < d.sh.length ? i : 0;
  };

  const record = key => {
    let d = pads.get(key);
    if (!d) { d = shape(null); pads.set(key, d); }
    return d;
  };

  const wrote = key => {
    owed.add(key);
    tellStatus('waiting');
    clearTimeout(timer);
    timer = setTimeout(flush, QUIET);
  };

  // ============================================================
  // # 💾 ⏳  WRITTEN AFTER THE HAND STOPS, NEVER WHILE IT MOVES
  // # 🔤 JavaScript
  // # 🎯 Puts every record that changed on the shelf
  // # 🔗 NOT ONE WRITE PER POINT, AND NOT ONE PER STROKE EITHER. The
  // #    reader's own machine learnt this the hard way twice: a save
  // #    inside the drag loop serialised the whole page's ink dozens of
  // #    times a second and the dragging went heavy; and the page's own
  // #    guard now counts storage writes during a gesture and demands
  // #    zero. So: the stroke lands in memory and on the canvas at
  // #    once, and the shelf hears about it when the hand rests.
  // ============================================================
  async function flush() {
    clearTimeout(timer); timer = 0;
    if (!owed.size) return true;
    const keys = [...owed];
    owed.clear();
    tellStatus('saving');
    let bad = 0;
    for (const key of keys) {
      const d = pads.get(key);
      if (!d) continue;
      d.rev = (Number(d.rev) || 1) + 1;
      let copy = null;
      try { copy = JSON.parse(JSON.stringify(d)); } catch { copy = null; }
      if (!copy) { bad++; continue; }
      const ok = await onShelf('readwrite', s => s.put(copy, shelfKey(key)));
      // A refused write KEEPS ITS MARK. The alternative is the fault
      // this project has already paid for twice in one week: a write
      // that failed and was quietly forgotten, with every counter on
      // the screen still green
      if (!ok) { owed.add(key); bad++; }
    }
    tellStatus(bad ? 'failed' : 'saved');
    return bad === 0;
  }

  window.MyTermInkStore = {
    VER, SC, who: () => me,

    // The chapter whose cards are being read. Opening another one writes
    // out what is owed FIRST: everything else in this project that let
    // go of an unsent write before switching lost work, and it is the
    // same mistake every time
    open: async (courseId, chapterId) => {
      const next = String(courseId || '') + '/' + String(chapterId || '');
      if (next === scope) return true;
      await flush();
      scope = next;
      pads.clear();
      openSheet.clear();
      return true;
    },
    scopeNow: () => scope,

    // Read one card's record off the shelf into memory. Asked for by the
    // pad when a card is first drawn, so a part of seventy-four cards
    // costs seventy-four small reads and not one big one — and the ones
    // never scrolled to cost nothing at all
    load: async key => {
      if (pads.has(key)) return pads.get(key);
      const kept = await onShelf('readonly', s => s.get(shelfKey(key)));
      const d = shape(kept);
      pads.set(key, d);
      return d;
    },
    ready: key => pads.has(key),

    // The strokes of the sheet this machine has open on that card
    strokes: key => {
      const d = pads.get(key);
      return d ? d.sh[at(key)].s : [];
    },
    has: key => {
      const d = pads.get(key);
      return Boolean(d && d.sh.some(s => s.s.length));
    },

    // ---------- what the pad does to it ----------
    add: (key, stroke) => {
      const d = record(key);
      d.sh[at(key)].s.push(stroke);
      d.sh[at(key)].at = now();
      wrote(key);
      return stroke;
    },
    // The last stroke taken back. Not a history: one step, which is
    // what a pen has — and it is the current sheet's own last stroke,
    // never another attempt's
    undo: key => {
      const d = pads.get(key);
      if (!d) return false;
      const s = d.sh[at(key)].s;
      if (!s.length) return false;
      s.pop();
      d.sh[at(key)].at = now();
      wrote(key);
      return true;
    },
    // Everything within reach of a point, by WHOLE strokes. Half-erasing
    // a stroke reads worse than erasing it: the reader's own machine
    // decided this and the decision stands
    eraseAt: (key, x, y, r) => {
      const d = pads.get(key);
      if (!d) return 0;
      const sheet = d.sh[at(key)];
      const before = sheet.s.length;
      sheet.s = sheet.s.filter(st => {
        for (let i = 0; i < st.p.length; i += 3) {
          if (Math.abs(st.p[i] - x) < r && Math.abs(st.p[i + 1] - y) < r) return false;
        }
        return true;
      });
      if (sheet.s.length === before) return 0;
      sheet.at = now();
      wrote(key);
      return before - sheet.s.length;
    },
    // The open sheet emptied — and ONLY the open one. The attempts kept
    // beside it are not touched, and whoever asks is told so by name
    clear: key => {
      const d = pads.get(key);
      if (!d || !d.sh[at(key)].s.length) return false;
      d.sh[at(key)].s = [];
      d.sh[at(key)].at = now();
      wrote(key);
      return true;
    },

    sheets: key => {
      const d = pads.get(key);
      return d ? d.sh.map((s, i) => ({ id: s.id, by: s.by, ts: s.ts, strokes: s.s.length, open: i === at(key) })) : [];
    },
    openAt: key => at(key),

    flush,
    owed: () => owed.size,
    watch: fn => { tellStatus = fn || (() => {}); },

    // Which shelf is in use, and a way to hand in another. The name is
    // reported so that a guard's output always says which one it
    // measured — a protocol proved against a stand-in and a database
    // proved in a real browser are two different claims
    shelfName: () => shelfImpl.name || 'given',
    useShelf: impl => {
      if (!impl || typeof impl.get !== 'function' || typeof impl.put !== 'function') return false;
      shelfImpl = impl;
      pads.clear();
      return true;
    },

    // Said plainly for the guard: what is in memory, and what the shelf
    // holds for the same card. A guard that cannot see both sides of a
    // write cannot prove the write happened
    onShelfNow: async key => onShelf('readonly', s => s.get(shelfKey(key)))
  };
})();
