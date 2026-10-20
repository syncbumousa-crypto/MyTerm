// ============================================================
// # 📐 📌  WHAT THE SQUARE ON A CHAPTER IS MEASURING
// # 🔤 JavaScript
// # 🎯 Reads the Summaries tree that ships with the site and answers
// #    two questions: how much of a chapter has been summarised, and
// #    out of how much it could possibly be.
// # 🔗 The number is not invented here. It was computed by the old
// #    project's scan over files on disk - ten artefacts, each weighted,
// #    none of them a yes/no: data 20, explain 20, anchors 15, book 10,
// #    bank 10, links 10, ledger 5, figs 4, widgets 3, photos 3.
// #
// #    The part that matters most is the ceiling. A book with no test
// #    bank can never earn bank, links or ledger - twenty five points
// #    that are not missing, they are not there to be had. Nine MGT210
// #    chapters are finished work and have been reading 75% for good.
// #    So everything below reports against what is REACHABLE, and the
// #    raw hundred is kept beside it rather than instead of it.
// ============================================================
(() => {
  'use strict';

  const ROOT = '%F0%9F%93%9ATermBoard/Summaries';

  // The ten artefacts in the order they are worth talking about, which
  // is the order of their weight and not the order of the alphabet
  const PARTS = [
    ['data',    20, 'Terms and questions written'],
    ['explain', 20, 'The explain layer'],
    ['anchors', 15, 'Every piece tied to its page in the book'],
    ['book',    10, 'The book, worded and paged'],
    ['bank',    10, 'The test bank'],
    ['links',   10, 'Bank questions tied to the summary'],
    ['ledger',   5, 'The audit ledger'],
    ['figs',     4, 'Figures'],
    ['widgets',  3, 'Widgets'],
    ['photos',   3, 'Photos']
  ];

  // The eleven operating cards. Some leave an artefact behind and can be
  // measured; the rest leave none and are attested by the guards and the
  // delivery note. Saying so is the point - a step with no trace must
  // not be drawn as though it had been measured
  const STEPS = [
    ['1',   'Sort from the source',        ['data']],
    ['2',   'Gather and write',            ['data']],
    ['3',   'Reverse-check to the source', ['anchors']],
    ['3b',  'Laws - practical courses only', ['laws'], 'conditional'],
    ['4',   'Horizontal consistency',      [],        'attested'],
    ['5',   'Exam filtering',              [],        'attested'],
    ['6',   'Adversarial read',            [],        'optional'],
    ['7',   'Outside comparison',          [],        'conditional'],
    ['8',   'Visual and technical check',  ['book', 'figs', 'widgets', 'photos']],
    ['9',   'Scored against the bank',     ['bank', 'links', 'ledger']],
    ['10',  'The explain layer',           ['explain']]
  ];

  const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  let index = null;
  const natures = {};      // code -> nature.json
  const chapters = {};     // "CODE/key" -> chapter.json
  let failed = false;

  const get = async path => {
    const r = await fetch(ROOT + '/' + path + '?t=' + Date.now());
    if (!r.ok) throw new Error(path + ' -> ' + r.status);
    return r.json();
  };

  // The square is drawn beside every chapter on the board, so the numbers
  // behind it arrive in ONE file of twelve kilobytes rather than in fifty
  // nine requests. The long text - the delivery note, the handover - is
  // left out of it and fetched for a single chapter when the pane opens
  let flat = null;

  const load = async () => {
    if (index || failed) return index;
    try {
      const [idx, all] = await Promise.all([get('index.json'), get('all.json')]);
      index = idx;
      flat = all;
      await Promise.all(index.courses.map(async c => {
        natures[c.code] = await get('courses/' + c.code + '/nature.json');
      }));
      // The board drew its squares before any of this arrived, so it is
      // told to draw them again. Without this the first paint keeps the
      // old meaning and nothing ever corrects it
      dispatchEvent(new CustomEvent('myterm:summaries'));
      reconcile();
    } catch (e) { failed = true; index = null; }
    return index;
  };

  // ============================================================
  // # 🔄 📄  THE CHAPTER'S OWN FILE HAS THE LAST WORD
  // # 🔤 JavaScript
  // # 🎯 Reads every chapter's own file once the board is up, and puts
  // #    right any square the one-file summary had wrong
  // # 🔗 THE ONE FILE IS A COPY, AND A COPY FALLS BEHIND. Seven ACCT210
  // #    chapters were recorded as finished in their own files and the
  // #    one file was never written again, so their squares sat empty
  // #    under work that was done. The one file still paints the board at
  // #    once; the chapters' own files are then read behind it, and what
  // #    they say is what the square shows. Nothing has to remember to
  // #    write the copy for the square to tell the truth
  // ============================================================
  const SAID = ['pct', 'cap', 'built', 'parts'];

  const reconcile = async () => {
    if (!flat) return;
    let moved = false;
    await Promise.all(Object.keys(flat).map(async id => {
      const [code, key] = id.split('/');
      const own = await chapterData(code, key);
      if (!own) return;
      const row = flat[id];
      if (SAID.every(f => JSON.stringify(own[f]) === JSON.stringify(row[f]))) return;
      SAID.forEach(f => { if (own[f] !== undefined) row[f] = own[f]; });
      moved = true;
    }));
    if (moved) dispatchEvent(new CustomEvent('myterm:summaries'));
  };

  // A course on the board is matched to a course in the tree by its code
  // with the spaces and the case thrown away: "Fin250", "FIN 250" and
  // "fin-250" are one course, and nothing else is guessed
  const courseOf = name => {
    if (!index) return null;
    const want = norm(name);
    const hit = index.courses.find(c => norm(c.code) === want);
    return hit ? natures[hit.code] : null;
  };

  // Chapters are matched by key, then by number - and ONLY by number when
  // that number belongs to exactly one chapter in the course. MGT210 holds
  // both B1-Ch2 and B2-Ch2, so a bare "2" there names two chapters and
  // therefore names none. An unmatched chapter says so; it does not take
  // the first of two and hope
  const chapterKey = (nature, name) => {
    if (!nature) return null;
    const want = norm(name);
    const exact = nature.chapters.find(k => norm(k) === want);
    if (exact) return exact;
    const digits = String(name || '').match(/\d+/);
    if (!digits) return null;
    const n = digits[0].replace(/^0+/, '');
    const byNum = nature.chapters.filter(k => {
      const m = k.match(/Ch(\d+)/i);
      return m && m[1].replace(/^0+/, '') === n;
    });
    return byNum.length === 1 ? byNum[0] : null;
  };

  const chapterData = async (code, key) => {
    const id = code + '/' + key;
    if (chapters[id]) return chapters[id];
    try { chapters[id] = await get('courses/' + code + '/chapters/' + encodeURIComponent(key) + '.json'); }
    catch (e) { chapters[id] = null; }
    return chapters[id];
  };

  // The reading the square wants: earned out of REACHABLE, with the raw
  // hundred kept beside it so neither number has to stand in for the other
  const readingFor = ch => {
    if (!ch) return null;
    const reachable = ch.cap || 100;
    const pct = ch.pct || 0;
    const ofReachable = reachable ? Math.round((pct / reachable) * 100) : 0;
    const w = (natures[ch.course] || {}).weights || {};
    const unreachable = (natures[ch.course] || {}).unreachable || [];
    const done = PARTS.filter(([k]) => !unreachable.includes(k) && (ch.parts[k] || 0) >= 0.999).length;
    const possible = PARTS.filter(([k]) => !unreachable.includes(k)).length;
    return { pct, reachable, ofReachable, done, possible, unreachable, weights: w };
  };

  // The square's reading, with no waiting: straight out of the one file
  const quick = (courseName, chapterName) => {
    if (!flat) return null;
    const nature = courseOf(courseName);
    if (!nature) return null;
    const key = chapterKey(nature, chapterName);
    if (!key) return null;
    const row = flat[nature.course + '/' + key];
    return row ? readingFor(row) : null;
  };

  window.MyTermSummary = {
    load, courseOf, chapterKey, chapterData, readingFor, quick,
    PARTS, STEPS, norm,
    natureOf: code => natures[code] || null,
    ready: () => !!index,
    broken: () => failed
  };

  // Read once, as soon as the page is up. It is a static file shipped
  // with the site, so there is nothing to wait for and nobody to ask
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', load);
  else load();
})();
