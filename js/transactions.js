import { $, $$, formatRp, parseRpInput, initFmtInputs, openModal, closeModal, toast, icons, todayStr } from './utils.js';
import { t, currentLang } from './i18n.js';
import { getAccounts, addTransaction, fetchTransactions, addLog } from './data.js';
import { renderDashboard, updateSaldo, renderWalletGrid } from './dashboard.js';

const INCOME_CATS = [
  { id: 'gaji', label: { id: 'Gaji', en: 'Salary' }, icon: 'briefcase' },
  { id: 'freelance', label: { id: 'Freelance', en: 'Freelance' }, icon: 'laptop' },
  { id: 'investasi', label: { id: 'Investasi', en: 'Investment' }, icon: 'trending-up' },
  { id: 'bonus', label: { id: 'Bonus', en: 'Bonus' }, icon: 'gift' },
  { id: 'transfer_masuk', label: { id: 'Transfer Masuk', en: 'Transfer In' }, icon: 'arrow-down-left' },
  { id: 'lainnya_inc', label: { id: 'Lainnya', en: 'Others' }, icon: 'more-horizontal' },
];
const EXPENSE_CATS = [
  { id: 'makanan', label: { id: 'Makanan & Minuman', en: 'Food & Drinks' }, icon: 'utensils' },
  { id: 'transportasi', label: { id: 'Transportasi', en: 'Transportation' }, icon: 'car' },
  { id: 'belanja', label: { id: 'Belanja', en: 'Shopping' }, icon: 'shopping-bag' },
  { id: 'tagihan', label: { id: 'Tagihan & Utilitas', en: 'Bills & Utilities' }, icon: 'file-text' },
  { id: 'hiburan', label: { id: 'Hiburan', en: 'Entertainment' }, icon: 'gamepad-2' },
  { id: 'kesehatan', label: { id: 'Kesehatan', en: 'Healthcare' }, icon: 'heart-pulse' },
  { id: 'pendidikan', label: { id: 'Pendidikan', en: 'Education' }, icon: 'graduation-cap' },
  { id: 'transfer_keluar', label: { id: 'Transfer Keluar', en: 'Transfer Out' }, icon: 'arrow-up-right' },
  { id: 'lainnya_exp', label: { id: 'Lainnya', en: 'Others' }, icon: 'more-horizontal' },
];

const ACC_COLORS = [
  { bg: 'rgba(13,148,136,.1)', bd: 'rgba(13,148,136,.3)', tx: '#0D9488' },
  { bg: 'rgba(59,130,246,.1)', bd: 'rgba(59,130,246,.3)', tx: '#3B82F6' },
  { bg: 'rgba(168,85,247,.1)', bd: 'rgba(168,85,247,.3)', tx: '#A855F7' },
  { bg: 'rgba(234,179,8,.1)', bd: 'rgba(234,179,8,.3)', tx: '#CA8A04' },
];

let actType = null;

export function initTransactions() {
  $('#actIncBtn').addEventListener('click', () => {
    if (actType === 'income') { actType = null; $('#actIncBtn').classList.remove('on-inc'); $('#actForm').innerHTML = ''; renderActHistory(); return; }
    actType = 'income';
    $('#actIncBtn').classList.add('on-inc');
    $('#actExpBtn').classList.remove('on-exp');
    $('#actForm').innerHTML = '';
    renderActHistory();
    renderActForm();
  });
  $('#actExpBtn').addEventListener('click', () => {
    if (actType === 'expense') { actType = null; $('#actExpBtn').classList.remove('on-exp'); $('#actForm').innerHTML = ''; renderActHistory(); return; }
    actType = 'expense';
    $('#actExpBtn').classList.add('on-exp');
    $('#actIncBtn').classList.remove('on-inc');
    $('#actForm').innerHTML = '';
    renderActHistory();
    renderActForm();
  });
}

export function resetTransactions() {
  actType = null;
  $('#actIncBtn').classList.remove('on-inc');
  $('#actExpBtn').classList.remove('on-exp');
  $('#actForm').innerHTML = '';
}

async function renderActHistory() {
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const trxs = await fetchTransactions(weekAgo);
  if (!trxs.length) {
    $('#actHistory').innerHTML = `<div class="act-empty"><div class="act-empty-t">${t('act_empty')}</div><div class="act-empty-s">${t('act_empty_sub')}</div></div>`;
    return;
  }
  const days = currentLang === 'id' ? ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = currentLang === 'id' ? ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  $('#actHistory').innerHTML = '<div class="act-list">' + trxs.slice(0, 20).map(tr => {
    const d = new Date(tr.date + 'T12:00:00');
    const ds = days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
    const cls = tr.type === 'income' ? 'inc' : 'exp';
    const sign = tr.type === 'income' ? '+' : '-';
    return `<div class="act-item ${cls}"><div class="act-item-info"><div class="act-item-cat">${tr.category_name}</div><div class="act-item-meta">${ds} · ${tr.account_id ? getAccounts().find(a => a.id === tr.account_id)?.name || '' : ''}</div></div><div class="act-item-amount ${cls}">${sign} ${formatRp(tr.amount)}</div></div>`;
  }).join('') + '</div>';
}

function renderActForm() {
  if (!actType) { $('#actForm').innerHTML = ''; return; }
  const accounts = getAccounts();
  if (!accounts.length) {
    $('#actForm').innerHTML = `<div class="act-empty"><div class="act-empty-t">${t('no_accounts')}</div><div class="act-empty-s">${t('no_accounts_sub')}</div></div>`;
    return;
  }
  const isInc = actType === 'income';
  const cats = isInc ? INCOME_CATS : EXPENSE_CATS;
  const accentColor = isInc ? 'var(--green)' : 'var(--red)';
  const accentBg = isInc ? 'var(--green-l)' : 'var(--red-l)';
  const accentBd = isInc ? 'rgba(5,150,105,.3)' : 'rgba(239,68,68,.3)';

  let accChips = accounts.map((a, i) => {
    const c = ACC_COLORS[i % ACC_COLORS.length];
    return `<div class="chip" data-acc="${a.id}" style="--cbg:${c.bg};--cbd:${c.bd};--ctx:${c.tx}">${a.name}</div>`;
  }).join('');
  let catChips = cats.map(c => `<div class="chip" data-cat="${c.id}"><i data-lucide="${c.icon}"></i>${c.label[currentLang] || c.label.id}</div>`).join('');

  $('#actForm').innerHTML = `<div class="act-form">
    <div class="act-section-label">${t('date')}</div>
    <div class="form-group" style="margin-bottom:0"><input type="date" class="form-input" id="actDate" value="${todayStr()}"></div>
    <div class="act-section-label">${t('choose_account')}</div>
    <div class="chip-grid" id="actAccChips">${accChips}</div>
    <div class="act-section-label">${isInc ? t('income_source') : t('expense_category')}</div>
    <div class="chip-grid" id="actCatChips">${catChips}</div>
    <div class="act-section-label">${t('amount_rp')}</div>
    <div class="form-group" style="margin-bottom:0"><input type="text" inputmode="numeric" class="form-input" id="actAmount" placeholder="0" data-fmt-rp></div>
    <div class="act-section-label">${t('note_optional')}</div>
    <div class="form-group" style="margin-bottom:0"><input type="text" class="form-input" id="actNote"></div>
    <button class="form-btn form-btn-primary" id="actPostBtn" style="margin-top:16px">${t('posting')}</button>
  </div>`;

  icons();
  initFmtInputs($('#actForm'));

  function setupChips(container, attr, bg, bd, tx) {
    container.querySelectorAll('.chip').forEach(ch => {
      ch.addEventListener('click', () => {
        container.querySelectorAll('.chip').forEach(x => { x.classList.remove('sel'); x.style.background = ''; x.style.borderColor = ''; x.style.color = ''; });
        ch.classList.add('sel');
        ch.style.background = attr === 'acc' ? ch.style.getPropertyValue('--cbg') : bg;
        ch.style.borderColor = attr === 'acc' ? ch.style.getPropertyValue('--cbd') : bd;
        ch.style.color = attr === 'acc' ? ch.style.getPropertyValue('--ctx') : tx;
      });
    });
  }
  setupChips($('#actAccChips'), 'acc');
  setupChips($('#actCatChips'), 'cat', accentBg, accentBd, accentColor);

  $('#actPostBtn').addEventListener('click', () => {
    const date = $('#actDate').value;
    const accEl = $('#actAccChips').querySelector('.chip.sel');
    const catEl = $('#actCatChips').querySelector('.chip.sel');
    const amount = parseRpInput($('#actAmount'));
    const note = $('#actNote').value.trim();
    if (!date) { toast(t('name_required')); return; }
    if (!accEl) { toast(t('choose_account')); return; }
    if (!catEl) { toast(isInc ? t('income_source') : t('expense_category')); return; }
    if (amount <= 0) { toast(t('invalid_amount')); return; }
    if (!isInc) {
      const acc = getAccounts().find(a => a.id === accEl.dataset.acc);
      if (acc && acc.balance < amount) { toast(t('mut_insufficient')); return; }
    }
    const accId = accEl.dataset.acc;
    const catId = catEl.dataset.cat;
    const catObj = cats.find(c => c.id === catId);
    const catName = catObj ? (catObj.label[currentLang] || catObj.label.id) : catId;

    openModal('confirmModal');
    $('#confirmMsg').textContent = t('correct');
    window._confirmCb = async () => {
      closeModal('confirmModal');
      await addTransaction({ type: actType, date, account_id: accId, category_id: catId, category_name: catName, amount, note });
      await addLog('trx', (actType === 'income' ? 'Pemasukan' : 'Pengeluaran'), catName + ' ' + formatRp(amount));
      renderActHistory();
      renderActForm();
      renderDashboard();
      toast(t('act_success'));
      window._confirmCb = null;
    };
  });
}
