// ============================================================
// # 🔑 ☁️  GOOGLE SETTINGS
// # 🔤 JavaScript
// # 🎯 Holds the two public Google values, the one permission this site
// #    asks for, and the names it gives the folder and the file
// # 🔗 The drive.file permission is the narrow one: this site only touches
// #    what it made itself, or what the user hands it through the Google
// #    window. It never sees the rest of the user's Drive
// ============================================================
const GOOGLE_CLIENT_ID = '730425860367-ptdsv9f8u1vf9vvap7r8hpivd4v4be9n.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyCQzcpzKR842f2CE9yoPQqKTQWWN4Ny3sg';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'MyTerm';
const DATA_FILE_NAME = 'myterm.json';
const FOLDER_TYPE = 'application/vnd.google-apps.folder';

let googleToken = null;
let pickerReady = false;

// ============================================================
// # 📣 🎟️  THE MESSAGE, AND KEEPING THE GOOGLE TOKEN
// # 🔤 JavaScript
// # 🎯 Keeps the line shown when Google is blocked, and keeps the Google
// #    token so a page reload does not send the user back to the start
// # 🔗 The token is kept with the hour that Google gave it, and is dropped
// #    when it runs out or when the user logs out. It is kept in the
// #    lasting store, not the session one, because changing a browser
// #    shield reloads the page and can wipe the session store with it.
// #    The test result is never kept: the whole point of that reload is
// #    that the browser just changed, so the test runs again every time
// ============================================================
const BLOCKED_TEXT =
  'لا يمكنك اختيار المكان بنفسك، متصفّحك يحجب كوكيز قوقل. ' +
  'اسمح بها لهذا الموقع ثم حدّث الصفحة، أو خزّنه في مجلد My Term وانقله في درايفك بعدها كيف شئت.';

const TOKEN_MEMO = 'myterm.googleToken';

function keepToken(token, seconds) {
  try {
    localStorage.setItem(TOKEN_MEMO, JSON.stringify({
      token: token,
      until: Date.now() + ((seconds || 3600) - 60) * 1000
    }));
  } catch (e) {
    // no storage means the user links again after a reload, nothing breaks
  }
}

function takeToken() {
  try {
    const saved = JSON.parse(localStorage.getItem(TOKEN_MEMO) || 'null');
    if (saved && saved.until > Date.now()) return saved.token;
  } catch (e) {
    return null;
  }
  return null;
}

function dropToken() {
  try { localStorage.removeItem(TOKEN_MEMO); } catch (e) { /* nothing to drop */ }
}

// ============================================================
// # 🙋 ✅  ASK GOOGLE FOR PERMISSION
// # 🔤 JavaScript
// # 🎯 Opens the Google window that asks the user to allow this site,
// #    and keeps the token it hands back
// # 🔗 The token lasts about an hour and lives only in this page, never on
// #    a server and never in the database. Every Drive call below sends it.
// #    This is a real window, not a frame, so it works in every browser
// ============================================================
function askGoogle() {
  return new Promise(function (done, fail) {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: function (answer) {
        if (answer.error) { fail(new Error(answer.error)); return; }
        googleToken = answer.access_token;
        keepToken(googleToken, answer.expires_in);
        done(googleToken);
      }
    });
    client.requestAccessToken();
  });
}

function driveHeaders(extra) {
  const head = { Authorization: 'Bearer ' + googleToken };
  if (extra) Object.keys(extra).forEach(function (k) { head[k] = extra[k]; });
  return head;
}

// ============================================================
// # 📁 📂  TWO WAYS TO GET A FOLDER
// # 🔤 JavaScript
// # 🎯 Either the site makes its own folder, or the user points at one
// #    through Google's own window
// # 🔗 The first way works in every browser because it is a plain network
// #    call. The second opens a frame from google.com, which a strict
// #    browser may block, and that is what the warning above is for
// ============================================================
async function findOrMakeFolder() {
  const ask = "mimeType='" + FOLDER_TYPE + "' and name='" + FOLDER_NAME + "' and trashed=false";
  const look = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(ask) + '&fields=files(id,name)',
    { headers: driveHeaders() }
  );
  if (!look.ok) throw new Error('Drive search failed: ' + look.status);
  const found = (await look.json()).files;
  if (found.length) return { id: found[0].id, name: found[0].name };

  const made = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: driveHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_TYPE })
  });
  if (!made.ok) throw new Error('Drive folder failed: ' + made.status);
  return { id: (await made.json()).id, name: FOLDER_NAME };
}

function loadPicker() {
  return new Promise(function (done) {
    if (pickerReady) { done(); return; }
    gapi.load('picker', function () { pickerReady = true; done(); });
  });
}

function folderView() {
  return new google.picker.DocsView(google.picker.ViewId.FOLDERS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true)
    .setMimeTypes(FOLDER_TYPE);
}

async function pickFolder() {
  await loadPicker();
  return new Promise(function (done) {
    new google.picker.PickerBuilder()
      .setOAuthToken(googleToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setOrigin(window.location.protocol + '//' + window.location.host)
      .addView(folderView())
      .setCallback(function (result) {
        if (result.action === google.picker.Action.PICKED) {
          done({ id: result.docs[0].id, name: result.docs[0].name });
        } else if (result.action === google.picker.Action.CANCEL) {
          done(null);
        }
      })
      .build()
      .setVisible(true);
  });
}

// ============================================================
// # 🧪 🫥  TRY THE GOOGLE WINDOW WITHOUT SHOWING IT
// # 🔤 JavaScript
// # 🎯 Opens the Google file window hidden, waits a few seconds for it to
// #    report that it drew itself, then closes it and says yes or no
// # 🔗 This is the one honest test. The window only reports loaded after it
// #    builds its own screen. When a browser blocks Google cookies it goes
// #    to a sign in page instead and never reports anything, so silence is
// #    the answer. The style file hides it while the body carries probing
// ============================================================
const PROBE_WAIT = 6000;

async function probePicker() {
  await loadPicker();
  return new Promise(function (done) {
    let picker = null;
    let settled = false;

    function stop(works) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { if (picker) picker.setVisible(false); } catch (e) { /* already gone */ }
      document.body.classList.remove('probing');
      done(works);
    }

    const timer = setTimeout(function () { stop(false); }, PROBE_WAIT);

    document.body.classList.add('probing');
    picker = new google.picker.PickerBuilder()
      .setOAuthToken(googleToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setOrigin(window.location.protocol + '//' + window.location.host)
      .addView(folderView())
      .setCallback(function (result) {
        const loaded = (google.picker.Action && google.picker.Action.LOADED) || 'loaded';
        if (result.action === loaded) stop(true);
        else if (result.action === google.picker.Action.CANCEL) stop(false);
      })
      .build();

    try {
      picker.setVisible(true);
    } catch (e) {
      stop(false);
    }
  });
}

// ============================================================
// # 💾 📄  MAKE, READ AND SAVE THE DATA FILE
// # 🔤 JavaScript
// # 🎯 Creates one json file inside the chosen folder, reads it back, and
// #    writes new content over it
// # 🔗 The file belongs to the user, not to this site. They can open it,
// #    edit it or delete it from Drive at any time, so the reader gives
// #    back nothing instead of breaking when the file is gone or spoiled
// ============================================================
async function driveCreateFile(folderId, content) {
  const info = { name: DATA_FILE_NAME, mimeType: 'application/json', parents: [folderId] };
  const edge = 'myterm' + Date.now();
  const body =
    '--' + edge + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(info) + '\r\n' +
    '--' + edge + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(content, null, 2) + '\r\n' +
    '--' + edge + '--';

  const answer = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: driveHeaders({ 'Content-Type': 'multipart/related; boundary=' + edge }),
    body: body
  });
  if (!answer.ok) throw new Error('Drive create failed: ' + answer.status);
  return (await answer.json()).id;
}

async function driveReadFile(fileId) {
  const answer = await fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media', {
    headers: driveHeaders()
  });
  if (!answer.ok) return null;
  try { return await answer.json(); } catch (e) { return null; }
}

async function driveWriteFile(fileId, content) {
  const answer = await fetch('https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=media', {
    method: 'PATCH',
    headers: driveHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(content, null, 2)
  });
  if (!answer.ok) throw new Error('Drive save failed: ' + answer.status);
}

// ============================================================
// # 🗄️ 🔖  REMEMBER THE PLACE, NOT THE DATA
// # 🔤 JavaScript
// # 🎯 Keeps the folder name and the file id in the profiles table, and
// #    reads them back on the next visit
// # 🔗 This is the whole link between the two services: the database holds
// #    a pointer, and the data itself stays in the user's own Drive.
// #    The table rules let each user touch their own row only
// ============================================================
async function loadProfile() {
  const me = (await db.auth.getUser()).data.user;
  if (!me) return null;
  const answer = await db.from('profiles').select('*').eq('id', me.id).maybeSingle();
  return answer.data;
}

async function saveProfile(folderName, fileId) {
  const me = (await db.auth.getUser()).data.user;
  if (!me) return;
  await db.from('profiles').upsert({
    id: me.id,
    drive_folder_name: folderName,
    drive_file_id: fileId,
    updated_at: new Date().toISOString()
  });
}

// ============================================================
// # 🪜 🖥️  THE THREE STEPS IN THE PANEL
// # 🔤 JavaScript
// # 🎯 Walks the user through three steps and shows only one at a time:
// #    link the Google account, pick where the file lives, then the file
// # 🔗 Waits for the signed-in message that script.js sends after a good
// #    login. A visitor who already has a file opens on the last step,
// #    because the place is kept in the profiles table, and the change
// #    place button is the way back to the second step. Without it the
// #    second step would be reachable only once, ever
// ============================================================
const steps = {
  link: document.getElementById('step-link'),
  place: document.getElementById('step-place'),
  done: document.getElementById('step-done')
};

const pickButton = document.getElementById('pick-place');
const placeButtons = document.getElementById('place-buttons');
const probeSpin = document.getElementById('probe-spin');
const driveWhere = document.getElementById('drive-where');
const driveOpen = document.getElementById('drive-open');
const driveNote = document.getElementById('drive-note');
const shieldHint = document.getElementById('shield-hint');

let profile = null;

function showStep(name) {
  Object.keys(steps).forEach(function (key) {
    steps[key].hidden = key !== name;
  });
}

function markBlocked() {
  pickButton.disabled = true;
  shieldHint.textContent = BLOCKED_TEXT;
  shieldHint.hidden = false;
}

function markOpen() {
  pickButton.disabled = false;
  shieldHint.hidden = true;
}

async function runProbe() {
  placeButtons.hidden = true;
  probeSpin.hidden = false;
  driveNote.textContent = 'نفحص إمكانيات متصفّحك…';

  const works = await probePicker();

  probeSpin.hidden = true;
  placeButtons.hidden = false;
  driveNote.textContent = '';
  if (works) markOpen(); else markBlocked();
}

function showFile(folderName, fileId) {
  driveWhere.textContent = 'ملفك في مجلد: ' + folderName;
  driveOpen.href = 'https://drive.google.com/file/d/' + fileId + '/view';
  showStep('done');
}

let signingIn = false;

async function onSignedIn() {
  if (signingIn) return;
  signingIn = true;
  try {
    driveNote.textContent = '';
    shieldHint.hidden = true;

    googleToken = takeToken();

    try {
      profile = await loadProfile();
    } catch (e) {
      profile = null;
    }

    if (profile && profile.drive_file_id) {
      showFile(profile.drive_folder_name || FOLDER_NAME, profile.drive_file_id);
      return;
    }

    if (!googleToken) {
      showStep('link');
      return;
    }

    showStep('place');
    await runProbe();
  } finally {
    signingIn = false;
  }
}

async function linkGoogle() {
  try {
    driveNote.textContent = 'لحظة…';
    await askGoogle();
    showStep('place');
    await runProbe();
  } catch (e) {
    driveNote.textContent = 'تعذّر الربط: ' + e.message;
  }
}

async function finish(folder) {
  driveNote.textContent = 'ننشئ الملف…';
  const fileId = await driveCreateFile(folder.id, {
    app: 'MyTerm',
    linked_at: new Date().toISOString(),
    notes: []
  });
  await saveProfile(folder.name, fileId);
  profile = { drive_folder_name: folder.name, drive_file_id: fileId };
  showFile(folder.name, fileId);
  driveNote.textContent = 'تم. انقل المجلد في درايفك حيث شئت، والرابط يبقى.';
}

async function autoPlace() {
  try {
    driveNote.textContent = 'نجهّز المجلد…';
    await finish(await findOrMakeFolder());
  } catch (e) {
    driveNote.textContent = 'تعذّر الحفظ: ' + e.message;
  }
}

async function pickPlace() {
  try {
    driveNote.textContent = 'تُفتح نافذة قوقل…';
    const folder = await pickFolder();
    driveNote.textContent = '';
    if (folder) await finish(folder);
  } catch (e) {
    driveNote.textContent = '';
    markBlocked();
  }
}

async function saveTest() {
  try {
    driveNote.textContent = 'لحظة…';
    if (!googleToken) await askGoogle();

    const current = (await driveReadFile(profile.drive_file_id)) || { app: 'MyTerm', notes: [] };
    if (!Array.isArray(current.notes)) current.notes = [];
    current.notes.push({ at: new Date().toISOString(), text: 'تجربة حفظ' });

    await driveWriteFile(profile.drive_file_id, current);
    driveNote.textContent = 'حُفظ. عدد السطور في ملفك: ' + current.notes.length;
  } catch (e) {
    driveNote.textContent = 'تعذّر الحفظ: ' + e.message;
  }
}

async function changePlace() {
  try {
    if (!googleToken) {
      driveNote.textContent = 'لحظة…';
      await askGoogle();
    }
    showStep('place');
    await runProbe();
  } catch (e) {
    driveNote.textContent = 'تعذّر الربط: ' + e.message;
  }
}

document.getElementById('link-google').onclick = linkGoogle;
document.getElementById('change-place').onclick = changePlace;
pickButton.onclick = pickPlace;
document.getElementById('auto-place').onclick = autoPlace;
document.getElementById('save-test').onclick = saveTest;

document.addEventListener('signed-in', onSignedIn);

// script.js runs before this file, so its signed-in message can go out
// before the line above is here to hear it. The flag it also sets is still
// readable now, and catching up on it is what makes a reload land on the
// right step instead of back at the first one
if (window.myTermSignedIn) onSignedIn();

document.addEventListener('signed-out', function () {
  googleToken = null;
  dropToken();
  profile = null;
  driveNote.textContent = '';
  shieldHint.hidden = true;
  probeSpin.hidden = true;
  placeButtons.hidden = false;
  pickButton.disabled = false;
  showStep('link');
});
