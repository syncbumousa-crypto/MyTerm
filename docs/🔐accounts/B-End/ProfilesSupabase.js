// ============================================================
// # 🔌 🔑  CONNECT TO THE SERVICE AND ASK IT
// # 🔤 JavaScript
// # 🎯 Nothing here shows on screen. It opens the line to the sign in
// #    service, and hands the page four ways to ask: make an account,
// #    log in, log out, and is anyone still logged in
// # 🔗 The screen file calls these four and then draws the answer. The
// #    key below is the public one, so it is safe to show: what keeps
// #    the data safe is the rules on the service, not this key. All the
// #    names sit inside one wrapper, so only MyTermAuth leaves this file
// ============================================================
(() => {
  const SERVICE_URL = 'https://qpxltggjchspcmqwibqg.supabase.co';
  const PUBLIC_KEY = 'sb_publishable_2Zhv75beNB67TjU4FzuKow_usYx7HBP';

  // ============================================================
  // # 🔑 🧱  THE SIGN IN IS NEVER THE THING THAT DOES NOT FIT
  // # 🔤 JavaScript
  // # 🎯 Where the service keeps who is signed in: this browser's
  // #    localStorage, under the same name as always, with one rule added
  // # 🔗 A KEY THAT CANNOT BE WRITTEN SIGNS YOU OUT AT THE NEXT RELOAD.
  // #    The service renews the sign in about once an hour and spends the
  // #    old key as it does. If the new one cannot be written, the page
  // #    goes on working on it, and the box keeps the spent one — which
  // #    the next reload hands back, is refused, and is signed out. So a
  // #    write that does not fit makes room by throwing away what is only
  // #    ever a copy of Drive (the chapters and the board kept for a fast
  // #    open) and is tried again. Nothing thrown here is the only copy
  // ============================================================
  const COPIES = ['myterm.chapter.', 'myterm.board.'];

  const makeRoom = () => {
    try {
      Object.keys(localStorage)
        .filter(k => COPIES.some(head => k.indexOf(head) === 0))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  };

  const keeps = {
    getItem: k => localStorage.getItem(k),
    setItem: (k, v) => {
      try { localStorage.setItem(k, v); }
      catch { makeRoom(); localStorage.setItem(k, v); }
    },
    removeItem: k => localStorage.removeItem(k)
  };

  const db = supabase.createClient(SERVICE_URL, PUBLIC_KEY, { auth: { storage: keeps } });

  window.MyTermAuth = {
    db,
    signUp: (email, password) => db.auth.signUp({ email, password }),
    signIn: (email, password) => db.auth.signInWithPassword({ email, password }),
    signOut: () => db.auth.signOut(),
    session: () => db.auth.getSession()
  };
})();
