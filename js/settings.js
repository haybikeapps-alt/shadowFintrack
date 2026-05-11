import { $, toast, icons, openModal, closeModal, showLoading, hideLoading } from './utils.js';
import { t, setLang, currentLang } from './i18n.js';
import { getProfile, updateProfile, resetAllData } from './data.js';
import { handleLogout } from './auth.js';
import { bulkImportTransactions, getAccounts } from './data.js';
import { renderDashboard } from './dashboard.js';

export function syncSettingUI() {
  const p = getProfile();
  if (!p) return;
  $('#themeToggle').classList.toggle('on', p.theme === 'dark');
  $$('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === (p.lang || 'id')));
}

export function initSettings() {
  // Theme
  $('#themeToggle').addEventListener('click', async () => {
    const p = getProfile();
    const next = p.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.querySelector('meta[name="theme-color"]').content = next === 'dark' ? '#0F1419' : '#0D9488';
    $('#themeToggle').classList.toggle('on', next === 'dark');
    await updateProfile({ theme: next });
  });

  // Language
  $$('.lang-btn').forEach(b => b.addEventListener('click', async () => {
    const lang = b.dataset.lang;
    setLang(lang);
    await updateProfile({ lang });
  }));

  // Import CSV
  $('#importBtn').addEventListener('click', () => $('#csvInput').click());
  $('#csvInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      const lines = text.trim().split('\n');
      if (lines.length < 2) { toast(t('csv_invalid_format')); return; }

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        if (parts.length < 5) continue;
        const type = parts[0].toLowerCase();
        if (type !== 'income' && type !== 'expense') continue;
        const date = parts[1];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const amount = parseInt(parts[4].replace(/\D/g, ''));
        if (!amount || amount <= 0) continue;
        rows.push({ type, date, category_id: parts[2] || 'lainnya', category_name: parts[2] || 'Lainnya', account_name: parts[3] || '', amount, note: parts[5] || null });
      }

      if (!rows.length) { toast(t('csv_invalid_format')); return; }

      const preview = rows.slice(0, 5).map(r =>
        `<div style="padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:${r.type === 'income' ? 'var(--green)' : 'var(--red)'};font-weight:600">${r.type === 'income' ? '+' : '-'}${r.amount.toLocaleString('id-ID')}</span> · ${r.category_name} · ${r.date}${r.note ? ' · ' + r.note : ''}</div>`
      ).join('');
      $('#importPreviewContent').innerHTML = preview;
      $('#importSummary').textContent = `${rows.length} ${t('csv_preview_rows')} — ${t('csv_format')}`;
      openModal('importModal');
      icons();

      window._importRows = rows;
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#importDoBtn').addEventListener('click', async () => {
    const rows = window._importRows;
    if (!rows || !rows.length) return;
    closeModal('importModal');
    showLoading();
    const { error } = await bulkImportTransactions(rows);
    hideLoading();
    if (error) { toast(error.message); }
    else { toast(rows.length + ' ' + t('csv_import_success')); renderDashboard(); }
    window._importRows = null;
  });

  // Reset
  $('#resetBtn').addEventListener('click', () => openModal('resetModal'));
  $('#resetYes').addEventListener('click', async () => {
    closeModal('resetModal');
    showLoading();
    await resetAllData();
    hideLoading();
    toast(t('reset'));
    renderDashboard();
  });

  // Logout
  $('#logoutBtn').addEventListener('click', async () => {
    await handleLogout();
  });
}
