import { $, $$, formatRp, icons } from './utils.js';
import { t, currentLang } from './i18n.js';
import { fetchTransactions, fetchMutations, fetchLogs, getAccounts } from './data.js';

let histFilter = 'all';

export function resetHistory() { histFilter = 'all'; }

export async function renderHistory() {
  const container = $('#historyContainer');
  const [trxs, muts, logs] = await Promise.all([
    fetchTransactions(),
    fetchMutations(),
    fetchLogs(200)
  ]);

  const accounts = getAccounts();
  let items = [];

  trxs.forEach(tr => {
    const accName = accounts.find(a => a.id === tr.account_id)?.name || '';
    items.push({ id: tr.id, type: tr.type === 'income' ? 'inc' : 'exp', cat: 'trx', title: tr.category_name, sub: accName + (tr.note ? ' · ' + tr.note : ''), amount: tr.amount, sign: tr.type === 'income' ? '+' : '-', ts: tr.date ? new Date(tr.date + 'T12:00:00').getTime() : (tr.created_at ? new Date(tr.created_at).getTime() : Date.now()) });
  });

  muts.forEach(m => {
    const fromName = accounts.find(a => a.id === m.from_account_id)?.name || '-';
    const toName = accounts.find(a => a.id === m.to_account_id)?.name || '-';
    items.push({ id: m.id, type: 'mut', cat: 'mut', title: fromName + ' → ' + toName, sub: '', amount: m.amount, sign: '-', ts: m.date ? new Date(m.date + 'T12:00:00').getTime() : (m.created_at ? new Date(m.created_at).getTime() : Date.now()) });
  });

  logs.forEach(l => {
    items.push({ id: l.id, type: 'log', cat: 'log', title: l.action, sub: l.detail || '', amount: 0, sign: '', ts: l.created_at ? new Date(l.created_at).getTime() : Date.now() });
  });

  items.sort((a, b) => b.ts - a.ts);

  if (histFilter === 'trx') items = items.filter(i => i.cat === 'trx');
  else if (histFilter === 'mut') items = items.filter(i => i.cat === 'mut');
  else if (histFilter === 'log') items = items.filter(i => i.cat === 'log');

  const fTrx = items.filter(i => i.cat === 'trx');
  const sumInc = fTrx.filter(i => i.type === 'inc').reduce((s, i) => s + i.amount, 0);
  const sumExp = fTrx.filter(i => i.type === 'exp').reduce((s, i) => s + i.amount, 0);
  const sumMut = items.filter(i => i.cat === 'mut').reduce((s, i) => s + i.amount, 0);

  const tabs = [
    { key: 'all', label: t('hist_all') },
    { key: 'trx', label: t('hist_trx') },
    { key: 'mut', label: t('hist_mut') },
    { key: 'log', label: t('hist_log') },
  ];

  let html = '<div class="hist-tabs">';
  tabs.forEach(tab => { html += `<button class="hist-tab${histFilter === tab.key ? ' active' : ''}" data-hf="${tab.key}">${tab.label}</button>`; });
  html += '</div>';

  html += `<div class="hist-summary">
    <div class="hist-sum-card"><div class="hist-sum-val inc">${formatRp(sumInc)}</div><div class="hist-sum-lbl">${t('hist_income')}</div></div>
    <div class="hist-sum-card"><div class="hist-sum-val exp">${formatRp(sumExp)}</div><div class="hist-sum-lbl">${t('hist_expense')}</div></div>
    <div class="hist-sum-card"><div class="hist-sum-val mut">${formatRp(sumMut)}</div><div class="hist-sum-lbl">${t('hist_transfer')}</div></div>
  </div>`;
  html += `<div class="hist-count">${items.length} ${t('hist_total_items')}</div>`;

  if (!items.length) {
    html += `<div class="ph"><div class="ph-icon"><i data-lucide="history"></i></div><div class="ph-t">${t('history_empty')}</div><div class="ph-s">${t('history_empty_sub')}</div></div>`;
    container.innerHTML = html;
    icons();
    container.querySelectorAll('.hist-tab').forEach(tab => tab.addEventListener('click', () => { histFilter = tab.dataset.hf; renderHistory(); }));
    return;
  }

  const groups = {};
  items.forEach(item => {
    const d = new Date(item.ts);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  const dayN = currentLang === 'id' ? ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthN = currentLang === 'id' ? ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'] : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  const todayK = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  const yestK = yest.getFullYear() + '-' + String(yest.getMonth() + 1).padStart(2, '0') + '-' + String(yest.getDate()).padStart(2, '0');

  const typeLabels = { inc: currentLang === 'id' ? 'Pemasukan' : 'Income', exp: currentLang === 'id' ? 'Pengeluaran' : 'Expense', mut: currentLang === 'id' ? 'Mutasi' : 'Transfer', log: 'Log' };
  const typeIcons = { inc: 'trending-up', exp: 'trending-down', mut: 'arrow-left-right', log: 'clipboard-list' };

  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(dateKey => {
    const d = new Date(dateKey + 'T12:00:00');
    let label;
    if (dateKey === todayK) label = t('hist_today');
    else if (dateKey === yestK) label = t('hist_yesterday');
    else label = dayN[d.getDay()] + ', ' + d.getDate() + ' ' + monthN[d.getMonth()] + ' ' + d.getFullYear();

    html += '<div class="hist-date-group">';
    html += `<div class="hist-date-label">${label}</div>`;
    groups[dateKey].forEach(item => {
      const tIcon = typeIcons[item.type] || 'circle';
      const tLabel = typeLabels[item.type] || item.type;
      html += `<div class="hist-item h-${item.type}">
        <div class="hist-item-top">
          <span class="hist-item-type t-${item.type}"><i data-lucide="${tIcon}" style="width:10px;height:10px"></i>${tLabel}</span>
          ${item.amount ? `<span class="hist-item-amount ${item.type}">${item.sign}${formatRp(item.amount)}</span>` : ''}
        </div>
        <div class="hist-item-title">${item.title}</div>
        ${item.sub ? `<div class="hist-item-sub">${item.sub}</div>` : ''}
      </div>`;
    });
    html += '</div>';
  });

  container.innerHTML = html;
  icons();
  container.querySelectorAll('.hist-tab').forEach(tab => tab.addEventListener('click', () => { histFilter = tab.dataset.hf; renderHistory(); }));
}
