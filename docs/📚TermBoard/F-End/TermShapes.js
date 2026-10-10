// ============================================================
// # 🔲 📊  THE THREE SHAPES: SQUARE · BAR · DISC
// # 🔤 JavaScript
// # 🎯 One way of reading, drawn at three sizes. The term, the course
// #    and the chapter all say the same three things, so what is
// #    learned on one line reads the whole page
// # 🔗 THE SQUARE: is it set up — a chapter with a name, a course with
// #    chapters. It fills from the bottom, and on a single chapter it
// #    is all or nothing.  THE BAR: how much is finished — the marks
// #    ticked out of all of them.  THE DISC: how the marks stand — a
// #    disc of three slices: green what was earned, red what was lost,
// #    gray what has not been judged yet. Gray is not a failing: it is
// #    silence, and saying so is the whole point of a third colour
// ============================================================
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const SIZES = { lg: 44, md: 16, sm: 10 };

  // A ring, built the way the term's ring above it is built: a track all
  // the way round for what has not been judged, and arcs laid on it for
  // what was earned and what was lost, starting from the top.
  //
  // It was a solid disc, and a solid disc is a different kind of object
  // from the ring at the head of the page — two shapes saying "how much
  // of a whole", each in its own language, on one screen. One language
  // costs nothing and is learned once
  const disc = (px, ok, bad, unknown) => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', px);
    svg.setAttribute('height', px);
    svg.setAttribute('viewBox', `0 0 ${px} ${px}`);

    // The ring of the term is 96 across with a 9 wide band; the same
    // proportion at every size here, so they read as the same thing
    const width = Math.max(2, Math.round(px * 9 / 96 * 1.6));
    const r = (px - width) / 2, round = 2 * Math.PI * r;
    const total = ok + bad + unknown;

    const arc = (colour, from, part) => {
      if (part <= 0) return;
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', px / 2);
      c.setAttribute('cy', px / 2);
      c.setAttribute('r', r);
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', colour);
      c.setAttribute('stroke-width', width);
      c.setAttribute('stroke-dasharray', `${round * part} ${round * (1 - part)}`);
      c.setAttribute('stroke-dashoffset', -round * from);
      c.setAttribute('transform', `rotate(-90 ${px / 2} ${px / 2})`);
      svg.appendChild(c);
    };

    arc('var(--mNone)', 0, 1);
    if (total) {
      arc('var(--mOk)', 0, ok / total);
      arc('var(--mBad)', ok / total, bad / total);
    }
    return svg;
  };

  // ready and done are percentages; marks are counts of earned, lost and ungraded
  window.MyTermShapes = {
    draw: (size, reading) => {
      const box = document.createElement('div');
      box.className = 'trio ' + size;

      const square = document.createElement('span');
      square.className = 'sq';
      square.title = reading.readyTip || '';
      const fill = document.createElement('i');
      fill.style.height = (reading.ready ?? 0) + '%';
      square.appendChild(fill);

      const bar = document.createElement('span');
      bar.className = 'tbar';
      bar.title = reading.doneTip || '';
      const run = document.createElement('i');
      run.style.width = (reading.done ?? 0) + '%';
      bar.appendChild(run);

      // The ring is always drawn, even with nothing judged: then it is
      // the bare track, which says "nothing judged" in the same language
      // as a half green ring says "half right". It used to be a dashed
      // outline in that case — a third shape for a third state, where
      // the same shape empty would have done
      const marks = reading.marks || { ok: 0, bad: 0, unknown: 0 };
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.title = reading.marksTip || 'Not judged yet';
      dot.appendChild(disc(SIZES[size] || 16, marks.ok, marks.bad, marks.unknown));

      box.append(square, bar, dot);
      return box;
    }
  };
})();
