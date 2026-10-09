// ============================================================
// # 🪜 🖥️  THE THREE STEPS IN THE PANEL
// # 🔤 JavaScript
// # 🎯 Everything the visitor sees about storage: one step at a time, and
// #    the words under it. Link the account, pick the place, then the
// #    finished file
// # 🔗 Waits for the signed-in message the accounts screen sends, and
// #    also reads the flag it sets, because that message can go out
// #    before this file is here to hear it. All steps start hidden behind
// #    a turning circle, since picking the right one needs answers from
// #    two services. All the asking lives in the other file
// ============================================================
(() => {
  const cloud = window.MyTermCloud;

  const BLOCKED_TEXT = 'لا يمكنك اختيار المكان بنفسك، متصفّحك يحجب كوكيز قوقل. ' +
    'اسمح بها لهذا الموقع ثم حدّث الصفحة، أو خزّنه في مجلد My Term وانقله في درايفك بعدها كيف شئت.';

  const $ = id => document.getElementById(id);
  const steps = { link: $('step-link'), place: $('step-place'), done: $('step-done') };
  const spin = $('session-spin'), probeSpin = $('probe-spin'), placeBtns = $('place-buttons');
  const pickBtn = $('pick-place'), note = $('drive-note'), hint = $('shield-hint');

  let place = null, busy = false;

  const show = name => {
    Object.entries(steps).forEach(([key, box]) => (box.hidden = key !== name));
    spin.hidden = Boolean(name);
  };

  const allowPick = ok => {
    pickBtn.disabled = !ok;
    hint.textContent = ok ? '' : BLOCKED_TEXT;
    hint.hidden = ok;
  };

  // Tells the board file one of two things: the saving place is ready,
  // or it still needs setting up. The board listens and steps aside
  const tell = name => document.dispatchEvent(new CustomEvent(name));

  const showFile = (name, id) => {
    $('drive-where').textContent = `ملفك في مجلد: ${name}`;
    $('drive-open').href = `https://drive.google.com/file/d/${id}/view`;
    show('done');
    tell('place-ready');
  };

  // ============================================================
  // # 🎛️ 👆  WHAT EACH BUTTON DOES
  // # 🔤 JavaScript
  // # 🎯 Runs the four buttons, and picks which step to show when the
  // #    visitor logs in or out
  // # 🔗 Every line that reaches Google or the database calls the other
  // #    file by name. What stays here is the waiting circle, the words
  // #    on screen, and the greyed button when the browser blocks the
  // #    Google window
  // ============================================================
  async function runProbe() {
    placeBtns.hidden = true;
    probeSpin.hidden = false;
    note.textContent = 'نفحص إمكانيات متصفّحك…';
    const works = await cloud.probePicker();
    probeSpin.hidden = true;
    placeBtns.hidden = false;
    note.textContent = '';
    allowPick(works);
  }

  async function toPlace() {
    tell('place-needed');
    if (!cloud.hasToken()) { note.textContent = 'لحظة…'; await cloud.askGoogle(); }
    show('place');
    await runProbe();
  }

  async function finish(folder) {
    note.textContent = 'ننشئ الملف…';
    const id = await cloud.createFile(folder.id, { app: 'MyTerm', linked_at: cloud.now(), notes: [] });
    await cloud.savePlace(folder.name, id);
    place = { drive_folder_name: folder.name, drive_file_id: id };
    showFile(folder.name, id);
    note.textContent = 'تم. انقل المجلد في درايفك حيث شئت، والرابط يبقى.';
  }

  async function fileIsGone() {
    place = null;
    await cloud.forgetPlace();
    await toPlace();
    note.textContent = 'لم نجد ملفك في درايف. اختر مكانًا جديدًا.';
  }

  async function onSignedIn() {
    if (busy) return;
    busy = true;
    try {
      note.textContent = '';
      hint.hidden = true;
      show(null);
      const linked = cloud.remember();
      place = await cloud.loadProfile().catch(() => null);

      const id = place?.drive_file_id;
      if (id) {
        if (!linked || await cloud.fileAlive(id).catch(() => true)) return showFile(place.drive_folder_name || cloud.FOLDER, id);
        return fileIsGone();
      }
      if (linked) return await toPlace();
      tell('place-needed');
      show('link');
    } finally {
      busy = false;
    }
  }

  const act = fn => async () => {
    try { await fn(); } catch (e) { note.textContent = 'تعذّر: ' + e.message; }
  };

  $('link-google').onclick = act(toPlace);
  $('change-place').onclick = act(toPlace);
  $('auto-place').onclick = act(async () => {
    note.textContent = 'نجهّز المجلد…';
    await finish(await cloud.findOrMakeFolder());
  });

  pickBtn.onclick = async () => {
    try {
      note.textContent = 'تُفتح نافذة قوقل…';
      const folder = await cloud.pickFolder();
      note.textContent = '';
      if (folder) await finish(folder);
    } catch {
      note.textContent = '';
      allowPick(false);
    }
  };

  $('save-test').onclick = act(async () => {
    note.textContent = 'لحظة…';
    if (!cloud.hasToken()) await cloud.askGoogle();
    const id = place.drive_file_id;
    if (!(await cloud.fileAlive(id))) return fileIsGone();
    const data = (await cloud.readFile(id)) || { app: 'MyTerm', notes: [] };
    if (!Array.isArray(data.notes)) data.notes = [];
    data.notes.push({ at: cloud.now(), text: 'تجربة حفظ' });
    await cloud.writeFile(id, data);
    note.textContent = `حُفظ. عدد السطور في ملفك: ${data.notes.length}`;
  });

  document.addEventListener('signed-in', onSignedIn);
  if (window.myTermSignedIn) onSignedIn();

  document.addEventListener('signed-out', () => {
    cloud.forgetToken();
    place = null;
    note.textContent = '';
    hint.hidden = true;
    probeSpin.hidden = true;
    placeBtns.hidden = false;
    pickBtn.disabled = false;
    show(null);
  });
})();
