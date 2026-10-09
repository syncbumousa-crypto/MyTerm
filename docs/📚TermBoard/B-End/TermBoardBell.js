// ============================================================
// # 🔔 📡  THE BELL BETWEEN THIS USER'S DEVICES
// # 🔤 JavaScript
// # 🎯 Nothing here shows on screen, and no term data passes through
// #    it. It rings a number in the database after this device writes
// #    to Drive, and it listens for that number changing so another
// #    device can know there is something new to read
// # 🔗 The data itself stays in the user's Drive. The database carries
// #    the news, not the news item: one number, who rang it, and when.
// #    The name is made fresh for every open page and never kept: its
// #    whole job is to let a page ignore the ring it rang itself. Keep
// #    it in the browser instead and two tabs on one machine carry the
// #    same name, so each ignores the other and neither ever updates
// ============================================================
(() => {
  const db = () => window.MyTermAuth.db;

  const me = 'p-' + Math.random().toString(36).slice(2, 10);

  let channel = null, lastHeard = 0;

  // From the token in this browser, not from a trip to the service. The
  // other way is a request that can fail, and a failure there reads as
  // "nobody is signed in" — which would hang up the doorbell in silence
  const myId = async () => (await db().auth.getSession()).data.session?.user?.id || null;

  window.MyTermBell = {
    me,

    // Rung after every good write to Drive. The number is the file's own,
    // so the other device knows what it holds is older
    ring: async version => {
      const id = await myId();
      if (!id) return;
      lastHeard = Math.max(lastHeard, Number(version) || 0);
      await db().from('profiles')
        .update({ board_version: version, board_by: me, board_touched_at: new Date().toISOString() })
        .eq('id', id);
    },

    // Called once. It ignores this page's own ring, and ignores a number
    // that is not newer: reading the file for no reason costs and gives nothing
    listen: async onRing => {
      const id = await myId();
      if (!id || channel) return false;
      channel = db().channel('myterm-board')
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'id=eq.' + id },
            payload => {
              const version = Number(payload.new?.board_version || 0);
              if (payload.new?.board_by === me) return;
              // The same number is ignored, not everything below it: if the
              // database ever ran ahead of the file the bell would fall silent for ever
              if (version === lastHeard) return;
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
