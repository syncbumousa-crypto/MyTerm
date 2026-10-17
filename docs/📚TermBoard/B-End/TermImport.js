// ============================================================
// # 📥 🛡️  BRINGING A COURSE IN FROM THE OLD PROJECT
// # 🔤 JavaScript
// # 🎯 Takes a bundle built on disk - one record per chapter, rows and
// #    anchors and explanations - and writes it into the reader's Drive
// #    through the same stores the app uses, one chapter at a time
// # 🔗 The bytes must never travel through a conversation. A chapter's
// #    content is a third of a megabyte and its explanations as much
// #    again, so the only affordable road is a file the reader picks
// #    here: the page already holds the Drive key, and nothing is
// #    uploaded that was not read off their own disk a moment earlier
// ============================================================
(function () {
  'use strict';

  const cloud   = () => window.MyTermCloud;
  const board   = () => window.MyTermBoardStore;
  const sources = () => window.MyTermSources;
  const chapters = () => window.MyTermChapterStore;

  // ============================================================
  // # 🏷️ 🧭  THE SENTINEL AND WHAT IT STANDS FOR
  // # 🔤 JavaScript
  // # 🎯 Turns the 'book' and 'bank' written by the builder into the
  // #    real source ids of THIS chapter, and says what it could not
  // # 🔗 The builder cannot know these ids: they are minted when a PDF
  // #    is uploaded, so on disk there is nothing to write but a word.
  // #    And an anchor pointing at a source that is not there is worse
  // #    than no anchor - it is a row that claims a page and jumps
  // #    nowhere - so it is DROPPED and counted, never written hopeful
  // ============================================================
  function resolveAnchors(content, idOf) {
    let kept = 0, lost = 0;
    (content.sections || []).forEach(sec => {
      (sec.rows || []).forEach(row => {
        if (!Array.isArray(row.srcs) || !row.srcs.length) return;
        const out = [];
        row.srcs.forEach(a => {
          const real = idOf(a.src);
          if (!real) { lost++; return; }
          out.push({ ...a, src: real });
          kept++;
        });
        row.srcs = out;
      });
    });
    return { kept, lost };
  }

  // ============================================================
  // # 📄 ☁️  A FILE IN THE CHAPTER'S FOLDER, WRITTEN OR MADE
  // # 🔤 JavaScript
  // # 🎯 Writes one json into a chapter's folder whether or not it is
  // #    already there, and returns its id
  // # 🔗 createJson on a name that exists makes a SECOND file of that
  // #    name - Drive allows twins - and then the app reads whichever
  // #    it finds first. That is how a course ends up with two
  // #    sources.json and a reader loses a day's work to the empty one,
  // #    which has already happened here. So it is always find first
  // ============================================================
  async function putJson(folderId, name, content) {
    const found = await cloud().findChild(folderId, name).catch(() => null);
    if (found) { await cloud().writeFile(found, content); return found; }
    return await cloud().createJson(folderId, name, content);
  }

  // ============================================================
  // # 📚 🚚  ONE CHAPTER
  // # 🔤 JavaScript
  // # 🎯 Opens the chapter so its folder and files exist, puts its two
  // #    PDFs up if they are not up yet, resolves the anchors against
  // #    them, and writes content, explain and sheets
  // # 🔗 Opening it first is not a courtesy to the reader: open() is
  // #    what creates the folder and the two files and writes their ids
  // #    beside the chapter, and it is also what makes add() know which
  // #    chapter a book belongs to - the store binds a new source to
  // #    whatever chapter is open at that moment, and to nothing if none
  // ============================================================
  async function oneChapter(course, chapter, rec, pdfs, say) {
    const tag = rec.chapter || chapter.name;

    await chapters().open(chapter);
    const openId = chapters().openId();

    // --- the two PDFs, only if this chapter has none of that kind yet
    const have = () => sources().forChapter(openId) || [];
    for (const kind of ['book', 'bank']) {
      if (have().some(s => s.kind === kind)) continue;
      const file = pdfs[tag + '|' + kind];
      if (!file) continue;
      say('      ' + kind + ': ' + file.name + ' (' + Math.round(file.size / 1024) + 'KB) ...');
      await sources().add(file, kind);
    }

    const mine = have();
    const pick = kind => (mine.find(s => s.kind === kind) || {}).id || '';
    const bookId = pick('book'), bankId = pick('bank');
    const idOf = word => word === 'bank' ? bankId : (word === 'book' ? bookId : '');

    const anchors = resolveAnchors(rec.content, idOf);

    await cloud().writeFile(chapter.contentId, rec.content);
    if (rec.explain) { await putJson(chapter.folderId, 'explain.json', rec.explain); }
    if (rec.sheets)  { await putJson(chapter.folderId, 'sheets.json',  rec.sheets);  }

    const rows = (rec.content.sections || []).reduce((n, s) => n + (s.rows || []).length, 0);
    const exps = rec.explain ? Object.keys(rec.explain.rows || {}).length : 0;
    chapters().shut();

    say('   ' + tag + '  rows=' + rows + ' anchors=' + anchors.kept
      + (anchors.lost ? ' LOST=' + anchors.lost + ' (no PDF for them)' : '')
      + ' explain=' + exps
      + ' book=' + (bookId ? 'yes' : 'NO') + ' bank=' + (bankId ? 'yes' : 'NO'));
    return { rows, anchors: anchors.kept, lost: anchors.lost, explain: exps };
  }

  // ============================================================
  // # ▶️ 📋  THE WHOLE BUNDLE
  // # 🔤 JavaScript
  // # 🎯 Walks the chapters of one course in the order the bundle gives
  // #    them, and stops on the first that throws
  // # 🔗 Stops, not skips. A half-written chapter is a thing the reader
  // #    can see and open, so carrying on past a failure would hide it
  // #    under nine successes and the only honest report would be a
  // #    number nobody reads. And the course is written down at the end
  // #    so the folder ids just minted are not lost on a refresh
  // ============================================================
  async function run(bundle, pdfs, say) {
    if (!bundle || !bundle.course || !Array.isArray(bundle.chapters)) {
      throw new Error('not a bundle: expected {course, chapters:[...]}');
    }
    const code = bundle.course;
    const all = board().courses() || [];
    const course = all.find(c => (c.code || c.name || '').toUpperCase() === code.toUpperCase());
    if (!course) throw new Error('no course on the board named ' + code);
    if (!course.folderId) throw new Error(code + ' has no folder in Drive yet - open it once in the app first');

    await sources().open(course);
    const known = board().chapters(course.id) || [];
    say(code + ': ' + bundle.chapters.length + ' chapter(s) in the bundle, '
      + known.length + ' on the board');

    const totals = { rows: 0, anchors: 0, lost: 0, explain: 0, done: 0 };
    for (const rec of bundle.chapters) {
      const name = String(rec.chapter || '').trim();
      const chapter = known.find(c => (c.name || '').trim() === name);
      if (!chapter) { say('   ' + name + '  SKIPPED: no chapter by that name on the board'); continue; }
      const got = await oneChapter(course, chapter, rec, pdfs, say);
      totals.rows += got.rows; totals.anchors += got.anchors;
      totals.lost += got.lost; totals.explain += got.explain; totals.done++;
    }

    board().touchCourse(course.id);
    await board().flush();
    sources().shut();

    say('');
    say('DONE ' + totals.done + ' chapter(s) | rows=' + totals.rows
      + ' anchors=' + totals.anchors + (totals.lost ? ' LOST=' + totals.lost : '')
      + ' explain=' + totals.explain);
    say('Reload the board to see them.');
    return totals;
  }

  window.MyTermImport = { run };
})();
