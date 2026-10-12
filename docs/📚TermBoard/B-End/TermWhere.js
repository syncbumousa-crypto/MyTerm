// ============================================================
// # 🧭 🔗  THE ADDRESS SAYS WHERE YOU ARE
// # 🔤 JavaScript
// # 🎯 Turns the place on screen into a readable address, and a pasted
// #    address back into a place
// # 🔗 IT READS LIKE A PATH BECAUSE IT IS ONE: board / course / part.
// #    `?course=c-4udap2` is a true address and tells a reader nothing
// #    -- it cannot be read aloud, cannot be guessed at, and a link
// #    sent to somebody says only that it is a link.
// #
// #    IT LIVES IN THE HASH, and that is not a compromise. This site is
// #    static files on GitHub Pages: a real path would be a request for
// #    a folder that does not exist, so every refresh and every pasted
// #    link would land on a 404. The hash never leaves the browser.
// #
// #    AND NAMES, NOT IDS -- but the id is what is obeyed when both are
// #    there. A name is for the reader and changes whenever they like;
// #    an id is for the machine and never does. So the address carries
// #    the name to be read and keeps working when it is renamed
// ============================================================
(() => {
  const keep = () => window.MyTermBoardStore;

  // What a name looks like in an address: spaces become dashes, and the
  // handful of characters that mean something in a URL are dropped. Two
  // courses whose names differ only by those would collide, which is
  // why the id is still the thing that decides
  const slug = s => String(s || '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[#?/\\%]+/g, '')
    .slice(0, 60);

  const same = (a, b) => slug(a).toLowerCase() === slug(b).toLowerCase();

  let quiet = false;          // a change this file made itself

  const write = path => {
    const want = '#/' + path.filter(Boolean).map(slug).join('/');
    if (location.hash === want) return;
    quiet = true;
    history.replaceState(null, '', location.pathname + location.search + want);
    setTimeout(() => { quiet = false; }, 0);
  };

  const parts = () => decodeURIComponent(location.hash || '')
    .replace(/^#\/?/, '').split('/').filter(Boolean);

  window.MyTermWhere = {
    slug,

    // ---- writing ----
    atBoard: () => write(['board']),
    atCourse: (course, partName) => write(['board', course?.name || 'course', partName || '']),

    // ---- reading ----
    // The course asked for, by id if the old style address is used and
    // by name otherwise. A name that matches nothing gives nothing: a
    // board is a safer place to land than somebody else's course
    asked: () => {
      const byId = new URLSearchParams(location.search).get('course');
      if (byId) return { id: byId, part: null };
      const bits = parts();
      if (bits[0] !== 'board' || !bits[1]) return { id: null, part: null };
      const list = (keep()?.live()?.courses || []).filter(c => !c.deleted);
      const hit = list.find(c => same(c.name, bits[1]));
      return { id: hit ? hit.id : null, part: bits[2] || null };
    },

    // Which part of the open chapter the address names, matched the same
    // forgiving way the course is
    partNamed: (sections, wanted) => {
      if (!wanted) return null;
      return (sections || []).find(s => same(s.name.split('·')[0], wanted)
                                     || same(s.name, wanted)) || null;
    },

    // A reader pressing Back should move between the places they have
    // been, not watch the address change under a page that ignores it
    listen: fn => window.addEventListener('hashchange', () => { if (!quiet) fn(); })
  };
})();
