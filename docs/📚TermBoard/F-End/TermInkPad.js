// ============================================================
// # 🖊️ 📐  THE NOTEBOOK UNDER A PRACTICE CARD
// # 🔤 JavaScript
// # 🎯 Puts a writing area under every card of a rules part, draws what
// #    the store holds, and takes the pen's strokes into it
// # 🔗 MEASURED BEFORE IT WAS WRITTEN (2026-10-20, ACCT210 Ch1): a card
// #    is a page of 800 × 1131 laid out, its question `.qcard` is 160
// #    tall, and the room under it runs 825–979 with a median of 963 —
// #    within two per cent of the same measurement on the reader's own
// #    machine, where this feature already works. So the shape is not
// #    redesigned here; it is carried.
// #
// # 🔗 AND THE SHEETS ARE REBUILT UNDER US. Opening a part builds all
// #    thirty-five sheets from their stored markup, so every notebook
// #    in the old page dies with it. Measured: a part switch rebuilds
// #    all of them, while `refit`, the language switch and a tick
// #    rebuild NONE. So there is exactly one place to re-inject from —
// #    after a draw — and the ink lives in the store, never in markup.
// #
// # 🔗 THE LAYOUT SIZE IS PINNED AT 800 whatever the page is scaled to,
// #    which is the condition the reader's own machine had to force by
// #    hand (its full-screen mode kept the layout fixed and zoomed
// #    visually, or every stored coordinate would have changed meaning
// #    and the writing would have slid into the corner). Here it holds
// #    by construction: `--sheetScale` is a transform, nothing more.
// ============================================================
(() => {
  const store = () => window.MyTermInkStore;
  const SC = 2;                        // store space = CSS pixels × 2

  // ============================================================
  // THE PEN'S OWN NUMBERS — MEASURED, NOT GUESSED
  //
  // From `Coding_Guide/GuardPenProbe.html` run on the reader's Surface
  // (2026-10-20): pressure arrives 0.10–1.00 · coalesced points come in
  // runs of 3 to 6 · hover leads the nib by 106 ms · tilt 13–27° ·
  // and `buttons` reported 1 only, so the tail eraser is NOT a reliable
  // path on this pen and the toolbar's eraser is the one that must work.
  //
  // The contact-size numbers were NOT re-measured here (no touch reached
  // the probe at all, so its 0/0 means "not measured" and not "zero"):
  // PALM_PX is carried from the measurement taken on THIS SAME DEVICE
  // for the local app — finger and palm 43–115 CSS pixels, median 66 —
  // and ninety separates a clear palm from a finger with room to spare.
  // It is declared as carried so that nobody later reads it as measured.
  // ============================================================
  const PR_LO = 0.10, PR_HI = 1.00;
  const PALM_PX = 90;                  // carried from the local app's measurement
  const COLORS = ['#12141a', '#c0392b', '#1f6fb8', '#1d8a5a'];
  const WIDTHS = [3.5, 5.5, 8];
  const ERASE_R = 10 * SC;

  let colour = COLORS[0], slot = 1, mode = 'pen';
  let where = null;

  // ---------- the pen's own pressure range, which learns the hand ----------
  let prLo = PR_LO, prHi = PR_HI;
  const learn = pr => {
    if (!(pr > 0)) return;
    if (pr < prLo) prLo = pr;
    if (pr > prHi) prHi = pr;
  };
  const norm = pr => {
    const n = ((pr || 0) - prLo) / Math.max(0.05, prHi - prLo);
    return Math.max(0, Math.min(1, n));
  };

  const keyOf = box => box.dataset.group + '#' + box.dataset.at;

  // ============================================================
  // # 🧱 🧰  THE BOX
  // # 🔤 JavaScript
  // # 🎯 One source for its shape, because it will be wanted in a second
  // #    place (the bank's practical questions) and two sources drift
  // ============================================================
  const build = () => {
    const box = document.createElement('div');
    box.className = 'inkBox';
    const sw = COLORS.map(c =>
      `<button class="inkBtn inkSw" data-ink="color" data-c="${c}" style="background:${c}" title="Ink"></button>`).join('');
    const wz = WIDTHS.map((v, i) =>
      `<button class="inkBtn inkWz" data-ink="width" data-i="${i}" title="Nib">${v}</button>`).join('');
    box.innerHTML =
        '<div class="inkBar">'
      +   '<span class="inkGrp">' + sw + '</span>'
      +   '<span class="inkGrp">' + wz + '</span>'
      +   '<span class="inkGrp">'
      +     '<button class="inkBtn" data-ink="erase" title="Rub out whole strokes">⌫</button>'
      +     '<button class="inkBtn" data-ink="undo" title="Take back the last stroke">↶</button>'
      +     '<button class="inkBtn" data-ink="clear" title="Empty this page">✕</button>'
      +   '</span>'
      + '</div>'
      + '<div class="inkPad"><canvas class="inkDry"></canvas><canvas class="inkWet"></canvas></div>';
    return box;
  };

  // ---------- canvas store, kept at the density it is drawn at ----------
  const raw = cv => cv.getContext('2d');
  const ctxOf = cv => {
    const c = cv.getContext('2d');
    const k = Number(cv.dataset.ratio) || 1;
    c.setTransform(k / SC, 0, 0, k / SC, 0, 0);   // store space (×SC) → device pixels
    c.lineCap = c.lineJoin = 'round';
    return c;
  };

  // Returns 0 when the canvas has no size yet, 2 when its store is
  // already what it should be (so nothing is redrawn — this is the whole
  // saving when a part is scrolled through), and 1 when the store was
  // changed, which empties it and makes a repaint necessary
  const fit = cv => {
    const w = cv.offsetWidth, h = cv.offsetHeight;
    if (!w || !h) return 0;
    const live = where ? (parseFloat(getComputedStyle(where).getPropertyValue('--sheetScale')) || 1) : 1;
    const k = Math.min(3, (window.devicePixelRatio || 1) * live);
    const want = [Math.round(w * k), Math.round(h * k)];
    if (cv.width === want[0] && cv.height === want[1] && cv.dataset.ratio === String(k)) return 2;
    cv.dataset.ratio = String(k);
    cv.width = want[0]; cv.height = want[1];
    return 1;
  };

  // ============================================================
  // ONE STROKE, DRAWN AS A LINE WHOSE WIDTH FOLLOWS THE PRESSURE
  //
  // THIS IS A PLACEHOLDER AND IS MEANT TO BE REPLACED. The engine the
  // reader chose out of eighteen in his own laboratory is a flat nib
  // swept from point to point, where the width is a geometric
  // consequence of the direction of the hand — and it is the next phase
  // of the plan, carried across function by function.
  //
  // It is kept separate on purpose: the stroke SHAPE stored here is
  // identical to the one that engine reads, so swapping the painter
  // changes nothing in the store, in the pen path, or in what is
  // already written. Everything below this line survives the swap.
  // ============================================================
  const paint = (c, st) => {
    const p = st.p;
    c.strokeStyle = st.c;
    for (let i = 3; i < p.length; i += 3) {
      const pr = norm(p[i + 2] / 255);
      c.lineWidth = Math.max(0.6, st.w * (0.18 + 0.82 * Math.pow(pr, 0.6))) * SC;
      c.beginPath();
      c.moveTo(p[i - 3], p[i - 2]);
      c.lineTo(p[i], p[i + 1]);
      c.stroke();
    }
    if (p.length === 3) {                 // a deliberate dot is not a short stroke
      c.fillStyle = st.c;
      c.beginPath();
      c.arc(p[0], p[1], Math.max(0.5, st.w * 0.45) * SC, 0, Math.PI * 2);
      c.fill();
    }
  };

  const repaint = cv => {
    if (!cv.width) return;
    const box = cv.closest('.inkBox');
    const c = ctxOf(cv);
    c.clearRect(0, 0, cv.width * SC, cv.height * SC);
    store().strokes(box.dataset.key).forEach(st => paint(c, st));
  };

  const wetOf = box => box.querySelector('.inkWet');

  // ============================================================
  // # ✋ 🖊️  THE FINGER SCROLLS AND THE PEN WRITES
  // # 🔤 JavaScript
  // # 🔗 THE STROKE BELONGS TO ONE POINTER ID. Without that line every
  // #    moving pointer — the palm resting on the glass — is added to
  // #    the pen's live stroke, and the line runs from the nib to the
  // #    palm and back. It is the fault the reader reported on his own
  // #    machine, and palm rejection does not prevent it: rejection
  // #    stops the page scrolling, it does not stop a second pointer
  // #    joining a stroke that is already being drawn.
  // ============================================================
  let draw = null;
  let penLast = 0;
  const penNear = () => (Date.now() - penLast) < 1000;
  const isPalm = ev => ev.pointerType === 'touch' && ev.width > 1
                    && (ev.width > PALM_PX || ev.height > PALM_PX);

  ['pointerover', 'pointermove', 'pointerdown', 'pointerup', 'pointerrawupdate'].forEach(t => {
    try {
      document.addEventListener(t, ev => { if (ev.pointerType === 'pen') penLast = Date.now(); },
        { capture: true, passive: true });
    } catch {}
  });

  const spot = (cv, ev) => {
    const r = cv.getBoundingClientRect();
    const k = (r.width / cv.offsetWidth) || 1;
    return [Math.round((ev.clientX - r.left) / k * SC),
            Math.round((ev.clientY - r.top) / k * SC),
            Math.max(0, Math.min(255, Math.round((ev.pressure || 0.5) * 255)))];
  };

  const wetDraw = () => {
    if (!draw || !draw.ctx) return;
    const st = draw.st, p = st.p;
    // Added, never redrawn: every point is computed from the one before
    // it alone, so the frame costs what has just arrived and not what
    // the stroke has grown to. Drawn whole each frame instead, the cost
    // is quadratic in the length of the stroke — which is the worst kind
    // of slowness, since it appears only once the writing gets long
    draw.ctx.strokeStyle = st.c;
    for (let i = Math.max(3, draw.done); i < p.length; i += 3) {
      const pr = norm(p[i + 2] / 255);
      draw.ctx.lineWidth = Math.max(0.6, st.w * (0.18 + 0.82 * Math.pow(pr, 0.6))) * SC;
      draw.ctx.beginPath();
      draw.ctx.moveTo(p[i - 3], p[i - 2]);
      draw.ctx.lineTo(p[i], p[i + 1]);
      draw.ctx.stroke();
    }
    draw.done = Math.max(3, p.length);
  };

  document.addEventListener('pointerdown', ev => {
    const cv = ev.target.closest && ev.target.closest('.inkDry');
    if (!cv) return;
    const box = cv.closest('.inkBox');
    const key = box.dataset.key;
    if (ev.pointerType === 'touch') return;          // the finger is left to the page
    if (ev.pointerType !== 'pen' && ev.pointerType !== 'mouse') return;
    if (draw) return;                                // one stroke is not cut by another
    ev.preventDefault();
    if (!cv.width && fit(cv)) repaint(cv);
    try { cv.setPointerCapture(ev.pointerId); } catch {}

    const p = spot(cv, ev);
    if (mode === 'erase' || (ev.pointerType === 'pen' && (ev.buttons & 32))) {
      draw = { erase: true, id: ev.pointerId, cv, key };
      if (store().eraseAt(key, p[0], p[1], ERASE_R)) repaint(cv);
      return;
    }
    learn(ev.pressure);
    const st = { c: colour, w: WIDTHS[slot], p };
    store().add(key, st);
    const wet = wetOf(box);
    box.classList.add('penDown');
    fit(wet);
    draw = { erase: false, id: ev.pointerId, cv, key, st, wet, ctx: ctxOf(wet), done: 0, raf: 0 };
    wetDraw();
  });

  document.addEventListener('pointermove', ev => {
    if (!draw || ev.pointerId !== draw.id || ev.pointerType === 'touch') return;
    if (draw.erase) {
      const p = spot(draw.cv, ev);
      if (store().eraseAt(draw.key, p[0], p[1], ERASE_R)) repaint(draw.cv);
      return;
    }
    // Every point the pen reported, not the ones that happened to land on
    // a frame: the browser gathers them between frames and hands them
    // over only when asked. Measured on this device: runs of three to
    // six. And the list can come back EMPTY, which is an honest answer —
    // so its length is tested, not its existence, or a stroke keeps only
    // its first point and nothing says why
    let evs = (ev.getCoalescedEvents && ev.getCoalescedEvents()) || [];
    if (!evs.length) evs = [ev];
    const p = draw.st.p;
    for (let i = 0; i < evs.length; i++) {
      const q = spot(draw.cv, evs[i]);
      const n = p.length;
      if (n >= 3 && q[0] === p[n - 3] && q[1] === p[n - 2]) continue;
      p.push(q[0], q[1], q[2]);
      learn(evs[i].pressure);
    }
    // Once per frame, not once per event: the pen reports faster than the
    // screen can show
    if (!draw.raf) draw.raf = requestAnimationFrame(() => { if (draw) { draw.raf = 0; wetDraw(); } });
  });

  const lift = ev => {
    if (!draw) return;
    if (ev && ev.pointerType === 'touch') return;     // a finger lifting ends nothing
    if (ev && ev.pointerId !== draw.id) return;
    const d = draw; draw = null;
    if (d.raf) cancelAnimationFrame(d.raf);
    const box = d.cv.closest('.inkBox');
    if (!d.erase) {
      // The stroke dries onto the page BEFORE the live layer is cleared,
      // so its place is never without ink for even one frame — and it is
      // added alone rather than by repainting the page, or every lift
      // would redraw everything written so far and be felt at the end of
      // every letter
      paint(ctxOf(d.cv), d.st);
      const wet = wetOf(box);
      if (wet) { raw(wet).clearRect(0, 0, wet.width, wet.height); wet.width = 0; wet.height = 0; }
      box.classList.remove('penDown');
    }
    store().flush();
  };
  document.addEventListener('pointerup', lift);
  document.addEventListener('pointercancel', lift);

  // ---------- the toolbar ----------
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('.inkBtn');
    if (!b) return;
    ev.stopPropagation();                             // a press on a tool is not a press on the card
    const box = b.closest('.inkBox');
    const cv = box.querySelector('.inkDry');
    const key = box.dataset.key;
    const what = b.dataset.ink;
    if (what === 'color') { colour = b.dataset.c; mode = 'pen'; }
    else if (what === 'width') { slot = +b.dataset.i; mode = 'pen'; }
    else if (what === 'erase') { mode = mode === 'erase' ? 'pen' : 'erase'; }
    else if (what === 'undo') { if (store().undo(key)) repaint(cv); }
    else if (what === 'clear') {
      if (store().has(key) && !confirm('Empty this page? The attempts kept beside it are not touched.')) return;
      if (store().clear(key)) repaint(cv);
    }
    tools();
  });

  const tools = () => {
    if (!where) return;
    where.querySelectorAll('.inkBox').forEach(box => {
      box.querySelectorAll('[data-ink="color"]').forEach(b =>
        b.classList.toggle('on', b.dataset.c === colour && mode !== 'erase'));
      box.querySelectorAll('[data-ink="width"]').forEach(b =>
        b.classList.toggle('on', +b.dataset.i === slot && mode !== 'erase'));
      box.querySelectorAll('[data-ink="erase"]').forEach(b => b.classList.toggle('on', mode === 'erase'));
    });
  };

  window.MyTermInkPad = {
    // Told where the sheets are drawn, once
    arm: spotEl => { where = typeof spotEl === 'string' ? document.getElementById(spotEl) : spotEl; return Boolean(where); },

    // ============================================================
    // CALLED AFTER EVERY DRAW, AND ITS COST IS ONE PASS
    //
    // A card that already has its box is left alone, so a draw that
    // rebuilt nothing costs nothing. And the record is read off the
    // shelf per card — seventy-four small reads for a part of
    // seventy-four, and none at all for the cards never looked at.
    // ============================================================
    mount: async () => {
      if (!where || !store()) return 0;
      const cards = [...where.querySelectorAll('.msheet-card')];
      let made = 0;
      for (const card of cards) {
        if (card.querySelector('.inkBox')) continue;
        const box = build();
        box.dataset.key = keyOf(card);
        card.appendChild(box);
        made++;
        await store().load(box.dataset.key);
        const cv = box.querySelector('.inkDry');
        if (fit(cv) === 1) repaint(cv);
      }
      tools();
      return made;
    },

    // The page is scaled, not re-laid-out, so the stores need a new
    // density and nothing else. `fit` says whether it actually changed
    // anything, and a canvas whose store is already right is not touched
    refit: () => {
      if (!where) return 0;
      let drawn = 0;
      where.querySelectorAll('.inkDry').forEach(cv => { if (fit(cv) === 1) { repaint(cv); drawn++; } });
      return drawn;
    },

    // For the guard and for anything that must know the pen is down
    writing: () => Boolean(draw),
    tool: () => ({ colour, slot, mode, palm: PALM_PX, pressure: [prLo, prHi] }),
    paintStroke: paint,
    PALM_PX
  };
})();
