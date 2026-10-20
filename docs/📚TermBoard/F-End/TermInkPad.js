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
      +     '<button class="inkBtn inkSelBtn" data-ink="select"'
      +       ' title="Select what you wrote, then shrink it with the corner or move it from the middle">'
      +       '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"'
      +       ' stroke-width="2.2" stroke-linecap="round" stroke-dasharray="4 3">'
      +       '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/></svg></button>'
            // A RUBBER, DRAWN. What stood here was U+232B, a keyboard's
            // backspace: it reads as "delete the last thing" and this
            // button rubs out whatever the nib passes over. The reader
            // could not tell what it was, which is the whole of the fault
      +     '<button class="inkBtn inkEraseBtn" data-ink="erase" title="Rub out whole strokes">'
      +       '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"'
      +       ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      +       '<path d="M9 20h12"/>'
      +       '<path d="M13.4 4.9l5.7 5.7a1.7 1.7 0 0 1 0 2.4l-6.6 6.6a1.7 1.7 0 0 1-2.4 0'
      +       'l-5.7-5.7a1.7 1.7 0 0 1 0-2.4l6.6-6.6a1.7 1.7 0 0 1 2.4 0z"/>'
      +       '<path d="M7.2 11.1l5.7 5.7"/></svg></button>'
      +     '<button class="inkBtn" data-ink="undo" title="Take back the last stroke">↶</button>'
      +     '<button class="inkBtn" data-ink="clear" title="Empty this page">✕</button>'
      +   '</span>'
      + '</div>'
      // ★ The attempts strip is its OWN element and not a child of the
      //   toolbar: a guard counts the toolbar's children — four inks and
      //   three nibs — so a button added inside it would fail a standing
      //   check. And it sits between the toolbar and the paper, stuck to
      //   the top edge of the paper as a browser's tabs are stuck to
      //   their page: the tab is "attached to the box itself", not a row
      //   floating above it
      + '<div class="inkTabs">'
      +   '<button class="inkBtn inkFullBtn" data-ink="full" title="The whole screen — write, then leave with Esc">'
      +     '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"'
      +     ' stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
      +     '<path d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5"/></svg></button>'
      +   '<button class="inkBtn inkSaveBtn" data-ink="seal"'
      +     ' title="Seal this attempt with today\'s date and open an empty one">Save</button>'
      +   '<span class="inkTabStrip"></span>'
      // Shown ONLY while something is still owed. A badge that lights up
      // on every letter is noise — the reader had one removed from his
      // own machine for exactly that — but ink that has not left the
      // device is a thing he must be able to see, since he cannot tell
      // by looking at the page
      +   '<span class="inkState" hidden>not sent yet</span>'
      + '</div>'
      + '<div class="inkPad"><canvas class="inkDry"></canvas><canvas class="inkWet"></canvas></div>';
    return box;
  };

  // ============================================================
  // # 📑 🏷️  THE STRIP OF ATTEMPTS
  // # 🔤 JavaScript
  // # 🎯 A tab for each attempt: its number, and the moment it was
  // #    sealed once it has been
  // # 🔗 THE WHOLE NAME IS THE IDENTITY OF THE ATTEMPT, so it is never
  // #    cut: the strip scrolls sideways instead, and the open tab is
  // #    brought into view. A clipped name is a thing the reader cannot
  // #    tell from another thing.
  // ============================================================
  const tabsOf = key => {
    const list = store().sheets(key);
    return list.map((s, i) => {
      const words = String(i + 1) + (s.ts ? ' · ' + store().stamp(s.ts) : '');
      return '<button class="inkTab' + (s.open ? ' on' : '') + '" data-sheet="' + i + '"'
        + ' title="' + (s.ts ? 'An attempt sealed at ' + store().stamp(s.ts) : 'The attempt in hand')
        + ' — right-press to delete it">' + words + '</button>';
    }).join('');
  };

  const syncTabs = box => {
    const strip = box.querySelector('.inkTabStrip');
    if (!strip) return;
    strip.innerHTML = tabsOf(box.dataset.key);
    const on = strip.querySelector('.inkTab.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
    cancelJob(cv);
    const box = cv.closest('.inkBox');
    const c = ctxOf(cv);
    c.clearRect(0, 0, cv.width * SC, cv.height * SC);
    store().strokes(box.dataset.key).forEach(st => drawStroke(c, st));
    delete cv.dataset.soft;
    thumbDrop(cv);              // the content changed: the old thumbnail is now a lie
  };

  // ============================================================
  // # 🧩 ⏱️  A FULL REPAINT, IN PIECES — AND NOBODY WATCHES IT DRAW
  // # 🔤 JavaScript
  // # 🎯 Draws a notebook's strokes in bites of six milliseconds, in a
  // #    buffer nobody can see, and swaps it in once
  // # 🔗 MEASURED ON THE MACHINE THIS CAME FROM: one pass over a part
  // #    cost 19 · 43 · 49 · 90 · 95 · 99 · 104 · 106 ms — SIX HUNDRED
  // #    MILLISECONDS of freeze in eight separate stalls, and it
  // #    happened again on every scroll up and down, because leaving a
  // #    notebook used to empty its canvas and coming back rebuilt the
  // #    picture from the strokes.
  // #
  // # 🔗 AND THE FIRST ATTEMPT AT THE CURE WAS WORSE THAN THE DISEASE:
  // #    clearing the canvas and filling it over several frames made the
  // #    page blanch and redraw itself in front of the reader, who
  // #    reported it in those words. A stall is felt and not seen; that
  // #    was seen. So the bites are drawn into a BUFFER and the visible
  // #    canvas is touched exactly once, at the end — from one complete
  // #    picture to another, with no half-drawn state ever shown.
  // #
  // # 🔗 One job at a time: two buffers at once would double the memory
  // #    this whole mechanism exists to save, and a queue means the
  // #    notebook you are actually looking at finishes first.
  // ============================================================
  const BUDGET_MS = 6;
  let queue = [], active = null;

  const freeJob = job => {
    if (job.raf) cancelAnimationFrame(job.raf);
    job.raf = 0;
    if (job.buf) { job.buf.width = 0; job.buf.height = 0; job.buf = null; }
    if (active === job) active = null;
  };
  const cancelJob = cv => {
    const j = cv.__job;
    if (!j) return;
    cv.__job = null;
    const k = queue.indexOf(j);
    if (k >= 0) queue.splice(k, 1);
    freeJob(j);
    pump();
  };
  // Copied with a NEUTRAL transform and not with the drawing one: that
  // one is multiplied by the density, and a copy made through it comes
  // out at the wrong size
  const blit = (cv, buf) => {
    const c = raw(cv);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.drawImage(buf, 0, 0);
  };
  const jobDone = job => {
    const cv = job.cv;
    if (cv.__job === job && cv.width && job.buf) blit(cv, job.buf);
    if (cv.__job === job) cv.__job = null;
    delete cv.dataset.soft;
    freeJob(job);
    pump();
  };
  function pump() {
    if (active || !queue.length) return;
    const job = queue.shift();
    const cv = job.cv;
    if (cv.__job !== job || !cv.width) { freeJob(job); return pump(); }
    try {
      job.buf = document.createElement('canvas');
      job.buf.width = cv.width; job.buf.height = cv.height;
      job.buf.dataset.ratio = cv.dataset.ratio;
      job.ctx = ctxOf(job.buf);
    } catch (e) {                    // no buffer to be had: draw straight away
      const c = ctxOf(cv);
      c.clearRect(0, 0, cv.width * SC, cv.height * SC);
      job.list.forEach(st => drawStroke(c, st));
      cv.__job = null; freeJob(job); return pump();
    }
    active = job;
    job.raf = requestAnimationFrame(job.step);
  }
  const repaintChunked = cv => {
    if (!cv.width) return;
    cancelJob(cv);
    const list = store().strokes(cv.closest('.inkBox').dataset.key);
    // With no frames to be had, or little to draw, it is drawn at once:
    // correctness first, and the splitting is an improvement and not a
    // condition for the ink to appear
    if (typeof requestAnimationFrame !== 'function' || list.length < 24) return repaint(cv);
    const job = { cv, i: 0, raf: 0, list, buf: null, ctx: null };
    job.step = () => {
      job.raf = 0;
      if (cv.__job !== job || !cv.width) { freeJob(job); return pump(); }
      const t0 = performance.now();
      while (job.i < job.list.length) {
        drawStroke(job.ctx, job.list[job.i++]);
        if (performance.now() - t0 >= BUDGET_MS) break;
      }
      if (job.i < job.list.length) job.raf = requestAnimationFrame(job.step);
      else jobDone(job);
    };
    cv.__job = job;
    queue.push(job);
    pump();
  };
  // Finished NOW: called before anything that assumes the page is whole
  // — the pen coming down, and the guards. Without it a stroke is
  // written over a page that is still half drawn
  const repaintFlush = cv => {
    const j = cv && cv.__job;
    if (!j) return;
    if (j.raf) { cancelAnimationFrame(j.raf); j.raf = 0; }
    if (!j.ctx) {                    // its turn in the queue had not come
      const k = queue.indexOf(j);
      if (k >= 0) queue.splice(k, 1);
      cv.__job = null; freeJob(j);
      return repaint(cv);
    }
    while (j.i < j.list.length) drawStroke(j.ctx, j.list[j.i++]);
    jobDone(j);
  };

  // ============================================================
  // # 🧠 🗃️  THE PIXELS ARE THE MEMORY, AND THEY ARE NOT THROWN AWAY
  // # 🔤 JavaScript
  // # 🎯 Keeps the drawn canvases of notebooks that have scrolled off,
  // #    within a budget, and leaves a small picture behind when one
  // #    has to go
  // # 🔗 EMPTYING A CANVAS ON THE WAY OUT MEANS REBUILDING THE PICTURE
  // #    ON THE WAY BACK — 419 strokes in a hundred milliseconds, on
  // #    every scroll past, for a notebook in which nothing changed.
  // #    The reader put it exactly: "it makes no sense that it is
  // #    summoned again with every zoom and every scroll up and down."
  // #    So the canvas IS the memory: it keeps its content after it
  // #    leaves, and coming back costs nothing at all.
  // #
  // # 🔗 Bounded in PIXELS and not in canvases: notebooks differ in
  // #    height, and a fixed count reserves twice what it thinks. What
  // #    is over the budget is evicted OLDEST-SEEN first, which is the
  // #    one least likely to be wanted next — and it leaves a third-size
  // #    thumbnail behind (a ninth of the memory), so a return shows the
  // #    page at once, softly, and is sharpened in the background.
  // ============================================================
  const CACHE_PX = 12e6;
  const THUMB = 1 / 3;
  let seenTick = 0;
  const touch = cv => { cv.dataset.seen = String(++seenTick); };

  const thumbDrop = cv => {
    const box = cv && cv.closest('.inkBox');
    if (!box || !box.__thumb) return;
    box.__thumb.width = 0; box.__thumb.height = 0;
    box.__thumb = null;
  };
  const thumbKeep = cv => {
    if (!cv.width || !cv.height) return;
    const box = cv.closest('.inkBox');
    if (!box) return;
    try {
      const t = box.__thumb || document.createElement('canvas');
      t.width = Math.max(1, Math.round(cv.width * THUMB));
      t.height = Math.max(1, Math.round(cv.height * THUMB));
      const c = t.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, t.width, t.height);
      c.drawImage(cv, 0, 0, t.width, t.height);
      box.__thumb = t;
    } catch (e) { /* without one, the old behaviour: drawn from the strokes */ }
  };
  const thumbShow = cv => {
    const box = cv.closest('.inkBox');
    const t = box && box.__thumb;
    if (!t || !t.width || !cv.width) return false;
    try {
      const c = raw(cv);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      c.drawImage(t, 0, 0, cv.width, cv.height);
      cv.dataset.soft = '1';
      return true;
    } catch (e) { return false; }
  };
  const freeCanvas = cv => {
    thumbKeep(cv);                   // the picture is taken BEFORE the store is emptied
    cancelJob(cv);
    cv.width = 0; cv.height = 0;
    const wet = wetOf(cv.closest('.inkBox'));
    if (wet) { wet.width = 0; wet.height = 0; }
  };
  const livePx = () => {
    let px = 0;
    if (where) where.querySelectorAll('.inkDry').forEach(c => { px += c.width * c.height; });
    return px;
  };
  const evict = () => {
    let px = livePx();
    if (px <= CACHE_PX) return 0;
    const cold = [];
    if (where) where.querySelectorAll('.inkBox').forEach(b => {
      const cv = b.querySelector('.inkDry');
      if (!cv || !cv.width) return;
      if (draw && draw.cv === cv) return;            // never the one under the pen
      if (b.dataset.near === '1') return;            // nor one in sight
      cold.push(cv);
    });
    cold.sort((a, b) => (+a.dataset.seen || 0) - (+b.dataset.seen || 0));
    let n = 0;
    for (let i = 0; i < cold.length && px > CACHE_PX; i++) {
      px -= cold[i].width * cold[i].height;
      freeCanvas(cold[i]);
      n++;
    }
    return n;
  };

  // Switched on and off by how near the screen it is. A part builds all
  // of its pages at once — seventy-four in one course — and a live
  // canvas for each is hundreds of megabytes
  let obs = null, refitSoon = 0;
  const watch = () => {
    if (obs || typeof IntersectionObserver !== 'function' || !where) return;
    obs = new IntersectionObserver(es => {
      es.forEach(e => {
        const cv = e.target.querySelector('.inkDry');
        if (!cv) return;
        e.target.dataset.near = e.isIntersecting ? '1' : '0';
        if (!e.isIntersecting) return;
        touch(cv);
        // 2 = its store is already what it should be and its ink is
        // still on it: NO WORK AT ALL. That is the whole saving
        if (fit(cv) === 1) {
          thumbShow(cv);             // a picture in its place at once, then sharpened
          repaintChunked(cv);
        }
      });
      evict();                       // once after the batch, not once per entry
    }, { root: where, rootMargin: '150% 0px' });
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
      document.addEventListener(t, ev => {
        if (ev.pointerType !== 'pen') return;
        penLast = Date.now();
        // THE TOUCH THAT CAME FIRST IS TAKEN BACK. The hard case is the
        // palm landing BEFORE the nib: by the time the pen is seen, a
        // scroll may already have been performed. So any scroll younger
        // than 450 ms is undone the instant the pen appears
        retract();
      },
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

  // ============================================================
  // # ✋ 📜  THE FINGER SCROLLS THE PAGE, BY HAND
  // # 🔤 JavaScript
  // # 🎯 Moves the scrolling box under the pad when a finger drags on
  // #    it, and refuses to when that finger is really a resting palm
  // # 🔗 THE WEB DOES NOT TELL US ABOUT PALMS. The browser reports a
  // #    palm leaning on the glass as an ordinary touch, and on Windows
  // #    the system does not suppress it while the pen is writing — the
  // #    probe on this very machine counted 726 touch events arriving
  // #    while the pen drew. So the policy is the one every project
  // #    that has solved this uses: DO NOT CLASSIFY THE TOUCH, OWN THE
  // #    PEN. While the pen is in range, touches over the pad do
  // #    nothing.
  // #
  // # 🔗 And because the pad needs `touch-action:none` for the pen, the
  // #    scrolling it would otherwise do has to be done here — which
  // #    turns out to be the feature, not the cost: a scroll performed
  // #    by hand can be WITHHELD until the touch proves itself, and
  // #    taken back if the pen arrives after it. A resting palm meets
  // #    the time and never the distance.
  // #
  // # 🔗 The two numbers are the platform's own: Windows delays touch
  // #    on inking surfaces by 250 ms "to allow additional time for pen
  // #    detection", and says rejection works best when the pen is seen
  // #    before the palm lands. Measured here, hover leads the nib by
  // #    106 ms — thinner than the 1698 ms on the machine this came
  // #    from, which is exactly why the 250 ms delay carries the weight.
  // ============================================================
  const ARM_MS = 250, ARM_PX = 12, RETRACT_MS = 450;
  const touches = new Set();
  let pan = null;

  document.addEventListener('pointerdown', ev => {
    if (ev.pointerType === 'touch') touches.add(ev.pointerId);
  }, { capture: true, passive: true });
  ['pointerup', 'pointercancel'].forEach(t => {
    document.addEventListener(t, ev => { touches.delete(ev.pointerId); }, { capture: true, passive: true });
  });

  // The box that actually scrolls under this pad, found rather than
  // assumed: the sheets live in one on the course screen and in another
  // in full screen later, and a name written here would be wrong in one
  // of them
  const scrollerOf = el => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 2) return n;
    }
    return document.scrollingElement || document.documentElement;
  };

  const rejected = ev => penNear() || isPalm(ev) || touches.size > 1;

  // The scroll that a touch turned out not to deserve, given back
  const retract = () => {
    if (!pan) return;
    if (pan.armed && (Date.now() - pan.t) < RETRACT_MS) pan.box.scrollTop = pan.top0;
    pan = null;
  };

  document.addEventListener('pointerdown', ev => {
    const cv = ev.target.closest && ev.target.closest('.inkDry');
    if (!cv) return;
    const box = cv.closest('.inkBox');
    const key = box.dataset.key;
    if (ev.pointerType === 'touch') {
      // Not acted on now: written down, and left to prove itself by
      // staying 250 ms AND travelling 12 pixels. The first scroll
      // position is kept so it can be given back if the pen appears
      if (rejected(ev)) return;
      const sc = scrollerOf(cv);
      pan = { id: ev.pointerId, y0: ev.clientY, y: ev.clientY, t: Date.now(),
              box: sc, top0: sc.scrollTop, armed: false };
      return;
    }
    if (ev.pointerType !== 'pen' && ev.pointerType !== 'mouse') return;
    if (draw) return;                                // one stroke is not cut by another
    ev.preventDefault();
    if (!cv.width && fit(cv)) repaint(cv);
    repaintFlush(cv);        // never a stroke written over a page still being drawn
    touch(cv);
    try { cv.setPointerCapture(ev.pointerId); } catch {}

    const p = spot(cv, ev);
    if (mode === 'erase' || (ev.pointerType === 'pen' && (ev.buttons & 32))) {
      draw = { erase: true, id: ev.pointerId, cv, key };
      if (store().eraseAt(key, p[0], p[1], ERASE_R)) repaint(cv);
      return;
    }
    // In selecting mode the pen drags a BOX and writes nothing. The box
    // is an element over the pad, not a drawing on it: the live layer is
    // the running stroke's and adds without clearing, and the dry page is
    // wiped on every repaint
    if (mode === 'select') {
      selClear();
      const m = document.createElement('div');
      m.className = 'inkMarq live';
      box.querySelector('.inkPad').appendChild(m);
      draw = { marq: true, id: ev.pointerId, cv, key, ax: p[0], ay: p[1], bx: p[0], by: p[1], m };
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
    if (pan && ev.pointerId === pan.id) {
      if (rejected(ev)) { retract(); return; }
      if (!pan.armed) {
        // BOTH GATES, and the palm is caught by the second: it rests for
        // as long as you like and it does not travel
        if (Date.now() - pan.t < ARM_MS) return;
        if (Math.abs(ev.clientY - pan.y0) < ARM_PX) return;
        pan.armed = true;
        pan.y = ev.clientY;        // scrolling starts from here, so it does not jump by the gathered distance
        return;
      }
      pan.box.scrollTop -= (ev.clientY - pan.y);
      pan.y = ev.clientY;
      return;
    }
    if (!draw || ev.pointerId !== draw.id || ev.pointerType === 'touch') return;
    if (draw.marq) {
      const q = spot(draw.cv, ev);
      draw.bx = q[0]; draw.by = q[1];
      const k = 1 / SC;
      draw.m.style.left = (Math.min(draw.ax, draw.bx) * k) + 'px';
      draw.m.style.top = (Math.min(draw.ay, draw.by) * k) + 'px';
      draw.m.style.width = (Math.abs(draw.bx - draw.ax) * k) + 'px';
      draw.m.style.height = (Math.abs(draw.by - draw.ay) * k) + 'px';
      return;
    }
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
    // The finger that was scrolling has let go: that is the end of the
    // scroll and of nothing else
    if (pan && ev && ev.pointerId === pan.id) { pan = null; return; }
    if (!draw) return;
    if (ev && ev.pointerType === 'touch') return;     // a finger lifting ends nothing
    if (ev && ev.pointerId !== draw.id) return;
    const d = draw; draw = null;
    if (d.raf) cancelAnimationFrame(d.raf);
    // The box is let go: what it caught becomes the selection. A drag
    // that caught nothing leaves no trace — which is not a fault but the
    // natural way to change one's mind
    if (d.marq) {
      if (d.m) d.m.remove();
      selBegin(d.key, d.cv, d.ax, d.ay, d.bx, d.by);
      return;
    }
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
    // A tab is NOT an `.inkBtn`, deliberately: it must not be counted
    // among the inks and nibs, must not pass through the nib handler,
    // and must not fall into the tail of this one
    const tb = ev.target.closest && ev.target.closest('.inkTab');
    if (tb) {
      ev.stopPropagation();
      const box = tb.closest('.inkBox');
      if (store().go(box.dataset.key, +tb.dataset.sheet)) {
        repaint(box.querySelector('.inkDry'));
        syncTabs(box);
      }
      return;
    }
    const b = ev.target.closest && ev.target.closest('.inkBtn');
    if (!b) return;
    ev.stopPropagation();                             // a press on a tool is not a press on the card
    const box = b.closest('.inkBox');
    const cv = box.querySelector('.inkDry');
    const key = box.dataset.key;
    const what = b.dataset.ink;
    if (what === 'color') { colour = b.dataset.c; mode = 'pen'; }
    else if (what === 'width') { slot = +b.dataset.i; mode = 'pen'; }
    else if (what === 'erase') { mode = mode === 'erase' ? 'pen' : 'erase'; selClear(); }
    else if (what === 'select') { mode = mode === 'select' ? 'pen' : 'select'; selClear(); }
    else if (what === 'full') { fullToggle(box); }
    else if (what === 'undo') { if (store().undo(key)) repaint(cv); }
    else if (what === 'clear') {
      if (store().has(key) && !confirm('Empty this page? The attempts kept beside it are not touched.')) return;
      if (store().clear(key)) repaint(cv);
    }
    else if (what === 'seal') {
      // An empty page is refused by the store, and the reader is told
      // why rather than left pressing a button that does nothing
      if (!store().seal(key)) { b.title = 'Write something first — an empty page is not sealed'; return; }
      repaint(cv);                                    // the new page is empty, so this clears it
      syncTabs(box);
    }
    tools();
  });

  // Deleted by the press that means "do something unusual to this", and
  // it says what it is about to take away. There is no undoing it, and
  // keeping quiet about that would be a cheat
  document.addEventListener('contextmenu', ev => {
    const tb = ev.target.closest && ev.target.closest('.inkTab');
    if (!tb) return;
    ev.preventDefault();
    const box = tb.closest('.inkBox');
    const key = box.dataset.key;
    const i = +tb.dataset.sheet;
    const list = store().sheets(key);
    if (list.length < 2) { tb.title = 'The last attempt is not deleted — the box needs a page to write on'; return; }
    const name = String(i + 1) + (list[i] && list[i].ts ? ' · ' + store().stamp(list[i].ts) : '');
    if (!confirm('Delete attempt ' + name + '? It cannot be brought back.')) return;
    if (store().drop(key, i)) { repaint(box.querySelector('.inkDry')); syncTabs(box); }
  });

  const tools = () => {
    if (!where) return;
    where.querySelectorAll('.inkBox').forEach(box => {
      // `mode === 'pen'` and not "not the rubber": with a third tool on
      // the bar, "not erasing" lit the ink and the nib while the pen was
      // not what the hand held
      box.querySelectorAll('[data-ink="color"]').forEach(b =>
        b.classList.toggle('on', b.dataset.c === colour && mode === 'pen'));
      box.querySelectorAll('[data-ink="width"]').forEach(b =>
        b.classList.toggle('on', +b.dataset.i === slot && mode === 'pen'));
      box.querySelectorAll('[data-ink="erase"]').forEach(b => b.classList.toggle('on', mode === 'erase'));
      // AND THE SELECT TOOL SAYS SO. It was the only tool on the bar
      // that looked the same armed as not, so the only way to know
      // whether a drag would draw a line or a box was to try it
      box.querySelectorAll('[data-ink="select"]').forEach(b => b.classList.toggle('on', mode === 'select'));
    });
  };

  // ============================================================
  // # ⬚ 🔍  SELECTING WHAT WAS WRITTEN, AND MAKING IT SMALLER
  // # 🔤 JavaScript
  // # 🎯 A box dragged over the writing, a grip at its corner to scale
  // #    it, and its middle to move it
  // # 🔗 ASKED FOR BECAUSE WRITING BY HAND COMES OUT BIGGER THAN ONE
  // #    EXPECTS: the first half of a solution fills the page and the
  // #    rest has nowhere to go, and rubbing it out to write it again
  // #    costs more than shrinking it.
  // #
  // # 🔗 AND THE ONE RULE OVER ALL OF IT: **there is no moment in which
  // #    the reader's ink is invisible.** Selecting lifts the strokes off
  // #    the dry page to draw them on the live layer, so any path that
  // #    lifts without drawing — even for a single frame — reads as "my
  // #    writing is gone". Three separate faults of exactly that kind
  // #    were reported on the machine this comes from, and each is
  // #    answered here by name.
  // ============================================================
  const SEL_MIN = 0.20;                  // below a fifth the writing is a smudge
  let sel = null;

  const selClear = () => {
    if (!sel) return;
    if (sel.raf) cancelAnimationFrame(sel.raf);
    const m = sel.box.querySelector('.inkMarq');
    if (m) m.remove();
    sel = null;
  };

  const boundsOf = (list, idx) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    idx.forEach(i => {
      const p = list[i].p;
      for (let k = 0; k < p.length; k += 3) {
        if (p[k] < x0) x0 = p[k];
        if (p[k] > x1) x1 = p[k];
        if (p[k + 1] < y0) y0 = p[k + 1];
        if (p[k + 1] > y1) y1 = p[k + 1];
      }
    });
    return { x0, y0, x1, y1 };
  };

  // ★ A stroke is selected when MOST of its points are inside. Demanding
  //   all of them drops a whole letter because its tail pokes out, and
  //   half a word is then shrunk; accepting one point takes in a long
  //   line that merely crosses the box and is no part of it
  const pick = (list, x0, y0, x1, y1) => {
    const out = [];
    list.forEach((st, i) => {
      const p = st.p, n = p.length / 3;
      if (!n) return;
      let inside = 0;
      for (let k = 0; k < p.length; k += 3) {
        if (p[k] >= x0 && p[k] <= x1 && p[k + 1] >= y0 && p[k + 1] <= y1) inside++;
      }
      if (inside * 2 > n) out.push(i);
    });
    return out;
  };

  // The pad's size in store space. READ FROM MEMORY while dragging:
  // `offsetWidth` forces the browser to recompute layout, and since the
  // box's own styles are written in the same breath, every move event
  // was costing a full layout pass — the last of the three slownesses
  const padSize = () => {
    if (sel && sel.drag) return { w: sel.drag.padW, h: sel.drag.padH };
    const cv = sel.cv;
    return { w: cv.offsetWidth * SC, h: cv.offsetHeight * SC };
  };
  // The limit is THE PAD ITSELF and not an invented number: growing until
  // the writing fills the page is understood; past that it is cropped in
  // the drawing and the reader thinks it was lost
  const maxScale = () => {
    const s = sel.snap0, pad = padSize();
    const w = Math.max(1, s.x1 - s.x0), h = Math.max(1, s.y1 - s.y0);
    return Math.max(SEL_MIN, Math.min(6, pad.w / w, pad.h / h));
  };

  // WHERE THE BOX IS *NOW*, not where the model last left it. The model
  // is written once, at the lift, so `sel.x0...y1` do not move during a
  // drag at all -- and the frame drawn from them stood still while the
  // writing slid out from under it, then jumped to catch up when the
  // hand came off. Reported in exactly those words. The rectangle is
  // computed from the same snapshot, by the same arithmetic the picture
  // is placed with, so the box and the ink are one thing moving
  const liveRect = () => {
    if (!sel.live) return { x0: sel.x0, y0: sel.y0, x1: sel.x1, y1: sel.y1 };
    const s = sel.snap0, f = sel.scale;
    return { x0: sel.fx + (s.x0 - sel.fx) * f + sel.dx,
             y0: sel.fy + (s.y0 - sel.fy) * f + sel.dy,
             x1: sel.fx + (s.x1 - sel.fx) * f + sel.dx,
             y1: sel.fy + (s.y1 - sel.fy) * f + sel.dy };
  };

  const overlay = () => {
    if (!sel) return;
    const pad = sel.box.querySelector('.inkPad');
    let m = sel.box.querySelector('.inkMarq');
    if (!m) {
      m = document.createElement('div');
      m.className = 'inkMarq';
      m.innerHTML = '<i class="inkSelGrip" title="Drag to make it smaller or larger"></i>';
      pad.appendChild(m);
    }
    const k = 1 / SC, r = liveRect();
    m.style.left = (r.x0 * k) + 'px';
    m.style.top = (r.y0 * k) + 'px';
    m.style.width = Math.max(6, (r.x1 - r.x0) * k) + 'px';
    m.style.height = Math.max(6, (r.y1 - r.y0) * k) + 'px';
  };

  const selBegin = (key, cv, x0, y0, x1, y1) => {
    selClear();
    const list = store().strokes(key);
    const idx = pick(list, Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1));
    if (!idx.length) return false;
    const b = boundsOf(list, idx);
    sel = { key, cv, box: cv.closest('.inkBox'), idx, scale: 1, dx: 0, dy: 0,
            x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1,
            // The corner that is NOT held stays put: the grip is at the
            // bottom right, so the top left is the fixed point — which is
            // what a hand expects of a corner grip. Hold the centre
            // instead and the selection creeps both ways at once
            fx: b.x0, fy: b.y0,
            snap0: { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 },
            // ★ EVERY TRANSFORM IS COMPUTED FROM THIS SNAPSHOT, never from
            //   the current state. Coordinates are whole numbers, so each
            //   scaling rounds; multiplying the current state compounds
            //   the loss and the original never comes back
            snap: idx.map(i => ({ p: list[i].p.slice(), w: list[i].w })) };
    overlay();
    return true;
  };

  // The model written once, at the end — the dry page redrawn with
  // everything, and only then is it saved
  const selApply = () => {
    if (!sel) return;
    const list = store().strokes(sel.key), f = sel.scale;
    sel.idx.forEach((i, k) => {
      const st = list[i], sp = sel.snap[k];
      for (let q = 0; q < sp.p.length; q += 3) {
        st.p[q] = Math.round(sel.fx + (sp.p[q] - sel.fx) * f + sel.dx);
        st.p[q + 1] = Math.round(sel.fy + (sp.p[q + 1] - sel.fy) * f + sel.dy);
        st.p[q + 2] = sp.p[q + 2];
      }
      // THE NIB SHRINKS WITH THE WRITING. Small writing drawn with a
      // broad nib is a smudge, not handwriting — and in this engine the
      // width IS the nib's length, so scaling it scales the nib
      st.w = Math.max(0.25, Math.min(12, Math.round(sp.w * f * 4) / 4));
    });
    const b = boundsOf(list, sel.idx);
    sel.x0 = b.x0; sel.y0 = b.y0; sel.x1 = b.x1; sel.y1 = b.y1;
    store().bumped(sel.key);
    repaint(sel.cv);
    overlay();
  };

  // ---------- the live drag: one picture moved, not ink redrawn ----------
  // The swept nib costs about five fills a point, and a line of writing
  // is three thousand points — fifteen thousand fills a frame if the
  // vectors are redrawn. So the selection is rasterised ONCE and the
  // frame moves a single image; the vectors are redrawn once at the end,
  // so what is left behind is vectors and not a stretched picture
  const selRaster = () => {
    const k = Number(sel.cv.dataset.ratio) || 1;
    const s = sel.snap0;
    const pad = 24 * SC;                 // room for the nib's reach past the points
    const w = Math.max(1, Math.round((s.x1 - s.x0 + pad * 2) * k / SC));
    const h = Math.max(1, Math.round((s.y1 - s.y0 + pad * 2) * k / SC));
    const buf = document.createElement('canvas');
    buf.width = w; buf.height = h;
    buf.dataset.ratio = String(k);
    const c = buf.getContext('2d');
    c.setTransform(k / SC, 0, 0, k / SC, 0, 0);
    c.translate(-(s.x0 - pad), -(s.y0 - pad));
    c.lineCap = c.lineJoin = 'round';
    sel.snap.forEach((sp, i) => drawStroke(c, { c: store().strokes(sel.key)[sel.idx[i]].c, w: sp.w, p: sp.p }));
    sel.bmp = { buf, x: s.x0 - pad, y: s.y0 - pad, w: s.x1 - s.x0 + pad * 2, h: s.y1 - s.y0 + pad * 2 };
  };

  const selLiveStart = () => {
    if (!sel || sel.live) return;
    sel.live = true;
    // Everything that has to be measured is measured ONCE, here: the pad,
    // the canvas, the context. A read of layout inside the move path is
    // what made fast dragging feel late
    // ★ SHOWN BEFORE IT IS MEASURED. The live layer is `display:none`
    //   until the box wears `penDown`, and a hidden element has no size —
    //   so measured first it got a store of 0×0, every stroke drawn on it
    //   went nowhere, and the selection was invisible for the whole drag
    //   while sitting safely in the store. Which is the very fault this
    //   section exists to prevent, arrived at from a new direction. Its
    //   own guard caught it
    sel.box.classList.add('penDown');
    const wet = wetOf(sel.box);
    fit(wet);
    sel.drag = { padW: sel.cv.offsetWidth * SC, padH: sel.cv.offsetHeight * SC,
                 ctx: ctxOf(wet), wet };
    // The dry page redrawn WITHOUT the selection, so its place is empty…
    repaintSkip(sel.cv, sel.idx);
    selRaster();
    // …and the selection drawn on the live layer AT ONCE. Scheduled for
    // the next frame instead, there is a moment with the ink nowhere —
    // and that moment is what was reported as "it disappears the instant
    // I touch the grip"
    selLiveDraw();
  };

  const repaintSkip = (cv, skip) => {
    if (!cv.width) return;
    cancelJob(cv);
    const c = ctxOf(cv);
    c.clearRect(0, 0, cv.width * SC, cv.height * SC);
    const list = store().strokes(cv.closest('.inkBox').dataset.key);
    const out = new Set(skip);
    list.forEach((st, i) => { if (!out.has(i)) drawStroke(c, st); });
    thumbDrop(cv);
  };

  const selLiveDraw = () => {
    if (!sel || !sel.live || !sel.bmp || !sel.drag) return;
    const c = sel.drag.ctx, cv = sel.drag.wet;
    c.clearRect(0, 0, cv.width * SC, cv.height * SC);
    const f = sel.scale, b = sel.bmp;
    // Placed by the same arithmetic the model will use, so what is seen
    // while dragging is where it lands
    const x = sel.fx + (b.x - sel.fx) * f + sel.dx;
    const y = sel.fy + (b.y - sel.fy) * f + sel.dy;
    c.drawImage(b.buf, x, y, b.w * f, b.h * f);
    overlay();
  };
  // ★ COUNTED AS A DECISION, NOT AS A PAINT. `requestAnimationFrame`
  //   EXISTS in the browser the guards run in and never calls back, so a
  //   counter inside the drawing reads zero on perfectly good code — the
  //   guard said "a move with no displacement drew nothing" about a
  //   version that decides to draw correctly. What can be measured
  //   anywhere is the decision
  let liveDraws = 0;
  const selSync = () => {
    if (!sel || !sel.live) return;
    liveDraws++;
    // ★ THE FRAME IS MOVED AT ONCE AND THE PICTURE ON THE NEXT FRAME.
    //   Four style writes cost nothing and read no layout, while the
    //   picture is a canvas full of ink — so the one thing that CAN keep
    //   up with the hand is not made to wait for the one that cannot.
    //   And it is the difference between "it follows me" and "it jumps
    //   when I let go", which is how this was reported
    overlay();
    // Correctness before coalescing: with no frames to be had the drawing
    // happens at once, exactly as the chunked repaint does. A guard runs
    // where `requestAnimationFrame` never fires, and a draw that waits
    // for a frame there never happens at all
    if (typeof requestAnimationFrame !== 'function') return selLiveDraw();
    if (sel.raf) return;
    sel.raf = requestAnimationFrame(() => { sel.raf = 0; selLiveDraw(); });
  };

  const clampMove = () => {
    const s = sel.snap0, f = sel.scale, pad = padSize();
    const w = (s.x1 - s.x0) * f, h = (s.y1 - s.y0) * f;
    const left = sel.fx + (s.x0 - sel.fx) * f;
    const top = sel.fy + (s.y0 - sel.fy) * f;
    sel.dx = Math.max(-left, Math.min(pad.w - w - left, sel.dx));
    sel.dy = Math.max(-top, Math.min(pad.h - h - top, sel.dy));
  };

  const selScale = f => {
    if (!sel) return;
    const want = Math.max(SEL_MIN, Math.min(maxScale(), f));
    // ★ The early exit stops the WRITING and not the drawing. Stopping
    //   both was the third disappearance: the first report from a grip is
    //   a move with no displacement at all — a ratio of exactly 1 — and
    //   the selection had already been lifted off the dry page
    if (Math.abs(want - sel.scale) < 0.0005) { selSync(); return; }
    sel.scale = want;
    clampMove();
    if (sel.live) selSync(); else selApply();
  };
  const selMove = (dx, dy) => {
    if (!sel) return;
    sel.dx = dx; sel.dy = dy;
    clampMove();
    if (sel.live) selSync(); else selApply();
  };

  // ★ Called on EVERY lift that began as a drag, even when nothing moved.
  //   Without that, a press on the box with no movement leaves the
  //   selection lifted off the dry page and never drawn back — the second
  //   disappearance, and the ink stays gone until some unrelated redraw
  const selCommit = () => {
    if (!sel || !sel.live) return;
    if (sel.raf) { cancelAnimationFrame(sel.raf); sel.raf = 0; }
    sel.live = false;
    if (sel.bmp) { sel.bmp.buf.width = 0; sel.bmp.buf.height = 0; sel.bmp = null; }
    sel.drag = null;
    selApply();                          // the dry page, with all of it back
    const wet = wetOf(sel.box);
    if (wet) { wet.width = 0; wet.height = 0; }
    sel.box.classList.remove('penDown');
    store().flush();
  };

  // ---------- the overlay's own gestures ----------
  document.addEventListener('pointerdown', ev => {
    const grip = ev.target.closest && ev.target.closest('.inkSelGrip');
    const marq = ev.target.closest && ev.target.closest('.inkMarq');
    if (!sel || (!grip && !marq)) return;
    if (ev.pointerType === 'touch' && penNear()) return;
    ev.preventDefault();
    ev.stopPropagation();
    try { (grip || marq).setPointerCapture(ev.pointerId); } catch {}
    const r = sel.cv.getBoundingClientRect();
    const k = (r.width / sel.cv.offsetWidth) || 1;
    const at = [(ev.clientX - r.left) / k * SC, (ev.clientY - r.top) / k * SC];
    selLiveStart();
    // THE DIAGONAL, not one axis: the ratio between width and height is
    // kept, so the writing is not squashed
    const s = sel.snap0;
    const diag = Math.max(1, Math.hypot((s.x1 - s.x0), (s.y1 - s.y0)));
    sel.hold = { id: ev.pointerId, grip: Boolean(grip), at, diag,
                 scale0: sel.scale, dx0: sel.dx, dy0: sel.dy };
  }, true);

  document.addEventListener('pointermove', ev => {
    if (!sel || !sel.hold || ev.pointerId !== sel.hold.id) return;
    const r = sel.cv.getBoundingClientRect();
    const k = (r.width / sel.cv.offsetWidth) || 1;
    const x = (ev.clientX - r.left) / k * SC, y = (ev.clientY - r.top) / k * SC;
    if (sel.hold.grip) {
      const s = sel.snap0;
      const was = Math.hypot(sel.hold.at[0] - (s.x0 + sel.dx), sel.hold.at[1] - (s.y0 + sel.dy));
      const now_ = Math.hypot(x - (s.x0 + sel.dx), y - (s.y0 + sel.dy));
      selScale(sel.hold.scale0 * (now_ / Math.max(1, was)));
    } else {
      selMove(sel.hold.dx0 + (x - sel.hold.at[0]), sel.hold.dy0 + (y - sel.hold.at[1]));
    }
  }, true);

  ['pointerup', 'pointercancel'].forEach(t => {
    document.addEventListener(t, ev => {
      if (!sel || !sel.hold || ev.pointerId !== sel.hold.id) return;
      sel.hold = null;
      selCommit();
    }, true);
  });

  // ============================================================
  // # ⛶ 🖊️  THE WHOLE SCREEN, AND THE PAGE THAT MUST NOT MOVE
  // # 🔤 JavaScript
  // # 🔗 ★ THE PAGE IS NOT MADE BIGGER, IT IS BROUGHT NEARER. Every
  // #    stored coordinate means "this far across a pad of THIS layout
  // #    size", so a layout that grows changes the meaning of everything
  // #    already written: the old writing stays small in a corner and
  // #    the new is written at coordinates that fall outside the small
  // #    pad and are lost on the way out. So the layout size is pinned
  // #    and the magnification is visual — the same mechanism the page's
  // #    own zoom uses, and no new line in the pen's path.
  // ============================================================
  const fullToggle = box => {
    const on = box.classList.contains('inkFull');
    if (on) {
      box.classList.remove('inkFull');
      box.style.removeProperty('--inkFullZoom');
      box.style.removeProperty('--inkPadW');
      box.style.removeProperty('--inkPadH');
      if (document.fullscreenElement === box && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      window.MyTermInkPad.refitNow();
      return false;
    }
    // ★ THE LAYOUT SIZE IS PINNED TO WHAT IT IS NOW, read BEFORE the
    //   class goes on. Taken afterwards it would be the full-screen
    //   measurement — the very number that must not change — and every
    //   coordinate already written would mean something slightly else:
    //   the old writing small in a corner, the new written at points
    //   that fall outside the smaller pad and lost on the way out
    const pad = box.querySelector('.inkPad');
    const keepW = pad.offsetWidth || 1, keepH = pad.offsetHeight || 1;
    box.style.setProperty('--inkPadW', keepW + 'px');
    box.style.setProperty('--inkPadH', keepH + 'px');
    box.classList.add('inkFull');
    if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
    const k = Math.max(0.5, Math.min(4,
      Math.min((window.innerWidth - 24) / keepW, (window.innerHeight - 90) / keepH)));
    box.style.setProperty('--inkFullZoom', k.toFixed(3));
    window.MyTermInkPad.refitNow();
    return true;
  };

  // ============================================================
  // # 🤏 📱  TWO FINGERS ON THE GLASS
  // # 🔤 JavaScript
  // # 🎯 Pinching a full-screen notebook brings it nearer
  // # 🔗 TOUCH EVENTS AND NOT POINTER EVENTS, for three reasons and the
  // #    third decides it: a touch event carries BOTH contacts at once
  // #    (with pointers each finger is a separate event and a parallel
  // #    record has to be kept, which breaks the moment one `up` is
  // #    missed); a touch move can be cancelled, and cancelling it is
  // #    what stops the browser doing its own gesture; and if the
  // #    browser decides the sequence is a scroll it fires
  // #    `pointercancel` and the pointer path simply ends mid-pinch,
  // #    while the touch events run to the end.
  // #
  // # 🔗 AND THE RATIO, not the accumulated difference: the nearness
  // #    follows the fingers, so one pinch reaches what is wanted.
  // #
  // # 🔗 THREE REFUSALS, AND ALL THREE ARE PALM REJECTION rather than
  // #    fussiness — the worst of them being the first: a hand resting
  // #    while writing reports two or three contacts that drift together
  // #    and apart with every letter, and taken for a pinch the zoom
  // #    would wobble as he writes
  // ============================================================
  const PINCH_ARM = 12;
  let pinch = null;
  const gap = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  document.addEventListener('touchstart', ev => {
    const box = ev.target.closest && ev.target.closest('.inkBox.inkFull');
    if (!box || ev.touches.length !== 2) { pinch = null; return; }
    if (penNear()) return;                            // the pen is in range: not a pinch
    const t = [ev.touches[0], ev.touches[1]];
    if (t.some(x => (x.radiusX || 0) * 2 > PALM_PX)) return;   // a palm-sized contact
    pinch = { box, from: gap(t), was: parseFloat(box.style.getPropertyValue('--inkFullZoom')) || 1, armed: false };
  }, { passive: true });

  document.addEventListener('touchmove', ev => {
    if (!pinch || ev.touches.length !== 2) return;
    const now_ = gap([ev.touches[0], ev.touches[1]]);
    if (!pinch.armed) {
      // Not cancelled before it is certainly a pinch: cancelling the
      // start of every two-finger touch would kill two-finger SCROLLING,
      // which Windows allows and people use far more often
      if (Math.abs(now_ - pinch.from) < PINCH_ARM) return;
      pinch.armed = true;
      pinch.from = now_;                              // measured from here, so it does not jump
      return;
    }
    ev.preventDefault();
    const k = Math.max(0.5, Math.min(4, pinch.was * (now_ / Math.max(1, pinch.from))));
    pinch.box.style.setProperty('--inkFullZoom', k.toFixed(3));
  }, { passive: false });

  ['touchend', 'touchcancel'].forEach(t => {
    document.addEventListener(t, () => {
      // Saved on the LIFT and not on every move: the nearness is written
      // on the box itself, and a hundred writes a second for a value
      // nobody reads until the end is work for nothing
      if (pinch && pinch.armed) window.MyTermInkPad.refitNow();
      pinch = null;
    }, { passive: true });
  });

  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    if (sel) { selClear(); return; }
    const full = where && where.querySelector('.inkBox.inkFull');
    if (full) fullToggle(full);
  });
  // The browser's own exit (Esc, or the system gesture) must leave the box
  // as it was, or the reader comes back to a page that is still zoomed
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) return;
    const full = where && where.querySelector('.inkBox.inkFull');
    if (full) { full.classList.remove('inkFull');
      full.style.removeProperty('--inkFullZoom');
      full.style.removeProperty('--inkPadW'); full.style.removeProperty('--inkPadH'); window.MyTermInkPad.refitNow(); }
  });

  window.MyTermInkPad = {
    // Told where the sheets are drawn, once
    arm: spotEl => {
      where = typeof spotEl === 'string' ? document.getElementById(spotEl) : spotEl;
      if (!where) return false;
      watch();
      // The one thing the reader is told, and only while it is true
      if (store() && store().watch) {
        store().watch(() => {
          const owing = store().cloudOwed() > 0;
          where.querySelectorAll('.inkState').forEach(s => { s.hidden = !owing; });
        });
      }
      return true;
    },

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
      // ============================================================
      // WHICH CHAPTER'S INK THIS IS, AND WHERE IN DRIVE IT GOES
      //
      // Worked out here rather than asked of the course screen: the
      // chapter store already knows which chapter is open and the board
      // already holds its folder, so a third place to keep the same fact
      // is a third place for it to go stale. And a notebook whose scope
      // was never set would write its ink under the wrong chapter — the
      // mistake this project has made before, with explanations landing
      // in a chapter nobody had open
      // ============================================================
      const C = window.MyTermChapterStore, B = window.MyTermBoardStore;
      const chId = C && C.openId && C.openId();
      if (chId) {
        let course = null, chapter = null;
        const live = B && B.live && B.live();
        (live && live.courses || []).some(c =>
          (c.chapters || []).some(h => (h.id === chId ? (course = c, chapter = h, true) : false)));
        if (chapter) {
          await store().open(course.id, chapter.id);
          store().attach(chapter.folderId || '');
          store().onPull(key => {
            const b = where.querySelector('.inkBox[data-key="' + key + '"]');
            if (!b) return;
            syncTabs(b);
            const cv = b.querySelector('.inkDry');
            if (cv && cv.width) { repaintChunked(cv); }
          });
        }
      }
      const cards = [...where.querySelectorAll('.msheet-card')];
      let made = 0;
      for (const card of cards) {
        if (card.querySelector('.inkBox')) continue;
        const box = build();
        box.dataset.key = keyOf(card);
        card.appendChild(box);
        made++;
        await store().load(box.dataset.key);
        syncTabs(box);
        const cv = box.querySelector('.inkDry');
        // Switched on by nearness where the browser will tell us, and
        // straight away where it will not: a part of seventy-four pages
        // must not hold seventy-four live canvases, but a page with no
        // ink shown at all is worse than one that costs memory
        if (obs) obs.observe(box);
        else if (fit(cv) === 1) repaint(cv);
      }
      tools();
      if (obs) evict();
      return made;
    },

    // The page is scaled, not re-laid-out, so the stores need a new
    // density and nothing else. `fit` says whether it actually changed
    // anything, and a canvas whose store is already right is not touched
    // ============================================================
    // GATHERED INTO ONE PASS PER FRAME
    //
    // The sheet paper refits twice for every draw (at once, and again on
    // the next frame once the scrollbar has taken its width), the window
    // refits on resize, and a pinch would refit on every wheel event —
    // dozens a second. Each pass asks every canvas for its size, and a
    // size that really changed costs a repaint. So the calls are
    // gathered: many in one frame become ONE, and `fit` returning 2 for
    // a canvas already at the right size means that one costs nothing
    // ============================================================
    refit: () => {
      if (!where) return 0;
      if (typeof requestAnimationFrame !== 'function') return window.MyTermInkPad.refitNow();
      if (refitSoon) return -1;                  // already booked for this frame
      refitSoon = requestAnimationFrame(() => { refitSoon = 0; window.MyTermInkPad.refitNow(); });
      return -1;
    },

    // The pass itself — called by the gathering above, and directly by
    // the guards, which have no frames to wait for
    refitNow: () => {
      if (!where) return 0;
      let drawn = 0;
      where.querySelectorAll('.inkDry').forEach(cv => {
        const was = fit(cv);
        if (was !== 1) return;
        // A canvas whose store has just been resized has been emptied by
        // that very act, so its ink has to come back — softly first if
        // there is a thumbnail to show
        thumbShow(cv);
        repaintChunked(cv);
        drawn++;
      });
      if (drawn) evict();
      return drawn;
    },

    // ============================================================
    // THE MEMORY MACHINERY, OPENED FOR MEASUREMENT
    //
    // Neither `requestAnimationFrame` nor `IntersectionObserver` runs in
    // the browser the guards are run in, so a guard cannot wait for a
    // frame or for a page to scroll into view. What it CAN do is ask the
    // pad to make the same decisions by hand and then count them: a job
    // queued, a canvas freed, a thumbnail kept, a size unchanged. That
    // is the work itself, and it is what regresses
    // ============================================================
    light: {
      fit, chunk: repaintChunked, flush: repaintFlush,
      pending: cv => Boolean(cv && cv.__job),
      touch, px: livePx, evict, thumb: thumbShow, keepThumb: thumbKeep,
      budget: CACHE_PX
    },

    // ---------- selecting and the whole screen, opened for measurement ----------
    // The dangerous one is the first: scaling writes into the coordinates
    // of particular strokes, and choosing the wrong ones disfigures a
    // solution nobody asked to change — and it is not noticed for weeks
    select: {
      from: (key, cv, x0, y0, x1, y1) => selBegin(key, cv, x0, y0, x1, y1),
      scale: selScale, move: selMove, commit: selCommit, clear: selClear,
      live: () => Boolean(sel && sel.live),
      draws: () => liveDraws,
      hold: () => { if (sel) selLiveStart(); },
      now: () => (sel ? { idx: sel.idx.slice(), scale: sel.scale, dx: sel.dx, dy: sel.dy,
                          box: { x0: sel.x0, y0: sel.y0, x1: sel.x1, y1: sel.y1 } } : null),
      min: SEL_MIN
    },
    full: box => fullToggle(box || (where && where.querySelector('.inkBox'))),

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
