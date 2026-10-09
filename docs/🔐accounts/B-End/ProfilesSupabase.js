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

  const db = supabase.createClient(SERVICE_URL, PUBLIC_KEY);

  window.MyTermAuth = {
    db,
    signUp: (email, password) => db.auth.signUp({ email, password }),
    signIn: (email, password) => db.auth.signInWithPassword({ email, password }),
    signOut: () => db.auth.signOut(),
    session: () => db.auth.getSession()
  };
})();
