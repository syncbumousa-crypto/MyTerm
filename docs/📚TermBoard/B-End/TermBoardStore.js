// ============================================================
// # 📄 🗄️  THE TERM PAPER IN THE USER'S DRIVE
// # 🔤 JavaScript
// # 🎯 Nothing here shows on screen. It holds the one paper that says
// #    what the term is called and which courses are in it, reads it
// #    from the user's own Drive, and writes it back when it changes
// # 🔗 The screen file calls change() on every keystroke, and this file
// #    decides when to actually write: the fast copy in the browser is
// #    written at once so nothing is ever lost, and Drive is written
// #    after a short quiet, because a call to Google per letter typed
// #    would be slow and wasteful. Keys are per file, so two accounts
// #    on one browser never read each other's board
// ============================================================
(() => {
  const QUIET = 900;            // كم ينتظر السكون قبل الكتابة في درايف
  const cloud = () => window.MyTermCloud;

  let fileId = null;            // الملف الذي نكتب فيه
  let raw = null;               // كل ما في الملف، حتى ما لا نعرفه
  let timer = null;
  let sending = false;
  let dirty = false;
  let tellStatus = () => {};
  const movedCourses = new Set();   // المواد التي تغيّرت فصولها فتحتاج كتابة

  const cacheKey = () => 'myterm.board.' + fileId;

  // أيّامُ الترم: مفتاحٌ لكل يوم، وفي كلٍّ حالتُه وختمُ وقتها، فيُدمج يومًا بيوم
  const shapeDays = days => {
    const out = {};
    if (days && typeof days === 'object') {
      Object.keys(days).forEach(key => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
        const d = days[key];
        out[key] = { done: d?.done === true, updatedAt: d?.updatedAt ?? null };
      });
    }
    return out;
  };

  const shape = doc => ({
    term: {
      name: typeof doc?.term?.name === 'string' ? doc.term.name : '',
      start: typeof doc?.term?.start === 'string' ? doc.term.start : '',
      end: typeof doc?.term?.end === 'string' ? doc.term.end : '',
      updatedAt: doc?.term?.updatedAt ?? null
    },
    days: shapeDays(doc?.days),
    courses: Array.isArray(doc?.courses)
      ? doc.courses.filter(c => c && typeof c.name === 'string').map(c => ({
          id: typeof c.id === 'string' ? c.id : 'c-' + Math.random().toString(36).slice(2, 8),
          name: c.name,
          updatedAt: c.updatedAt ?? null,
          deleted: c.deleted === true,
          folderId: typeof c.folderId === 'string' ? c.folderId : null,
          folderName: typeof c.folderName === 'string' ? c.folderName : null,
          fileId: typeof c.fileId === 'string' ? c.fileId : null,
          credits: Number(c.credits) || 3,
          chapters: shapeChapters(c.chapters),
          items: shapeItems(c.items)
        }))
      : []
  });

  // ============================================================
  // # 🤝 ⏱️  PUTTING TWO VERSIONS TOGETHER
  // # 🔤 JavaScript
  // # 🎯 When this device has work not yet sent and the other device has
  // #    already saved, neither side is thrown away: the two are put
  // #    together item by item, and for each item the newer stamp wins
  // # 🔗 This is why every course carries an id and a stamp of its own.
  // #    Without the id a rename here and a new course there look the
  // #    same. Without the stamp there is no way to tell which came
  // #    later. A course removed is kept with a mark instead of being
  // #    dropped: a dropped course looks brand new to the other device
  // #    and walks straight back in on the next read
  // ============================================================
  // ============================================================
  // # 📑 🧩  THE CHAPTERS OF A COURSE
  // # 🔤 JavaScript
  // # 🎯 Reads and writes the chapter list that lives in the course's
  // #    own file, inside the course's own folder in Drive
  // # 🔗 Chapters are kept out of the term paper on purpose: the term
  // #    paper is the index, and it is read on every open, so it stays
  // #    small. A course's chapters are read once beside it and written
  // #    only when that course changed — not on every save of anything
  // ============================================================
  const shapeChapters = list => Array.isArray(list)
    ? list.filter(c => c && typeof c.name === 'string').map(c => ({
        id: typeof c.id === 'string' ? c.id : 'h-' + Math.random().toString(36).slice(2, 8),
        name: c.name,
        done: c.done === true,
        updatedAt: c.updatedAt ?? null,
        deleted: c.deleted === true
      }))
    : [];

  // بنود التقييم: اسمٌ ووزنٌ من ١٠٠، ودرجةٌ خام من أصلٍ، وتاريخ
  const shapeItems = list => Array.isArray(list)
    ? list.filter(i => i && typeof i.name === 'string').map(i => ({
        id: typeof i.id === 'string' ? i.id : 'i-' + Math.random().toString(36).slice(2, 8),
        name: i.name,
        weight: Number(i.weight) || 0,
        got: i.got === null || i.got === undefined || i.got === '' ? null : Number(i.got),
        outOf: Number(i.outOf) || 0,
        due: typeof i.due === 'string' ? i.due : '',
        updatedAt: i.updatedAt ?? null,
        deleted: i.deleted === true
      }))
    : [];

  const courseBody = course => ({
    app: 'MyTerm',
    id: course.id,
    name: course.name,
    credits: Number(course.credits) || 3,
    chapters: shapeChapters(course.chapters),
    items: shapeItems(course.items),
    updatedAt: new Date().toISOString()
  });

  const pick = (mine, theirs) => {
    const a = mine?.updatedAt || '', b = theirs?.updatedAt || '';
    if (a > b) return mine;
    if (b > a) return theirs;
    return mine?.deleted ? mine : theirs;      // تعادلٌ في الوقت: الشاهدة تغلب
  };

  const mergeCourse = (mine, theirs) => {
    const base = pick(mine, theirs);
    const byId = (list, taken) => {
      const left = new Map((list || []).map(x => [x.id, x]));
      const out = (taken || []).map(t => { const m = left.get(t.id); left.delete(t.id); return m ? pick(m, t) : t; });
      return out.concat([...left.values()]);
    };
    return {
      ...base,
      chapters: byId(mine.chapters, theirs.chapters),
      items: byId(mine.items, theirs.items)
    };
  };

  const merge = (mine, theirs) => {
    const left = new Map(mine.courses.map(c => [c.id, c]));
    const courses = theirs.courses.map(t => {
      const m = left.get(t.id);
      left.delete(t.id);
      return m ? mergeCourse(m, t) : t;
    });
    // الأيّام تُدمج يومًا بيوم: يومٌ أشّرته على جوالك ويومٌ على حاسبك يبقيان معًا
    const days = { ...theirs.days };
    Object.keys(mine.days || {}).forEach(key => {
      days[key] = days[key] ? pick(mine.days[key], days[key]) : mine.days[key];
    });

    return { term: pick(mine.term, theirs.term), days, courses: courses.concat([...left.values()]) };
  };

  // ============================================================
  // # 💾 ⚡  THE FAST COPY IN THE BROWSER
  // # 🔤 JavaScript
  // # 🎯 Writes and reads a copy next to the user, so the board draws
  // #    the moment it opens instead of waiting on Google
  // # 🔗 This copy is never the truth. Drive is. On every open the copy
  // #    is drawn first and then replaced by what Drive says. Each call
  // #    is wrapped, because a browser with its shields up refuses the
  // #    store and throws instead of answering
  // ============================================================
  const cache = {
    read: () => {
      try {
        const kept = localStorage.getItem(cacheKey());
        return kept === null ? null : shape(JSON.parse(kept));   // null = لا نسخة، لا «نسخة فارغة»
      } catch { return null; }
    },
    write: board => { try { localStorage.setItem(cacheKey(), JSON.stringify(board)); } catch {} },
    drop: () => { try { localStorage.removeItem(cacheKey()); } catch {} }
  };

  // ============================================================
  // # 📤 ⏳  WRITING TO DRIVE AFTER THE TYPING STOPS
  // # 🔤 JavaScript
  // # 🎯 Sends the paper to Drive once the user has been quiet for a
  // #    moment, says what it is doing, and keeps a count that goes up
  // #    on every write
  // # 🔗 The count is for the next step: another device will watch it to
  // #    know something changed. Fields we did not write are carried
  // #    over untouched, so nothing already in the file is destroyed.
  // #    A failed write is NOT tried again on a timer: when Drive says
  // #    no because the permission ran out, a retry every second fails
  // #    every second for ever. The work is kept, the screen is told,
  // #    and the next change or a press of the renew button tries again
  // ============================================================
  async function push() {
    if (!fileId || sending || !dirty) return;
    sending = true;
    dirty = false;
    tellStatus('saving');
    try {
      await settleFolders();
      const body = { ...(raw || {}), ...shape(raw), version: Number(raw?.version || 0) + 1, updatedAt: new Date().toISOString() };

      // الفصول تُحذف من ورقة الترم قبل كتابتها: مكانها ملفّ مادّتها، وورقةُ
      // الترم فهرسٌ يُقرأ في كل فتحة فيجب أن يبقى خفيفًا
      const index = { ...body, courses: body.courses.map(({ chapters, items, ...rest }) => rest) };
      await cloud().writeFile(fileId, index);

      // ثم ملفّات المواد التي تغيّرت فصولها وحدَها
      for (const id of [...movedCourses]) {
        const course = (raw?.courses || []).find(c => c.id === id);
        if (course?.fileId) await cloud().writeFile(course.fileId, courseBody(course));
        movedCourses.delete(id);
      }

      raw = body;
      // النسخة السريعة تُحدَّث هنا أيضًا لا عند التعديل وحده: الكتابةُ تُضيف
      // ما لم يكن في يد الشاشة — معرّفات المجلدات — فلو لم تُحدَّث لبقيت
      // النسخة تقول «لا مجلد» بعد أن صار للمادة مجلد
      cache.write(shape(body));
      tellStatus('saved');
      window.MyTermBell?.ring(body.version).catch(() => {});   // اقرع الجرس للأجهزة الأخرى
    } catch (e) {
      dirty = true;
      tellStatus('failed');
    } finally {
      sending = false;
    }
  }

  // ============================================================
  // # 📁 🪞  THE FOLDERS FOLLOW THE NAMES
  // # 🔤 JavaScript
  // # 🎯 Gives every course a folder of its own beside the term paper,
  // #    and keeps the folder's name the same as the course's name
  // # 🔗 Runs just before the paper is written, not on every letter
  // #    typed: by then the user has stopped, so one folder is made and
  // #    one rename is sent instead of one per keystroke. A course whose
  // #    folder could not be made keeps an empty folder slot and is
  // #    tried again next time, so a refused call never loses a course.
  // #    The term folder is asked for once and remembered
  // ============================================================
  let termFolder = null;

  async function settleFolders() {
    const courses = raw?.courses;
    if (!Array.isArray(courses) || !courses.length) return;

    const needs = courses.filter(c => !c.deleted && (!c.folderId || c.folderName !== c.name));
    if (!needs.length) return;

    if (!termFolder) termFolder = await cloud().parentOf(fileId);
    if (!termFolder) return;

    for (const course of needs) {
      const title = course.name.trim() || 'مادة بلا اسم';
      if (!course.folderId) {
        course.folderId = await cloud().makeFolder(title, termFolder);
        course.fileId = await cloud().createJson(course.folderId, 'course.json', {
          app: 'MyTerm', id: course.id, name: course.name, createdAt: new Date().toISOString()
        });
      } else {
        await cloud().rename(course.folderId, title);
      }
      course.folderName = title;
    }
  }

  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(push, QUIET);
  };

  window.MyTermBoardStore = {
    attach: id => { fileId = id; raw = null; termFolder = null; },
    detach: () => { clearTimeout(timer); fileId = null; raw = null; dirty = false; termFolder = null; },

    cached: () => (fileId ? cache.read() : null),

    // تُعيد null إذا تعذّرت القراءة — ولا تعيد «لوحةً فارغة»، فبينهما فرقٌ
    // يراه المستخدم: الفراغُ حقيقةٌ عنه، والتعذّرُ عطبٌ عندنا
    load: async () => {
      if (!fileId) return null;
      const doc = await cloud().readFile(fileId);
      if (!doc || typeof doc !== 'object') return null;

      const incoming = shape(doc);
      const local = raw ? shape(raw) : null;
      const mineById = new Map((local?.courses || []).map(c => [c.id, c]));

      // فصولُ كل مادة تُقرأ من ملفها، والمواد تُقرأ معًا لا واحدةً بعد أخرى.
      // وإن تعذّرت قراءةُ ملفِ مادة بقيت فصولُها التي عندنا، فالتعذّر لا يمحو
      await Promise.all(incoming.courses.map(async course => {
        if (course.deleted) return;
        const kept = mineById.get(course.id)?.chapters || [];
        if (!course.fileId) { course.chapters = kept; return; }
        const keptItems = mineById.get(course.id)?.items || [];
        const own = await cloud().readFile(course.fileId).catch(() => null);
        course.chapters = own ? shapeChapters(own.chapters) : kept;
        course.items = own ? shapeItems(own.items) : keptItems;
        if (own && own.credits) course.credits = Number(own.credits) || 3;
      }));

      const board = (local && dirty) ? merge(local, incoming) : incoming;

      raw = { ...doc, ...board };
      cache.write(board);
      return board;
    },

    change: board => {
      if (!fileId) return;
      raw = { ...(raw || {}), ...board };
      cache.write(shape(board));
      dirty = true;
      tellStatus('waiting');
      later();
    },

    flush: () => { clearTimeout(timer); return push(); },

    version: () => Number(raw?.version || 0),

    // اللوحة الحيّة التي يملكها المخزن، تقرأها الشاشتان كلتاهما فلا نسختان
    board: () => (raw ? shape(raw) : null),
    live: () => raw,

    busy: () => dirty || sending,

    // تُنادى حين تتغيّر فصولُ مادة، فيُكتب ملفُّها هي وحدَها في الإرسال التالي
    touchCourse: id => { movedCourses.add(id); },

    onStatus: fn => { tellStatus = fn; },

    forget: () => { if (fileId) cache.drop(); }
  };
})();
