// ============================================================
// # 🖊️ 🗄️  THE HANDWRITTEN SOLUTIONS — WHAT THEY ARE AND WHERE THEY LIVE
// # 🔤 JavaScript
// # 🎯 Holds the ink of every practice card as VECTORS, keeps it on the
// #    browser's own shelf so a reload loses nothing, carries it to the
// #    reader's own Drive so his other machine has it, and hands it to
// #    whoever draws
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
  let me = (() => {
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
  let told = () => {};              // said when another machine's work lands

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
    return { v: VER, sc: SC, rev: Number(d.rev) > 0 ? Number(d.rev) : 1,
             // `pr` is the version that actually REACHED Drive. It lives in
             // the record, so a device that failed to send and was then
             // closed still knows, on its next open, that it is holding ink
             // nobody else has — a debt kept only in memory is a debt that
             // a reload forgives, and the ink then stays on one machine for
             // ever with every counter green
             pr: Number(d.pr) > 0 ? Number(d.pr) : 0, sh: sheets };
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

  // The shelf hears about it after nine tenths of a second of quiet, and
  // Drive after four. TWO CLOCKS ON PURPOSE: the shelf is local and
  // instant and exists so that a reload loses nothing, so it is written
  // eagerly; Drive is a network call for a file that is rewritten whole,
  // so it waits until the hand has really stopped. Four seconds of a
  // reader's attention is nothing; forty Drive writes while he works out
  // one problem is rude
  const CLOUD_QUIET = 4000;
  let cloudTimer = 0;

  const wrote = key => {
    // The content changed, so the version moves — here and nowhere else
    const d = pads.get(key);
    if (d) d.rev = (Number(d.rev) || 1) + 1;
    owed.add(key);
    cloudOwed.add(key);
    tellStatus('waiting');
    clearTimeout(timer);
    timer = setTimeout(flush, QUIET);
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => pushAll(), CLOUD_QUIET);
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
      // ★ THE SHELF DOES NOT ADVANCE THE VERSION. It did at first, and
      //   the debt then chased its own tail: every push set "reached
      //   Drive = the current version", the shelf write that followed
      //   bumped the version again, and the record read as unsent for
      //   ever. The counter belongs to the CONTENT — it moves when a
      //   stroke is drawn, erased or sealed, and when a push gives the
      //   other machines a new version to notice — never when the same
      //   content is merely saved again. Found by its own guard
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

  // ============================================================
  // # ☁️ 🤝  CARRYING IT TO DRIVE — AND WHY NOTHING CAN COLLIDE
  // # 🔤 JavaScript
  // # 🎯 One small file per card under the chapter's own folder, read
  // #    when first wanted and written when that card changes
  // # 🔗 THE READER'S OWN MACHINE DOES NOT DO THIS AT ALL, and says so
  // #    in its plan: "not synced with Google — the ink is local like
  // #    the rest of your progress, and its size forbids it." That size
  // #    was the browser's five-megabyte box, which the whole origin
  // #    shares. Drive is not that box: a dense page of writing is under
  // #    sixty kilobytes, so a chapter of twenty written cards is some
  // #    three and a half megabytes — nothing, in a Drive folder.
  // #
  // # 🔗 ONE FILE PER CARD and not one per chapter: a chapter can hold
  // #    two hundred cards, and a single file means every stroke rewrites
  // #    all of them. And not inside `state.json`, which is written on
  // #    every tick and every verdict: ink there would make a tick cost
  // #    a megabyte.
  // #
  // # 🔗 AND THE MERGE CANNOT CONFLICT, BY CONSTRUCTION. An attempt
  // #    belongs to the machine that started it (`by`), a machine writes
  // #    only its own, and the fold is a UNION: their sheets that I do
  // #    not own, plus mine. No stroke can lose a race. The worst case
  // #    is two attempts side by side — one begun on the tablet, one on
  // #    the laptop — which is exactly what attempts are for.
  // #
  // # 🔗 AND THE FRESHNESS COUNTER LIVES INSIDE THE FILE. This project
  // #    has already paid for the other arrangement twice in one week:
  //  #   a version noted somewhere else went stale, the shelf agreed with
  // #    the note, and 241 questions read as written for an hour with
  // #    Drive holding none of them. So `rev` is read out of the record
  // #    itself, and a push that finds a newer `rev` folds before it
  // #    writes instead of overwriting.
  // ============================================================
  const liveCloud = {
    name: 'Drive',
    ready: () => Boolean(window.MyTermCloud && window.MyTermCloud.hasToken && window.MyTermCloud.hasToken()),
    list: parentId => window.MyTermCloud.listChildren(parentId),
    find: (parentId, name) => window.MyTermCloud.findChild(parentId, name),
    folder: (name, parentId) => window.MyTermCloud.makeFolder(name, parentId),
    make: (parentId, name, body) => window.MyTermCloud.createJson(parentId, name, body),
    read: id => window.MyTermCloud.readFile(id),
    write: (id, body) => window.MyTermCloud.writeFile(id, body)
  };
  let cloud = liveCloud;

  let chapterFolder = '';      // the open chapter's own folder in Drive
  let inkFolder = '';          // the `ink` folder inside it
  const fileOf = new Map();    // key → Drive file id, for the open chapter
  const baseRev = new Map();   // key → the `rev` this device last saw in Drive
  const cloudOwed = new Set();
  let pushing = false;

  const fileName = key => 'ink-' + String(key).replace(/[^A-Za-z0-9#-]/g, '') .replace('#', '-') + '.json';

  // Found once per chapter: one listing tells which cards have ink and
  // what their file ids are. Seventy-four `find` calls would say the
  // same thing and ask seventy-four times
  const reachFolder = async make => {
    if (inkFolder) return inkFolder;
    if (!chapterFolder || !cloud.ready()) return '';
    let id = await cloud.find(chapterFolder, 'ink').catch(() => null);
    if (!id && make) id = await cloud.folder('ink', chapterFolder).catch(() => null);
    if (!id) return '';
    inkFolder = id;
    const kids = await cloud.list(id).catch(() => null);
    (kids || []).forEach(f => {
      const m = /^ink-(.+)-(\d+)\.json$/.exec(f.name || '');
      if (m) fileOf.set(m[1] + '#' + m[2], f.id);
    });
    return inkFolder;
  };

  // Their sheets and mine, with nothing arbitrated: a sheet is written
  // only by the machine that owns it
  // ============================================================
  // NOTHING IS DROPPED FOR WANT OF AN OWNER
  //
  // The first shape of this kept "my own sheets from memory" and brought
  // over only sheets belonging to somebody else — and its own guard
  // caught the hole on the first run: a machine whose shelf had been
  // cleared, or which read the card before it had written anything,
  // would see its OWN attempts in Drive as "mine" and keep the empty
  // memory copy instead. Its sealed work would vanish on the next push.
  //
  // So the rule is by IDENTITY first and ownership second: a sheet not
  // here is taken, and where both sides have the same sheet the one who
  // writes it wins — my copy for my own, theirs for theirs. Then nothing
  // can be lost by either end, and there is still nothing to arbitrate.
  // ============================================================
  const fold = (mine, theirs) => {
    if (!theirs || !Array.isArray(theirs.sh)) return mine;
    const here = new Map(mine.sh.map(s => [s.id, s]));
    const out = [];
    theirs.sh.forEach(s => {
      if (!s || !s.id) return;
      const ours = here.get(s.id);
      if (!ours) { out.push(s); return; }          // not here at all: taken
      out.push(ours.by === me ? ours : s);         // the writer of a sheet wins it
      here.delete(s.id);
    });
    // And everything of mine that Drive has never seen, at the end —
    // where the reader left it
    mine.sh.forEach(s => { if (here.has(s.id)) out.push(s); });
    mine.sh = out.length ? out : [{ id: newId(), by: me, ts: 0, at: now(), s: [] }];
    mine.rev = Math.max(Number(theirs.rev) || 1, Number(mine.rev) || 1) + 1;
    return mine;
  };

  async function pushOne(key) {
    const d = pads.get(key);
    if (!d) return true;
    if (!cloud.ready()) return false;
    const folder = await reachFolder(true);
    if (!folder) return false;

    let id = fileOf.get(key);
    if (!id) {
      id = await cloud.find(folder, fileName(key)).catch(() => null);
      if (id) fileOf.set(key, id);
    }
    // Nothing of ours yet, and nothing worth a file: an empty card does
    // not litter the folder
    if (!id && !d.sh.some(s => s.s.length)) return true;

    if (id) {
      const there = await cloud.read(id).catch(() => null);
      // THE FOLD BEFORE THE PUSH, and the decision made on the `rev`
      // inside the file rather than on anything remembered elsewhere
      if (there && Number(there.rev) !== baseRev.get(key)) fold(d, there);
      else d.rev = (Number(d.rev) || 1) + 1;
      const ok = await cloud.write(id, d).then(() => true, () => false);
      if (!ok) return false;
    } else {
      const made = await cloud.make(folder, fileName(key), d).catch(() => null);
      if (!made) return false;
      fileOf.set(key, made);
    }
    baseRev.set(key, Number(d.rev) || 1);
    // IT REACHED DRIVE, and the record says so from now on. The shelf is
    // told as well, so the fact survives being closed: `rev > pr` is how
    // the next session knows this card is still owed
    d.pr = Number(d.rev) || 1;
    owed.add(key);
    clearTimeout(timer);
    timer = setTimeout(flush, QUIET);
    return true;
  }

  async function pushAll() {
    if (pushing || !cloudOwed.size) return true;
    pushing = true;
    tellStatus('sending');
    const keys = [...cloudOwed];
    let bad = 0;
    for (const key of keys) {
      const ok = await pushOne(key);
      // A refused push KEEPS ITS MARK — the lesson this project paid for
      // twice: a write that failed and was quietly forgotten, with every
      // counter on the screen still green
      if (ok) cloudOwed.delete(key); else bad++;
    }
    pushing = false;
    tellStatus(bad ? 'unsent' : 'sent');
    return bad === 0;
  }

  // What Drive holds for one card, folded into what is here. Called when
  // a card is first read on this device, so another machine's attempts
  // are there before the reader looks for them
  async function pullOne(key) {
    if (!cloud.ready()) return false;
    const folder = await reachFolder(false);
    if (!folder) return false;
    let id = fileOf.get(key);
    if (!id) {
      id = await cloud.find(folder, fileName(key)).catch(() => null);
      if (!id) return false;
      fileOf.set(key, id);
    }
    const there = await cloud.read(id).catch(() => null);
    if (!there) return false;
    const d = pads.get(key) || shape(null);
    const had = d.sh.reduce((n, s) => n + s.s.length, 0);
    fold(d, shape(there));
    pads.set(key, d);
    baseRev.set(key, Number(there.rev) || 1);
    // Only written back if this device is actually holding something the
    // other end has not got; otherwise reading would cause a write, and
    // two devices reading would write at each other for ever
    if (d.sh.some(s => s.by === me && s.s.length)) { owed.add(key); cloudOwed.add(key); }
    return had !== d.sh.reduce((n, s) => n + s.s.length, 0) || true;
  }

  window.MyTermInkStore = {
    VER, SC, who: () => me,

    // ---------- the cloud side, and a seam for measuring it ----------
    cloudName: () => cloud.name || 'given',
    // ★ WHO THIS MACHINE IS, as a seam. A guard cannot stand in for two
    //   devices otherwise: it runs in ONE browser, so its "second
    //   machine" would carry this one's identity and the sheets it pulled
    //   would be counted as this one's own. Its first run said exactly
    //   that — "reading left this machine owing a card" — and the fault
    //   was in the fixture and not in the fold
    useWho: id => { if (id) me = String(id); return me; },
    useCloud: impl => {
      cloud = impl || liveCloud;
      inkFolder = ''; fileOf.clear(); baseRev.clear();
      return true;
    },
    // Told the chapter's own folder, so the ink folder can be found
    // inside it. Without it the store still works and simply stays local
    attach: folderId => { chapterFolder = String(folderId || ''); inkFolder = ''; fileOf.clear(); baseRev.clear(); },
    push: pushAll,
    pull: pullOne,
    cloudOwed: () => cloudOwed.size,
    fileIdOf: key => fileOf.get(key) || '',
    revOf: key => (pads.get(key) || {}).rev || 0,

    // The chapter whose cards are being read. Opening another one writes
    // out what is owed FIRST: everything else in this project that let
    // go of an unsent write before switching lost work, and it is the
    // same mistake every time
    open: async (courseId, chapterId) => {
      const next = String(courseId || '') + '/' + String(chapterId || '');
      if (next === scope) return true;
      // EVERYTHING OWED IS SENT BEFORE THE SCOPE CHANGES — to the shelf
      // and to Drive both. This project has lost work at exactly this
      // line twice: a chapter switch that walked away from an unsent
      // write, and the marks cleared behind it
      await flush();
      await pushAll();
      scope = next;
      pads.clear();
      openSheet.clear();
      inkFolder = ''; fileOf.clear(); baseRev.clear();
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
      // ★ A DEBT CARRIED OVER FROM A PREVIOUS SESSION. If the record says
      //   its newest version never reached Drive, it is owed again the
      //   moment it is read — so ink written while the network was down,
      //   or while the reader was signed out, goes up by itself the next
      //   time he opens that part. Without this the shelf keeps it and
      //   nothing ever sends it
      if (Number(d.rev) > Number(d.pr || 0) && d.sh.some(s => s.s.length)) cloudOwed.add(key);
      // And what the OTHER machine wrote, fetched behind this — not
      // awaited, because a card must appear with its own ink at once and
      // an attempt made on the tablet arriving a moment later is no loss
      if (cloud.ready() && chapterFolder) {
        pullOne(key).then(changed => { if (changed) told(key); }).catch(() => {});
      }
      return d;
    },
    // Whoever draws the card wants to know when another machine's
    // attempts have landed in it
    onPull: fn => { told = typeof fn === 'function' ? fn : () => {}; },
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

    // ============================================================
    // # 📑 🗓️  THE ATTEMPTS — "I GO BACK A TAB AND SOLVE IT AGAIN"
    // # 🔤 JavaScript
    // # 🎯 Seals the page in hand with the moment it was sealed, and
    // #    opens an empty one after it
    // # 🔗 EVERY SHEET KEEPS ITS OWN STROKES. The reader's own machine
    // #    had to keep the open sheet's strokes in a field of their own
    // #    and everything else in the list, because seven places in its
    // #    code read that one field — and the rule that followed (a
    // #    sheet is never in two places) had to be stated and guarded.
    // #    Nothing here reads strokes except through the open sheet, so
    // #    the list holds them all and there is no rule to break.
    // #
    // # 🔗 AND THE NUMBER IS A NUMBER. What is stored is `ts` in
    // #    milliseconds and never the words: a stored date freezes the
    // #    way it was written on the day it was written, so the day the
    // #    reader asks for a different clock the old sheets keep the old
    // #    shape and the strip reads in two formats at once. The words
    // #    are built at the moment of showing, from the number.
    // ============================================================
    seal: key => {
      const d = pads.get(key);
      if (!d) return false;
      const i = at(key);
      // An empty page is not sealed and does not breed another: the
      // reader would be told "saved" and handed a blank page, with
      // nothing having been saved at all
      if (!d.sh[i].s.length) return false;
      d.sh[i].ts = Date.now();
      d.sh[i].at = now();
      d.sh.push({ id: newId(), by: me, ts: 0, at: now(), s: [] });
      openSheet.set(key, d.sh.length - 1);
      wrote(key);
      return true;
    },
    go: (key, i) => {
      const d = pads.get(key);
      if (!d || !(i >= 0) || i >= d.sh.length) return false;
      openSheet.set(key, i);
      return true;
    },
    // Taken away for good, and said so when asked. Three conditions,
    // and the first is the one that keeps the notebook usable at all
    drop: (key, i) => {
      const d = pads.get(key);
      if (!d) return false;
      if (d.sh.length < 2) return false;        // the last page is not deleted: the box needs one to write on
      if (!(i >= 0) || i >= d.sh.length) return false;
      d.sh.splice(i, 1);
      const now_ = at(key);
      openSheet.set(key, Math.min(now_ > i ? now_ - 1 : now_, d.sh.length - 1));
      wrote(key);
      return true;
    },

    // ============================================================
    // THE NAME OF AN ATTEMPT — GREGORIAN AND TWELVE-HOUR, BY HAND
    //
    // Built from getFullYear/getMonth/getDate and a comparison, NEVER
    // from a locale formatter. This is measured, not feared: on the
    // reader's own machine the negative test of this very function put
    // out `1448/4/19` for `2026/9/30` when the locale was allowed to
    // choose a calendar, and `١٢:٠٠ ص` when it was allowed to choose
    // the digits and the period. The two letters wanted are AM and PM,
    // so they are written in the code and not borrowed.
    //
    // And the two hours that break the naive conversion are handled
    // openly: `h % 12` alone makes midnight "0 AM" and noon "0 PM", so
    // `|| 12` returns them to 12; and the period comes from the
    // twenty-four-hour value, because after the conversion noon and
    // midnight are the same number and neither can be told from the
    // other.
    // ============================================================
    stamp: ts => {
      if (!ts) return '';
      const t = new Date(ts);
      const h24 = t.getHours();
      const h12 = (h24 % 12) || 12;
      return t.getFullYear() + '/' + (t.getMonth() + 1) + '/' + t.getDate()
        + ' ' + h12 + ':' + String(t.getMinutes()).padStart(2, '0')
        + ' ' + (h24 < 12 ? 'AM' : 'PM');
    },

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
