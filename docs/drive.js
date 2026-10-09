// ============================================================
// # 🔑 ☁️  GOOGLE SETTINGS
// # 🔤 JavaScript
// # 🎯 Holds the public Google id, the one permission this site asks for,
// #    and the names it gives the folder and the file it makes
// # 🔗 The drive.file permission is the narrow one: this site can only
// #    touch what it made itself. It never sees the rest of the user's Drive,
// #    which is also why it has to make its own folder
// ============================================================
const GOOGLE_CLIENT_ID = '730425860367-ptdsv9f8u1vf9vvap7r8hpivd4v4be9n.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'MyTerm';
const DATA_FILE_NAME = 'myterm.json';
const FOLDER_TYPE = 'application/vnd.google-apps.folder';

let googleToken = null;

// ============================================================
// # 🙋 ✅  ASK GOOGLE FOR PERMISSION
// # 🔤 JavaScript
// # 🎯 Opens the Google window that asks the user to allow this site,
// #    and keeps the token it hands back
// # 🔗 The token lasts about an hour and lives only in this page, never on
// #    a server and never in the database. Every Drive call below sends it.
// #    This is a real window, not a hidden frame, so strict browsers that
// #    block third party cookies do not get in the way
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
// # 📁 🆕  FIND OR MAKE THE FOLDER
// # 🔤 JavaScript
// # 🎯 Looks for a folder this site made before, and makes one if there
// #    is none, so the user never has to pick a place by hand
// # 🔗 The search only ever sees folders this site made, because of the
// #    narrow permission. The user may move or rename the folder in Drive
// #    later and nothing breaks, since the saved id never changes
// ============================================================
async function findFolder() {
  const ask = "mimeType='" + FOLDER_TYPE + "' and name='" + FOLDER_NAME + "' and trashed=false";
  const answer = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(ask) + '&fields=files(id,name)',
    { headers: driveHeaders() }
  );
  if (!answer.ok) throw new Error('Drive search failed: ' + answer.status);
  const found = (await answer.json()).files;
  return found.length ? found[0].id : null;
}

async function makeFolder() {
  const answer = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: driveHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_TYPE })
  });
  if (!answer.ok) throw new Error('Drive folder failed: ' + answer.status);
  return (await answer.json()).id;
}

// ============================================================
// # 💾 📄  MAKE, READ AND SAVE THE DATA FILE
// # 🔤 JavaScript
// # 🎯 Creates one json file inside the folder, reads it back, and writes
// #    new content over it
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
// # 🎯 Keeps the folder name and the file id in the profiles table,
// #    and reads them back on the next visit
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
// # 🖥️ 🔄  THE DRIVE PART OF THE LOGGED IN PANEL
// # 🔤 JavaScript
// # 🎯 Shows either the link button or the file the user already has,
// #    runs the whole linking trip, and saves a test line into the file
// # 🔗 Waits for the signed-in message that script.js sends after a good
// #    login, and clears itself on the signed-out message
// ============================================================
const driveNone = document.getElementById('drive-none');
const driveLinked = document.getElementById('drive-linked');
const driveWhere = document.getElementById('drive-where');
const driveOpen = document.getElementById('drive-open');
const driveNote = document.getElementById('drive-note');

let profile = null;

function showDrive(linked) {
  driveNone.hidden = linked;
  driveLinked.hidden = !linked;
}

function showPlace(folderName, fileId) {
  driveWhere.textContent = 'ملفك في مجلد: ' + folderName;
  driveOpen.href = 'https://drive.google.com/file/d/' + fileId + '/view';
  showDrive(true);
}

async function onSignedIn() {
  driveNote.textContent = '';
  profile = await loadProfile();
  if (profile && profile.drive_file_id) {
    showPlace(profile.drive_folder_name || FOLDER_NAME, profile.drive_file_id);
  } else {
    showDrive(false);
  }
}

async function linkDrive() {
  try {
    driveNote.textContent = 'لحظة…';
    await askGoogle();

    driveNote.textContent = 'نجهّز المجلد…';
    const folderId = (await findFolder()) || (await makeFolder());

    driveNote.textContent = 'ننشئ الملف…';
    const fileId = await driveCreateFile(folderId, {
      app: 'MyTerm',
      linked_at: new Date().toISOString(),
      notes: []
    });

    await saveProfile(FOLDER_NAME, fileId);
    profile = { drive_folder_name: FOLDER_NAME, drive_file_id: fileId };
    showPlace(FOLDER_NAME, fileId);
    driveNote.textContent = 'تم الربط. انقل المجلد في درايفك حيث شئت، والرابط يبقى.';
  } catch (e) {
    driveNote.textContent = 'تعذّر الربط: ' + e.message;
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

document.getElementById('link-drive').onclick = linkDrive;
document.getElementById('save-test').onclick = saveTest;

document.addEventListener('signed-in', onSignedIn);
document.addEventListener('signed-out', function () {
  googleToken = null;
  profile = null;
  driveNote.textContent = '';
  showDrive(false);
});
