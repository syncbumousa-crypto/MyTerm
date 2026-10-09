// ============================================================
// # 🔔 📡  THE BELL BETWEEN THIS USER'S DEVICES
// # 🔤 JavaScript
// # 🎯 Nothing here shows on screen, and no term data passes through
// #    it. It rings a number in the database after this device writes
// #    to Drive, and it listens for that number changing so another
// #    device can know there is something new to read
// # 🔗 The data itself stays in the user's Drive. The database carries
// #    the news, not the news item: one number, who rang it, and when.
// #    Each device makes itself a name once and keeps it, so a device
// #    can tell its own ring from somebody else's and ignore its own
// ============================================================
(() => {
  const WHO = 'myterm.device';
  const db = () => window.MyTermAuth.db;

  const me = (() => {
    try {
      let name = localStorage.getItem(WHO);
      if (!name) { name = 'd-' + Math.random().toString(36).slice(2, 10); localStorage.setItem(WHO, name); }
      return name;
    } catch { return 'd-' + Math.random().toString(36).slice(2, 10); }
  })();

  let channel = null, lastHeard = 0;

  const myId = async () => (await db().auth.getUser()).data.user?.id || null;

  window.MyTermBell = {
    me,

    // يُقرع بعد كل كتابة ناجحة في درايف. ورقم النسخة هو نفسه الذي في الملف،
    // فيعرف الجهاز الآخر أنّ عنده أقدمَ منه
    ring: async version => {
      const id = await myId();
      if (!id) return;
      lastHeard = Math.max(lastHeard, Number(version) || 0);
      await db().from('profiles')
        .update({ board_version: version, board_by: me, board_touched_at: new Date().toISOString() })
        .eq('id', id);
    },

    // تُستدعى مرّة. وتُهمل قرعَ هذا الجهاز نفسِه، وتُهمل رقمًا ليس أحدث ممّا
    // عندنا — فإعادةُ قراءةِ الملف لغير سببٍ تكلفة بلا فائدة
    listen: async onRing => {
      const id = await myId();
      if (!id || channel) return false;
      channel = db().channel('myterm-board')
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'id=eq.' + id },
            payload => {
              const version = Number(payload.new?.board_version || 0);
              if (payload.new?.board_by === me) return;
              if (version <= lastHeard) return;
              lastHeard = version;
              onRing(version);
            })
        .subscribe();
      return true;
    },

    seen: version => { lastHeard = Math.max(lastHeard, Number(version) || 0); },

    stop: async () => { if (channel) { await db().removeChannel(channel); channel = null; } }
  };
})();
