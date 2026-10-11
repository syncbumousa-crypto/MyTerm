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
  const fitOneLine = line => {
    line.style.fontSize = '';
    const wide = line.clientWidth;
    if (!wide) return;
    if (line.scrollWidth <= wide + 0.5) return;
    // One proportional jump lands near the answer, then small steps:
    // stepping alone (0.04 fourteen times) stopped at 0.44 and was not
    // enough for a long equation at a large type size
    let s = Math.max(0.3, (wide / line.scrollWidth) * 0.98);
    line.style.fontSize = s.toFixed(3) + 'em';
    for (let i = 0; i < 12 && line.scrollWidth > wide + 0.5 && s > 0.3; i++) {
      s = Math.round((s - 0.03) * 1000) / 1000;
      line.style.fontSize = s + 'em';
    }
  };

  const refit = () => {
    if (!where) return;
    where.querySelectorAll('.eqPage').forEach(page => {
      page.style.setProperty('--eqScale', '1');
      // A grid shrinks as ONE so its two rows stay level with each
      // other; a lone equation shrinks by itself
      page.querySelectorAll('.lawGrid, .lawEq:not(.lawGrid .lawEq)').forEach(fitOneLine);
      // and if the whole sheet is still taller than its frame, all of
      // it comes down together rather than one line at a time
      let scale = 1;
      for (let i = 0; i < 14 && page.scrollHeight > page.clientHeight + 1 && scale > 0.34; i++) {
        scale = Math.round((scale - 0.05) * 100) / 100;
        page.style.setProperty('--eqScale', String(scale));
      }
    });
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
    return box;
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
      // measured after drawing, because the width is not known before
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
