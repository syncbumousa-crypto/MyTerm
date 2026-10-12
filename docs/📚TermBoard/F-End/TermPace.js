// ============================================================
// # 🏁 ⏳  WHEN THE WORK RUNS OUT
// # 🔤 JavaScript
// # 🎯 Two sentences: what the reader's own measured pace says the end
// #    date is, and what a pace they pick would say instead
// # 🔗 THE MEASURED ONE COMES FIRST and is the one with a number in it
// #    that nobody chose. The second is a question — "if I did four
// #    hours a day" — and a question is only worth asking next to the
// #    answer you already have.
// #
// #    Both divide the work LEFT by what a day is worth, so both are in
// #    the same currency as the strips under the chapters: minutes, at
// #    the price the board already charges for a row
// ============================================================
(() => {
  const days = () => window.MyTermDaysStore;
  const board = () => window.MyTermBoardStore;
  const $ = id => document.getElementById(id);

  const HOURS_KEY = 'myterm.pace.hours';
  let perDay = 4;
  try { const v = Number(localStorage.getItem(HOURS_KEY)); if (v >= 1 && v <= 24) perDay = v; } catch {}

  const el = (tag, cls, words) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (words != null) n.textContent = words;
    return n;
  };

  // 171 minutes reads as 2h51m, not as 171 and not as 2.85
  const asHours = m => {
    const whole = Math.max(0, Math.round(m));
    const h = Math.floor(whole / 60), r = whole % 60;
    if (h && r) return h + 'h' + String(r).padStart(2, '0') + 'm';
    if (h) return h + 'h';
    return r + 'm';
  };
  const daysWord = n => n + (n === 1 ? ' day' : ' days');

  // ============================================================
  // # 📐 ➖  HOW MUCH WORK IS LEFT
  // # 🔤 JavaScript
  // # 🎯 Every chapter's minutes, less what is already done
  // # 🔗 A chapter nobody has written yet is worth NOTHING here, not a
  // #    guess. The board knows what a chapter comes to only once its
  // #    parts exist; inventing an average for the empty ones would put
  // #    a number on the end of the term that no part of the board can
  // #    be opened to check
  // ============================================================
  const termHours = () => {
    const b = board()?.board?.();
    let all = 0, did = 0;
    (b?.courses || []).filter(c => !c.deleted).forEach(c => {
      (c.chapters || []).filter(h => !h.deleted).forEach(h => {
        // What a chapter is worth is asked of the store, so this line
        // and the cards below it can never put a different price on the
        // same chapter
        const worth = board().hoursOf(h);
        all += worth;
        did += Math.min(worth, Math.max(0, Number(h.doneMinutes) || 0));
      });
    });
    return { all, did, left: Math.max(0, all - did) };
  };

  const leftMinutes = () => termHours().left;

  // ============================================================
  // # 🗂️ 🏷️  WHAT ONE PIECE OF A DAY WAS
  // # 🔤 JavaScript
  // # 🎯 Turns the ids in an entry back into words a reader knows
  // # 🔗 The record keeps ids, not names, so that renaming a course does
  // #    not orphan a history. The names are looked up at the moment of
  // #    showing — and a chapter that has since been removed says so
  // #    rather than showing a bare id or vanishing
  // ============================================================
  // The course is the heading these sit under, so it is not said again
  // on every line beneath it
  const nameOf = e => {
    const b = board()?.board?.();
    const c = b?.courses.find(x => x.id === e.c);
    const h = (c?.chapters || []).find(x => x.id === e.h);
    const part = (h?.parts || []).find(p => p.id === e.s);
    const label = part ? part.name.split('·')[0].trim() : '';
    return (h ? h.name : 'a chapter since removed')
         + (label ? ' · ' + label : '')
         + (Math.abs(e.n) > 1 ? ' ×' + Math.abs(e.n) : '');
  };

  let where = null, pop = null;

  const shut = () => { if (pop) { pop.remove(); pop = null; } };

  // ============================================================
  // # 📜 🚫  THE DAYS, AND LEAVING SOME OUT
  // # 🔤 JavaScript
  // # 🎯 Every day that was measured, what it was made of, and a switch
  // #    on each
  // # 🔗 A DAY YOU TICKED OFF WHAT YOU ALREADY KNEW IS NOT A DAY YOU
  // #    WORKED, and it lifts the average into a lie that then tells
  // #    you a date. So any day — or any one piece of one — can be left
  // #    out. And what is left out is drawn switched off rather than
  // #    removed: a reader must be able to see what they excluded, or
  // #    they cannot change their mind about it
  // ============================================================
  const openDays = anchor => {
    if (pop) { shut(); return; }
    pop = el('div', 'pacePop');
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'The days behind your average');
    pop.addEventListener('click', e => e.stopPropagation());

    const open = {};
    const draw = () => {
      pop.textContent = '';
      const s = days().stats();
      const head = el('div', 'pacePopHead');
      head.append(el('span', null, s.days
        ? asHours(s.avg) + ' a day, over ' + daysWord(s.days) + ' — ' + asHours(s.total) + ' in all'
        : 'nothing counted yet'));
      pop.append(head);

      s.list.forEach(d => {
        const row = el('div', 'paceDay' + (d.off ? ' off' : ''));

        const sw = el('button', 'paceSwitch' + (d.off ? '' : ' on'));
        sw.type = 'button';
        sw.title = d.off ? 'Count this day again' : 'Leave this day out of the average';
        // Leaving a day out changes what it is worth, so the sentence
        // AND that day's square both have to be redrawn: a square still
        // green for a day the average no longer counts is the line and
        // the grid saying different things about the same day
        sw.onclick = () => { days().exclude(d.key, !d.off); draw(); paint();
                             window.MyTermDays?.repaint?.(); };

        // The expander stands at the START of the row, so every day's
        // switch, arrow and name line up down the whole list
        const twist = el('button', 'paceTwist' + (open[d.key] ? ' open' : ''), '▸');
        twist.type = 'button';
        twist.title = open[d.key] ? 'Fold this day' : 'What this day was made of';
        twist.onclick = () => { open[d.key] = !open[d.key]; draw(); };

        const pull = el('button', 'paceDayName');
        pull.type = 'button';
        pull.textContent = d.key + '  ·  ' + asHours(d.counted) +
          (d.off ? ' (left out)' : '') + '  ·  ' + d.rows.length +
          (d.rows.length === 1 ? ' piece' : ' pieces');
        pull.onclick = () => { open[d.key] = !open[d.key]; draw(); };

        row.append(sw, twist, pull);
        pop.append(row);

        if (!open[d.key]) return;

        // ============================================================
        // THE COURSES BEHIND ONE DAY
        // The pieces alone answer "what did I touch"; they do not answer
        // "where did the day go", which is the question somebody looking
        // at a six-hour Tuesday is actually asking. So they are gathered
        // by course first — how many things and how long in each — and
        // the pieces sit under the course they belong to
        // ============================================================
        const byCourse = new Map();
        d.rows.forEach(r => {
          const key = r.c || '?';
          if (!byCourse.has(key)) byCourse.set(key, { n: 0, m: 0, rows: [] });
          const g = byCourse.get(key);
          g.rows.push(r);
          if (!r.off) { g.n += r.n; g.m += r.m; }
        });

        [...byCourse.entries()]
          .sort((a, b) => b[1].m - a[1].m)
          .forEach(([id, g]) => {
            const b = board()?.board?.();
            const course = b?.courses.find(x => x.id === id);
            const line = el('div', 'paceCourse');
            line.append(el('span', 'paceCourseName', course ? course.name : 'a course since removed'),
                        el('span', 'paceCourseSum',
                           Math.abs(g.n) + (Math.abs(g.n) === 1 ? ' row' : ' rows') +
                           '  ·  ' + asHours(g.m)));
            pop.append(line);

            g.rows.forEach(r => {
              const one = el('div', 'paceBit' + (r.off ? ' off' : ''));
              const b2 = el('button', 'paceSwitch' + (r.off ? '' : ' on'));
              b2.type = 'button';
              b2.title = r.off ? 'Count this again' : 'Leave this out of the average';
              b2.onclick = () => { days().exclude(r.id, !days().isOut(r.id)); draw(); paint();
                                   window.MyTermDays?.repaint?.(); };
              one.append(b2, el('span', 'paceBitName', nameOf(r)),
                         el('span', 'paceBitMin', (r.m < 0 ? '' : '+') + Math.round(r.m * 10) / 10 + 'm'));
              pop.append(one);
            });
          });
      });
    };
    draw();
    // Hung on the WHOLE block and not on the sentence that opened it.
    // Every switch in here changes the average, which redraws the
    // sentence — and a list living inside that sentence was swept away
    // with it, so the reader's first press closed the thing they had
    // just opened
    where.append(pop);
  };

  // ============================================================
  // # ✍️ 🖌️  THE TWO SENTENCES
  // # 🔤 JavaScript
  // # 🎯 Draws them, and draws them again whenever the answer changes
  // # 🔗 A reader with no history yet is told WHERE the number will come
  // #    from rather than shown a blank: the measuring starts the
  // #    moment they tick something inside a chapter, and nothing on
  // #    this screen would otherwise say so
  // ============================================================
  const paint = () => {
    if (!where) return;
    // The sentences are replaced; an open list is left standing. It is
    // the reason the sentence changed, and it must not disappear to
    // show the result of pressing something inside it
    [...where.children].forEach(n => { if (!n.classList.contains('pacePop')) n.remove(); });
    const sum = termHours();
    const left = sum.left;
    const s = days()?.stats?.() || { avg: null, days: 0, total: 0, list: [] };

    // ============================================================
    // THE WHOLE TERM, IN ONE LINE, BEFORE ANY FORECAST
    // Both sentences under this are predictions; this is the only
    // number here that has already happened. It is said first and in
    // the colours the cards use for the same two quantities — green
    // for what is done, orange for what the work comes to — so a
    // reader moving between the cards and this line is reading the
    // same pair of numbers in the same pair of colours, added up
    // ============================================================
    const tally = el('p', 'paceTally');
    tally.append(el('b', 'paceDone', asHours(sum.did)),
                 el('span', 'paceOf', ' of '),
                 el('b', 'paceAll', asHours(sum.all)),
                 el('span', 'paceOf', ' of the term’s work'));
    tally.title = sum.all > 0
      ? Math.round(sum.did / sum.all * 100) + '% of everything on the board'
      : 'Nothing on the board has hours yet';
    where.append(tally);

    // --- the measured one ---
    const real = el('p', 'paceLine');
    if (s.avg == null) {
      real.append(el('span', 'paceDim', s.list.length
        ? 'Every day is left out of your average.'
        : 'Your pace is measured from what you tick inside a chapter.'));
      if (s.list.length) {
        const b = el('button', 'paceVal', 'the days');
        b.type = 'button';
        b.onclick = e => { e.stopPropagation(); openDays(b); };
        real.append(document.createTextNode(' '), b);
      }
    } else {
      const avg = el('button', 'paceVal', asHours(s.avg));
      avg.type = 'button';
      avg.setAttribute('aria-haspopup', 'dialog');
      avg.title = 'Measured over ' + daysWord(s.days) + ' — ' + asHours(s.total) +
                  ' in all. Press to see the days and leave some out.';
      avg.onclick = e => { e.stopPropagation(); openDays(avg); };
      real.append(document.createTextNode('According to your '), avg,
                  document.createTextNode(' completing average, you’ll finish by '));
      real.append(el('b', 'paceDays', left > 0 ? daysWord(Math.ceil(left / s.avg)) : 'nothing left'));
    }
    where.append(real);

    // --- and the one you ask ---
    const ask = el('p', 'paceLine paceAsk');
    const minus = el('button', 'paceStep', '−');
    const plus = el('button', 'paceStep', '+');
    const val = el('span', 'paceVal paceNum', String(perDay));
    minus.type = plus.type = 'button';
    minus.disabled = perDay <= 1;
    plus.disabled = perDay >= 24;
    minus.setAttribute('aria-label', 'one hour less a day');
    plus.setAttribute('aria-label', 'one hour more a day');
    const step = by => {
      perDay = Math.max(1, Math.min(24, perDay + by));
      try { localStorage.setItem(HOURS_KEY, String(perDay)); } catch {}
      paint();
      // The squares below are coloured against this very number, so they
      // are redrawn with it. Left alone they would be a judgement on a
      // goal the reader has just changed their mind about
      window.MyTermDays?.repaint?.();
    };
    minus.onclick = e => { e.stopPropagation(); step(-1); };
    plus.onclick = e => { e.stopPropagation(); step(1); };

    ask.append(document.createTextNode('If completing '), minus, val, plus,
               document.createTextNode(' hours a day, then by '));
    ask.append(el('b', 'paceDays',
      left > 0 ? daysWord(Math.ceil(left / (perDay * 60))) : 'nothing left'));
    where.append(ask);

    where.title = left > 0 ? asHours(left) + ' of work left on the board' : '';
  };

  document.addEventListener('click', shut);

  window.MyTermPace = {
    arm: spot => {
      where = typeof spot === 'string' ? $(spot) : spot;
      return Boolean(where);
    },
    // ============================================================
    // # ⏱️ 🎨  AND THE SQUARES ARE TOLD WHEN THE RECORD ARRIVES
    // # 🔤 JavaScript
    // # 🎯 Reads the record once, draws the sentences, and sends the
    // #    grid back to the record it could not see yet
    // # 🔗 THE GRID IS BUILT BEFORE THIS FILE IS READ. The board draws
    // #    the squares the moment it has the term's dates, which is
    // #    long before a second file comes back from Drive — so every
    // #    day was coloured against a record of nothing, and the
    // #    squares came out grey. It LOOKED right for a while only
    // #    because some later repaint happened to land after the read;
    // #    a slower morning took the colours away and the reader asked
    // #    where they had gone. Now it is said rather than hoped for
    // ============================================================
    show: async () => {
      if (!where) return;
      await days()?.ready?.().catch(() => {});
      paint();
      window.MyTermDays?.repaint?.();
    },
    paint,
    leftMinutes,
    // The hours a day the reader is aiming at. The squares below are
    // coloured against it, so it is read from here and not kept twice
    hours: () => perDay,
    goalMinutes: () => perDay * 60
  };
})();
