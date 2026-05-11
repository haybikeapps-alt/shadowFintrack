import { $, formatRp, parseRpInput, initFmtInputs, openModal, closeModal, toast, icons, todayStr } from './utils.js';
import { t, currentLang } from './i18n.js';
import { getAccounts, addMutation, fetchMutations, addLog } from './data.js';
import { renderDashboard, updateSaldo } from './dashboard.js';

export async function renderMutasiHistory() {
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const muts = await fetchMutations(weekAgo);
  if (!muts.length) {
    $('#mutasiHistory').innerHTML = `<div class="mut-empty"><div class="mut-empty-icon"><i data-lucide="arrow-left-right"></i></div><div class="mut-empty-t">${t('mut_empty')}</div><div class="mut-empty-s">${t('mut_empty_sub')}</div></div>`;
    icons();
    return;
  }
  const days = currentLang === 'id' ? ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = currentLang === 'id' ? ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const accounts = getAccounts();

  $('#mutasiHistory').innerHTML = '<div class="mut-list">' + muts.map(m => {
    const d = new Date(m.date + 'T12:00:00');
    const ds = days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    const fromName = accounts.find(a => a.id === m.from_account_id)?.name || '-';
    const toName = accounts.find(a => a.id === m.to_account_id)?.name || '-';
    return `<div class="mut-item"><div class="mut-item-top"><div class="mut-item-date"><i data-lucide="calendar"></i>${ds}</div><div class="mut-item-amount">- ${formatRp(m.amount)}</div></div><div class="mut-item-flow"><span class="mut-item-from">${fromName}</span><i data-lucide="arrow-right"></i><span class="mut-item-to">${toName}</span></div></div>`;
  }).join('') + '</div>';
  icons();
}

export function initMutations() {
  $('#mutasiOpenBtn').addEventListener('click', () => {
    const accounts = getAccounts();
    if (accounts.length < 2) { toast(t('no_accounts_mut')); return; }
    $('#mutasiDate').value = todayStr();
    $('#mutasiAmount').value = '';
    const opts = accounts.map(a => `<option value="${a.id}">${a.name} (${formatRp(a.balance)})</option>`).join('');
    $('#mutasiFrom').innerHTML = opts;
    $('#mutasiTo').innerHTML = opts;
    if (accounts.length > 1) $('#mutasiTo').selectedIndex = 1;
    openModal('mutasiModal');
    initFmtInputs($('#mutasiModal'));
  });

  $('#mutasiPost').addEventListener('click', () => {
    const date = $('#mutasiDate').value;
    const fromId = $('#mutasiFrom').value;
    const toId = $('#mutasiTo').value;
    const amount = parseRpInput($('#mutasiAmount'));
    if (!date) { toast(t('name_required')); return; }
    if (fromId === toId) { toast(t('mut_same_account')); return; }
    if (amount <= 0) { toast(t('invalid_amount')); return; }
    const fromAcc = getAccounts().find(a => a.id === fromId);
    if (!fromAcc || fromAcc.balance < amount) { toast(t('mut_insufficient')); return; }
    closeModal('mutasiModal');
    openModal('confirmModal');
    $('#confirmMsg').textContent = t('correct');
    window._confirmCb = async () => {
      closeModal('confirmModal');
      await addMutation({ date, from_account_id: fromId, to_account_id: toId, amount });
      await addLog('mutasi', 'Mutasi saldo', formatRp(amount));
      renderMutasiHistory();
      renderDashboard();
      updateSaldo();
      toast(t('mut_success'));
      window._confirmCb = null;
    };
  });
}
