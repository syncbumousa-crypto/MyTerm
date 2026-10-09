// ============================================================
// # 🔑 ☁️  GOOGLE KEYS AND SETTINGS
// # 🔤 JavaScript
// # 🎯 Holds the two public Google values and the one permission this
// #    site asks for, plus the name of the file it keeps in Drive
// # 🔗 Both values are public by design. The drive.file permission is the
// #    narrow one: this site can only touch files it made itself, or files
// #    the user hands it through the picker. It never sees the rest of Drive
// ============================================================
const GOOGLE_CLIENT_ID = '730425860367-ptdsv9f8u1vf9vvap7r8hpivd4v4be9n.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyCQzcpzKR842f2CE9yoPQqKTQWWN4Ny3sg';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DATA_FILE_NAME = 'myterm.json';

let googleToken = null;
let pickerReady = false;

// ============================================================
// # 🙋 ✅  ASK GOOGLE FOR PERMISSION
// # 🔤 JavaScript
// # 🎯 Opens the Google window that asks the user to allow this site,
// #    and keeps the token it hands back
// # 🔗 The token lasts about an hour and lives only in this page, never
// #    on a server and never in the database. Every Drive call below
// #    sends it. When it runs out, the user is asked again
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

// ============================================================
// # 📂 👆  LET THE USER PICK A FOLDER
// # 🔤 JavaScript
// # 🎯 Opens Google's own folder window so the user chooses where their
// #    file will live, and gives back the id of what they picked
// # 🔗 This is how the narrow permission works: the site does not browse
// #    Drive. The user points at one folder, and only that folder opens up
// ============================================================
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
      .setMimeTypes('application/vnd.google-apps.folder');

    const picker = new google.picker.PickerBuilder()
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
      .build();

    picker.setVisible(true);
  });
}

// ============================================================
// # 💾 📄  MAKE, READ AND SAVE THE DATA FILE
// # 🔤 JavaScript
// # 🎯 Creates one json file inside the chosen folder, reads it back,
// #    and writes new content over it
// # 🔗 The file belongs to the user, not to this site. They can open it,
// #    edit it, or delete it from Drive at any time, so the reader below
// #    must cope with a file that is missing or broken
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
    headers: {
      Authorization: 'Bearer ' + googleToken,
      'Content-Type': 'multipart/related; boundary=' + edge
    },
    body: body
  });
  if (!answer.ok) throw new Error('Drive create failed: ' + answer.status);
  return (await answer.json()).id;
}

async function driveReadFile(fileId) {
  const answer = await fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media', {
    headers: { Authorization: 'Bearer ' + googleToken }
  });
  if (!answer.ok) return null;
  try { return await answer.json(); } catch (e) { return null; }
}

async function driveWriteFile(fileId, content) {
  const answer = await fetch('https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=media', {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + googleToken,
      'Content-Type': 'application/json'
    },
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
// # 🎯 Shows either the link button or the chosen place, runs the whole
// #    linking trip, and saves a test line into the file
// # 🔗 Waits for the signed-in message that script.js sends after a good
// #    login, and clears itself on the signed-out message
// ============================================================
const driveNone = document.getElementById('drive-none');
const driveLinked = document.getElementById('drive-linked');
const driveWhere = document.getElementById('drive-where');
const driveNote = document.getElementById('drive-note');

let profile = null;

function showDrive(linked) {
  driveNone.hidden = linked;
  driveLinked.hidden = !linked;
}

async function onSignedIn() {
  driveNote.textContent = '';
  profile = await loadProfile();
  if (profile && profile.drive_file_id) {
    driveWhere.textContent = 'ملفك في: ' + (profile.drive_folder_name || 'مجلد مختار');
    showDrive(true);
  } else {
    showDrive(false);
  }
}

async function linkDrive() {
  try {
    driveNote.textContent = 'لحظة…';
    await askGoogle();
    const folder = await pickFolder();
    if (!folder) { driveNote.textContent = 'لم تختر مكانًا.'; return; }

    driveNote.textContent = 'ننشئ الملف…';
    const fileId = await driveCreateFile(folder.id, {
      app: 'MyTerm',
      linked_at: new Date().toISOString(),
      notes: []
    });

    await saveProfile(folder.name, fileId);
    profile = { drive_folder_name: folder.name, drive_file_id: fileId };
    driveWhere.textContent = 'ملفك في: ' + folder.name;
    showDrive(true);
    driveNote.textContent = 'تم الربط. الملف باسم ' + DATA_FILE_NAME;
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
document.getElementById('relink').onclick = linkDrive;
document.getElementById('save-test').onclick = saveTest;

document.addEventListener('signed-in', onSignedIn);
document.addEventListener('signed-out', function () {
  googleToken = null;
  profile = null;
  driveNote.textContent = '';
  showDrive(false);
});
