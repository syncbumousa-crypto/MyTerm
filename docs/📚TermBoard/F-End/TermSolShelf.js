// ============================================================
// # 📎 🗂️  THE FOLDER ON A QUESTION
// # 🔤 JavaScript
// # 🎯 Puts one button at the top of every practice question. Pressing it
// #    opens that question's own folder: the pictures of the worked
// #    answer already put there, each with the day it was put, and a way
// #    to add another.
// # 🔗 ASKED FOR AFTER THE PEN. The notebook under a card stays where it
// #    is - whoever wants to write still writes - but writing a long
// #    numerical answer by hand was called tiring, and a photograph of
// #    the page already worked is what the reader actually has. So this
// #    is a SHELF, not an editor: no layers, no handles, no dragging.
// #    Upload, see, and see when.
// # 🔗 THE RECORD IS THE CARD'S, NOT THE SHEET'S. A sheet is one attempt
// #    at writing; a photograph of the answer belongs to the question. So
// #    it lives in `d.sol` beside the sheets and survives every attempt
// #    sealed, emptied or deleted.
// # 🔗 AND IT IS A SEPARATE FILE on purpose. The pad is 80 KB of pen
// #    physics; a shelf of pictures has nothing to do with any of it, and
// #    a fault in one must not be read in the other.
// ============================================================
(() => {
  const store = () => window.MyTermInkStore;
  const pad = () => window.MyTermInkPad;

  const MAX_EDGE = 1600;                 // longest side kept
  const MAX_CARD = 6 * 1024 * 1024;      // the whole folder of one question

  let where = null;

  // The same arithmetic the pad uses, and for the same reason: a phone
  // photograph is four thousand pixels and several megabytes, `data:`
  // adds a third, and this record is pushed to Drive on every change.
  // Taken from the pad when it is there so there is one implementation.
  const encode = src => (pad() && pad().encode)
    ? pad().encode(src)
    : new Promise((done, fail) => {
        const im = new Image();
        im.onload = () => {
          const k = Math.min(1, MAX_EDGE / (Math.max(im.naturalWidth, im.naturalHeight) || 1));
          const w = Math.max(1, Math.round(im.naturalWidth * k));
          const h = Math.max(1, Math.round(im.naturalHeight * k));
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(im, 0, 0, w, h);
          let out = '';
          try { out = cv.toDataURL('image/webp', 0.82); } catch (e) { out = ''; }
          if (!out || out.slice(0, 15) !== 'data:image/webp') out = cv.toDataURL('image/jpeg', 0.85);
          done({ src: out, w: w, h: h });
        };
        im.onerror = () => fail(new Error('not an image'));
        im.src = src;
      });

  // The day it was put there, in the reader's own words rather than a
  // raw stamp: "today" and "yesterday" are what he actually asks, and a
  // date is only useful once it is older than that
  const when = ts => {
    if (!ts) return '';
    const d = new Date(ts), n = new Date();
    const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const gap = Math.round((day(n) - day(d)) / 86400000);
    const clock = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (gap === 0) return 'today ' + clock;
    if (gap === 1) return 'yesterday ' + clock;
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + clock;
  };

  const keyOf = el => {
    const box = el.closest('.msheet');
    if (!box) return '';
    return String(box.dataset.group || '') + '#' + String(box.dataset.at || '0');
  };

  // ---------- the button, one per question ----------
  // Put at the TOP of the question and not beside the notebook: it is the
  // question's folder, and the hand looks for it where the question is
  const arm = spot => {
    where = typeof spot === 'string' ? document.getElementById(spot) : spot;
    return Boolean(where);
  };

  const mount = () => {
    if (!where || !store()) return 0;
    let made = 0;
    where.querySelectorAll('.msheet .qcard').forEach(q => {
      if (q.querySelector(':scope > .solBtn')) return;
      const key = keyOf(q);
      if (!key) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'solBtn';
      b.dataset.key = key;
      b.title = 'The pictures of your answer to this question';
      b.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none"'
        + ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
        + '</svg><b class="solN"></b>';
      q.prepend(b);
      made++;
    });
    count();
    return made;
  };

  // The number on the button is read from the record, so a folder that
  // has something in it says so without being opened
  const count = () => {
    if (!where || !store()) return;
    where.querySelectorAll('.solBtn').forEach(b => {
      const n = store().ready(b.dataset.key) ? (store().sols(b.dataset.key) || []).length : 0;
      const tag = b.querySelector('.solN');
      if (tag) tag.textContent = n ? String(n) : '';
      b.classList.toggle('has', n > 0);
    });
  };

  // ---------- the folder ----------
  let openKey = '';

  const shut = () => {
    openKey = '';
    document.querySelectorAll('.solWrap').forEach(w => w.remove());
    document.querySelectorAll('.solBtn.on').forEach(b => b.classList.remove('on'));
  };

  // ===== ONE PICTURE, LARGE, AND ARROWS BETWEEN THEM =====
  // A grid of thumbnails was the first shape, and a worked answer cannot
  // be read at 118 px - the reader opens this to READ his own working,
  // not to find it. So the window shows one picture as large as it will
  // go, and the arrows move between them. The date and the position are
  // under it, because "which of them is this" is the other half of what
  // he asked to see.
  let at = 0;

  const listNow = () => (store().sols(openKey) || []).slice().sort((a, b) => b.ts - a.ts);

  const draw = () => {
    const wrap = document.querySelector('.solWrap');
    if (!wrap || !openKey) return;
    const list = listNow();
    if (at >= list.length) at = Math.max(0, list.length - 1);
    const one = list[at];
    const body = wrap.querySelector('.solBody');
    body.innerHTML = list.length
      ? '<div class="solStage">'
        + '<button type="button" class="solArrow solPrev" data-step="-1"'
        + (list.length > 1 ? '' : ' disabled') + ' title="The one before">&#8249;</button>'
        + '<a class="solBig" href="' + one.src + '" target="_blank" rel="noopener"'
        + ' title="Open it full size in a tab"><img src="' + one.src + '" alt=""></a>'
        + '<button type="button" class="solArrow solNext" data-step="1"'
        + (list.length > 1 ? '' : ' disabled') + ' title="The next one">&#8250;</button>'
        + '</div>'
        + '<div class="solFoot">'
        + '<span class="solWhen">' + when(one.ts) + '</span>'
        + '<span class="solPos">' + (at + 1) + ' of ' + list.length + '</span>'
        + '<span class="solGrow"></span>'
        + '<button type="button" class="solDel" data-id="' + one.id + '"'
        + ' title="Remove this picture">Remove</button>'
        + '</div>'
      : '<p class="solNone">Nothing here yet. Add the picture of your worked answer.</p>';
    const n = wrap.querySelector('.solCount');
    if (n) n.textContent = list.length ? String(list.length) : '';
    // ===== AND WHETHER IT HAS LEFT THIS MACHINE =====
    // The notebook carried this badge and the notebook is put away, so
    // the only place that writes pictures now is the only place that can
    // say so. A picture kept on one device and never sent is exactly the
    // fault the reader hit, and he cannot tell by looking at it.
    const st = wrap.querySelector('.solSent');
    if (st) {
      const owed = store().cloudOwed ? store().cloudOwed() : 0;
      const can = store().cloudName && store().cloudName() === 'Drive';
      st.hidden = false;
      st.textContent = !list.length ? ''
        : owed > 0 ? 'not sent to your Drive yet'
        : can ? 'in your Drive' : 'kept on this device';
      st.className = 'solSent' + (owed > 0 ? ' owed' : '');
      st.hidden = !st.textContent;
    }
    count();
  };

  const step = d => {
    const list = listNow();
    if (list.length < 2) return;
    at = (at + d + list.length) % list.length;
    draw();
  };

  const open = btn => {
    const key = btn.dataset.key;
    if (openKey === key) { shut(); return; }
    shut();
    openKey = key;
    at = 0;
    btn.classList.add('on');
    // ===== A POP-IN, NOT A PANEL ON THE PAPER =====
    // It was inserted after the question, and a rectangle opening inside
    // the sheet pushes the page about and sits where the answer should be.
    // The reader asked for a window that holds the pictures and nothing
    // else - so it is a layer over everything, closed by its own cross, by
    // Escape, or by pressing the dark outside it.
    const wrap = document.createElement('div');
    wrap.className = 'solWrap';
    wrap.innerHTML =
        '<div class="solCard" role="dialog" aria-modal="true">'
      +   '<div class="solHead">'
      +     '<b>Your answer</b><span class="solCount"></span>'
      +     '<span class="solGrow"></span>'
      +     '<button type="button" class="solAdd">Add a picture</button>'
      +     '<button type="button" class="solShut" title="Close">&#10005;</button>'
      +   '</div>'
      +   '<div class="solBody"></div>'
      +   '<p class="solSay" hidden></p>'
      +   '<p class="solSent" hidden></p>'
      + '</div>';
    document.body.append(wrap);
    draw();
  };

  const say = text => {
    const p = document.querySelector('.solWrap .solSay');
    if (!p) return;
    p.hidden = false; p.textContent = text;
    clearTimeout(p._t);
    p._t = setTimeout(() => { p.hidden = true; }, 4000);
  };

  // ---------- adding ----------
  const picker = () => {
    let el = document.getElementById('solFile');
    if (el) return el;
    el = document.createElement('input');
    el.type = 'file'; el.accept = 'image/*'; el.multiple = true; el.id = 'solFile';
    el.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px';
    el.addEventListener('change', async () => {
      const files = Array.from(el.files || []);
      const key = el._key;
      el.value = '';
      if (!key) return;
      // MORE THAN ONE AT A TIME, because a worked answer is often two or
      // three pages and choosing them one by one is the tiring part
      for (const f of files) {
        try {
          const src = await new Promise((ok, no) => {
            const rd = new FileReader();
            rd.onload = () => ok(String(rd.result));
            rd.onerror = () => no(new Error('unreadable'));
            rd.readAsDataURL(f);
          });
          const enc = await encode(src);
          if (store().solWeight(key) + enc.src.length > MAX_CARD) {
            say('This folder is full - remove a picture first'); break;
          }
          store().addSol(key, enc);
        } catch (e) { say('One of those files is not a picture'); }
      }
      draw();
    });
    document.body.appendChild(el);
    return el;
  };

  document.addEventListener('click', ev => {
    const t = ev.target;
    const b = t.closest && t.closest('.solBtn');
    if (b) { ev.preventDefault(); ev.stopPropagation(); open(b); return; }
    const add = t.closest && t.closest('.solAdd');
    if (add) {
      ev.preventDefault();
      const p = picker(); p._key = openKey; p.click(); return;
    }
    const x = t.closest && t.closest('.solShut');
    if (x) { ev.preventDefault(); shut(); return; }
    // The dark around it closes it, which is what the hand expects of a
    // layer over the page - but only the dark, never the card in it
    if (t.classList && t.classList.contains('solWrap')) { ev.preventDefault(); shut(); return; }
    const arrow = t.closest && t.closest('.solArrow');
    if (arrow) { ev.preventDefault(); step(+arrow.dataset.step); return; }
    const del = t.closest && t.closest('.solDel');
    if (del) {
      ev.preventDefault();
      const id = del.dataset.id;
      // There is no undoing it, and keeping quiet about that would be a
      // cheat - the same rule the attempt tabs follow
      if (!confirm('Remove this picture? It cannot be brought back.')) return;
      if (store().dropSol(openKey, id)) draw();
      return;
    }
  });

  document.addEventListener('keydown', ev => {
    if (!openKey) return;
    if (ev.key === 'Escape') { ev.preventDefault(); shut(); return; }
    // The arrows of the keyboard do what the arrows on the screen do
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1); }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); step(1); }
  });

  window.MyTermSolShelf = { arm, mount, count, draw, when, shut, step,
    at: () => at,
    openKey: () => openKey,
    MAX_CARD, MAX_EDGE };
})();
