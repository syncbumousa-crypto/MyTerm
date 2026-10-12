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

  let where = null, group = null, lang = 'ar';

  // The tick on a practice card is a mark like any other, and it is
  // keyed by the card's SEAT — `s-rules1:55`. Not by its order among
  // the filled ones: a card that moved seats would wear somebody
  // else's tick, which is the same rule the reader's own ink follows
  const keyOf = (g, at) => 's-' + g + ':' + at;

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
  let scale = 1;

  const fitOnce = () => {
    const cs = getComputedStyle(where);
    const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const room = Math.max(240, (where.clientWidth || PAGE_W) - pad);
    const drawn = Math.min(PAGE_W, room);
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

    if (one.kind === 'card') {
      const tick = document.createElement('button');
      tick.type = 'button';
      tick.className = 'msheet-tick';
      const key = keyOf(one.group, one.at);
      tick.classList.toggle('on', chapters()?.isOn?.(key) === true);
      tick.title = 'I can do this one';
      tick.onclick = () => {
        const on = !tick.classList.contains('on');
        tick.classList.toggle('on', on);
        chapters()?.mark?.(key, on);
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
    arm: spot => {
      where = typeof spot === 'string' ? document.getElementById(spot) : spot;
      if (!where) return false;
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
    showing: () => group,
    // Every card's tick, re-read — for a redraw that must not lose them
    repaint: () => {
      where?.querySelectorAll('.msheet-card').forEach(box => {
        const tick = box.querySelector('.msheet-tick');
        if (tick) tick.classList.toggle('on',
          chapters()?.isOn?.(keyOf(box.dataset.group, box.dataset.at)) === true);
      });
    }
  };
})();
