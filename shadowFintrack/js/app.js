import { $, $$, icons, initAutoFit, showLoading, hideLoading, closeModal, toast } from './utils.js';
import { t, applyI18n, setLang, currentLang } from './i18n.js';
import { getProfile, getAccounts, initProfile as initData } from './data.js';
import { initAuth, handleLogout } from './auth.js';
import { renderDashboard, updateSaldo, animateDashboard } from './dashboard.js';
import { renderCOA, initAccounts } from './accounts.js';
import { initTransactions, resetTransactions } from './transactions.js';
import { renderMutasiHistory, initMutations } from './mutations.js';
import { renderTagAllList, resetBills, initBills, initTagModals } from './bills.js';
import { renderHistory, resetHistory } from './history.js';
import { populateProfileForm, updateAllLogos, initProfile as initProfileUI } from './profile.js';
import { syncSettingUI, initSettings } from './settings.js';

// ===== State =====
let currentPage = 'dashboard';
window._confirmCb = null;
window._tagConfirmCb = null;
window._tagPayCb = null;
window._importRows = null;
window._recvCache = null;

// ===== Ready callback =====
window._onAppReady = async () => {
  const profile = getProfile();
  if (!profile) return;

  // Apply saved theme
  document.documentElement.setAttribute('data-theme', profile.theme || 'light');
  document.querySelector('meta[name="theme-color"]').content = profile.theme === 'dark' ? '#0F1419' : '#0D9488';

  // Apply saved language
  setLang(profile.lang || 'id');

  // Apply photo
  if (profile.photo) updateAllLogos(profile.photo);

  // Apply name
  $('#dashUserName').textContent = profile.name || 'User';

  // Render dashboard
  await renderDashboard();

  // Mark ready
  window._appReady = true;
};

// ===== Sidebar =====
function openSB() {
  $('#sidebar').classList.add('active');
  $('#sbOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  showSBMenu();
}
function closeSB() {
  $('#sidebar').classList.remove('active');
  $('#sbOverlay').classList.remove('active');
  document.body.style.overflow = '';
}
function showSBMenu() {
  $('#sbMenu').style.display = '';
  $$('.sb-page').forEach(p => p.classList.remove('active'));
  $$('.sb-item[data-sb]').forEach(i => i.classList.remove('active'));
}
function showSBPage(key) {
  $('#sbMenu').style.display = 'none';
  $$('.sb-page').forEach(p => p.classList.remove('active'));
  const tgt = $(`#sb-${key}`);
  if (tgt) { void tgt.offsetWidth; tgt.classList.add('active'); }
  $('#sidebar').scrollTop = 0;
  if (key === 'profile') populateProfileForm();
  if (key === 'coa') renderCOA();
  if (key === 'setting') syncSettingUI();
  icons();
}
window._openSB = openSB;
window._showSBPage = showSBPage;

// ===== Page Navigation =====
async function navigateTo(page) {
  currentPage = page;
  $$('.ni').forEach(n => n.classList.remove('active'));
  const navBtn = $(`.ni[data-pg="${page}"]`);
  if (navBtn) navBtn.classList.add('active');
  $$('.pg').forEach(p => p.classList.remove('active'));
  const pg = $(`#pg-${page}`);
  if (pg) { void pg.offsetWidth; pg.classList.add('active'); }
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'dashboard') { await renderDashboard(); }
  else if (page === 'mutasi') { await renderMutasiHistory(); }
  else if (page === 'tambah') { resetTransactions(); }
  else if (page === 'tagihan') { resetBills(); await renderTagAllList(); }
  else if (page === 'riwayat') { resetHistory(); await renderHistory(); }
}

// ===== Confirm Modal =====
function initConfirmModal() {
  $('#confirmYes').addEventListener('click', () => {
    closeModal('confirmModal');
    if (window._confirmCb) { window._confirmCb(); window._confirmCb = null; }
  });
}

// ===== Close Modal Buttons =====
function initCloseModals() {
  $$('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });
}

// ===== Bottom Nav =====
function initNav() {
  $$('.ni[data-pg]').forEach(n => {
    n.addEventListener('click', () => navigateTo(n.dataset.pg));
  });
}

// ===== Header Scroll =====
function initHeader() {
  window.addEventListener('scroll', () => {
    $('#header').classList.toggle('scrolled', window.scrollY > 4);
  }, { passive: true });
}

// ===== Offline =====
function initOffline() {
  function update() { $('#offBanner').classList.toggle('show', !navigator.onLine); }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

// ===== PWA Install =====
function initInstall() {
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    $('#installBtn').classList.add('visible');
  });
  $('#installBtn').addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') toast(t('installed'));
    deferred = null;
    $('#installBtn').classList.remove('visible');
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    $('#installBtn').classList.remove('visible');
    toast(t('install_success'));
  });
}

// ===== Service Worker =====
function initSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(() => console.log('SW ok')).catch(e => console.log('SW fail', e));
    });
  }
}

// ===== Keyboard: Escape =====
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSB();
      $$('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
  });
}

// ===== INIT =====
async function init() {
  icons();
  initAuth();
  initNav();
  initHeader();
  initOffline();
  initInstall();
  initSW();
  initKeyboard();
  initCloseModals();
  initConfirmModal();
  initAccounts();
  initTransactions();
  initMutations();
  initBills();
  initTagModals();
  initProfileUI();
  initSettings();

  // Sidebar
  $('#logoBtn').addEventListener('click', openSB);
  $('#sbClose').addEventListener('click', closeSB);
  $('#sbOverlay').addEventListener('click', closeSB);
  $$('.sb-item[data-sb]').forEach(item => {
    item.addEventListener('click', () => showSBPage(item.dataset.sb));
  });
  $$('.sb-back[data-back]').forEach(btn => {
    btn.addEventListener('click', () => { showSBMenu(); icons(); });
  });

  hideLoading();
}

init();
