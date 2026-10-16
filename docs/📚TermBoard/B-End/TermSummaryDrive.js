// ============================================================
// # 🗄️ 📌  WHERE A CHAPTER'S SUMMARY AND SKILL ARE KEPT
// # 🔤 JavaScript
// # 🎯 A Summaries folder inside the term folder in the reader's own
// #    Drive: a record per chapter, and one skill file per course that
// #    the next chapter is handed.
// # 🔗 The craft is NOT kept here. The thirteen method files and each
// #    course's nature ship with the site: they are the same for every
// #    reader, and a copy of them in a thousand Drives is a thousand
// #    copies to keep in step. What goes to Drive is what belongs to
// #    this reader - what was summarised, and what was learned doing it.
// #
// #    One rule is enforced rather than asked for: a skill file is
// #    copied into skills/ before it is written over, every time. The
// #    whole point of the file is that each chapter hands it to the
// #    next, so the question "which skill was this chapter summarised
// #    with" has to stay answerable. A plain overwrite destroys the
// #    only thing the file is for, and does it silently.
// ============================================================
(() => {
  'use strict';

  const ROOT = 'Summaries';
  const cloud = () => window.MyTermCloud;
  const board = () => window.MyTermBoardStore;

  const ids = {};                       // path -> folder id, for this page's life

  const folder = async (name, parentId) => {
    const key = parentId + '/' + name;
    if (ids[key]) return ids[key];
    const c = cloud();
    let id = await c.findChild(parentId, name, 'application/vnd.google-apps.folder');
    if (!id) id = await c.makeFolder(name, parentId);
    ids[key] = id;
    return id;
  };

  // Nothing here works before there is a term file in Drive to hang it
  // off. Saying so plainly beats half-creating a tree beside nothing
  const home = async () => {
    const c = cloud();
    if (!c || !c.hasToken()) return null;
    return await board().homeFolder();
  };

  const rootFolder = async () => {
    const h = await home();
    return h ? folder(ROOT, h) : null;
  };

  const courseFolder = async code => {
    const r = await rootFolder();
    if (!r) return null;
    return folder(code, await folder('courses', r));
  };

  const readJson = async (parentId, name) => {
    const c = cloud();
    const id = await c.findChild(parentId, name);
    if (!id) return null;
    try { return JSON.parse(await c.readFile(id)); } catch (e) { return null; }
  };

  const putJson = async (parentId, name, obj) => {
    const c = cloud();
    const id = await c.findChild(parentId, name);
    if (id) { await c.writeFile(id, obj); return id; }
    return c.createJson(parentId, name, obj);
  };

  // ---- a chapter's record -------------------------------------------
  const chapter = {
    read: async (code, key) => {
      const cf = await courseFolder(code);
      if (!cf) return null;
      return readJson(await folder('chapters', cf), key + '.json');
    },
    write: async (code, key, record) => {
      const cf = await courseFolder(code);
      if (!cf) throw new Error('No term folder in Drive yet');
      const now = new Date().toISOString();
      return putJson(await folder('chapters', cf), key + '.json',
                     Object.assign({}, record, { course: code, chapter: key, savedAt: now }));
    }
  };

  // ---- the skill, and the history it must not lose -------------------
  // The file carries its own version number. Counting what is already in
  // the archive folder would have been the obvious way and is not
  // available: Drive is only ever asked for a child BY NAME here, never
  // for a list. So the number travels inside the file it belongs to,
  // which is also the only place it cannot drift from
  const skills = {
    read: async code => {
      const cf = await courseFolder(code);
      if (!cf) return null;
      const c = cloud();
      const id = await c.findChild(cf, 'skills.json');
      if (!id) return null;
      const body = await c.readFile(id);
      return body ? { id, version: body.version || 1, after: body.after || null, text: body.text || '' } : null;
    },

    // The old text is archived FIRST and the write only happens if that
    // succeeded. Losing the new text is a retry; losing the old one is
    // the one loss this store exists to prevent
    write: async (code, text, afterChapter) => {
      const cf = await courseFolder(code);
      if (!cf) throw new Error('No term folder in Drive yet');
      const c = cloud();
      const old = await skills.read(code);

      if (old && old.text) {
        const hist = await folder('skills', cf);
        const n = String(old.version).padStart(2, '0');
        const name = 'v' + n + (old.after ? '-after-' + old.after : '') + '.json';
        const kept = await putJson(hist, name, {
          version: old.version, after: old.after,
          archivedAt: new Date().toISOString(), text: old.text
        });
        if (!kept) throw new Error('The previous skill could not be archived, so it was not written over');
      }

      const next = {
        version: (old ? old.version : 0) + 1,
        after: afterChapter || null,
        savedAt: new Date().toISOString(),
        text
      };
      if (old && old.id) { await c.writeFile(old.id, next); return old.id; }
      return c.createJson(cf, 'skills.json', next);
    }
  };

  // ---- seeding: the shipped record as a starting point ----------------
  // Only ever fills a gap. A chapter already in Drive is the reader's
  // own and is never written over by the copy that ships with the site
  const seed = async (code, onEach) => {
    const nature = window.MyTermSummary?.natureOf(code);
    if (!nature) throw new Error('No such course in the shipped tree');
    let made = 0, kept = 0;
    for (const key of nature.chapters) {
      const there = await chapter.read(code, key);
      if (there) { kept++; onEach?.(key, 'kept'); continue; }
      const shipped = await window.MyTermSummary.chapterData(code, key);
      if (!shipped) { onEach?.(key, 'missing'); continue; }
      await chapter.write(code, key, shipped);
      made++; onEach?.(key, 'written');
    }
    return { made, kept };
  };

  window.MyTermSummaryDrive = {
    ready: async () => Boolean(await home()),
    chapter, skills, seed, rootFolder
  };
})();
