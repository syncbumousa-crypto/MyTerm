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

  const askGoogle = () => new Promise((ok, fail) =>
    google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: SCOPE,
      callback: a => a.error ? fail(new Error(a.error))
        : (token = a.access_token, store.save(token, a.expires_in), ok())
    }).requestAccessToken());

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

  const drive = (url, opts = {}) =>
    fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...opts.headers } });

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

  async function createFile(folderId, content) {
    const edge = 'myterm' + Date.now();
    const part = o => `--${edge}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(o, null, 2)}\r\n`;
    const made = await drive(`${UPLOAD}?uploadType=multipart`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${edge}` },
      body: part({ name: FILE, mimeType: 'application/json', parents: [folderId] }) + part(content) + `--${edge}--`
    });
    if (!made.ok) throw new Error(`Drive create failed: ${made.status}`);
    return (await made.json()).id;
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
    FOLDER, now,
    hasToken: () => Boolean(token),
    remember: () => Boolean(token = store.read()),
    forgetToken: () => { token = null; store.clear(); },
    askGoogle,
    findOrMakeFolder, createFile, fileAlive, readFile, writeFile,
    pickFolder, probePicker,
    loadProfile, savePlace, forgetPlace
  };
})();
