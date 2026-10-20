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

  // ============================================================
  // # 🖋️ 📐  THE ENGINE: A FLAT NIB, SWEPT
  // # 🔤 JavaScript
  // # 🎯 Turns a stroke's points into the shape a nib would leave
  // # 🔗 CHOSEN OUT OF EIGHTEEN IN THE READER'S OWN LABORATORY, and
  // #    carried here unchanged — the numbers are his, picked by
  // #    writing with them. There is NO WIDTH RULE in it: the nib has a
  // #    length, a thickness and a fixed angle, and the width you see
  // #    is a consequence of geometry — `L · |sin(φ − θ)|`, where φ is
  // #    the direction of the hand. A stroke across the nib shows its
  // #    whole length and comes out broad; one along it shows only its
  // #    thickness and comes out a hair. That is what was asked for —
  // #    "thick and thin by the direction of the writing" — and it
  // #    brings three things with it at no cost: the end of a stroke is
  // #    cut at the nib's angle instead of bulging round, a dot is the
  // #    nib's own print rather than a circle borrowed from elsewhere,
  // #    and the expression sits on TWO axes (pressure and direction)
  // #    rather than one.
  // ============================================================
  const NIB_ANGLE = 45 * Math.PI / 180;   // the angle the nib is cut at
  const NIB_FLAT = 0.35;                  // thickness ÷ length: contrast that is felt, not shouted
  const INK_HAIR = 0.06;                  // the thinnest the line may go, as a fraction
  const INK_PRESS = 0.92;                 // the share of the nib's length given to pressure
  const INK_GAMMA = 0.42;                 // a power under one OPENS THE LIGHT END: a light touch is a hair, not a third of the width
  const INK_VEL = 0.38;                   // a hurrying hand thins the line, as real ink does
  const INK_STREAM = 0.42;                // the path is drawn towards the point before it, so the tremor dissolves
  const INK_TAPER = 0.22;                 // both ends drawn to a point
  // Tied to the path's own smoothing exactly as it was in the
  // laboratory, not a number of its own to be tuned apart from it
  const INK_PSMOOTH = 1 - INK_STREAM * 0.55;
  // ★ SPEED IS MEASURED BY THE GAP BETWEEN POINTS, NOT BY TIME. No
  //   timestamps are stored — a stroke is three numbers a point — and
  //   the digitiser reports at a fixed rate, so the gap is the speed
  //   times a constant. 1.6 px/ms × 4.2 ms a point = 6.7 pixels.
  //   AND THAT IS WHY A STROKE IS DRAWN AFTER A RELOAD EXACTLY AS IT
  //   WAS DRAWN THE FIRST TIME: nothing in the sum is outside what was
  //   stored. Put the clock in it and the line would differ between one
  //   session and the next by how the browser happened to schedule
  const INK_VSPAN = 6.7 * SC;
  const INK_VSM = 0.35;
  // While the pen is still down the stroke's length is not known yet,
  // so a middling taper is assumed; what changes on the lift is a pixel
  // or two at the very start, which is not visible
  const INK_TLEN_WET = 6 * SC;

  const nibThick = L => Math.max(0.8, L * (INK_HAIR + (1 - INK_HAIR) * (1 - NIB_FLAT)));
  const ease = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
  // The nib's length at one point: how far it is from the start, from
  // the end, and how long the taper is. The distance to the end is
  // Infinity while the pen is still writing — an end not yet reached is
  // not tapered
  const nibLen = (base, pr, vel, dStart, dEnd, tlen) => {
    let m = (1 - INK_PRESS) + INK_PRESS * Math.pow(norm(pr), INK_GAMMA);
    const f = Math.min(1, vel / INK_VSPAN);
    m *= (1 - INK_VEL) + INK_VEL * (1 - f * 0.85);
    if (INK_TAPER > 0) m *= Math.min(ease(dStart / tlen), ease(dEnd / tlen)) * 0.92 + 0.08;
    return Math.max(0.8, base * SC * Math.max(INK_HAIR, m));
  };
  // A share of the stroke, not a fixed number: a short stroke was read
  // as all taper and crushed. Two pixels at least, so it never vanishes
  const taperLen = total => Math.max(2 * SC, total * 0.32 * INK_TAPER);

  // The nib's print at one place: a stadium at the cutting angle, drawn
  // as TWO ARCS and not as a rounded rectangle inside save/rotate/
  // restore — the arcs write the shape straight into canvas coordinates,
  // so there is no matrix swap and no state save per print, and the
  // prints run into the thousands on a full repaint
  const NIB_EX = Math.cos(NIB_ANGLE), NIB_EY = Math.sin(NIB_ANGLE);
  const NIB_A0 = NIB_ANGLE - Math.PI / 2, NIB_A1 = NIB_ANGLE + Math.PI / 2;
  const stamp = (c, x, y, L, t) => {
    const r = t / 2, h = Math.max(0, (L - t) / 2);
    c.beginPath();
    c.arc(x + NIB_EX * h, y + NIB_EY * h, r, NIB_A0, NIB_A1);
    c.arc(x - NIB_EX * h, y - NIB_EY * h, r, NIB_A1, NIB_A1 + Math.PI);
    c.closePath();
    c.fill();
  };

  // One pulled segment: the quadrilateral swept between two nib
  // positions, plus prints along it. THE PRINTS ARE NOT DECORATION — in
  // the direction ALONG the nib that quadrilateral has no area at all,
  // so without them the stroke breaks into separate beads. It was seen
  // with the eye and reported: the diagonal from bottom-right to
  // top-left came out dotted
  const span = (c, x0, y0, L0, x1, y1, L1) => {
    const h0 = L0 / 2, h1 = L1 / 2;
    c.beginPath();
    c.moveTo(x0 + NIB_EX * h0, y0 + NIB_EY * h0);
    c.lineTo(x1 + NIB_EX * h1, y1 + NIB_EY * h1);
    c.lineTo(x1 - NIB_EX * h1, y1 - NIB_EY * h1);
    c.lineTo(x0 - NIB_EX * h0, y0 - NIB_EY * h0);
    c.closePath();
    c.fill();
    const d = Math.hypot(x1 - x0, y1 - y0);
    const small = Math.min(L0, L1);
    const step = Math.max(0.9, Math.min(small, nibThick(small)) * 0.5);
    const k = Math.ceil(d / step);
    if (k > 1) for (let j = 1; j < k; j++) {
      const u = j / k, Lu = L0 + (L1 - L0) * u;
      stamp(c, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, Lu, nibThick(Lu));
    }
    stamp(c, x1, y1, L1, nibThick(L1));
  };

  // ★ PREPARING THE POINTS IS CUMULATIVE: it resumes where it left off
  //   and is never redone from the beginning. That is possible because
  //   everything a point needs comes from the point BEFORE it alone —
  //   a smoothed position, a smoothed pressure, a smoothed speed and a
  //   running length. Nothing in it looks forward. And on that one fact
  //   rests the whole of the cheap live drawing below: a segment is
  //   FINAL as soon as both its ends exist
  const prep = (p, a) => {
    const n = p.length / 3;
    if (!a) a = [];
    for (let i = a.length; i < n; i++) {
      const rx = p[i * 3], ry = p[i * 3 + 1], rp = (p[i * 3 + 2] || 0) / 255;
      if (!i) { a.push({ x: rx, y: ry, pr: rp, v: 0, d: 0 }); continue; }
      const q = a[i - 1];
      const x = q.x + (rx - q.x) * (1 - INK_STREAM);
      const y = q.y + (ry - q.y) * (1 - INK_STREAM);
      const sp = Math.hypot(x - q.x, y - q.y);
      a.push({ x, y,
               pr: q.pr + (rp - q.pr) * INK_PSMOOTH,
               v: q.v + (sp - q.v) * INK_VSM,
               d: q.d + sp });
    }
    return a;
  };
  const runLen = a => (a.length ? a[a.length - 1].d : 0);

  // A DELIBERATE TOUCH IS NOT A VERY SHORT STROKE. Three things used to
  // gang up on it — the taper read it as an end, the pressure of a quick
  // tap had not peaked, and the instantaneous speed was high — and it
  // came out under a pixel and was not seen at all. So it is measured by
  // its PEAK pressure, with no taper and no speed, and has a visible
  // floor: it leaves the nib's full print, as a touch does on paper
  const dotLen = (st, a) => {
    let pk = 0;
    for (let i = 0; i < a.length; i++) if (a[i].pr > pk) pk = a[i].pr;
    const m = 0.62 + 0.58 * Math.pow(norm(pk), INK_GAMMA);
    return Math.max(1.6 * SC, st.w * SC * m);
  };
  const dotThresh = st => Math.max(1.2 * SC, st.w * SC * 0.35);

  // `from` is what lets this resume: zero draws the whole stroke, and
  // anything above it draws only what is new, over what is already
  // there. `total` is zero while writing (so the end nobody has reached
  // is not tapered) and the real length after the lift
  const paintRun = (c, st, a, from, total, carry) => {
    const wet = !(total > 0);
    const tlen = wet ? INK_TLEN_WET : taperLen(total);
    const len = q => nibLen(st.w, q.pr, q.v, q.d, wet ? Infinity : (total - q.d), tlen);
    let L0 = carry || 0, i = (from | 0);
    if (i <= 0) {
      L0 = len(a[0]);
      stamp(c, a[0].x, a[0].y, L0, nibThick(L0));
      i = 1;
    }
    for (; i < a.length; i++) {
      const q = a[i], L1 = len(q);
      span(c, a[i - 1].x, a[i - 1].y, L0, q.x, q.y, L1);
      L0 = L1;
    }
    return L0;
  };

  // One whole stroke, as it is drawn on a page that is being rebuilt
  const drawStroke = (c, st) => {
    if (!st || !st.p || st.p.length < 3) return;   // a stroke with no point draws nothing and breaks nothing
    c.fillStyle = st.c;
    const a = prep(st.p), total = runLen(a);
    if (total < dotThresh(st)) {
      const L = dotLen(st, a);
      stamp(c, a[a.length - 1].x, a[a.length - 1].y, L, nibThick(L));
      return;
    }
    paintRun(c, st, a, 0, total, 0);
  };

  // The nominal width at a given pressure, with no speed and no taper.
  // This is what a guard measures pressure sensitivity by: the ratio
  // between the thickest line and the thinnest
  const nominal = (base, pr) => nibLen(base || WIDTHS[1], pr, 0, Infinity, Infinity, 1) / SC;

  // ============================================================
  // ★ `desynchronized` FOR THE LIVE LAYER ONLY
  //
  // It is the low-latency path: the canvas is handed to the screen
  // without waiting for the compositor, so the ink keeps up with the
  // nib. Its price is that what is SHOWN follows the drawing commands
  // rather than the state of the canvas — a frame with nothing new in
  // it can stay on screen even after the store under it changed.
  //
  // That is acceptable on the live layer, which only exists while the
  // pen is drawing on it, and a FAULT on the dry page: erasing REMOVES
  // pixels and adds none, so no new drawing command pushes a frame, and
  // the erasure stays invisible until the next stroke. The reader met
  // exactly that on his own machine and said so.
  //
  // So every context for a canvas is taken from here — even where no
  // transform is wanted. A bare `getContext('2d')` on the live layer
  // takes its fast path away for ever, and the places that ask for a
  // context are many
  // ============================================================
  const raw = cv => (cv.classList && cv.classList.contains('inkWet')
    ? cv.getContext('2d', { desynchronized: true })
    : cv.getContext('2d'));

  const ctxOf = cv => {
    const c = raw(cv);
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

  // THE PLACEHOLDER IS GONE. What stood here drew the stroke as a line
  // whose width followed the pressure — written only so that the first
  // phase could be measured end to end. The engine above replaced it
  // with no change to the store, to the pen path, or to anything already
  // written, which is why the stroke's stored shape was kept identical
  // to the one that engine reads from the first line of code.

  const repaint = cv => {
    if (!cv.width) return;
    const box = cv.closest('.inkBox');
    const c = ctxOf(cv);
    c.clearRect(0, 0, cv.width * SC, cv.height * SC);
    store().strokes(box.dataset.key).forEach(st => drawStroke(c, st));
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

  // ============================================================
  // THE LIVE LAYER IS ADDED TO, NOT REDRAWN
  //
  // A swept nib costs about five fills a point. Redrawn whole every
  // frame, the frame's cost grows with the length of the stroke and the
  // total cost is QUADRATIC in it: the writing starts quick and gets
  // heavier the longer the line — the worst kind of slowness, because it
  // appears where nobody is looking for it.
  //
  // It can be added to instead because of one fact in `prep`: every
  // point is computed from the one before it alone, so a segment is
  // FINAL the moment both its ends exist. Nothing is cleared and nothing
  // is recomputed — the new points are drawn over what is already there,
  // and the frame costs what has just arrived (eight points or fewer),
  // whatever the stroke has grown to. Measured on the machine this came
  // from: 0.037 ms a frame, and the last frames of a stroke cheaper than
  // the first.
  //
  // THE PRICE IS STATED, NOT HIDDEN: while writing, the far end is not
  // tapered (an end not yet reached cannot be), and the near end's taper
  // uses a fixed assumed length. On the lift the whole stroke is drawn
  // once more, exactly, onto the dry page — a pixel or two at the ends,
  // and no one sees it happen.
  // ============================================================
  const wetDraw = () => {
    if (!draw || !draw.ctx || !draw.st) return;
    const c = draw.wet || draw.cv;
    if (!c.width) return;
    const a = draw.pts = prep(draw.st.p, draw.pts);
    if (!a.length) return;
    const ctx = draw.ctx, total = runLen(a);
    ctx.fillStyle = draw.st.c;
    // Still a touch and not yet a stroke: redrawn whole every frame —
    // a handful of points over the area of a fingernail, so the cost is
    // nothing — and sized by its PEAK pressure so it never comes out a
    // blind speck
    if (total < dotThresh(draw.st)) {
      if (draw.wet) ctx.clearRect(0, 0, c.width * SC, c.height * SC);
      const L = dotLen(draw.st, a);
      stamp(ctx, a[a.length - 1].x, a[a.length - 1].y, L, nibThick(L));
      draw.done = 0; draw.carry = 0;
      return;
    }
    // It has just become a stroke after being a dot: the dot is cleared
    // once, and from here on the drawing accumulates
    if (!draw.done && draw.wet) ctx.clearRect(0, 0, c.width * SC, c.height * SC);
    draw.carry = paintRun(ctx, draw.st, a, draw.done, 0, draw.carry);
    draw.done = a.length;
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
    draw = { erase: false, id: ev.pointerId, cv, key, st, wet, ctx: ctxOf(wet),
             pts: [], done: 0, carry: 0, raf: 0 };
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
      drawStroke(ctxOf(d.cv), d.st);
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
    // ============================================================
    // THE ENGINE, OPENED FOR MEASUREMENT
    //
    // Not a convenience: these are the pieces the guards have to RUN.
    // A guard that restates the nib's arithmetic in its own code proves
    // only that two copies of one idea agree, which is the one thing
    // never in doubt — and the three numbers that matter here (the
    // pressure range, the broad-to-hair ratio, and whether a live frame
    // costs more as the stroke grows) cannot be read off the source at
    // all. They have to be drawn and counted.
    // ============================================================
    engine: {
      prep, runLen, paintRun, drawStroke, nominal, stamp, nibThick, nibLen,
      dotLen, dotThresh,
      consts: { SC, NIB_ANGLE, NIB_FLAT, INK_HAIR, INK_PRESS, INK_GAMMA, INK_VEL,
                INK_STREAM, INK_TAPER, INK_VSPAN, INK_VSM, WIDTHS }
    },
    drawStroke, nominal,
    PALM_PX
  };
})();
