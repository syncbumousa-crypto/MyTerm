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

  const BLOCKED_TEXT = 'You cannot pick the place yourself: your browser blocks Google cookies. ' +
    'Allow them for this site and reload, or keep it in a MyTerm folder and move it in your Drive afterwards however you like.';

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
  // or it still needs setting up. The board listens and steps aside.
  // When ready it is handed the file to work in, because the board is
  // the one that writes the term paper from now on
  const tell = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

  const showFile = (name, id) => {
    $('drive-where').textContent = `Your file is in: ${name}`;
    $('drive-open').href = `https://drive.google.com/file/d/${id}/view`;
    show('done');
    tell('place-ready', { fileId: id, folderName: name });
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
    note.textContent = 'Checking what your browser allows…';
    const works = await cloud.probePicker();
    probeSpin.hidden = true;
    placeBtns.hidden = false;
    note.textContent = '';
    allowPick(works);
  }

  async function toPlace() {
    tell('place-needed');
    if (!cloud.hasToken()) { note.textContent = 'One moment…'; await cloud.askGoogle(); }
    show('place');
    await runProbe();
  }

  async function finish(folder) {
    note.textContent = 'Creating the file…';
    const id = await cloud.createJson(folder.id, cloud.FILE, { app: 'MyTerm', linked_at: cloud.now(), term: { name: '', updatedAt: null }, courses: [] });
    await cloud.savePlace(folder.name, id);
    place = { drive_folder_name: folder.name, drive_file_id: id };
    showFile(folder.name, id);
    note.textContent = 'Done. Move the folder anywhere in your Drive; the link holds.';
  }

  async function fileIsGone() {
    place = null;
    await cloud.forgetPlace();
    await toPlace();
    note.textContent = 'Your file was not found in Drive. Pick a new place.';
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
    try { await fn(); } catch (e) { note.textContent = 'Could not: ' + e.message; }
  };

  $('link-google').onclick = act(toPlace);
  $('change-place').onclick = act(toPlace);
  $('auto-place').onclick = act(async () => {
    note.textContent = 'Preparing the folder…';
    await finish(await cloud.findOrMakeFolder());
  });

  pickBtn.onclick = async () => {
    try {
      note.textContent = 'Opening the Google window…';
      const folder = await cloud.pickFolder();
      note.textContent = '';
      if (folder) await finish(folder);
    } catch {
      note.textContent = '';
      allowPick(false);
    }
  };

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
