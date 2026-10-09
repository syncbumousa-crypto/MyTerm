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
  const DAY = 86400000;
  const NAMES = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const arabic = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

  const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromKey = s => { const p = (s || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; };
  const midnight = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

  let board = null;

  const touch = () => keep.change(board);

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
    if (!start || !end || end < start) {
      line.textContent = 'حدّد بداية الترم ونهايته ليظهر جدول أيّامك.';
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
          cell.title = `${arabic(walk.getDate())} ${MONTHS[walk.getMonth()]}` + (mark?.done ? ' · أنجزتَه' : ahead ? ' · لم يأتِ بعد' : '');
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
    line.textContent = `${arabic(done)} يومًا من ${arabic(past)} مضت · ${arabic(all)} يومًا في الترم · بقي ${arabic(left)}`;
    window.MyTermDaysReading = { done, past, all, left };
  };

  fromBox.onchange = () => { board.term = { ...board.term, start: fromBox.value, updatedAt: new Date().toISOString() }; touch(); build(); };
  toBox.onchange = () => { board.term = { ...board.term, end: toBox.value, updatedAt: new Date().toISOString() }; touch(); build(); };

  window.MyTermDays = {
    show: live => {
      board = live;
      fromBox.value = board?.term?.start || '';
      toBox.value = board?.term?.end || '';
      build();
    }
  };
})();
