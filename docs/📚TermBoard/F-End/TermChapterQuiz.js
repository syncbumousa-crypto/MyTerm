// ============================================================
// # 🎯 📝  THE TEST BANK
// # 🔤 JavaScript
// # 🎯 A part of a chapter that is ANSWERED instead of read: a bank of
// #    questions, a run through them one at a time, and what you got
// # 🔗 NO PAPER HERE. A sheet is for something read from end to end,
// #    and a question is looked at alone, answered, and left — putting
// #    them on pages would mean a reader seeing the next three
// #    questions while trying to answer this one.
// #
// #    The questions are ordinary rows of the same chapter, with three
// #    more fields filled in. So moving one, swapping two, removing
// #    one, both clocks and the whole merge work here without a line
// #    written for them — and a bank can be turned back into a list
// #    without anything being converted
// ============================================================
(() => {
  const store = () => window.MyTermChapterStore;

  let host = null, told = () => {};

  // What has been answered in the run that is going on. It is thrown
  // away when the run ends: an exam is a sitting, not a fact about the
  // course. What survives is the one mark per question saying how it
  // went last time, and that goes in with the ticks
  let run = null;

  const plain = html => {
    const box = document.createElement('div');
    box.innerHTML = html || '';
    return box.textContent.trim();
  };

  // ============================================================
  // # 🗃️ ✍️  THE BANK, AND WRITING IN IT
  // # 🔤 JavaScript
  // # 🎯 A card per question: what is asked, the answers offered, and
  // #    which one is right
  // # 🔗 The right answer is a RADIO on the choice itself and not a
  // #    letter typed somewhere else. Typed, it is a second place the
  // #    truth lives: a choice reordered or removed leaves it pointing
  // #    at whatever moved into that spot, and nothing on the screen
  // #    would say so
  // ============================================================
  const askCard = (row, n, set) => {
    const card = document.createElement('article');
    // A card that cannot be asked is marked ON ITSELF. "9 of 12 ready"
    // at the top tells a reader three are unfinished and gives them no
    // way at all to find which three
    card.className = 'qcard' + (set.includes(row) ? '' : ' qcard-half');

    const head = document.createElement('div');
    head.className = 'qcard-head';

    const no = document.createElement('span');
    no.className = 'qcard-no';
    no.textContent = n;

    const ask = document.createElement('div');
    ask.className = 'qcard-ask';
    ask.contentEditable = 'true';
    ask.innerHTML = row.ask;
    ask.dataset.empty = 'What is asked';
    ask.oninput = () => store().editRow(row.id, 'ask', ask.innerHTML);

    const off = document.createElement('button');
    off.className = 'qcard-off';
    off.type = 'button';
    off.textContent = '✕';
    off.title = 'Remove this question';
    off.onclick = () => { store().dropRow(row.id); paint(host, told); };

    head.append(no, ask, off);

    const list = document.createElement('div');
    list.className = 'qcard-picks';

    const redraw = () => { paint(host, told); };

    row.pick.forEach((one, at) => {
      const line = document.createElement('div');
      line.className = 'qpick' + (at === row.right ? ' right' : '');

      const mark = document.createElement('button');
      mark.className = 'qpick-mark';
      mark.type = 'button';
      mark.title = at === row.right ? 'This is the right answer' : 'Make this the right answer';
      mark.onclick = () => { store().setChoices(row.id, row.pick, at); redraw(); };

      const words = document.createElement('div');
      words.className = 'qpick-words';
      words.contentEditable = 'true';
      words.innerHTML = one;
      words.dataset.empty = 'An answer';
      words.oninput = () => {
        const next = row.pick.slice();
        next[at] = words.innerHTML;
        store().setChoices(row.id, next, row.right);
      };

      const drop = document.createElement('button');
      drop.className = 'qpick-off';
      drop.type = 'button';
      drop.textContent = '✕';
      drop.title = 'Remove this answer';
      drop.onclick = () => {
        const next = row.pick.filter((x, i) => i !== at);
        // Taking away the one that was marked leaves NOTHING marked. It
        // must not slide onto the choice that moved up into the gap:
        // the question would look finished and mark every reader wrong
        const right = at === row.right ? -1
                    : row.right > at ? row.right - 1
                    : row.right;
        store().setChoices(row.id, next, right);
        redraw();
      };

      line.append(mark, words, drop);
      list.append(line);
    });

    const more = document.createElement('button');
    more.className = 'qcard-add';
    more.type = 'button';
    more.textContent = '+ answer';
    more.onclick = () => { store().setChoices(row.id, row.pick.concat(['']), row.right); redraw(); };

    // Two answers is the commonest question there is, and typing "True"
    // and "False" by hand every time is the sort of thing a reader
    // stops doing and then stops writing questions at all
    const yesno = document.createElement('button');
    yesno.className = 'qcard-add';
    yesno.type = 'button';
    yesno.textContent = 'True / False';
    // The two answers, and neither of them marked. Which one is right is
    // the whole question, and a shortcut that answered it as well would
    // be filling in the part only the writer knows
    yesno.onclick = () => { store().setChoices(row.id, ['True', 'False'], -1); redraw(); };

    const feet = document.createElement('div');
    feet.className = 'qcard-feet';
    feet.append(more);
    if (!row.pick.length) feet.append(yesno);

    card.append(head, list, feet);
    return card;
  };

  // ============================================================
  // # ▶️ 🧪  THE RUN
  // # 🔤 JavaScript
  // # 🎯 One question at a time, an answer picked, and the score at the
  // #    end with every question you missed
  // # 🔗 The answer is NOT shown as you go. A bank where the right one
  // #    lights up the moment you press is a bank you cannot be wrong
  // #    in — you learn to read the lighting instead of the question.
  // #    It is all told at the end, where it can be read against what
  // #    you actually chose
  // ============================================================
  // Words, two answers to choose between, and one of them marked. All
  // three, because a question missing any one of them cannot be asked:
  // with no words there is nothing to read, with one answer there is
  // nothing to choose, and with none marked there is no way to be right
  const ready = rows => rows.filter(
    r => plain(r.ask) && r.pick.filter(p => plain(p)).length >= 2 && r.right >= 0
  );

  const runView = () => {
    const wrap = document.createElement('div');
    wrap.className = 'qrun';

    if (run.at >= run.rows.length) return scoreView(wrap);

    const row = run.rows[run.at];

    const bar = document.createElement('div');
    bar.className = 'qrun-bar';
    const count = document.createElement('span');
    count.className = 'qrun-count';
    count.textContent = (run.at + 1) + ' / ' + run.rows.length;
    const stop = document.createElement('button');
    stop.className = 'qrun-stop';
    stop.type = 'button';
    stop.textContent = 'Stop';
    stop.onclick = () => { run = null; paint(host, told); };
    bar.append(count, stop);

    const ask = document.createElement('p');
    ask.className = 'qrun-ask';
    ask.innerHTML = row.ask;

    const picks = document.createElement('div');
    picks.className = 'qrun-picks';
    row.pick.forEach((one, at) => {
      const button = document.createElement('button');
      button.className = 'qrun-pick' + (run.said[row.id] === at ? ' on' : '');
      button.type = 'button';
      button.innerHTML = one;
      button.onclick = () => {
        run.said[row.id] = at;
        store().answered(row.id, at === row.right);
        onward();
      };
      picks.append(button);
    });

    const feet = document.createElement('div');
    feet.className = 'qrun-feet';

    const back = document.createElement('button');
    back.className = 'qrun-move';
    back.type = 'button';
    back.textContent = 'Back';
    back.disabled = run.at === 0;
    back.onclick = () => { run.at--; paint(host, told); };

    const next = document.createElement('button');
    next.className = 'qrun-move';
    next.type = 'button';
    next.textContent = run.at === run.rows.length - 1 ? 'Finish' : 'Skip';
    next.onclick = onward;

    feet.append(back, next);
    wrap.append(bar, ask, picks, feet);
    return wrap;
  };

  const onward = () => {
    run.at++;
    paint(host, told);
  };

  const scoreView = wrap => {
    const right = run.rows.filter(r => run.said[r.id] === r.right).length;

    const score = document.createElement('p');
    score.className = 'qscore';
    score.textContent = right + ' of ' + run.rows.length + ' right';

    const missed = run.rows.filter(r => run.said[r.id] !== r.right);

    const list = document.createElement('div');
    list.className = 'qmissed';
    missed.forEach(r => {
      const one = document.createElement('div');
      one.className = 'qmissed-one';

      const ask = document.createElement('p');
      ask.className = 'qmissed-ask';
      ask.innerHTML = r.ask;

      const said = document.createElement('p');
      said.className = 'qmissed-said';
      said.textContent = run.said[r.id] === undefined
        ? 'You did not answer'
        : 'You said: ' + plain(r.pick[run.said[r.id]]);

      const was = document.createElement('p');
      was.className = 'qmissed-was';
      was.textContent = 'The answer: ' + plain(r.pick[r.right]);

      one.append(ask, said, was);
      list.append(one);
    });

    const again = document.createElement('button');
    again.className = 'qstart';
    again.type = 'button';
    again.textContent = 'Back to the bank';
    again.onclick = () => { run = null; paint(host, told); };

    wrap.append(score);
    if (missed.length) wrap.append(list);
    wrap.append(again);
    return wrap;
  };

  // ============================================================
  // # 🖌️ 🗂️  DRAWING IT
  // # 🔤 JavaScript
  // # 🎯 The bank while nothing is running, and the run while one is
  // # 🔗 A question that is not finished — no words, or fewer than two
  // #    answers — is kept in the bank and left out of the run. Thrown
  // #    out of the bank it would be work lost; put into the run it
  // #    would be a question nobody can answer
  // ============================================================
  const paint = (into, onChange) => {
    host = into;
    told = onChange || (() => {});
    host.textContent = '';

    const desk = document.createElement('div');
    desk.className = 'qdesk';

    if (run) {
      desk.append(runView());
      host.append(desk);
      return;
    }

    const rows = store().rows();
    const set = ready(rows);

    const top = document.createElement('div');
    top.className = 'qtop';

    const says = document.createElement('span');
    says.className = 'qtop-says';
    says.textContent = rows.length
      ? set.length + ' of ' + rows.length + ' ready to ask'
      : 'No questions in this bank yet';

    const start = document.createElement('button');
    start.className = 'qstart';
    start.type = 'button';
    start.textContent = 'Start';
    start.disabled = !set.length;
    start.title = set.length
      ? 'Go through them one at a time'
      : 'A question needs words, two answers, and one of them marked right';
    start.onclick = () => {
      run = { rows: set, at: 0, said: {} };
      paint(host, told);
    };

    top.append(says, start);
    desk.append(top);

    rows.forEach((row, i) => desk.append(askCard(row, i + 1, set)));

    const more = document.createElement('button');
    more.className = 'csheet-done';
    more.type = 'button';
    more.textContent = '+ question';
    more.onclick = () => {
      if (!store().addRow()) return;
      paint(host, told);
      const last = host.querySelector('.qcard:last-of-type .qcard-ask');
      last?.focus();
    };
    desk.append(more);

    host.append(desk);
    told();
  };

  window.MyTermQuiz = {
    paint,
    // A run left going when the reader walks away is a run they never
    // finished and would come back into halfway through, with no memory
    // of what they had already said
    shut: () => { run = null; }
  };
})();
