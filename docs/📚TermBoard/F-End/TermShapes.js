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

  // A solid disc: the arc is half the width and a quarter the radius, so it meets the middle with no hole
  const disc = (px, ok, bad, unknown) => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', px);
    svg.setAttribute('height', px);
    svg.setAttribute('viewBox', `0 0 ${px} ${px}`);

    const total = ok + bad + unknown;
    const slice = (color, from, part) => {
      if (part <= 0) return;
      const c = document.createElementNS(NS, 'circle');
      const r = px / 4, round = 2 * Math.PI * r;
      c.setAttribute('cx', px / 2);
      c.setAttribute('cy', px / 2);
      c.setAttribute('r', r);
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', color);
      c.setAttribute('stroke-width', px / 2);
      c.setAttribute('stroke-dasharray', `${round * part} ${round * (1 - part)}`);
      c.setAttribute('stroke-dashoffset', -round * from);
      c.setAttribute('transform', `rotate(-90 ${px / 2} ${px / 2})`);
      svg.appendChild(c);
    };

    slice('var(--mNone)', 0, 1);
    if (total) {
      slice('var(--mOk)', 0, ok / total);
      slice('var(--mBad)', ok / total, bad / total);
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

      const marks = reading.marks;
      const dot = document.createElement('span');
      dot.className = 'dot' + (marks && (marks.ok + marks.bad + marks.unknown) > 0 ? ' disc' : ' none');
      dot.title = reading.marksTip || 'Not judged yet';
      if (marks && (marks.ok + marks.bad + marks.unknown) > 0) {
        dot.appendChild(disc(SIZES[size] || 16, marks.ok, marks.bad, marks.unknown));
      }

      box.append(square, bar, dot);
      return box;
    }
  };
})();
