// ============================================================
// # 🗓️ 🟩  A SQUARE FOR EVERY DAY OF THE TERM
// # 🔤 JavaScript
// # 🎯 Draws the whole term as squares, one per day, in full weeks.
// #    Pressing a square says "I worked that day". The term start and
// #    end are set here too, since without them there is no grid
// # 🔗 The grid is the WHOLE term, not only up to today: the empty
// #    squares ahead are part of the news — you see how many are left
// #    to fill. A day still ahead is drawn hollow, not as a day missed,
// #    because the two are not the same thing and drawing them alike
// #    would read as a reproach for something that has not happened.
// #    Weeks run Sunday to Saturday or the row names would lie, and
// #    days outside the term keep the shape without being seen
// ============================================================
(() => {
  const keep = window.MyTermBoardStore;
  const $ = id => document.getElementById(id);

  const grid = $('days-grid'), fromBox = $('term-from'), toBox = $('term-to'), line = $('days-line');
  const ring = $('term-ring'), when = $('term-when'), doneBtn = $('term-when-done');
  const DAY = 86400000;
  const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const arabic = n => String(n);

  const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromKey = s => { const p = (s || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; };
  const midnight = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

  let board = null, editingDates = false;

  const touch = () => keep.change(board);
  const openDates = () => { editingDates = true; ring.hidden = true; when.hidden = false; };

  // ============================================================
  // # 🕰️ ⭕  THE RING OF THE TERM ITSELF
  // # 🔤 JavaScript
  // # 🎯 Once both dates are set, the two date boxes give way to a ring
  // #    that fills as the term goes by, with the days still left in the
  // #    middle of it. Pressing the ring brings the boxes back
  // # 🔗 Its colour is on purpose none of the colours used for work:
  // #    this ring says nothing about you and nothing about us, it only
  // #    says the days pass whether the page is opened or not. Give it
  // #    the green of a finished thing and it reads as an achievement
  // #    when it is a deadline. And the middle says DAYS, not a percent:
  // #    you can plan around "69 days left", not around "33%"
  // ============================================================
  const human = d => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

  const drawRing = (start, end) => {
    ring.textContent = '';
    const total = Math.round((end - start) / DAY);
    if (!(total > 0)) return false;

    const gone = Math.round((midnight() - start) / DAY);
    const seen = Math.max(0, Math.min(total, gone));
    const left = total - seen;

    const NS = 'http://www.w3.org/2000/svg';
    const SIZE = 96, WIDTH = 9, r = (SIZE - WIDTH) / 2, round = 2 * Math.PI * r;

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
    svg.setAttribute('width', SIZE);
    svg.setAttribute('height', SIZE);

    const arc = (cls, part) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', SIZE / 2);
      c.setAttribute('cy', SIZE / 2);
      c.setAttribute('r', r);
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke-width', WIDTH);
      c.setAttribute('class', cls);
      if (part != null) {
        c.setAttribute('stroke-linecap', 'round');
        c.setAttribute('stroke-dasharray', round);
        c.setAttribute('stroke-dashoffset', round * (1 - Math.max(0, Math.min(1, part))));
      }
      return c;
    };

    svg.append(arc('ring-track', null));
    if (seen > 0) svg.append(arc('ring-arc', seen / total));

    const label = (cls, y, words) => {
      const n = document.createElementNS(NS, 'text');
      n.setAttribute('x', SIZE / 2);
      n.setAttribute('y', y);
      n.setAttribute('class', cls);
      n.textContent = words;
      return n;
    };
    svg.append(label('ring-left', SIZE / 2 - 6, left + 'd'));
    svg.append(label('ring-total', SIZE / 2 + 13, 'left of ' + total + 'd'));

    // The pencil is drawn with the ring, because the ring is wiped and
    // drawn again on every change: a button left in the page would be
    // swept away with it. One button, one job — the ring itself is not
    // a button, so pressing it to read it never opens the dates
    const pencil = document.createElement('button');
    pencil.type = 'button';
    pencil.className = 'ring-edit';
    pencil.textContent = '✎';
    pencil.title = 'Change the term dates';
    pencil.onclick = openDates;

    ring.append(svg, pencil);
    ring.title = `Term ${human(start)} → ${human(end)}`
      + (gone < 0 ? ' · not started yet'
        : gone > total ? ' · over'
        : ` · day ${seen} of ${total} · ${left} day${left === 1 ? '' : 's'} left`);
    return true;
  };

  // ============================================================
  // # 📐 🧱  BUILDING THE GRID
  // # 🔤 JavaScript
  // # 🎯 Works out the first and last square, pads the two ends to
  // #    whole weeks, then lays a column per week with its month name
  // #    above it and its number in the term
  // # 🔗 Week numbers count from the week the term starts, not from the
  // #    first column drawn, so a day recorded before the term cannot
  // #    shift the whole term's numbering by a week
  // ============================================================
  const build = () => {
    const start = fromKey(board?.term?.start), end = fromKey(board?.term?.end);
    grid.textContent = '';

    const dated = Boolean(start && end && end >= start) && drawRing(start, end);
    ring.hidden = !dated || editingDates;
    when.hidden = dated && !editingDates;

    if (!dated) {
      line.textContent = 'Set the term start and end to see your days.';
      return;
    }

    const today = midnight();
    const gridFrom = new Date(start.getFullYear(), start.getMonth(), start.getDate() - start.getDay());
    const gridTo = new Date(end.getFullYear(), end.getMonth(), end.getDate() + (6 - end.getDay()));
    const weeks = Math.round((Math.round((gridTo - gridFrom) / DAY) + 1) / 7);

    const names = document.createElement('div');
    names.className = 'day-names';
    NAMES.forEach(n => { const s = document.createElement('span'); s.textContent = n; names.append(s); });

    const months = document.createElement('div');
    months.className = 'day-months';
    const weekNos = document.createElement('div');
    weekNos.className = 'day-weeks';
    const cells = document.createElement('div');
    cells.className = 'day-cells';
    cells.style.gridTemplateColumns = `repeat(${weeks}, 1fr)`;
    months.style.gridTemplateColumns = `repeat(${weeks}, 1fr)`;
    weekNos.style.gridTemplateColumns = `repeat(${weeks}, 1fr)`;

    const walk = new Date(gridFrom);
    let lastMonth = -1, done = 0, past = 0;

    for (let w = 0; w < weeks; w++) {
      const head = walk < start ? new Date(start) : new Date(walk);
      const mcell = document.createElement('span');
      if (head.getMonth() !== lastMonth) { mcell.textContent = MONTHS[head.getMonth()]; lastMonth = head.getMonth(); }
      months.append(mcell);

      const no = Math.round((walk - gridFrom) / DAY / 7) + 1;
      const wcell = document.createElement('span');
      wcell.textContent = arabic(no);
      weekNos.append(wcell);

      for (let d = 0; d < 7; d++) {
        const k = key(walk);
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'day';
        cell.style.gridColumn = w + 1;
        cell.style.gridRow = d + 1;

        if (walk < start || walk > end) {
          cell.classList.add('pad');
          cell.disabled = true;
        } else {
          const mark = board.days?.[k];
          const ahead = walk > today;
          const isToday = k === key(today);
          if (mark?.done) { cell.classList.add('on'); done++; }
          else if (ahead) cell.classList.add('ahead');
          else if (!isToday) cell.classList.add('miss');
          if (isToday) cell.classList.add('today');
          if (!ahead) past++;
          cell.title = `${MONTHS[walk.getMonth()]} ${walk.getDate()}` + (mark?.done ? ' · worked' : ahead ? ' · still ahead' : '');
          cell.onclick = () => {
            board.days = board.days || {};
            const was = board.days[k]?.done === true;
            board.days[k] = { done: !was, updatedAt: new Date().toISOString() };
            touch();
            build();
          };
        }
        cells.append(cell);
        walk.setDate(walk.getDate() + 1);
      }
    }

    const body = document.createElement('div');
    body.className = 'days-body';
    const stack = document.createElement('div');
    stack.className = 'days-stack';
    stack.append(months, weekNos, cells);
    body.append(names, stack);
    grid.append(body);

    const all = Math.round((end - start) / DAY) + 1;
    const left = Math.max(0, Math.round((end - today) / DAY));
    line.textContent = `${done} of ${past} days worked · ${all} days in the term · ${left} left`;
    window.MyTermDaysReading = { done, past, all, left };
  };

  const setDate = (which, value) => {
    board.term = { ...board.term, [which]: value, updatedAt: new Date().toISOString() };
    editingDates = false;
    touch();
    build();
  };

  fromBox.onchange = () => setDate('start', fromBox.value);
  toBox.onchange = () => setDate('end', toBox.value);

  // Done does not save anything: every change was saved the moment it was
  // made. It only says "I am finished looking", and the ring comes back
  doneBtn.onclick = () => { editingDates = false; build(); };

  window.MyTermDays = {
    show: live => {
      board = live;
      fromBox.value = board?.term?.start || '';
      toBox.value = board?.term?.end || '';
      build();
    }
  };
})();
