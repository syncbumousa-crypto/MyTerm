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
  // # 🗂️ 🎚️  THE FOLDERS OF A BANK
  // # 🔤 JavaScript
  // # 🎯 The ready questions gathered into folders — what it asks of
  // #    you crossed with how it asks — so a sitting can be one folder,
  // #    several, or the whole bank
  // # 🔗 BUILT FROM WHAT IS THERE, NOT FROM A LIST OF WHAT COULD BE.
  // #    A bank of a hundred true-or-false questions should show one
  // #    folder and not six, five of them empty; and a bank nobody has
  // #    sorted yet shows a single UNSORTED folder holding all of it,
  // #    so the reader is never told there is nothing to sit for.
  // #
  // #    The choice is remembered per chapter and in this browser only:
  // #    which folders you practised last night is a convenience, not a
  // #    fact about the course, and it has no business in Drive
  // ============================================================
  const TRACKS = { theory: 'Theory', practical: 'Practical' };
  const TYPES = { mcq: 'Multiple choice', tf: 'True / false', essay: 'Essay' };

  const folderOf = row => (row.track || '') + '|' + (row.type || '');

  const folderName = key => {
    const [track, type] = key.split('|');
    const words = [TRACKS[track], TYPES[type]].filter(Boolean);
    return words.length ? words.join(' · ') : 'Unsorted';
  };

  const foldersOf = set => {
    const seen = new Map();
    set.forEach(row => {
      const key = folderOf(row);
      seen.set(key, (seen.get(key) || 0) + 1);
    });
    // Sorted so the folders do not jump about as answers are written:
    // theory before practical, and inside each the way the types are
    // listed above, with the unsorted pile last
    const rank = key => {
      const [track, type] = key.split('|');
      const t = Object.keys(TRACKS).indexOf(track);
      const y = Object.keys(TYPES).indexOf(type);
      return (t < 0 ? 9 : t) * 10 + (y < 0 ? 9 : y);
    };
    return [...seen.entries()].map(([key, n]) => ({ key, n, name: folderName(key) }))
                              .sort((a, b) => rank(a.key) - rank(b.key));
  };

  const memoryKey = () => 'myterm.bankfolders.' + (store()?.openId() || '-');

  const remembered = folders => {
    let kept = null;
    try { kept = JSON.parse(localStorage.getItem(memoryKey()) || 'null'); } catch { kept = null; }
    const here = new Set(folders.map(f => f.key));
    // A chapter never chosen for means the WHOLE bank — which is what a
    // reader pressing Start expects. A chapter chosen for keeps what was
    // chosen, even if that is nothing: a reader who cleared the folders
    // and came back should find them cleared, not quietly all on again
    if (!Array.isArray(kept)) return new Set(folders.map(f => f.key));
    return new Set(kept.filter(k => here.has(k)));
  };

  const remember = chosen => {
    try { localStorage.setItem(memoryKey(), JSON.stringify([...chosen])); } catch { /* a private window */ }
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

    // ============================================================
    // THE WRITTEN ANSWER, WHERE THE QUESTION IS
    //
    // A question with nothing to choose between is answered against the
    // answer it came with, and that answer has to be readable and
    // correctable in the same place the question is — otherwise the one
    // field the run depends on is the one field the bank cannot show,
    // and a wrong answer key can only be fixed in the sheet, three
    // screens away from the question it belongs to.
    //
    // Shown only where there is nothing to choose: under four answers
    // with one of them marked it would be a second answer to the same
    // question, and the run would have to guess which was meant
    // ============================================================
    const written = document.createElement('div');
    if (picksOf(row).length < 2) {
      written.className = 'qcard-key';
      written.contentEditable = 'true';
      written.innerHTML = row.text;
      written.dataset.empty = 'The answer, to mark your own working against';
      written.oninput = () => store().editRow(row.id, 'text', written.innerHTML);
    }

    card.append(head, list, feet);
    if (written.className) card.append(written);
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
  // ============================================================
  // TWO WAYS TO BE ANSWERABLE, AND THE CHOICE COMES FIRST
  //
  // A question with two answers and one of them marked is asked by
  // CHOOSING. A written question — work it out, show your working — has
  // no choices at all and is asked by READING: the question, then the
  // answer it came with, then your own word on whether you had it.
  //
  // Three hundred and thirty-eight of those sat in the folders unasked,
  // because "can this be asked" meant "has it got choices". A whole
  // kind of question was classified, counted, shown in its folder, and
  // silently skipped by the only thing the folder is for.
  //
  // The choice comes first where a row has both, which is not a
  // contradiction but a mislabelled row: some arrived from the reader's
  // own file typed as written questions with four answers under them.
  // Asked by choosing, such a row is asked properly; asked by reading,
  // its answers would be hidden for no reason
  // ============================================================
  const picksOf = row => row.pick.filter(p => plain(p));
  const byChoice = row => picksOf(row).length >= 2 && row.right >= 0;
  const byHand = row => Boolean(plain(row.text));
  const ready = rows => rows.filter(r => plain(r.ask) && (byChoice(r) || byHand(r)));

  // What counts as having had it right, in whichever way it was asked
  const wasRight = row => (byChoice(row)
    ? run.said[row.id] === row.right
    : run.said[row.id] === 'ok');

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
    if (byChoice(row)) {
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
    } else {
      // ============================================================
      // A WRITTEN ANSWER IS MARKED BY THE ONE WHO WROTE IT
      //
      // The answer comes AFTER it is asked for and not before, or the
      // question is not a question. And the two words that follow are
      // the reader's own: nothing here can tell whether a page of
      // working arrives at the same place as the answer in the book.
      //
      // It is the same mark as a chosen answer — the square beside the
      // thing it tests goes green or red the same way — because what
      // the square says is "do you have this now", and that question is
      // answered as honestly by someone marking their own working as by
      // someone pressing one of four buttons
      // ============================================================
      const show = document.createElement('button');
      show.className = 'qrun-show';
      show.type = 'button';
      show.textContent = 'Show the answer';

      const key = document.createElement('div');
      key.className = 'qrun-key';
      key.hidden = true;
      key.innerHTML = row.text;

      const mark = document.createElement('div');
      mark.className = 'qrun-mark';
      mark.hidden = true;
      [['I had it right', true], ['I had it wrong', false]].forEach(([words, ok]) => {
        const button = document.createElement('button');
        button.className = 'qrun-pick' + (run.said[row.id] === (ok ? 'ok' : 'no') ? ' on' : '');
        button.type = 'button';
        button.textContent = words;
        button.onclick = () => {
          run.said[row.id] = ok ? 'ok' : 'no';
          store().answered(row.id, ok);
          onward();
        };
        mark.append(button);
      });

      show.onclick = () => { show.hidden = true; key.hidden = false; mark.hidden = false; };
      // Already marked once and come back to: the answer is not hidden
      // again, because it has been seen
      if (run.said[row.id] !== undefined) show.onclick();
      picks.append(show, key, mark);
    }

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

  // ============================================================
  // THE STRIP IS TOLD AT EVERY ANSWER, NOT AT THE END OF THE RUN
  //
  // Painting the run returns before the line that tells whoever is
  // listening, so the readings above — the part's green-and-red line,
  // the chapter's, the board's — sat exactly as they were until the
  // reader came back out of the bank. Answer thirty questions and
  // nothing moves; the reader reported it as the line "not reflecting
  // the real state".
  //
  // Said HERE, where an answer has just been recorded, and it costs a
  // redraw of the strip and not of the page: the listener re-reads the
  // counts and redraws the tabs, and the question in hand is untouched
  // ============================================================
  const onward = () => {
    told();
    run.at++;
    paint(host, told);
  };

  const scoreView = wrap => {
    const right = run.rows.filter(wasRight).length;

    const score = document.createElement('p');
    score.className = 'qscore';
    score.textContent = right + ' of ' + run.rows.length + ' right';

    const missed = run.rows.filter(r => !wasRight(r));

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
      said.textContent = run.said[r.id] === undefined ? 'You did not answer'
        : byChoice(r) ? 'You said: ' + plain(r.pick[run.said[r.id]])
        : 'You marked it wrong';

      const was = document.createElement('p');
      was.className = 'qmissed-was';
      // The written answer in full, and not a line of it: it is the
      // whole of what there is to look at afterwards
      was.textContent = 'The answer: ' + (byChoice(r) ? plain(r.pick[r.right]) : plain(r.text));

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

    const folders = foldersOf(set);
    const chosen = remembered(folders);
    const asked = set.filter(row => chosen.has(folderOf(row)));

    const says = document.createElement('span');
    says.className = 'qtop-says';
    says.textContent = !rows.length ? 'No questions in this bank yet'
      : folders.length > 1 && asked.length !== set.length
        ? asked.length + ' chosen of ' + set.length + ' ready'
        : set.length + ' of ' + rows.length + ' ready to ask';

    const start = document.createElement('button');
    start.className = 'qstart';
    start.type = 'button';
    start.textContent = 'Start';
    start.disabled = !asked.length;
    start.title = !set.length
      ? 'A question needs words, and either two answers with one marked right, or an answer to mark your own working against'
      : asked.length ? 'Go through them one at a time' : 'Choose a folder first';
    start.onclick = () => {
      run = { rows: asked, at: 0, said: {} };
      paint(host, told);
    };

    top.append(says, start);
    desk.append(top);

    // One folder is no choice at all, and a strip of one button saying
    // the obvious is in the way of the only thing the reader came for
    if (folders.length > 1) {
      const strip = document.createElement('div');
      strip.className = 'qfolders';

      folders.forEach(folder => {
        const one = document.createElement('button');
        one.className = 'qfolder' + (chosen.has(folder.key) ? ' on' : '');
        one.type = 'button';
        one.innerHTML = '<span class="qfolder-name"></span><span class="qfolder-n"></span>';
        one.querySelector('.qfolder-name').textContent = folder.name;
        one.querySelector('.qfolder-n').textContent = folder.n;
        one.title = chosen.has(folder.key) ? 'In this sitting' : 'Left out of this sitting';
        one.onclick = () => {
          if (chosen.has(folder.key)) chosen.delete(folder.key); else chosen.add(folder.key);
          remember(chosen);
          paint(host, told);
        };
        strip.append(one);
      });

      const all = document.createElement('button');
      all.className = 'qfolder qfolder-all';
      all.type = 'button';
      all.textContent = chosen.size === folders.length ? 'None' : 'All';
      all.title = chosen.size === folders.length ? 'Leave them all out' : 'Take them all';
      all.onclick = () => {
        remember(chosen.size === folders.length ? new Set() : new Set(folders.map(f => f.key)));
        paint(host, told);
      };
      strip.append(all);

      desk.append(strip);
    }

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
