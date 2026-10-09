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

  const formTitle = document.getElementById('form-title');
  const sendButton = document.getElementById('submit');
  const emailBox = document.getElementById('email');
  const passwordBox = document.getElementById('password');
  const note = document.getElementById('note');
  const who = document.getElementById('who');

  let mode = 'signup';

  const show = name => Object.keys(panels).forEach(key => (panels[key].hidden = key !== name));

  function openForm(which) {
    mode = which;
    const label = which === 'signup' ? 'إنشاء حساب' : 'تسجيل الدخول';
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
    note.textContent = 'لحظة…';

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
      note.textContent = 'تم إنشاء الحساب. افتح بريدك لتأكيده ثم سجّل الدخول.';
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
  function openSession(email) {
    who.textContent = 'مرحبًا، ' + email;
    show('session');
    window.myTermSignedIn = true;
    document.dispatchEvent(new CustomEvent('signed-in'));
  }

  document.getElementById('logout').onclick = async () => {
    await auth.signOut();
    window.myTermSignedIn = false;
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
