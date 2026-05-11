import { $, showLoading, hideLoading, toast, icons } from './utils.js';
import { t } from './i18n.js';
import { sb, initProfile } from './data.js';

export function initAuth() {
  $('#showSignup').addEventListener('click', () => {
    $('#loginForm').style.display = 'none';
    $('#signupForm').style.display = '';
    $('#authError').style.display = 'none';
  });
  $('#showLogin').addEventListener('click', () => {
    $('#signupForm').style.display = 'none';
    $('#loginForm').style.display = '';
    $('#authError').style.display = 'none';
  });

  $('#loginBtn').addEventListener('click', handleLogin);
  $('#signupBtn').addEventListener('click', handleSignup);

  ['loginEmail', 'loginPassword', 'signupPassword'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        if (id.startsWith('login')) handleLogin();
        else handleSignup();
      }
    });
  });

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      showLoading();
      await initProfile();
      $('#authScreen').classList.add('hidden');
      $('#appWrap').style.display = '';
      hideLoading();
      window._appReady = true;
      if (window._onAppReady) window._onAppReady();
    } else if (event === 'SIGNED_OUT') {
      $('#authScreen').classList.remove('hidden');
      $('#appWrap').style.display = 'none';
      window._appReady = false;
    }
  });
}

function showAuthError(msg) {
  const el = $('#authError');
  el.textContent = msg;
  el.style.display = '';
}

async function handleLogin() {
  const email = $('#loginEmail').value.trim();
  const pass = $('#loginPassword').value;
  if (!email || !pass) { showAuthError(t('name_required')); return; }
  showLoading();
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  hideLoading();
  if (error) showAuthError(error.message === 'Invalid login credentials' ? 'Email atau password salah' : error.message);
}

async function handleSignup() {
  const name = $('#signupName').value.trim();
  const email = $('#signupEmail').value.trim();
  const pass = $('#signupPassword').value;
  if (!name) { showAuthError(t('name_empty')); return; }
  if (!email || !pass) { showAuthError(t('name_required')); return; }
  if (pass.length < 6) { showAuthError('Password minimal 6 karakter'); return; }
  showLoading();
  const { error } = await sb.auth.signUp({ email, password: pass, options: { data: { name } } });
  hideLoading();
  if (error) { showAuthError(error.message); return; }
  toast('Berhasil daftar! Silakan login.');
  $('#signupForm').style.display = 'none';
  $('#loginForm').style.display = '';
  $('#loginEmail').value = email;
  $('#authError').style.display = 'none';
}

export async function handleLogout() {
  await sb.auth.signOut();
}
