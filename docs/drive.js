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
// # 📣 💬  WHAT TO SAY WHEN GOOGLE IS BLOCKED
// # 🔤 JavaScript
// # 🎯 Two lines the panel shows after the Google file window fails, one
// #    for a trip that ended with nothing picked, one for a real error
// # 🔗 There is no way to know ahead of time whether a browser will block
// #    the Google frame. No browser tells a page that, on purpose. So the
// #    site never judges before the user tries. It lets them try, then
// #    says what happened. Checking the browser name was wrong: a name
// #    says which browser, not whether this visitor has blocking turned on
// ============================================================
const CANCEL_TEXT =
  'لم تختر مكانًا. وإن كانت نافذة قوقل طلبت منك تسجيل الدخول بدل عرض مجلّداتك، ' +
  'فمتصفّحك يحجب كوكيز قوقل — اسمح بها لهذا الموقع ثم أعد المحاولة، أو خزّنه في مجلد My Term.';

const BLOCKED_TEXT =
  'تعذّر فتح نافذة قوقل، والأرجح أن متصفّحك يحجب كوكيز قوقل. ' +
  'اسمح بها لهذا الموقع ثم حدّث الصفحة، أو خزّنه في مجلد My Term وانقله في درايفك بعدها كيف شئت.';

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

async function pickFolder() {
  await loadPicker();
  return new Promise(function (done) {
    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMimeTypes(FOLDER_TYPE);

    new google.picker.PickerBuilder()
      .setOAuthToken(googleToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setOrigin(window.location.protocol + '//' + window.location.host)
      .addView(view)
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
// #    login. A visitor who already has a file skips straight to the last
// #    step, because the place is remembered in the profiles table
// ============================================================
const steps = {
  link: document.getElementById('step-link'),
  place: document.getElementById('step-place'),
  done: document.getElementById('step-done')
};

const pickButton = document.getElementById('pick-place');
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

function showHint(text) {
  shieldHint.textContent = text;
  shieldHint.hidden = false;
}

function showFile(folderName, fileId) {
  driveWhere.textContent = 'ملفك في مجلد: ' + folderName;
  driveOpen.href = 'https://drive.google.com/file/d/' + fileId + '/view';
  showStep('done');
}

async function onSignedIn() {
  driveNote.textContent = '';
  shieldHint.hidden = true;
  profile = await loadProfile();
  if (profile && profile.drive_file_id) {
    showFile(profile.drive_folder_name || FOLDER_NAME, profile.drive_file_id);
  } else {
    showStep('link');
  }
}

async function linkGoogle() {
  try {
    driveNote.textContent = 'لحظة…';
    await askGoogle();
    driveNote.textContent = '';
    showStep('place');
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
    if (!folder) {
      driveNote.textContent = '';
      showHint(CANCEL_TEXT);
      return;
    }
    await finish(folder);
  } catch (e) {
    driveNote.textContent = '';
    pickButton.disabled = true;
    showHint(BLOCKED_TEXT);
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

document.getElementById('link-google').onclick = linkGoogle;
pickButton.onclick = pickPlace;
document.getElementById('auto-place').onclick = autoPlace;
document.getElementById('save-test').onclick = saveTest;

document.addEventListener('signed-in', onSignedIn);
document.addEventListener('signed-out', function () {
  googleToken = null;
  profile = null;
  driveNote.textContent = '';
  shieldHint.hidden = true;
  pickButton.disabled = false;
  showStep('link');
});
