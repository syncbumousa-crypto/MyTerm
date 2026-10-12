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

  // ============================================================
  // # 🎨 📏  THE FIVE STEPS OF A DAY
  // # 🔤 JavaScript
  // # 🎯 Turns minutes finished and minutes meant into one of five
  // #    verdicts, or no verdict at all
  // # 🔗 −1 IS NOT ZERO. A day with nothing finished has no verdict: it
  // #    is drawn as it always was, and a day still ahead is drawn
  // #    hollow — a day that has not come yet is not a day you failed,
  // #    and the grid must never say otherwise.
  // #
  // #    And a day with NO GOAL is all gain: if the reader never set an
  // #    hours-a-day, anything they finished is above what they asked
  // #    of themselves, and the square is full
  // ============================================================
  const level = (got, goal) => {
    if (!(goal > 0)) return got > 0 ? 4 : -1;
    const r = got / goal;
    if (r >= 1) return 4;
    if (r >= 0.75) return 3;
    if (r >= 0.5) return 2;
    if (r >= 0.25) return 1;
    return 0;                       // including nothing at all: a day missed
  };

  // ============================================================
  // # 🕛 ⚖️  A DAY IS JUDGED BY HOW MUCH OF IT HAS GONE
  // # 🔤 JavaScript
  // # 🎯 How much of the day's goal is due by now, and whether the day
  // #    may be judged at all
  // # 🔗 TODAY IS NOT A FAILED DAY AT NINE IN THE MORNING. Judging it
  // #    against a whole day's goal paints it red for hours before the
  // #    reader could possibly have met it — so what is due is the
  // #    share of the day that has passed: half of it at noon, all of
  // #    it by midnight, and nothing asked of an empty morning.
  // #
  // #    AND A DAY BEFORE ANY OF THIS WAS MEASURED IS NOT A DAY YOU
  // #    MISSED. The record begins when the engine first ran; every
  // #    square before that would otherwise be painted red for a
  // #    failure that was never asked of anyone
  // ============================================================
  const dueShare = on => {
    if (on !== key(midnight())) return 1;
    const n = new Date();
    return Math.min(1, (n.getHours() * 60 + n.getMinutes()) / 1440);
  };

  let began = null;
  const firstMeasured = () => {
    if (began !== null) return began;
    const list = window.MyTermDaysStore?.stats?.().list || [];
    began = list.length ? list.map(d => d.key).sort()[0] : '';
    return began;
  };

  const asHours = m => {
    const whole = Math.max(0, Math.round(m));
    const h = Math.floor(whole / 60), r = whole % 60;
    if (h && r) return h + 'h' + String(r).padStart(2, '0') + 'm';
    if (h) return h + 'h';
    return r + 'm';
  };

  // What was finished on one day, after whatever the reader left out of
  // their average. Read from the record, not kept here: the line above
  // and the squares below must not be able to say different numbers
  let counted = null;
  const refreshCounted = () => {
    counted = new Map();
    (window.MyTermDaysStore?.stats?.().list || []).forEach(d => counted.set(d.key, d.counted));
  };
  const minutesOn = key => {
    if (!counted) refreshCounted();
    return counted.get(key) || 0;
  };

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

  // ============================================================
  // THE RING COUNTS THE TERM THE WAY THE GRID DRAWS IT
  // A square is drawn for the start day AND for the end day, and the
  // line under the grid counts them both — but the ring measured the
  // DISTANCE between the two dates, which is one less. So the same
  // term read 127 days inside the ring and 128 directly beneath it,
  // and the last day of the term was a day you can be marked for and
  // the ring did not know existed. The last day is a day you study.
  //
  // `gone` is days BEGUN, today included, so the start day is day one
  // and not day zero; `left` is then the days after today, which is
  // what the line below already says.
  // ============================================================
  // The term measured ONCE, and read twice. It was measured twice and
  // read twice, and the two measurements were not the same measurement
  const spanOf = (start, end) => {
    const total = Math.round((end - start) / DAY) + 1;
    const gone = Math.round((midnight() - start) / DAY) + 1;
    const seen = Math.max(0, Math.min(total, gone));
    return { total, gone, seen, left: total - seen };
  };

  const drawRing = (start, end) => {
    ring.textContent = '';
    const { total, gone, seen, left } = spanOf(start, end);
    if (!(total > 0)) return false;

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
      + (gone < 1 ? ' · not started yet'
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

          // ============================================================
          // THE COLOUR IS WHAT YOU FINISHED, AGAINST WHAT YOU MEANT TO
          //
          // Not a comparison with your other days: a judgement on the
          // day against the goal YOU set, which is the number in the
          // line directly above this grid. Five steps rather than a
          // smooth scale, because the point is a verdict read at a
          // glance — met it, nearly, half, a little, a trace — and the
          // exact share is in the tooltip for whoever wants it.
          //
          // And the press keeps its own meaning: it says "count this as
          // a day I worked", which is a thing only the reader knows. So
          // the two facts are drawn differently — the colour is
          // measured, the tick is said
          // ============================================================
          const got = Math.round(minutesOn(k));
          // THIS day's goal, not an average of the week: a Thursday with
          // two hours in it and a Sunday with six are not the same day,
          // and one number held over both makes one of them fail every
          // week while the other coasts
          const whole = window.MyTermPace?.goalMinutes?.(k) || 0;
          const began = firstMeasured();
          const share = dueShare(k);
          const due = Math.round(whole * share);
          // A day still ahead is not judged; nor is one from before any
          // of this was being measured; nor an empty morning
          const judge = !ahead && began && k >= began
                        && !(isToday && share < 0.5 && got === 0);
          const lvl = judge ? level(got, due) : -1;
          if (lvl >= 0) cell.dataset.lvl = String(lvl);
          cell.title = `${MONTHS[walk.getMonth()]} ${walk.getDate()}`
            + (got > 0 ? ' · ' + asHours(got) : (judge ? ' · nothing finished' : ''))
            + (judge && whole > 0
                ? ' of ' + asHours(due) + (isToday && share < 1 ? ' due so far today' : '')
                : '')
            + (mark?.done ? ' · marked as worked' : '')
            + (ahead ? ' · still ahead' : (!began || k < began) ? ' · before this was measured' : '');
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

    // ============================================================
    // THE BEST DAY AND THE WORST, INSTEAD OF A COUNT OF DAYS
    //
    // The line used to say how many days the term is and how many are
    // left — and the ring directly above it already says both, in
    // bigger type. Two readings of one fact, one of them redundant.
    //
    // What the grid could not say is which day was the best and which
    // the worst: the colours rank a day against its own goal, not
    // against the other days, so the biggest day of the term is not
    // picked out by being the greenest. Now it is named
    // ============================================================
    line.textContent = '';
    // counted is a Map, and Object.entries of a Map is always empty —
    // which made this read "nothing finished yet" on a term full of work
    if (!counted) refreshCounted();
    const inTerm = [...counted.entries()]
      .filter(([k, m]) => m > 0 && k >= key(start) && k <= key(end));
    if (!inTerm.length) {
      line.textContent = 'Nothing finished yet — the days you work will show here.';
      return;
    }
    const best = inTerm.reduce((a, b) => (b[1] > a[1] ? b : a));
    const worst = inTerm.reduce((a, b) => (b[1] < a[1] ? b : a));
    const short = k => { const d = fromKey(k); return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] : k; };
    const one = (label, pair, cls) => {
      const box = document.createElement('span');
      box.className = 'dayPeak ' + cls;
      box.append(Object.assign(document.createElement('span'), { className: 'peakWhat', textContent: label }),
                 Object.assign(document.createElement('b'), { className: 'peakHours', textContent: asHours(pair[1]) }),
                 Object.assign(document.createElement('span'), { className: 'peakWhen', textContent: short(pair[0]) }));
      box.title = label + ': ' + asHours(pair[1]) + ' on ' + pair[0];
      return box;
    };
    line.append(one('Best day', best, 'best'), one('Worst day', worst, 'worst'));
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
      counted = null;
      began = null;
      build();
    },
    // Called when the goal moves or a day is left out of the average:
    // both change what a square should say about a day whose work has
    // not changed at all
    repaint: () => { if (!board) return; counted = null; began = null; build(); }
  };
})();
