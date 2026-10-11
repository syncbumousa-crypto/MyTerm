// ============================================================
// # 🗔 📖  THE LONG EXPLANATION, IN A WINDOW OF ITS OWN
// # 🔤 JavaScript
// # 🎯 Opens over the sheet with one row's full explanation in it: a
// #    title, a language of its own, and two pairs of handles — one for
// #    the words, one for the pictures
// # 🔗 THE ROOM IS BUILT NOW AND THE FURNITURE COMES LATER. Nothing is
// #    written into it yet, on purpose: what goes inside is a question
// #    about the chapter's own writing, and the window it goes into is
// #    a question about the screen. Built apart, the second is finished
// #    and proved before the first is begun.
// #
// #    Every rule here was learned from the reader's own pages, where a
// #    window like this has been in daily use — and three of them are
// #    not obvious:
// #
// #    ONE MAP AND NOT A KEY APIECE. There are hundreds of rows in a
// #    term, and a stored key for each one would swell the browser's
// #    store and make it impossible to look through or sweep out. So
// #    one key holds the lot, and what is left at its ordinary size is
// #    not written down at all.
// #
// #    THE SIZES ARE PUT BACK ON EVERY OPEN. This is one window shown
// #    again and again, so a row opened after an enlarged one would
// #    wear the other row's size — which is somebody else's reading of
// #    somebody else's paragraph.
// #
// #    PICTURES HAVE THEIR OWN HANDLE. The first handle feeds the size
// #    of the TYPE, and a picture measured against the width of its box
// #    cannot hear it. So the words take one handle and the pictures
// #    take another, and neither moves the other: a reader who wants
// #    bigger diagrams has not asked for bigger letters
// ============================================================
(() => {
  const $ = id => document.getElementById(id);

  const pop = $('course-explain');
  const card = $('ep-card');
  const title = $('ep-title');
  const body = $('ep-body');
  const closeBtn = $('ep-close');
  const langBtn = $('ep-lang');
  const smallBtn = $('ep-smaller'), bigBtn = $('ep-bigger');
  const figSmallBtn = $('ep-fig-smaller'), figBigBtn = $('ep-fig-bigger');
  if (!pop) return;

  // ============================================================
  // # 📏 💾  THE TWO SIZES, REMEMBERED PER ROW
  // # 🔤 JavaScript
  // # 🎯 How large the words and the pictures of THIS row's window were
  // #    left, kept in this browser and nowhere else
  // # 🔗 It is one reader's eyes and one screen's size, not a fact about
  // #    the chapter — so it never goes to Drive, where it would reach
  // #    over and change what the phone looks like.
  // #
  // #    SCALED FROM ONE ROOT, and everything inside measured against
  // #    it: a rule written in pixels comes out wrong at the first press
  // #    of the handle, which is exactly the failure that should be
  // #    loud. Anything written as a share of the root scales for free
  // ============================================================
  const KEYS = { text: 'myterm.ep.text', fig: 'myterm.ep.fig', lang: 'myterm.ep.lang' };
  const STEP = 0.1;
  const BOUNDS = { text: [0.75, 2.0], fig: [0.4, 2.0] };

  const mapOf = which => {
    try { return JSON.parse(localStorage.getItem(KEYS[which]) || '{}') || {}; }
    catch { return {}; }
  };
  const writeMap = (which, map) => {
    try { localStorage.setItem(KEYS[which], JSON.stringify(map)); } catch {}
  };

  let who = null;        // the row this window is showing
  let mine = null;       // its name in the two maps: chapter and row together

  const sizeOf = which => (mine ? Number(mapOf(which)[mine]) || 1 : 1);

  const applySizes = () => {
    body.style.setProperty('--ep-scale', String(sizeOf('text')));
    body.style.setProperty('--ep-fig', String(sizeOf('fig')));
    sayPercent();
  };

  const sayPercent = () => {
    const words = Math.round(sizeOf('text') * 100), pics = Math.round(sizeOf('fig') * 100);
    smallBtn.title = 'Smaller words in this window · ' + words + '%';
    bigBtn.title = 'Larger words in this window · ' + words + '%';
    figSmallBtn.title = 'Smaller pictures in this window · ' + pics + '%';
    figBigBtn.title = 'Larger pictures in this window · ' + pics + '%';
  };

  const bump = (which, way) => {
    if (!mine) return;
    const map = mapOf(which);
    const [low, high] = BOUNDS[which];
    const next = Math.min(high, Math.max(low,
      Math.round(((Number(map[mine]) || 1) + way * STEP) * 100) / 100));
    // The ordinary size is not written down. A map that remembered every
    // row anybody ever opened at its own size would grow without end and
    // say nothing
    if (next === 1) delete map[mine]; else map[mine] = next;
    writeMap(which, map);
    applySizes();
  };

  // ============================================================
  // # 🌐 🔤  A LANGUAGE OF ITS OWN
  // # 🔤 JavaScript
  // # 🎯 This window reads in Arabic or in English, whichever was left
  // # 🔗 NOT THE PAPER'S LANGUAGE. A reader keeps the sheet in English
  // #    because that is how the terms are examined, and still wants the
  // #    long explanation in the language they think in. They are two
  // #    readings of two different things, and tying them together would
  // #    make the second cost the first
  // ============================================================
  let lang = (() => {
    try { return localStorage.getItem(KEYS.lang) === 'ar' ? 'ar' : 'en'; } catch { return 'en'; }
  })();

  const WORDS = {
    en: { empty: 'No long explanation for this row yet.',
          coming: 'Fetching the explanations…',
          lang: 'التبديل إلى العربية', untitled: 'This row' },
    ar: { empty: 'ما فيه شرح موسّع لهذا الصف بعد.',
          coming: 'تُجلب الشروح…',
          lang: 'Switch to English', untitled: 'هذا الصف' }
  };

  const plain = html => {
    const box = document.createElement('div');
    box.innerHTML = html || '';
    return box.textContent.trim();
  };

  const rowNow = () => {
    const store = window.MyTermChapterStore;
    if (!store || !who) return null;
    for (const part of store.sections() || []) {
      const found = (store.rowsOf(part.id) || []).find(r => r.id === who);
      if (found) return found;
    }
    return null;
  };

  // ============================================================
  // # 🖼️ ⬇️  A PICTURE COMES DOWN ONCE
  // # 🔤 JavaScript
  // # 🎯 Turns every picture named in an explanation into one on screen
  // # 🔗 Held by file name for as long as the page lives: one figure
  // #    serves several rows — that is the reader's own rule, "the same
  // #    figure appears in every item it serves" — so the same picture
  // #    is asked for again and again, and fetching it each time would
  // #    download a chapter's figures many times over
  // ============================================================
  const shown = new Map();

  const showPictures = async () => {
    for (const picture of [...body.querySelectorAll('img[data-file]:not([src])')]) {
      const name = picture.dataset.file;
      if (!shown.has(name)) {
        shown.set(name, window.MyTermCloud.readBlob(name)
          .then(blob => (blob ? URL.createObjectURL(blob) : ''))
          .catch(() => ''));
      }
      const where = await shown.get(name);
      if (where) picture.src = where;
      else picture.classList.add('cep-gone');
    }
  };

  // What this site cannot build: the interactive pictures of the
  // reader's own pages. Their place is kept and SAID, so a reader who
  // knows one stood here is not left thinking the explanation is short
  const sayWidgets = () => {
    body.querySelectorAll('.epWidget').forEach(spot => {
      if (spot.childNodes.length) return;
      spot.textContent = lang === 'ar'
        ? 'تمثيلٌ تفاعليٌّ — في صفحاتك وحدها'
        : 'An interactive piece — on your own pages only';
    });
  };

  const draw = async () => {
    // Which row this drawing is for, held so the answer that comes back
    // from Drive can be thrown away if the reader has moved on. Without
    // it, opening three rows quickly leaves whichever file arrived last
    // on screen, under whichever name was asked for last
    const asked = who;
    const row = rowNow();
    const ar = lang === 'ar';
    const dir = ar ? 'rtl' : 'ltr';

    title.dir = dir;
    title.textContent = row
      ? (plain(ar ? (row.termAr || row.term) : (row.term || row.textAr))
         || plain(row.term) || plain(row.ask) || WORDS[lang].untitled)
      : WORDS[lang].untitled;

    body.dir = dir;
    body.textContent = '';
    langBtn.title = WORDS[lang].lang;

    // Said while it is on its way. The file is three hundred kilobytes
    // and arrives on the first asking only — and a window that sits
    // blank for two seconds reads as a window with nothing in it
    const note = document.createElement('p');
    note.className = 'cep-note';
    note.textContent = WORDS[lang].coming;
    body.append(note);

    const words = await wordsFor(asked);
    if (who !== asked) return;   // the reader moved on while it came down

    const said = words && (lang === 'ar' ? words.ar : words.en);
    // One language written and not the other is not an empty
    // explanation: it is shown in the one it has
    const other = words && (lang === 'ar' ? words.en : words.ar);
    body.textContent = '';
    if (said || other) {
      const page = document.createElement('div');
      page.className = 'cep-said';
      page.innerHTML = said || other;
      page.dir = said ? dir : (lang === 'ar' ? 'ltr' : 'rtl');
      body.append(page);
      sayWidgets();
      showPictures();
    } else {
      const none = document.createElement('p');
      none.className = 'cep-note';
      none.textContent = WORDS[lang].empty;
      body.append(none);
    }
    body.scrollTop = 0;
  };

  // The chapter's explanations, fetched once and kept while it is open
  const wordsFor = async rowId => {
    const store = window.MyTermExplainStore;
    if (!store || !rowId) return null;
    const board = window.MyTermBoardStore?.live?.();
    const courseId = window.MyTermCoursePage?.openId?.();
    const course = (board?.courses || []).find(c => c.id === courseId);
    const chapter = (course?.chapters || []).find(c => c.id === window.MyTermChapterStore?.openId());
    if (!chapter) return null;
    await store.ready(courseId, chapter).catch(() => null);
    return store.of(rowId);
  };

  const shut = () => {
    pop.hidden = true;
    who = null;
  };

  const open = rowId => {
    if (!rowId) return false;
    who = rowId;
    mine = (window.MyTermChapterStore?.openId() || 'h') + ':' + rowId;
    draw();
    // Put back before it is shown, never after: a window that arrives at
    // the last row's size and then jumps to its own has been wrong on
    // screen, and the reader saw it
    applySizes();
    pop.hidden = false;
    return true;
  };

  closeBtn.onclick = shut;
  // The dark ground around the card is a way out, and the card itself is
  // not: a press that lands inside what you are reading must never close it
  pop.addEventListener('mousedown', event => { if (event.target === pop) shut(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !pop.hidden) shut();
  });

  smallBtn.onclick = () => bump('text', -1);
  bigBtn.onclick = () => bump('text', +1);
  figSmallBtn.onclick = () => bump('fig', -1);
  figBigBtn.onclick = () => bump('fig', +1);

  langBtn.onclick = () => {
    lang = lang === 'ar' ? 'en' : 'ar';
    try { localStorage.setItem(KEYS.lang, lang); } catch {}
    draw();
  };

  window.MyTermExplain = {
    open,
    shut,
    isOpen: () => !pop.hidden,
    // What the window is showing, for whoever fills it later
    showing: () => who,
    lang: () => lang
  };
})();
