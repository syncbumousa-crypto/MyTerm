// ============================================================
// # 🛡️ 📏  WHAT A CHAPTER IS MEASURED BY, IN THE READER'S OWN COPY
// # 🔤 JavaScript
// # 🎯 Opens one chapter out of Drive and counts what is wrong with it:
// #    anchors that land nowhere, rows missing a language, figures
// #    pointing at files that are gone, sheets the gate would strip,
// #    and entities left half-written.
// # 🔗 IT MEASURES THE ARTEFACT THE READER OPENS. The guards this
// #    replaces read the author's own data files on their machine; this
// #    one reads the chapter as it stands in Drive and searches the PDF
// #    the reader's panel loads. The two are not the same thing, and
// #    the difference is not academic: six hundred and thirty-two
// #    anchors once passed every local guard and matched nothing at all
// #    in the reader's copy.
// # 🔗 CALIBRATED ON A DELIVERED CHAPTER FIRST. Run against ACCT210 Ch3
// #    on 2026-10-18 it read: 169 rows, 247 anchors, 38 figure tags over
// #    18 files, 48 sheets — and zero on every count. A guard that has
// #    not passed something known to be right cannot be trusted to
// #    condemn something new.
// # 🔗 AND IT DOES NOT INVENT RULES. The same chapter holds 33 em
// #    dashes and 6 HTML entities; both were measured before either was
// #    made a fault, and neither is one. Only a HALF-written entity is
// #    — `&amp` with no semicolon behind it — because that is the defect
// #    that was actually found and fixed, 155 times, in MIS250.
// ============================================================
(() => {
  const board = () => window.MyTermBoardStore;
  const chapters = () => window.MyTermChapterStore;
  const sources = () => window.MyTermSources;
  const sheets = () => window.MyTermSheetStore;
  const explains = () => window.MyTermExplainStore;
  const finder = () => window.MyTermFind;

  // The panel loads pdf.js when it is first opened. Asked before that,
  // the guard would report every anchor dead for want of a reader —
  // the loudest possible lie — so it says what is missing instead
  const needPdf = () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    throw new Error('open the sources panel once first: the PDF reader loads with it');
  };

  const check = async (courseName, chapterName, say) => {
    const tell = say || (() => {});
    const raw = board().live();
    const course = (raw.courses || []).find(c => !c.deleted && c.name === courseName);
    if (!course) throw new Error('no course ' + courseName);
    const chapter = (course.chapters || []).find(h => !h.deleted && h.name === chapterName);
    if (!chapter) throw new Error('no chapter ' + chapterName);

    const lib = needPdf();
    await sources().open(raw, course);
    // THE FILES FIRST, THE CHAPTER LAST. Every await here is a window in
    // which the course screen reopens the chapter the reader left, and
    // the chapter has to be the open one at the instant it is copied —
    // not at the instant it was asked for. Opened before these three
    // and copied after them, the guard measured whichever chapter the
    // screen preferred and said so four times in a row.
    await sheets().ready(course.id, chapter).catch(() => {});
    await explains().ready(course.id, chapter).catch(() => {});
    await chapters().open(raw, course, chapter);
    if (chapters().openId() !== chapter.id) {
      throw new Error('could not hold ' + chapterName + ' open: close the course screen and try again');
    }

    // Every book of this chapter, read once. Held by source id because
    // a chapter has two of them and an anchor names which
    const docs = {};
    for (const one of (sources().forChapter(chapter.id) || [])) {
      const blob = await sources().bytesOf(one.id).catch(() => null);
      docs[one.id] = blob
        ? await lib.getDocument({ data: await blob.arrayBuffer() }).promise.catch(() => null)
        : null;
    }
    tell('books: ' + Object.keys(docs).length);

    const seen = { rows: 0, anchors: 0, figures: 0, files: 0, sheets: 0, asks: 0, sorted: 0, joined: 0, loose: 0 };
    const bad = { anchors: [], lang: [], figures: [], gate: [], entities: [], guard: [], missing: [], bank: [] };

    // ============================================================
    // EVERYTHING IS TAKEN DOWN BEFORE ANYTHING IS SEARCHED
    //
    // The chapter store holds ONE open chapter, and the course screen
    // reopens the one the reader left while this is working — a search
    // through a hundred pages of PDF is seconds long, and that is the
    // whole of the window. Read as it went, the guard lost a section of
    // 125 rows midway and reported a pass on 44: the right answer to
    // the wrong question, which is the only kind of wrong a guard must
    // never give.
    //
    // So the chapter is copied out first, while it is certainly still
    // open, and the slow work is done against the copy.
    // ============================================================
    const taken = (chapters().sections() || []).map(section => ({
      name: section.name, kind: section.kind, said: section.rows,
      rows: (chapters().rowsOf(section.id) || []).map(row => ({
        no: row.no, id: row.id,
        term: row.term, termAr: row.termAr, text: row.text, textAr: row.textAr,
        // The bank's own four, copied with the rest: a question that
        // cannot be asked at all is a hole in a layer that reports
        // itself as full, and one about nothing is a debt counted below
        ask: row.ask, pick: row.pick, right: row.right,
        track: row.track, type: row.type,
        about: (row.about || []).filter(a => !a.deleted).map(a => ({ row: a.row, sheet: a.sheet })),
        links: (chapters().linksOf(row.id) || []).map(l => ({ src: l.src, page: l.page, anchor: l.anchor })),
        words: explains().of(row.id)
      }))
    }));
    if (chapters().openId() !== chapter.id) {
      bad.guard.push('the open chapter changed while this was being read');
    }
    // A section that says it holds rows and hands back none is the shape
    // the race leaves behind, and it is also what a half-written chapter
    // looks like. Either way it is not a pass.
    //
    // EXCEPT A STACK OF SHEETS, which says how many CARDS it holds and
    // has no rows at all — six of them cried out on a chapter that is
    // perfectly correct the first time this ran, which is what
    // calibrating on something known to be right is for. The honest
    // check for those is further down, against the sheets themselves.
    taken.forEach(section => {
      if (section.kind !== 'rules' && section.said > 0 && section.rows.length === 0) {
        bad.guard.push(section.name + ' says ' + section.said + ' rows and gave none');
      }
    });
    tell('read: ' + taken.reduce((n, s) => n + s.rows.length, 0) + ' rows');

    for (const section of taken) {
      for (const row of section.rows) {
        seen.rows++;

        // A row the reader cannot read in one of their two languages is
        // half a row, and the half that is missing is never the one the
        // author was looking at
        if (section.kind === 'part') {
          ['term', 'termAr', 'text', 'textAr'].forEach(field => {
            if (!String(row[field] || '').trim()) {
              bad.lang.push(section.name + ' #' + row.no + ' ' + field);
            }
          });
        }

        for (const link of row.links) {
          seen.anchors++;
          const doc = docs[link.src];
          if (!doc) { bad.anchors.push('#' + row.no + ' names a file that is not here'); continue; }
          if (link.page > doc.numPages) { bad.anchors.push('#' + row.no + ' p' + link.page + ' is past the end'); continue; }
          const page = await finder().page(doc, link.src, link.page).catch(() => null);
          if (!page || !finder().find(page, link.anchor)) {
            bad.anchors.push((sources().one(link.src) || {}).kind + ' p' + link.page +
                             ' #' + row.no + ' "' + String(link.anchor).slice(0, 36) + '"');
          }
        }

        const words = row.words;
        if (!words) continue;
        const html = String((words.ar || '') + ' ' + (words.en || ''));
        for (const tag of (html.match(/<img[^>]*>/g) || [])) {
          seen.figures++;
          const id = (tag.match(/data-file="([^"]*)"/) || [])[1] || '';
          if (!id) { bad.figures.push('#' + row.no + ' has a picture with no file on it'); continue; }
          if (docs['fig:' + id] === undefined) {
            docs['fig:' + id] = await window.MyTermCloud.fileAlive(id).catch(() => false);
            seen.files++;
            if (!docs['fig:' + id]) bad.figures.push('#' + row.no + ' points at a file that is gone');
          }
        }
        [words.ar, words.en].forEach(side => {
          const half = String(side || '').match(/&[a-zA-Z]{2,8}(?![a-zA-Z]*;)/g);
          if (half) bad.entities.push('#' + row.no + ' ' + half.slice(0, 2).join(','));
        });
      }
    }

    // What the gate would take out if this sheet were written again. It
    // should take out nothing: the sheets went up through the gate, and
    // anything it would strip now is something the site learned to
    // forbid after they were stored
    // Read before the search above would have been tidier; read after is
    // what is correct, because the sheet store holds one chapter too and
    // the same race applies. So its own answer is checked against the
    // chapter this guard was asked about
    if (sheets().openId && sheets().openId() !== chapter.id) {
      bad.guard.push('the sheets moved to another chapter before they were counted');
    } else {
      const cards = {};
      for (const group of (sheets().groups ? sheets().groups() : [])) {
        for (const one of (sheets().of(group) || [])) {
          seen.sheets++;
          if (one.kind === 'card') cards[group] = (cards[group] || 0) + 1;
          if (sheets().gate(one.html) !== one.html) bad.gate.push(group + ':' + one.at);
        }
      }
      // WHAT A STACK SAYS IT IS WORTH AGAINST WHAT IT HOLDS. The count
      // is kept on the part and the cards are kept in another file, so
      // the two drift apart in silence: five stacks in ACCT210 Ch14 sat
      // at zero while holding sixty cards between them, and the chapter
      // claimed 225 minutes instead of 1,325
      taken.filter(s => s.kind === 'rules').forEach(section => {
        const group = (chapters().sections() || [])
          .find(s => s.name === section.name && s.kind === 'rules');
        const held = group ? (cards[group.group] || 0) : null;
        if (held !== null && held !== section.said) {
          bad.guard.push(section.name + ' says ' + section.said + ' cards and holds ' + held);
        }
      });
    }

    // ============================================================
    // # 🧮 🪧  AND WHAT THE CHAPTER SAYS IT IS WORTH
    // # 🎯 Counts what is here against what the skills file records
    // # 🔗 EVERYTHING ABOVE CHECKS THAT WHAT IS HERE IS RIGHT. None of
    // #    it notices what is ABSENT, and absence is the failure this
    // #    project keeps meeting: ACCT210 Ch1 passed every check above
    // #    with 90 anchors, all of them into the book, while its own
    // #    record says 165 bank links — a whole layer gone, and a clean
    // #    bill of health over the hole.
    // # 🔗 The record is the one the board already scores the course by
    // #    (`Summaries/courses/<C>/chapters/<Ch>.json`), so this adds no
    // #    second opinion about what a chapter should hold.
    // ============================================================
    // COUNTED BY THE FILE IT POINTS INTO, NOT BY THE SECTION IT SITS IN.
    // A bank anchor lives on the TERM's row — that is the reader's own
    // arrangement, so that pressing a term shows what will be asked of
    // it — and counting the bank's own section instead returned zero on
    // four chapters that are entirely correct.
    const bank = taken.reduce((n, s) => n + s.rows.reduce((m, r) =>
      m + r.links.filter(l => (sources().one(l.src) || {}).kind === 'tb').length, 0), 0);
    try {
      const said = await fetch('%F0%9F%93%9ATermBoard/Summaries/courses/' + courseName +
                               '/chapters/' + chapterName + '.json').then(r => r.ok ? r.json() : null);
      if (said && said.built && said.counts) {
        const want = said.counts;
        if (want.linked > 0 && bank < want.linked) {
          bad.missing.push('bank links: ' + bank + ' here, ' + want.linked + ' recorded');
        }
        if (want.figs > 0 && seen.figures < want.figs) {
          bad.missing.push('figures: ' + seen.figures + ' here, ' + want.figs + ' recorded');
        }
        // `items` IS NOT CHECKED. It reads 74 for a chapter whose rows
        // come to 44, so it counts something this cannot see from here —
        // and a measure that cries out on a chapter known to be whole is
        // not a measure, it is noise that will be learned to ignore.
        // Three such cried out while this was being built; all three
        // were mine, and all three were found by running it against
        // chapters that were already right.
      }
    } catch { /* an unbuilt chapter has no record, and that is not a fault */ }
    seen.bank = bank;

    // ============================================================
    // # 🏦 🧾  THE BANK IS A LAYER AND IS CHECKED LIKE ONE
    // # 🔤 JavaScript
    // # 🎯 Every question sorted into a folder, answerable, and about
    // #    something that is still there
    // # 🔗 A BANK REPORTS ITS SIZE AND NOTHING ELSE, AND SIZE IS THE
    // #    ONE THING THAT WAS NEVER WRONG. Eleven hundred questions
    // #    were carried over in one afternoon; two chapters came out
    // #    with their folders stripped, one came out holding another
    // #    chapter's questions, and every count on every screen stayed
    // #    exactly as green as before. These three say what the count
    // #    cannot: what a question is for, whether it can be asked at
    // #    all, and whether the thing it tests still exists.
    // #
    // #    A chapter with no bank says nothing here — it is not a
    // #    fault to be a course without one
    // ============================================================
    const liveRows = new Set();
    taken.forEach(s => s.rows.forEach(r => liveRows.add(r.id)));
    const cards = new Set();
    taken.filter(s => s.kind === 'rules').forEach(s => {
      const stack = sheets()?.of?.(s.group) || [];
      stack.forEach((one, at) => { if (one) cards.add(s.group + '#' + at); });
    });

    for (const section of taken.filter(s => s.kind === 'tb')) {
      for (const q of section.rows) {
        seen.asks++;
        const where = 'q' + (q.no || '?');
        if (q.track && q.type) seen.sorted++;
        else bad.bank.push(where + ' is in no folder');

        // ASKED BY CHOOSING, OR ASKED BY READING. A written question
        // carries no choices by design and is answered against the
        // answer it came with — counted as unaskable, 338 of them read
        // as faults in a layer that was in fact complete, which is the
        // kind of noise that teaches you to stop reading the guard
        const picks = (q.pick || []).filter(p => String(p || '').replace(/<[^>]*>/g, '').trim()).length;
        const answer = String(q.text || '').replace(/<[^>]*>/g, '').trim();
        if (!(picks >= 2 && q.right >= 0) && !answer) bad.bank.push(where + ' cannot be asked');

        // ============================================================
        // A QUESTION ABOUT NOTHING IS A DEBT, NOT A FAULT
        //
        // IT CANNOT BE DRIVEN TO ZERO, AND A FAULT THAT CANNOT BE
        // CLEARED IS A FAULT NOBODY READS. ACCT210's eleven chapters
        // hold a hundred and seventy things worth knowing between them
        // — that is their finished size — and their banks hold three
        // and a half thousand questions. Nine hundred of those test
        // something the chapter does not claim to teach, which is the
        // ordinary shape of a textbook bank and not a hole in anything.
        //
        // So it is COUNTED and printed, never hidden, and the other end
        // is what is actually worth measuring: how much of the summary
        // has a question on it. A row pointing at something GONE stays
        // a fault — that is a broken link, which is a different thing
        // ============================================================
        const about = q.about || [];
        if (!about.length) seen.loose++;
        else seen.joined++;
        about.forEach(a => {
          if (a.row && !liveRows.has(a.row)) bad.bank.push(where + ' points at a row that is gone');
          if (a.sheet && cards.size && !cards.has(a.sheet)) bad.bank.push(where + ' points at ' + a.sheet + ', which is not there');
        });
      }
    }

    const wrong = Object.keys(bad).reduce((sum, k) => sum + bad[k].length, 0);
    return { course: courseName, chapter: chapterName, seen, bad, wrong, passed: wrong === 0 };
  };

  // Said in one line, because a guard whose answer has to be read twice
  // gets read none
  const line = got =>
    (got.passed ? 'PASS ' : 'FAIL ') + got.course + ' ' + got.chapter +
    ' | rows=' + got.seen.rows + ' anchors=' + got.seen.anchors +
    ' bank=' + got.seen.bank + ' figures=' + got.seen.figures + ' sheets=' + got.seen.sheets +
    (got.seen.asks ? ' asks=' + got.seen.asks + ' sorted=' + got.seen.sorted
                   + ' joined=' + got.seen.joined
                   + (got.seen.loose ? ' loose=' + got.seen.loose : '') : '') +
    ' | wrong=' + got.wrong +
    Object.keys(got.bad).filter(k => got.bad[k].length)
      .map(k => ' ' + k + '=' + got.bad[k].length).join('');

  window.MyTermGuard = { check, line };
})();
