// ============================================================
// # 🔑 ☁️  GOOGLE PERMISSION, AND THE PERMIT OF THE HOUR
// # 🔤 JavaScript
// # 🎯 Nothing here draws anything. It holds the public Google values,
// #    links the account once through Google's window, and from then
// #    on gets its hour-long permits from our own server
// # 🔗 drive.file is the narrow permission: only what this site made, or
// #    what the user handed it through the Google window. The lasting
// #    key is NOT here and never will be — a page cannot keep a secret,
// #    so it lives on the server. What is kept here is one permit that
// #    dies within the hour, saved only to spare a call on every reload
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
  // # 🤝 ♻️  LINKING ONCE, THEN RENEWING FOR EVER
  // # 🔤 JavaScript
  // # 🎯 Two ways of getting a permit for Drive. The first opens
  // #    Google's window, and runs once in a person's life: what comes
  // #    back is handed to our own server, which trades it for a
  // #    lasting key and keeps it. The second asks that server for a
  // #    fresh permit, and opens nothing at all
  // # 🔗 This is why the permit can be renewed in silence now. The old
  // #    way asked Google straight from the page, and Google answers a
  // #    page only through a window; a browser that blocks Google's
  // #    cookies then turns every quiet ask into a visible one, and a
  // #    window that nobody clicked for is blocked. A server has no
  // #    such trouble: it holds a secret, so Google answers it plainly
  // ============================================================
  const SERVER = 'https://qpxltggjchspcmqwibqg.supabase.co/functions/v1/google-drive';

  const server = async (action, extra = {}) => {
    const { data } = await window.MyTermAuth.db.auth.getSession();
    const jwt = data.session?.access_token;
    if (!jwt) throw new Error('not signed in');

    const answer = await fetch(SERVER, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra })
    });
    const body = await answer.json().catch(() => ({}));
    if (!answer.ok) {
      throw Object.assign(new Error(body.error || 'HTTP ' + answer.status), {
        relink: body.relink === true,
        needConsent: body.needConsent === true
      });
    }
    return body;
  };

  const keepPermit = body => {
    token = body.access_token;
    store.save(token, body.expires_in);
    return token;
  };

  // The one window the user ever sees. It must be opened from a press
  // of theirs, or the browser blocks it — so it is only ever wired to
  // a button, never called from code that noticed something expired
  const askGoogle = () => new Promise((ok, fail) => {
    google.accounts.oauth2.initCodeClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      ux_mode: 'popup',
      callback: async answer => {
        if (answer.error || !answer.code) return fail(new Error(answer.error || 'no code'));
        // The server may answer with a permit and no lasting key, when
        // Google decided this person had already agreed once. That hour
        // still works, so it is not a failure; but it must not pass in
        // silence either, or the link looks whole and dies at the hour.
        // It is handed back for the screen to say out loud
        try { const body = await server('link', { code: answer.code }); keepPermit(body); ok(body); }
        catch (e) { fail(e); }
      },
      error_callback: e => fail(new Error(e?.type || 'google window failed'))
    }).requestCode();
  });

  // One renewal at a time: five Drive calls failing together must not
  // start five renewals. They all wait on the same one and share it
  let renewing = null;
  const renew = () => {
    if (!renewing) {
      renewing = server('token').then(body => { keepPermit(body); return true; }, () => false);
      renewing.then(() => { renewing = null; });
    }
    return renewing;
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
  // 401 means the permit ran out, and the only honest answer is to ask
  // the server for a new one and send the very same call again. Once,
  // not in a loop: if the server cannot renew now it will not in a second
  const drive = async (url, opts = {}) => {
    const first = await send(url, opts);
    if (first.status !== 401) return first;
    return (await renew()) ? send(url, opts) : first;
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

  // ============================================================
  // # 🔎 📁  WHAT IS ALREADY IN THERE
  // # 🔤 JavaScript
  // # 🎯 Looks inside one folder for a child with this name
  // # 🔗 An id written down is a GUESS about Drive and not a fact: the
  // #    user can trash it, and the page can lose it. Everything here
  // #    that makes a file should look for it first, or a lost id makes
  // #    a second file beside the first and the work in the first one
  // #    simply stops being seen — which is exactly what happened to the
  // #    source list, and the reader watched their books disappear
  // ============================================================
  const findChild = async (parentId, name, mimeType) => {
    const quoted = String(name).split("'").join("\\'");
    const bits = [`'${parentId}' in parents`, `name='${quoted}'`, 'trashed=false'];
    if (mimeType) bits.push(`mimeType='${mimeType}'`);
    const r = await drive(`${DRIVE}?q=${encodeURIComponent(bits.join(' and '))}&fields=files(id,name)`);
    if (!r.ok) return null;
    return (await r.json().catch(() => ({}))).files?.[0]?.id || null;
  };

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
  // # 📦 ⬆️  A WHOLE FILE, NOT A LINE OF JSON
  // # 🔤 JavaScript
  // # 🎯 Puts a book in the user's Drive and gets it back again
  // # 🔗 RESUMABLE, NOT MULTIPART, and that is the whole point of writing
  // #    it separately. Multipart sends the bytes inside the same request
  // #    as the name: the browser holds the entire file in memory to build
  // #    it, nothing can be reported while it goes, and a textbook that
  // #    fails at ninety percent starts again from nothing. Resumable
  // #    asks first and sends after, so the sending is a request of its
  // #    own — which is what lets a bar be drawn and a break be survived.
  // #
  // #    And the sending is done with XHR and not fetch, for one reason:
  // #    fetch cannot say how much of an upload has gone. On a forty
  // #    megabyte book over a slow line that is two minutes of a page
  // #    that looks frozen, and a reader who cannot tell a slow upload
  // #    from a dead one presses the button again
  // ============================================================
  async function uploadBlob(parentId, name, blob, onGoing) {
    const start = await drive(`${UPLOAD}?uploadType=resumable`,
      json('POST', { name, mimeType: blob.type || 'application/pdf', parents: [parentId] }));
    if (!start.ok) throw new Error(`Drive upload failed to start: ${start.status}`);

    const to = start.headers.get('Location');
    if (!to) throw new Error('Drive gave no place to send the file');

    return new Promise((done, fail) => {
      const call = new XMLHttpRequest();
      call.open('PUT', to, true);
      call.setRequestHeader('Content-Type', blob.type || 'application/pdf');
      call.upload.onprogress = e => {
        if (e.lengthComputable && onGoing) onGoing(e.loaded / e.total);
      };
      call.onload = () => {
        if (call.status < 200 || call.status > 299) return fail(new Error(`Drive upload failed: ${call.status}`));
        try { done(JSON.parse(call.responseText).id); }
        catch { fail(new Error('Drive gave back no id')); }
      };
      call.onerror = () => fail(new Error('The upload was cut off'));
      call.send(blob);
    });
  }

  // Given back as bytes and not as a link. A Drive link needs the file
  // shared with whoever opens it, and these files are the reader's own
  // and shared with nobody — so the page fetches them with the permit it
  // already holds, the same way it reads everything else
  const readBlob = async id => {
    const r = await drive(`${DRIVE}/${id}?alt=media`);
    return r.ok ? r.blob() : null;
  };

  const fileFacts = async id => {
    const r = await drive(`${DRIVE}/${id}?fields=id,name,size,trashed`);
    if (!r.ok) return null;
    const got = await r.json().catch(() => null);
    return got && got.trashed !== true ? got : null;
  };

  async function dropFile(id) {
    const r = await drive(`${DRIVE}/${id}`, json('PATCH', { trashed: true }));
    return r.ok;
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
  const now = () => new Date().toISOString();

  // Who is this? Read from the sign-in token already in this browser.
  // The other way, getUser(), is a journey to the service — measured at
  // 834ms on a good line — and when it does not arrive it hands back
  // "nobody" without a word of complaint. A phone in its first seconds
  // does exactly that, and then nobody can tell "not signed in" from
  // "the question never got there"
  const me = async () => (await db().auth.getSession()).data.session?.user ?? null;

  // Three answers, never two: here is your row · you have no row yet ·
  // I could not find out. The third must not be dressed as the second,
  // or a person who already chose a place is sent to choose it again
  const loadProfile = async () => {
    const user = await me();
    if (!user) throw new Error('not signed in');
    const { data, error } = await db().from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  };

  const savePlace = async (name, fileId) => {
    const user = await me();
    if (!user) throw new Error('not signed in');
    const { error } = await db().from('profiles')
      .upsert({ id: user.id, drive_folder_name: name, drive_file_id: fileId, updated_at: now() });
    if (error) throw new Error(error.message);
  };

  const forgetPlace = async () => {
    const user = await me();
    if (!user) throw new Error('not signed in');
    const { error } = await db().from('profiles')
      .update({ drive_folder_name: null, drive_file_id: null, updated_at: now() }).eq('id', user.id);
    if (error) throw new Error(error.message);
  };

  window.MyTermCloud = {
    FOLDER, FILE, now,
    hasToken: () => Boolean(token),
    remember: async () => Boolean(token = store.read()) || await renew(),
    forgetToken: () => { token = null; store.clear(); },
    askGoogle,
    unlink: () => server('unlink'),
    findOrMakeFolder, createJson, fileAlive, readFile, writeFile,
    uploadBlob, readBlob, fileFacts, dropFile,
    parentOf, makeFolder, findChild, rename,
    pickFolder, probePicker,
    loadProfile, savePlace, forgetPlace
  };
})();
