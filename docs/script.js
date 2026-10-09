// ============================================================
// # 🔌 ☁️  CONNECT TO THE SERVICE
// # 🔤 JavaScript
// # 🎯 Connects the page to the sign in service. The address says which
// #    project, and the key says which app is asking
// # 🔗 Needs the library that index.html loads from the CDN just before
// #    this file. The key here is the public one, so it is safe to show.
// #    What keeps the data safe is the rules set on the service, not this key
// ============================================================
const SERVICE_URL = 'https://qpxltggjchspcmqwibqg.supabase.co';
const PUBLIC_KEY = 'sb_publishable_2Zhv75beNB67TjU4FzuKow_usYx7HBP';

const db = supabase.createClient(SERVICE_URL, PUBLIC_KEY);

// ============================================================
// # 🧩 🔀  PAGE PARTS AND PANEL SWITCHING
// # 🔤 JavaScript
// # 🎯 Picks up the three panels and the form parts from the page,
// #    and switches which panel is on screen
// # 🔗 The names match the id values in index.html. One panel shows at a
// #    time, and the hidden rule in style.css is what makes it disappear
// ============================================================
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

function show(name) {
  Object.keys(panels).forEach(function (key) {
    panels[key].hidden = key !== name;
  });
}

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

document.getElementById('go-signup').onclick = function () { openForm('signup'); };
document.getElementById('go-login').onclick = function () { openForm('login'); };
document.getElementById('back').onclick = function () { show('choice'); };

// ============================================================
// # 📤 🔐  SEND SIGN UP OR LOG IN
// # 🔤 JavaScript
// # 🎯 Sends the email and password to the service, either to make a new
// #    account or to log in, and shows what came back
// # 🔗 The same form does both jobs, so it reads the mode set above.
// #    The service does the hard parts: it hides the password, checks if
// #    the email is taken, and hands back a login token
// ============================================================
panels.form.onsubmit = async function (event) {
  event.preventDefault();

  const email = emailBox.value.trim();
  const password = passwordBox.value;

  sendButton.disabled = true;
  note.textContent = 'لحظة…';

  const answer = mode === 'signup'
    ? await db.auth.signUp({ email: email, password: password })
    : await db.auth.signInWithPassword({ email: email, password: password });

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
// # 🚪 🔄  LOG OUT AND SESSION CHECK
// # 🔤 JavaScript
// # 🎯 Shows who is logged in, lets them leave, and checks on page load
// #    whether they are still logged in from an earlier visit
// # 🔗 The service keeps the login token in the browser, so the visitor
// #    stays logged in after a refresh. The check at the end decides
// #    which panel the page opens with. It also sends a signed-in message
// #    that drive.js waits for, so the two files stay apart and neither
// #    has to load before the other
// ============================================================
function openSession(email) {
  who.textContent = 'مرحبًا، ' + email;
  show('session');
  document.dispatchEvent(new CustomEvent('signed-in'));
}

document.getElementById('logout').onclick = async function () {
  await db.auth.signOut();
  document.dispatchEvent(new CustomEvent('signed-out'));
  show('choice');
};

(async function () {
  const answer = await db.auth.getSession();
  if (answer.data.session) {
    openSession(answer.data.session.user.email);
  } else {
    show('choice');
  }
})();
