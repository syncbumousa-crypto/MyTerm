// ============================================================
// # 🧩 🔀  PAGE PARTS AND PANEL SWITCHING
// # 🔤 JavaScript
// # 🎯 Everything the visitor sees about accounts: it picks up the three
// #    panels and the form parts, and switches which panel is on screen
// # 🔗 The names match the id values in index.html. One panel shows at a
// #    time, and the hidden rule in shell.css is what makes it disappear.
// #    All the names here sit inside one wrapper, so they stay private to
// #    this file and can never clash with a name in another file
// ============================================================
(() => {
  const auth = window.MyTermAuth;

  const panels = {
    choice: document.getElementById('choice'),
    form: document.getElementById('form'),
    session: document.getElementById('session')
  };

  const curtain = document.getElementById('boot');

  const formTitle = document.getElementById('form-title');
  const sendButton = document.getElementById('submit');
  const emailBox = document.getElementById('email');
  const passwordBox = document.getElementById('password');
  const note = document.getElementById('note');
  const who = document.getElementById('who');

  let mode = 'signup';

  // Showing any panel takes the curtain down with it: the curtain is
  // there only for the time when nothing is known yet
  const show = name => {
    window.MyTermCurtain.down();
    Object.keys(panels).forEach(key => (panels[key].hidden = key !== name));
  };

  // Two names, two jobs. The curtain comes down for whatever screen
  // turns out to be the right one — a panel here, the board, or the one
  // course a tab was opened on — so it is not the panels' to keep.
  // And the account panel is opened from two places that are not here:
  // the face in the corner, and a storage step the visitor must act on
  window.MyTermCurtain = { down: () => { curtain.hidden = true; } };
  window.MyTermAccount = { show: () => show('session') };

  function openForm(which) {
    mode = which;
    const label = which === 'signup' ? 'Create account' : 'Log in';
    formTitle.textContent = label;
    sendButton.textContent = label;
    note.textContent = '';
    emailBox.value = '';
    passwordBox.value = '';
    show('form');
    emailBox.focus();
  }

  document.getElementById('go-signup').onclick = () => openForm('signup');
  document.getElementById('go-login').onclick = () => openForm('login');
  document.getElementById('back').onclick = () => show('choice');

  // ============================================================
  // # 📤 💬  SEND THE FORM AND SHOW THE ANSWER
  // # 🔤 JavaScript
  // # 🎯 Takes what was typed, asks the service, and writes back what
  // #    came: the next panel, or the reason it was refused
  // # 🔗 The same form does both jobs, so it reads the mode set above.
  // #    The asking itself is in the other file. This one only reads the
  // #    boxes, greys the button while waiting, and draws the answer
  // ============================================================
  panels.form.onsubmit = async event => {
    event.preventDefault();

    const email = emailBox.value.trim();
    const password = passwordBox.value;

    sendButton.disabled = true;
    note.textContent = 'One moment…';

    const answer = mode === 'signup'
      ? await auth.signUp(email, password)
      : await auth.signIn(email, password);

    sendButton.disabled = false;

    if (answer.error) {
      note.textContent = answer.error.message;
      return;
    }

    if (answer.data.session) {
      openSession(answer.data.session.user.email);
    } else {
      note.textContent = 'Account created. Open your email to confirm it, then log in.';
    }
  };

  // ============================================================
  // # 🚪 👤  THE LOGGED IN PANEL, LEAVING, AND THE FIRST LOOK
  // # 🔤 JavaScript
  // # 🎯 Writes who is logged in, lets them leave, and on page load picks
  // #    which panel the visitor opens with
  // # 🔗 The service keeps the login token in the browser, so the visitor
  // #    stays logged in after a refresh. It both sets a flag and sends a
  // #    message, because the storage screen file loads after this one: a
  // #    message sent too early is heard by nobody and is gone, while a
  // #    flag can still be read by that file a moment later
  // ============================================================
  // Being signed in does NOT mean the account panel is the right screen.
  // Nine times in ten the Drive place is already set and the board — or
  // the one course a tab was opened on — is where this visitor is going;
  // the panel was being shown for the eight tenths of a second it takes
  // to ask where their file is kept, and it reads as being asked to sign
  // in again. So the curtain stays, and whoever finds out what is needed
  // opens the panel: the storage screen when there is a step to take,
  // the board screen by taking the screen for itself
  function openSession(email) {
    who.textContent = 'Hello, ' + email;
    window.MyTermHud?.face(email);
    window.myTermSignedIn = true;
    document.dispatchEvent(new CustomEvent('signed-in'));
  }

  document.getElementById('logout').onclick = async () => {
    await auth.signOut();
    window.myTermSignedIn = false;
    window.MyTermHud?.hide();
    document.dispatchEvent(new CustomEvent('signed-out'));
    show('choice');
  };

  (async () => {
    const answer = await auth.session();
    if (answer.data.session) {
      openSession(answer.data.session.user.email);
    } else {
      show('choice');
    }
  })();
})();
