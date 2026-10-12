// ============================================================
// # 💺 🔒  ONE PAGE AT A TIME HOLDS THE PEN
// # 🔤 JavaScript
// # 🎯 Says which page is the one allowed to write, and tells the
// #    others to stop
// # 🔗 TWO PAGES WRITING THE SAME FILE DO NOT MERGE, THEY TAKE TURNS
// #    OVERWRITING EACH OTHER. Both are honest, both save what they
// #    hold, and each one's save undoes the other's -- so the reader
// #    watches a number they fixed go back to what it was, with no
// #    error anywhere and nothing to blame. It happened on this board
// #    for a whole afternoon: a course's hours written four times and
// #    reverted within seconds each time by a tab left open elsewhere.
// #
// #    So a page TAKES A SEAT when it opens. The newest arrival gets
// #    it -- it is the one the reader is looking at -- and whoever held
// #    it before stops saving and says so, with a way back.
// #
// #    A SEAT IS A PAGE, NOT A DEVICE. The board and a course are two
// #    different seats, and two different courses are two more, so
// #    nothing stops a reader keeping the board and a chapter open side
// #    by side. What is refused is the same page twice, which is the
// #    only arrangement that can silently eat work
// ============================================================
(() => {
  const db = () => window.MyTermAuth?.db;

  // A name for this page, made fresh every time it opens and never
  // kept: two tabs of one browser must not share it or each would
  // ignore the other, which is the very arrangement this guards against
  const me = 's-' + Math.random().toString(36).slice(2, 10);

  let channel = null, seat = null, holding = false, tellLost = () => {};

  const myId = async () => (await db()?.auth.getSession())?.data?.session?.user?.id || null;

  // Everything that writes is frozen together. Freezing one and not the
  // other would leave a page that cannot save its board still saving
  // its chapter -- the same overwriting, from a quieter direction
  const freeze = on => {
    holding = !on;
    window.MyTermBoardStore?.hold?.(on);
    window.MyTermChapterStore?.hold?.(on);
    window.MyTermDaysStore?.hold?.(on);
  };

  const announce = async () => {
    if (!channel || !seat) return;
    await channel.send({ type: 'broadcast', event: 'took',
                         payload: { seat, by: me, at: Date.now() } });
  };

  window.MyTermSeat = {
    me,
    seat: () => seat,
    writing: () => holding,

    // ============================================================
    // # 🪑 ✋  TAKING THE SEAT
    // # 🔤 JavaScript
    // # 🎯 Says "I am this page now" to every other page of this user
    // # 🔗 The NEWEST page wins, always. The alternative -- refusing to
    // #    open because an old tab somewhere still claims the seat --
    // #    leaves a reader locked out by a window they have forgotten,
    // #    on a machine they may not be near
    // ============================================================
    take: async (which, onLost) => {
      if (!db()) return false;
      seat = String(which || 'board');
      if (onLost) tellLost = onLost;
      freeze(true);

      const id = await myId();
      if (!id) return false;

      if (!channel) {
        channel = db().channel('myterm-seats-' + id, { config: { broadcast: { self: false } } });
        channel.on('broadcast', { event: 'took' }, msg => {
          const p = msg?.payload || {};
          if (p.by === me) return;                  // my own voice
          if (p.seat !== seat) return;              // another page entirely
          // Somebody else is this page now. Stop writing before saying
          // so: the words can wait, a save cannot be taken back
          freeze(false);
          tellLost(p);
        });
        await channel.subscribe();
      }
      await announce();
      return true;
    },

    // The reader has said "no, here" — take it back and start saving again
    resume: async () => {
      freeze(true);
      await announce();
      return true;
    },

    // Leaving quietly: nothing is announced, because a page that is
    // closing has no claim to make and the one still open already holds it
    drop: () => { seat = null; freeze(false); }
  };
})();
