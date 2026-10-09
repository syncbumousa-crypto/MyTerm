// ============================================================
// # 🔑 ☁️  GOOGLE PERMISSION AND THE SAVED TOKEN
// # 🔤 JavaScript
// # 🎯 Nothing here draws anything. It holds the public Google values,
// #    asks the user to allow this site, and keeps the permission so a
// #    reload does not undo the linking
// # 🔗 drive.file is the narrow permission: only what this site made, or
// #    what the user handed it through the Google window. The permission
// #    is kept in the lasting store because changing a browser shield
// #    reloads the page and can wipe the short term store with it
// ============================================================
(() => {
  const CLIENT_ID = '730425860367-ptdsv9f8u1vf9vvap7r8hpivd4v4be9n.apps.googleusercontent.com';
  const API_KEY = 'AIzaSyCQzcpzKR842f2CE9yoPQqKTQWWN4Ny3sg';
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const FOLDER = 'MyTerm', FILE = 'term.json';
  const FOLDER_TYPE = 'application/vnd.google-apps.folder';
  const MEMO = 'myterm.googleToken';

  let token = null, pickerReady = false;

  const store = {
    save: (t, secs) => { try { localStorage.setItem(MEMO, JSON.stringify({ t, until: Date.now() + ((secs || 3600) - 60) * 1000 })); } catch {} },
    read: () => { try { const v = JSON.parse(localStorage.getItem(MEMO) || 'null'); return v && v.until > Date.now() ? v.t : null; } catch { return null; } },
    clear: () => { try { localStorage.removeItem(MEMO); } catch {} }
  };

  // ============================================================
  // # 🔄 🤫  ASKING AGAIN, QUIETLY
  // # 🔤 JavaScript
  // # 🎯 Google's permission lasts about an hour. This asks for a fresh
  // #    one. Called with no prompt it opens Google's window; called
  // #    with an empty prompt it asks for no window at all, which works
  // #    when the user already said yes once before
  // # 🔗 The quiet way is tried first by the Drive helper below, so a
  // #    permission that ran out while the page sat open heals itself
  // #    with nothing for the user to press. It is given a short rope:
  // #    a browser that blocks Google cookies can leave the quiet ask
  // #    hanging with no answer at all, and a hang is worse than a no,
  // #    so after a few seconds it counts as a no and the button shows
  // ============================================================
  const SILENT_WAIT = 4000;

  const askGoogle = prompt => new Promise((ok, fail) => {
    let over = false;
    const once = fn => value => { if (!over) { over = true; clearTimeout(timer); fn(value); } };
    const good = once(ok), bad = once(fail);

    const config = {
      client_id: CLIENT_ID, scope: SCOPE,
      callback: a => a.error ? bad(new Error(a.error))
        : (token = a.access_token, store.save(token, a.expires_in), good()),
      error_callback: e => bad(new Error(e?.type || 'google window failed'))
    };
    if (prompt !== undefined) config.prompt = prompt;

    const timer = prompt === '' ? setTimeout(() => bad(new Error('silent ask timed out')), SILENT_WAIT) : null;
    google.accounts.oauth2.initTokenClient(config).requestAccessToken();
  });

  // One quiet ask at a time: five Drive calls failing together must not
  // open five asks. They all wait on the same one and share its answer
  let quietAsk = null;
  const renewQuietly = () => {
    if (!quietAsk) {
      quietAsk = askGoogle('').then(() => true, () => false);
      quietAsk.then(() => { quietAsk = null; });
    }
    return quietAsk;
  };

  // ============================================================
  // # 📡 🗄️  TALKING TO DRIVE
  // # 🔤 JavaScript
  // # 🎯 One helper that signs every call, then the five things this site
  // #    does: find or make its folder, make a file, ask if it still
  // #    exists, read it, and write over it
  // # 🔗 The file belongs to the user, who may move, trash or delete it.
  // #    So the saved id is never trusted: a missing file and a file in
  // #    the bin both count as gone, and the reader gives back nothing
  // #    instead of breaking when the content is spoiled
  // ============================================================
  const DRIVE = 'https://www.googleapis.com/drive/v3/files';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

  const send = (url, opts) =>
    fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...opts.headers } });

  // Every call goes through here, so every call heals the same way: a
  // 401 means the permission ran out, and the only honest answer is to
  // ask for a new one and send the very same call again. Once, not in a
  // loop: if the quiet ask fails the first time it will fail the second
  const drive = async (url, opts = {}) => {
    const first = await send(url, opts);
    if (first.status !== 401) return first;
    return (await renewQuietly()) ? send(url, opts) : first;
  };

  const json = (method, body) =>
    ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body, null, 2) });

  async function findOrMakeFolder() {
    const q = encodeURIComponent(`mimeType='${FOLDER_TYPE}' and name='${FOLDER}' and trashed=false`);
    const found = await drive(`${DRIVE}?q=${q}&fields=files(id,name)`);
    if (!found.ok) throw new Error(`Drive search failed: ${found.status}`);
    const hit = (await found.json()).files?.[0];
    if (hit) return hit;

    const made = await drive(DRIVE, json('POST', { name: FOLDER, mimeType: FOLDER_TYPE }));
    if (!made.ok) throw new Error(`Drive folder failed: ${made.status}`);
    return { id: (await made.json()).id, name: FOLDER };
  }

  async function createJson(parentId, name, content) {
    const edge = 'myterm' + Date.now();
    const part = o => `--${edge}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(o, null, 2)}\r\n`;
    const made = await drive(`${UPLOAD}?uploadType=multipart`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${edge}` },
      body: part({ name, mimeType: 'application/json', parents: [parentId] }) + part(content) + `--${edge}--`
    });
    if (!made.ok) throw new Error(`Drive create failed: ${made.status}`);
    return (await made.json()).id;
  }

  // ============================================================
  // # 📁 🌳  FOLDERS INSIDE THE TERM FOLDER
  // # 🔤 JavaScript
  // # 🎯 The three things a course folder needs: find the folder the
  // #    term paper sits in, make a folder beside it, and rename one
  // # 🔗 The term folder's own id was never written down, and it does
  // #    not need to be: Drive knows the parent of any file it holds,
  // #    so it is asked. The narrow permission reaches these folders
  // #    because the app made them, or the user handed the term folder
  // #    to it through the Google window
  // ============================================================
  async function parentOf(fileId) {
    const r = await drive(`${DRIVE}/${fileId}?fields=parents`);
    if (!r.ok) throw new Error(`Drive parent failed: ${r.status}`);
    return (await r.json()).parents?.[0] || null;
  }

  async function makeFolder(name, parentId) {
    const made = await drive(DRIVE, json('POST', { name, mimeType: FOLDER_TYPE, parents: [parentId] }));
    if (!made.ok) throw new Error(`Drive folder failed: ${made.status}`);
    return (await made.json()).id;
  }

  async function rename(id, name) {
    const r = await drive(`${DRIVE}/${id}`, json('PATCH', { name }));
    if (!r.ok) throw new Error(`Drive rename failed: ${r.status}`);
  }

  async function fileAlive(id) {
    const r = await drive(`${DRIVE}/${id}?fields=id,trashed`);
    if (r.status === 404) return false;
    if (!r.ok) return true;
    return (await r.json().catch(() => ({}))).trashed !== true;
  }

  const readFile = async id => {
    const r = await drive(`${DRIVE}/${id}?alt=media`);
    return r.ok ? r.json().catch(() => null) : null;
  };

  async function writeFile(id, content) {
    const r = await drive(`${UPLOAD}/${id}?uploadType=media`, json('PATCH', content));
    if (!r.ok) throw new Error(`Drive save failed: ${r.status}`);
  }

  // ============================================================
  // # 📂 🧪  THE GOOGLE WINDOW, SHOWN OR HIDDEN
  // # 🔤 JavaScript
  // # 🎯 Opens Google's own folder window. Shown, it lets the user pick.
  // #    Hidden, it answers one question and shows nothing: does this
  // #    browser let it work
  // # 🔗 The window only reports loaded after it draws its own screen. A
  // #    browser that blocks Google cookies sends it to a sign in page
  // #    instead, and it reports nothing, so silence is the answer. No
  // #    browser tells a page about blocking, so it is tried, not asked
  // ============================================================
  const PROBE_WAIT = 6000;
  const Action = () => google.picker.Action;

  async function openPicker(onResult, hidden = false) {
    if (!pickerReady) await new Promise(ok => gapi.load('picker', () => (pickerReady = true, ok())));
    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes(FOLDER_TYPE);
    const win = new google.picker.PickerBuilder()
      .setOAuthToken(token).setDeveloperKey(API_KEY)
      .setOrigin(`${location.protocol}//${location.host}`)
      .addView(view).setCallback(onResult).build();
    document.body.classList.toggle('probing', hidden);
    win.setVisible(true);
    return win;
  }

  const pickFolder = () => new Promise(done =>
    openPicker(r => {
      if (r.action === Action().PICKED) done({ id: r.docs[0].id, name: r.docs[0].name });
      else if (r.action === Action().CANCEL) done(null);
    }).catch(() => done(null)));

  const probePicker = () => new Promise(done => {
    let win = null, over = false;
    const stop = works => {
      if (over) return;
      over = true;
      clearTimeout(timer);
      try { win?.setVisible(false); } catch {}
      document.body.classList.remove('probing');
      done(works);
    };
    const timer = setTimeout(() => stop(false), PROBE_WAIT);
    openPicker(r => {
      if (r.action === (Action().LOADED || 'loaded')) stop(true);
      else if (r.action === Action().CANCEL) stop(false);
    }, true).then(w => (win = w)).catch(() => stop(false));
  });

  // ============================================================
  // # 🔖 🗄️  THE POINTER IN THE DATABASE
  // # 🔤 JavaScript
  // # 🎯 Reads, writes and clears the one row that says where this
  // #    user's file lives
  // # 🔗 This is the whole link between the two services: the database
  // #    holds a pointer, and the data itself stays in the user's own
  // #    Drive. The table rules let each user touch their own row only.
  // #    Only the list at the end leaves this file, and the screen file
  // #    calls it: one name instead of fifty
  // ============================================================
  const db = () => window.MyTermAuth.db;
  const me = async () => (await db().auth.getUser()).data.user;
  const now = () => new Date().toISOString();

  const loadProfile = async () => {
    const user = await me();
    return user ? (await db().from('profiles').select('*').eq('id', user.id).maybeSingle()).data : null;
  };

  const savePlace = async (name, fileId) => {
    const user = await me();
    if (user) await db().from('profiles').upsert({ id: user.id, drive_folder_name: name, drive_file_id: fileId, updated_at: now() });
  };

  const forgetPlace = async () => {
    const user = await me();
    if (user) await db().from('profiles').update({ drive_folder_name: null, drive_file_id: null, updated_at: now() }).eq('id', user.id);
  };

  window.MyTermCloud = {
    FOLDER, FILE, now,
    hasToken: () => Boolean(token),
    remember: () => Boolean(token = store.read()),
    forgetToken: () => { token = null; store.clear(); },
    askGoogle,
    findOrMakeFolder, createJson, fileAlive, readFile, writeFile,
    parentOf, makeFolder, rename,
    pickFolder, probePicker,
    loadProfile, savePlace, forgetPlace
  };
})();
