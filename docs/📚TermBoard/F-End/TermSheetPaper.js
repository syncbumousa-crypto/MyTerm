// ============================================================
// # 📄 🖌️  DRAWING A STACK OF SHEETS
// # 🔤 JavaScript
// # 🎯 Puts a chapter's law sheets and practice cards on the page, and
// #    answers the six presses they carry
// # 🔗 THE SHEET IS DRAWN, NOT REBUILT. What comes out of the store is
// #    the markup the page was composed as; this file adds nothing to
// #    it but a wrapper, a tick box on the cards, and the pictures the
// #    laws ask for by name. Everything else here is listening
// ============================================================
(() => {
  const chapters = () => window.MyTermChapterStore;
  const sheets = () => window.MyTermSheetStore;
  const icons = () => window.EP_ICONS || {};

  let where = null, group = null, lang = 'ar', told = () => {};

  // The tick on a practice card is a mark like any other, and it is
  // keyed by the card's SEAT — `s-rules1:55`. Not by its order among
  // the filled ones: a card that moved seats would wear somebody
  // else's tick, which is the same rule the reader's own ink follows
  const keyOf = (g, at) => 's-' + g + ':' + at;

  // ============================================================
  // # 🔎 📖  THE TWO PRESSES THE SHEETS WERE MISSING
  // # 🔤 JavaScript
  // # 🎯 A law box and a problem card each owe the reader two answers:
  // #    where it came from in the book, and what it means at length.
  // # 🔗 ONE KEY ANSWERS BOTH. A law is keyed by its own number
  // #    (`rules1:1.1`) because a law PAGE holds several boxes — nine
  // #    pages carry twenty-six of them in FIN250 Ch4 — and a card by
  // #    its SEAT (`rules1:55`), which is what its tick and the
  // #    reader's ink are keyed by too. Never by its order among the
  // #    filled ones: a card that moves seats would wear another
  // #    card's explanation.
  // # 🔗 The explanation window takes any key at all, so nothing but
  // #    the button was ever missing. The places are read from the
  // #    chapter's own sheets file, resolved when it was built — the
  // #    reader's book is a PDF read a page at a time, and searching
  // #    it for a ten-word window would turn one press into a hundred
  // #    page reads.
  // ============================================================
  const ICON_SRC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2.5H20v19H6.5A2.5 2.5 0 0 1 4 19V5a2.5 2.5 0 0 1 2.5-2.5z"/></svg>';
  const ICON_EP = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.1a2.7 2.7 0 1 1 3.9 2.5c-.7.4-1.2 1-1.2 1.8v.4"/><line x1="12" y1="17.2" x2="12" y2="17.3"/></svg>';
  const ICON_CALC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2"/><rect x="7.8" y="5.4" width="8.4" height="3.4" rx=".6"/><path d="M8.6 12.4h.01M12 12.4h.01M15.4 12.4h.01M8.6 15.6h.01M12 15.6h.01M15.4 15.6h.01M8.6 18.4h.01M12 18.4h.01M15.4 18.4h.01"/></svg>';

  // `terms:9` — which stack of rows, and the row's own NUMBER in it.
  // Matched by name because that is what the reference is written in:
  // the stacks are called "Terms · Ch1" and "Questions · Ch1", or bare
  // "Terms" and "Questions" in the chapters built later
  const rowFor = ref => {
    const cut = String(ref || '').split(':');
    if (cut.length < 2) return '';
    const want = /^questions/i.test(cut[0]) ? /^questions/i : /^terms/i;
    const section = (chapters()?.sections?.() || [])
      .find(s => s.kind === 'part' && want.test(s.name || ''));
    if (!section) return '';
    const no = cut.slice(1).join(':');
    const row = (chapters()?.rowsOf?.(section.id) || []).find(r => String(r.no) === no);
    return row ? row.id : '';
  };

  // ============================================================
  // # 🏷️ 📚  WHICH COPY OF THE BOOK A KIND MEANS
  // # 🔤 JavaScript
  // # 🎯 Turns `book` and `bank` into this chapter's own source ids
  // # 🔗 A sheet place was resolved when the chapter was built, where
  //  #   the only thing known about the book was that it WAS the book.
  // #    The panel's jump matches a place against the id of the source
  // #    it is showing, so a place carrying a kind lights nothing.
  // # 🔗 Read off THE CHAPTER'S OWN ROWS, because they point at the
  // #    chapter's own copies — a course has twenty sources and the
  // #    name on them is not a contract
  // ============================================================
  const idForKind = () => {
    const map = {};
    const all = window.MyTermSources;
    (chapters()?.sections?.() || []).forEach(section => {
      (chapters()?.rowsOf?.(section.id) || []).forEach(row => {
        (row.srcs || []).forEach(link => {
          const kind = all?.one?.(link.src)?.kind;
          if (kind && !map[kind]) map[kind] = link.src;
        });
      });
    });
    return map;
  };

  // ============================================================
  // # ⏱️ 🎯  A JUMP MADE WHILE THE PANEL IS STILL BEING BUILT
  // # 🔤 JavaScript
  // # 🎯 Asks for the jump again until it takes, or gives up and says so
  // # 🔗 The panel answers false while the page it is asked for has no
  // #    slot yet — and pressing Sources returns long before the stacks
  // #    are laid out. The first build waited four tenths of a second
  // #    and the press landed on an empty panel: open, and nothing lit.
  // #    Waiting on the panel's own markup would be this file reaching
  // #    into another's; asking again until the answer changes needs to
  // #    know nothing at all.
  // # 🔗 AND isOpen() IS NOT THE SIGNAL. Measured on the live page: the
  // #    panel reports itself open two milliseconds after the button is
  // #    pressed, and the first jump does not take until 3,140 — and
  // #    that was with the sources already loaded. Sixteen quarters of
  // #    a second was on the edge of that and over it from cold, which
  // #    is exactly the press that lit nothing in B164. Sixteen seconds
  // #    now, and they cost nothing at all when the first ask takes.
  // ============================================================
  const jump = async (pane, link) => {
    for (let i = 0; i < 40; i++) {
      if (await pane?.goTo?.(link)) return true;
      await new Promise(r => setTimeout(r, 400));
    }
    return false;
  };

  const button = (cls, title, art, go) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.title = title;
    b.innerHTML = art;
    b.onclick = event => { event.stopPropagation(); go(); };
    return b;
  };

  // A press that finds nothing when something is there is a press that
  // tells the reader there is nothing — so each button is added only
  // when what it would open exists
  const presses = (host, key) => {
    if (!host || !key || host.querySelector(':scope > .srcJump, :scope > .epJump')) return;

    // ============================================================
    // A LAW IS PRESSED THROUGH ITS ROW
    //
    // The panel does not light a piece of text handed to it. It draws
    // the marks of the chapter's ROWS onto each page as it is read, and
    // then flashes one of them by its id. A sheet's own place carries a
    // source KIND (`book`) and no id, so pressed on its own it lights
    // nothing whatever, and the reader is left pressing a dead button —
    // which is worse than no button.
    //
    // So the place names the row it came out of (`terms:9`) and the
    // press goes through that row: real ids, marks already on the page,
    // and the same behaviour as pressing the row itself. The row is
    // found by its NUMBER, which is what the chapter was written with.
    // ============================================================
    const places = sheets()?.srcsOf?.(key) || [];
    if (places.length) {
      host.append(button('srcJump', 'اذهب لمصدره في الكتاب', ICON_SRC, async () => {
        const pane = window.MyTermSourcePane;
        // The panel is opened by PRESSING THE READER'S OWN BUTTON, not by
        // calling open() here. It takes the board and the course, it arms
        // itself with the course screen's own handlers, it loads the
        // sources, and it keeps the button's icon honest — open() called
        // bare did none of that and quietly did nothing at all.
        if (pane && !pane.isOpen?.()) {
          const book = document.getElementById('course-book');
          if (book) book.click();
        }
        const tries = [];
        const ids = idForKind();
        places.forEach(place => {
          // A law goes through its row; a problem card has no row and
          // goes on its own mark, which the panel now draws for it
          const rowId = place.ref ? rowFor(place.ref) : '';
          // Two books are not two alternatives: a law stated in the book
          // and tested in the bank has both, and both columns are open
          if (rowId) {
            (chapters()?.linksOf?.(rowId) || []).forEach(link => tries.push(jump(pane, link)));
            return;
          }
          const src = ids[place.src === 'bank' ? 'tb' : 'book'];
          if (src) tries.push(jump(pane, { ...place, src }));
        });
        // Counted by what came back, not by how many were attempted: the
        // jump is awaited, so a press that lit nothing says so instead
        // of leaving the reader to decide whether it registered
        const done = await Promise.all(tries);
        if (!done.some(Boolean)) pane?.sayNowhere?.();
      }));
    }

    if (window.MyTermExplainStore?.of?.(key)) {
      host.append(button('epJump', 'الشرح الموسّع', ICON_EP, () => {
        window.MyTermExplain?.open(key);
      }));
    }
  };

  // ============================================================
  // # 🧮 🚪  THE CALCULATOR, IN A SHEET OF ITS OWN
  // # 🔤 JavaScript
  // # 🎯 Opens the BA II Plus panel over the page for one problem card
  // # 🔗 NOT IN THE EXPLANATION WINDOW, which is where their own pages
  // #    put it. What this holds is not an explanation of a law: it is
  // #    this problem's own numbers and the keys the book presses on
  // #    them, and it rides on the card in `data-calc` rather than in
  // #    the explanations file. Its own sheet keeps the two apart.
  // ============================================================
  // The card's name as the reader is actually reading it. Taken off the
  // LIVE head and not a copy of it, because the sheet's own data-rlang
  // is what hides the language not in use — a clone outside the sheet
  // is governed by nothing and gives back both, so the panel came up
  // headed "…in one questionMC-38 — السلسلةُ كلُّها في سؤال". The
  // switch's own words are taken off the end for the same reason the
  // buttons are: they belong to the card, not to its name
  const headWords = head => {
    const all = (head.innerText || '').replace(/\s+/g, ' ').trim();
    const sw = (head.querySelector('.qSwitch')?.innerText || '').replace(/\s+/g, ' ').trim();
    return (sw && all.endsWith(sw) ? all.slice(0, -sw.length) : all).trim();
  };

  const openCalc = (card, name) => {
    const calc = window.MyTermCalc;
    if (!calc || !card?.getAttribute('data-calc')) return;

    const veil = document.createElement('div');
    veil.className = 'mcalc-veil';
    const sheet = document.createElement('div');
    sheet.className = 'mcalc-card';

    const head = document.createElement('div');
    head.className = 'mcalc-head';
    const title = document.createElement('div');
    title.className = 'mcalc-name';
    title.textContent = name || '';
    const shut = document.createElement('button');
    shut.type = 'button';
    shut.className = 'mcalc-shut';
    shut.title = 'Close';
    shut.textContent = '×';
    head.append(title, shut);

    const spot = document.createElement('div');
    spot.setAttribute('data-calc', card.getAttribute('data-calc'));
    sheet.append(head, spot);
    veil.append(sheet);

    const away = () => { veil.remove(); document.removeEventListener('keydown', key); };
    // The ground around it is a way out and the panel itself is not: a
    // press on the keys you came to press must never close them
    const key = event => { if (event.key === 'Escape') away(); };
    shut.onclick = away;
    veil.addEventListener('mousedown', event => { if (event.target === veil) away(); });
    document.addEventListener('keydown', key);

    document.body.append(veil);
    calc.draw(spot, { lang: lang === 'en' ? 'en' : 'ar' });
  };

  // ============================================================
  // # 📐 🔍  THE SHEET IS A FIXED SHEET, SO THE WRITING SHRINKS
  // # 🔤 JavaScript
  // # 🎯 Measures each sheet after it is drawn and takes the type down
  // #    until the longest line fits inside it
  // # 🔗 CARRIED OVER FROM THEIR OWN applyLawFit, including its floor.
  // #    Not 0.5 but 0.34: two sheets in one chapter carry six laws
  // #    with compound fractions, and at a half they still spilled.
  // #
  // #    And it is measured AFTER drawing because the width available
  // #    is not known before — which is also why it runs again on
  // #    every redraw and every resize
  // ============================================================
  // ============================================================
  // # 📏 ⚖️  HOW MUCH ROOM A LINE REALLY WANTS
  // # 🔤 JavaScript
  // # 🎯 Adds up what is in a row instead of asking the row
  // # 🔗 A CENTRED ROW NEVER ADMITS THAT IT OVERFLOWS. `scrollWidth`
  // #    is what an element can be scrolled to, and a box centred in
  // #    its parent spills equally off BOTH ends -- so the end it can
  // #    reach is half the trouble, and when flex squeezes its
  // #    children rather than overflow at all, it is none of it. A
  // #    live sheet measured `scrollOver: 0` while a law hung 27px out
  // #    over each edge of its page, and the fit pass below, reading
  // #    that same zero, sat still through all of it.
  // #
  // #    So the width asked for is the sum of the children at the size
  // #    each of them actually wants -- its own box, or its own
  // #    overflowing contents, whichever is larger
  // ============================================================
  const sideRoom = el => {
    const cs = getComputedStyle(el);
    return (parseFloat(cs.marginLeft) || 0) + (parseFloat(cs.marginRight) || 0);
  };

  const wantsWide = line => {
    const kids = [...line.children];
    if (!kids.length) return line.scrollWidth;
    const gap = parseFloat(getComputedStyle(line).columnGap) || 0;
    let sum = gap * (kids.length - 1);
    kids.forEach(k => { sum += Math.max(k.offsetWidth, k.scrollWidth) + sideRoom(k); });
    return Math.max(line.scrollWidth, Math.ceil(sum));
  };

  // The same blindness, upright: .eqPage centres its boxes down the
  // page, so a stack taller than the sheet hangs off the top and the
  // bottom and scrollHeight owns up to half of it at best
  const wantsTall = page => {
    const kids = [...page.children];
    if (!kids.length) return page.scrollHeight;
    const gap = parseFloat(getComputedStyle(page).rowGap) || 0;
    let sum = gap * (kids.length - 1);
    kids.forEach(k => { sum += Math.max(k.offsetHeight, k.scrollHeight); });
    return Math.max(page.scrollHeight, Math.ceil(sum));
  };

  const fitOneLine = line => {
    line.style.fontSize = '';
    const wide = line.clientWidth;
    if (!wide) return;
    if (wantsWide(line) <= wide + 0.5) return;
    // One proportional jump lands near the answer, then small steps:
    // stepping alone (0.04 fourteen times) stopped at 0.44 and was not
    // enough for a long equation at a large type size
    let s = Math.max(0.3, (wide / wantsWide(line)) * 0.98);
    line.style.fontSize = s.toFixed(3) + 'em';
    for (let i = 0; i < 12 && wantsWide(line) > wide + 0.5 && s > 0.3; i++) {
      s = Math.round((s - 0.03) * 1000) / 1000;
      line.style.fontSize = s + 'em';
    }
  };

  // ============================================================
  // # 📐 🔍  HOW SMALL THE PAGE IS DRAWN
  // # 🔤 JavaScript
  // # 🎯 Fits an 800-pixel page to whatever room the column has, and
  // #    gives each slot the room its page takes once shrunk
  // # 🔗 THIS IS NOT A REBUILD, which is the whole point of a page
  // #    that never changes size: a narrower desk changes only how
  // #    small the paper is drawn, never what is on it or where it
  // #    sits. The room is read TWICE on purpose -- the first reading
  // #    is taken before the pages land, and the moment they do a
  // #    scrolling bar appears and takes fifteen pixels of the width
  // #    just measured, which was fifteen pixels of page hanging off
  // ============================================================
  const PAGE_W = 800;
  // ★ TWO NUMBERS AND NOT ONE. `scale` is how small the page had to be
  //   drawn to fit the desk, which the window decides; `zoom` is how
  //   near the reader asked to be brought, which only he decides. Kept
  //   as one number, every resize of the window threw his zoom away.
  //
  //   AND NEITHER OF THEM RE-LAYS-OUT THE PAGE. The sheet is 800 pixels
  //   wide in its own layout whatever happens here -- this is a
  //   transform and nothing else -- which is what keeps a notebook's
  //   stored ink meaning what it meant: every point in it is "this far
  //   across a pad of THIS layout size", and that size does not move.
  //   Only the canvas's density follows, which is what `refit` is for
  const ZOOM_MIN = 0.5, ZOOM_MAX = 3;
  let scale = 1, zoom = 1;

  const fitOnce = () => {
    const cs = getComputedStyle(where);
    const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const room = Math.max(240, (where.clientWidth || PAGE_W) - pad);
    // Fitted to the desk first, then brought nearer by as much as was
    // asked. Past the room it has, the stack simply scrolls -- which is
    // what zooming into a framed painting does
    const drawn = Math.min(PAGE_W, room) * zoom;
    scale = drawn / PAGE_W;
    where.style.setProperty('--sheetW', Math.round(drawn) + 'px');
    where.style.setProperty('--sheetScale', scale.toFixed(4));
    return where.clientWidth;
  };

  // A slot holds the room a page takes once shrunk. Almost always that
  // is exactly an A4; a card whose solution has just been folded open
  // is given the few millimetres it really grew, so the next page does
  // not sit on top of it
  const seatSlots = () => {
    where.querySelectorAll('.msheet-slot').forEach(slot => {
      const page = slot.firstElementChild;
      if (page) slot.style.height = Math.ceil(page.offsetHeight * scale) + 'px';
    });
  };

  const refit = () => {
    if (!where) return;
    const first = fitOnce();
    if (where.clientWidth !== first) fitOnce();

    where.querySelectorAll('.eqPage').forEach(page => {
      page.style.setProperty('--eqScale', '1');
      // A grid shrinks as ONE so its two rows stay level with each
      // other; a lone equation shrinks by itself
      page.querySelectorAll('.lawGrid, .lawEq:not(.lawGrid .lawEq)').forEach(fitOneLine);
      // and if the whole sheet is still taller than its frame, all of
      // it comes down together rather than one line at a time
      let s = 1;
      for (let i = 0; i < 14 && wantsTall(page) > page.clientHeight + 1 && s > 0.34; i++) {
        s = Math.round((s - 0.05) * 100) / 100;
        page.style.setProperty('--eqScale', String(s));
      }
    });

    seatSlots();
    // The pages are scaled and not re-laid-out, so a notebook's canvas
    // needs a new density and nothing more — and one whose store is
    // already right is not touched, which is what keeps a pinch cheap
    window.MyTermInkPad?.refit?.();
  };

  // ============================================================
  // # 🪧 🧩  ONE SHEET IN ITS WRAPPER
  // # 🔤 JavaScript
  // # 🎯 The stored markup, a language, and a tick box if it is a card
  // # 🔗 A LAW SHEET HAS NO TICK. There is nothing on it to finish: it
  //  #   is the reference you work from. Counted as work, a stack of
  // #    fourteen cards once reported thirty-three and doubled the
  // #    hours the chapter claimed
  // ============================================================
  const draw1 = one => {
    const box = document.createElement('div');
    box.className = 'msheet msheet-' + one.kind;
    box.dataset.rlang = lang;
    box.dataset.group = one.group;
    box.dataset.at = String(one.at);
    box.innerHTML = one.html;

    // the pictures a law asks for by name
    box.querySelectorAll('.lawIco[data-icon]').forEach(spot => {
      const drawing = icons()[spot.getAttribute('data-icon')];
      if (drawing) spot.innerHTML = drawing;
    });

    // the book's wording to begin with, as their own pages open
    box.querySelectorAll('.qcard').forEach(card => {
      if (!card.getAttribute('data-ans')) card.setAttribute('data-ans', 'hidden');
      if (!card.getAttribute('data-say')) card.setAttribute('data-say', 'full');
    });

    // A law answers under its own number; a card answers under its seat
    box.querySelectorAll('.lawBox').forEach(lawBox => {
      const no = lawBox.querySelector('.lawNo');
      const num = no ? String(no.textContent).trim() : '';
      if (num) presses(lawBox, one.group + ':' + num);
    });
    box.querySelectorAll('.qcard').forEach(card => {
      // The head and not the card: pressing the card itself is already
      // taken — it turns the wording between the book's and the short one
      const head = card.querySelector(':scope > .qh');
      if (head) presses(head, one.group + ':' + one.at);
      // And the ones the book solves on the calculator say so
      if (head && card.hasAttribute('data-calc') && !head.querySelector('.calcJump')) {
        head.append(button('calcJump', 'حُلّها بالحاسبة المالية — الخطوات والمفاتيح',
                           ICON_CALC, () => openCalc(card, headWords(head))));
      }
    });

    // ============================================================
    // # 🟩 🟥  WHAT THE BANK SAID ABOUT THIS SHEET
    // # 🔤 JavaScript
    // # 🎯 The same small square the rows wear, on the card or the law
    // #    page a bank question was about
    // # 🔗 THE PRACTICAL HALF OF A BANK ASKS WHAT A RULES PAGE TEACHES
    // #    — often the same numbers — so the answer belongs beside the
    // #    page, not only beside a term. A sheet the bank has never
    // #    reached wears nothing: an empty square would read as a
    // #    question answered and not yet marked
    // ============================================================
    const bankWas = chapters()?.saidSheet?.(one.group + '#' + one.at);
    const said = bankWas === 'ok' || bankWas === 'no';

    // A LAW PAGE HAS NO BOX OF ITS OWN, so the answer about it is a
    // square of its own, where the card's tick would have been. A CARD
    // has one, and wears the answer on it — see the note in the rows'
    // own sheet: the box the reader already looks at is where this
    // belongs, and a second mark beside it is a second thing to read
    if (said && one.kind !== 'card') {
      const mark = document.createElement('span');
      mark.className = 'msheet-bank ' + bankWas;
      mark.title = bankWas === 'ok'
        ? 'The bank asked about this and you had it right'
        : 'The bank asked about this and you had it wrong';
      box.prepend(mark);
    }

    if (one.kind === 'card') {
      const tick = document.createElement('button');
      tick.type = 'button';
      tick.className = 'msheet-tick' + (said ? ' ' + bankWas : '');
      const key = keyOf(one.group, one.at);
      tick.classList.toggle('on', chapters()?.isOn?.(key) === true);
      tick.title = 'I can do this one'
        + (bankWas === 'ok' ? ' · the bank had you right on it'
         : bankWas === 'no' ? ' · the bank had you wrong on it' : '');
      tick.onclick = () => {
        const on = !tick.classList.contains('on');
        tick.classList.toggle('on', on);
        chapters()?.mark?.(key, on);
        // AND THE STRIP IS TOLD. The store knows at once, but the count
        // over the section is drawn and left — so a card ticked off went
        // on reading 6/9 until something else happened to redraw it, and
        // unticking one looked like a press that had not registered.
        // The rows' own tick has said this since it was written; the
        // sheets simply had nobody to say it to until now.
        told();
      };
      box.prepend(tick);
    }

    // The page goes in a slot: the slot is the room it takes on the
    // board once shrunk, the page inside it stays the 800 it was drawn
    // as. Nothing about the page itself knows how narrow the desk is
    const slot = document.createElement('div');
    slot.className = 'msheet-slot';
    slot.append(box);
    return slot;
  };

  // ============================================================
  // # 👆 🔀  THE PRESSES A SHEET CARRIES
  // # 🔤 JavaScript
  // # 🎯 The solution folds open, the wording changes, the language
  // #    turns — all three without leaving the sheet
  // # 🔗 ONE LISTENER ON THE WHOLE STACK, not one per card. Four
  // #    hundred cards would otherwise be twelve hundred listeners,
  // #    and every redraw would have to take them all off again
  // ============================================================
  const pressed = e => {
    const card = e.target.closest('.qcard');
    if (!card || !where.contains(card)) return;
    if (e.target.closest('.ansToggle')) {
      card.setAttribute('data-ans', card.getAttribute('data-ans') === 'shown' ? 'hidden' : 'shown');
      // the card is taller than it was a moment ago, so its slot is too
      refit();
      return;
    }
    if (e.target.closest('.qSwitch')) {
      card.setAttribute('data-say', card.getAttribute('data-say') === 'simple' ? 'full' : 'simple');
      refit();
    }
  };

  let watching = false;
  const watchSize = () => {
    if (watching) return;
    watching = true;
    let soon = null;
    window.addEventListener('resize', () => {
      clearTimeout(soon);
      soon = setTimeout(refit, 120);
    });
  };

  window.MyTermSheetPaper = {
    // Where the sheets go. Said once, so a redraw does not hunt for it
    // Told where to draw, and what to call when a tick changes — the
    // same bargain the rows' paper is handed, and for the same reason:
    // this file must not know the course screen's own names
    arm: (spot, onTick) => {
      where = typeof spot === 'string' ? document.getElementById(spot) : spot;
      if (!where) return false;
      told = onTick || (() => {});
      window.MyTermInkPad?.arm?.(where);
      // The folder on a question is told the same spot and at the same
      // moment: it draws a button into each question, and a question that
      // was never drawn has no folder to show
      window.MyTermSolShelf?.arm?.(where);
      where.addEventListener('click', pressed);
      watchSize();
      return true;
    },

    draw: which => {
      if (!where) return 0;
      group = which;
      where.textContent = '';
      const stack = sheets()?.of?.(which) || [];
      stack.forEach(one => { if (one.html) where.append(draw1(one)); });
      // Measured after drawing, because the width is not known before --
      // and at once rather than on the next frame, so no sheet is ever
      // painted at the 800 it was laid out as before being scaled down.
      // Again on the frame after, because the scrolling bar that the
      // first sheets bring takes width that was just measured
      refit();
      requestAnimationFrame(refit);
      // ============================================================
      // AND THE NOTEBOOKS ARE PUT BACK
      //
      // Every sheet here was just built out of its stored markup, so
      // any writing area that was in the old ones died with them. The
      // ink itself is not in the markup — it is in its own store — so
      // the boxes are injected again and filled from there. THIS IS THE
      // ONLY PLACE IT IS NEEDED: measured on 2026-10-20, a part switch
      // rebuilds all thirty-five sheets while a refit, a language
      // switch and a tick rebuild none
      // ============================================================
      window.MyTermInkPad?.mount?.();
      // AND AFTER THE SAME DRAW. Opening a part rebuilds every sheet, so a
      // button put into a question dies with it - this is the one seam
      // that survives, exactly as the notebook's is
      window.MyTermSolShelf?.mount?.();
      return stack.length;
    },

    // The language of the sheets, which is the sheet's own and not the
    // page's: a sheet can be read in English beside a summary in Arabic
    lang: which => {
      if (which === 'ar' || which === 'en') lang = which;
      where?.querySelectorAll('.msheet').forEach(s => { s.dataset.rlang = lang; });
      refit();
      return lang;
    },

    refit,

    // ============================================================
    // # 🔍 📐  HOW NEAR THE SHEETS ARE BROUGHT
    // # 🔤 JavaScript
    // # 🎯 The same bargain the summary's paper strikes, so one pinch
    // #    and one reading in the strip serve both kinds of page
    // # 🔗 ASKED FOR BACK: these sheets were once held at "whatever
    // #    fits, never larger", on the reasoning that a page which
    // #    measures itself to its frame cannot be enlarged. That is
    // #    true of ENLARGING and not of ZOOMING: a framed painting is
    // #    moved nearer without a brush stroke changing. So nothing
    // #    here re-lays-out anything -- the number is handed to a
    // #    transform, and the sheet stays the 800 it was composed at
    // ============================================================
    zoom: next => {
      const want = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(next) || 1));
      if (Math.abs(want - zoom) < 0.0005) return zoom;
      zoom = want;
      refit();
      return zoom;
    },
    zoomNow: () => zoom,

    showing: () => group,
    // Every card's tick, re-read — for a redraw that must not lose them
    repaint: () => {
      where?.querySelectorAll('.msheet-card').forEach(box => {
        const tick = box.querySelector('.msheet-tick');
        if (!tick) return;
        tick.classList.toggle('on',
          chapters()?.isOn?.(keyOf(box.dataset.group, box.dataset.at)) === true);
        // AND THE BANK'S LAST WORD WITH IT, because that one changes
        // without anything on this page being pressed: a run ends in
        // the bank and the card must wear the colour of the newest
        // answer, not of the one it happened to be drawn with
        const was = chapters()?.saidSheet?.(box.dataset.group + '#' + box.dataset.at);
        tick.classList.toggle('ok', was === 'ok');
        tick.classList.toggle('no', was === 'no');
      });
    }
  };
})();
