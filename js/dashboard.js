import { $, $$, formatRp, initAutoFit, icons, todayStr } from './utils.js';
import { t, currentLang } from './i18n.js';
import { getProfile, getAccounts, fetchTransactions, fetchMutations, fetchDebts, fetchReceivables } from './data.js';

export function animateDashboard() {
  $$('#pg-dashboard .dc').forEach(c => c.classList.remove('vis'));
  $$('#pg-dashboard .dc').forEach(c => {
    const d = parseInt(c.dataset.delay) || 0;
    setTimeout(() => c.classList.add('vis'), 50 + d);
  });
}

export async function renderDashboard() {
  const profile = getProfile();
  if (!profile) return;

  $('#dashUserName').textContent = profile.name || 'User';
  updateGreeting();
  updateDashTime();
  updateSaldo();
  renderWalletGrid();

  const today = todayStr();
  const monthPrefix = today.slice(0, 7);
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);

  const [trx, muts, debts, recvs] = await Promise.all([
    fetchTransactions(monthPrefix),
    fetchMutations(weekAgo),
    fetchDebts(),
    fetchReceivables()
  ]);

  updateComparison(trx, today, monthPrefix);
  updateBadges(debts, recvs);
  updateHealth(trx, today, monthPrefix, debts);
  animateDashboard();
  setTimeout(() => initAutoFit(), 500);
}

function updateGreeting() {
  const h = new Date().getHours();
  $('#greetTime').textContent = h >= 5 && h < 12 ? t('greet_morning') : h >= 12 && h < 17 ? t('greet_afternoon') : h >= 17 && h < 20 ? t('greet_evening') : t('greet_night');
  $('#greetHello').textContent = t('hello');
}

function updateDashTime() {
  const now = new Date();
  const days = currentLang === 'id' ? ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  $('#dashTime').textContent = t('last_update') + ' ' + days[now.getDay()] + ', ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}

export function updateSaldo() {
  const total = getAccounts().reduce((s, a) => s + (a.balance || 0), 0);
  $('#dashTotalSaldo').textContent = formatRp(total);
}

export function renderWalletGrid() {
  const grid = $('#walletGrid');
  const accounts = getAccounts();
  const iconMap = { Cash: 'wallet', Bank: 'landmark', 'E-Wallet': 'smartphone', Crypto: 'bitcoin', Asuransi: 'shield' };
  let html = accounts.map(a => `<div class="w-card"><div class="w-card-type">${a.type}</div><div class="w-card-lbl"><i data-lucide="${iconMap[a.type] || 'wallet'}" style="width:13px;height:13px"></i>${a.name}</div><div class="w-card-val auto-fit">${formatRp(a.balance)}</div></div>`).join('');
  html += `<button class="w-add" id="dashAddAcc"><i data-lucide="plus"></i><span>${t('add_new_account')}</span></button>`;
  grid.innerHTML = html;
  icons();
  document.getElementById('dashAddAcc')?.addEventListener('click', () => {
    if (window._openSB) window._openSB();
    setTimeout(() => { if (window._showSBPage) window._showSBPage('coa'); }, 400);
  });
  setTimeout(initAutoFit, 50);
}

function updateComparison(trx, today, monthPrefix) {
  let tInc = 0, tExp = 0, mInc = 0, mExp = 0;
  trx.forEach(r => {
    if (r.date === today) { if (r.type === 'income') tInc += r.amount; else tExp += r.amount; }
    if (r.date.startsWith(monthPrefix)) { if (r.type === 'income') mInc += r.amount; else mExp += r.amount; }
  });

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('dashTodayInc', formatRp(tInc));
  set('dashTodayExp', formatRp(tExp));
  const tNet = tInc - tExp;
  const tNetEl = $('#dashTodayNet');
  tNetEl.textContent = (tNet >= 0 ? '+' : '') + formatRp(Math.abs(tNet));
  tNetEl.className = 'cmp-net ' + (tNet >= 0 ? 'pos' : 'neg');

  set('dashMonthInc', formatRp(mInc));
  set('dashMonthExp', formatRp(mExp));
  const mNet = mInc - mExp;
  const mNetEl = $('#dashMonthNet');
  mNetEl.textContent = (mNet >= 0 ? '+' : '') + formatRp(Math.abs(mNet));
  mNetEl.className = 'cmp-net ' + (mNet >= 0 ? 'pos' : 'neg');

  const tIncBar = $('#dashTodayIncBar'), tExpBar = $('#dashTodayExpBar');
  const mIncBar = $('#dashMonthIncBar'), mExpBar = $('#dashMonthExpBar');
  if (tIncBar) { tIncBar.dataset.w = tInc > 0 ? '100%' : '0%'; tIncBar.style.width = '0%'; }
  if (tExpBar) { tExpBar.dataset.w = tInc > 0 ? Math.min(Math.round(tExp / tInc * 100), 100) + '%' : '0%'; tExpBar.style.width = '0%'; }
  if (mIncBar) { mIncBar.dataset.w = mInc > 0 ? '100%' : '0%'; mIncBar.style.width = '0%'; }
  if (mExpBar) { mExpBar.dataset.w = mInc > 0 ? Math.min(Math.round(mExp / mInc * 100), 100) + '%' : '0%'; mExpBar.style.width = '0%'; }

  setTimeout(() => {
    $$('.bar-f').forEach(b => { b.style.width = b.dataset.w || '0%'; });
  }, 300);
}

function updateBadges(debts, recvs) {
  const activeDebts = debts.filter(d => (d.total_debt - d.paid_amount) > 0);
  const activeRecvs = recvs.filter(r => (r.amount - r.paid_amount) > 0);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const nearDue = activeDebts.filter(d => d.due_date && (() => { const diff = Math.ceil((new Date(d.due_date + 'T00:00:00') - now) / 864e5); return diff >= 0 && diff <= 1; })());
  const totalRecv = activeRecvs.reduce((s, r) => s + (r.amount - r.paid_amount), 0);

  $('#dashBadges').innerHTML = `
    <div class="badge badge-utang"><div class="badge-icon"><i data-lucide="alert-circle"></i></div><div class="badge-title">${t('debt_bill')}</div><div class="badge-count">${activeDebts.length} <span style="font-size:.75rem;font-weight:500">${t('bills')}</span></div>${nearDue.length ? `<div class="badge-warn"><span class="badge-warn-dot"></span>${t('due_tomorrow')}</div><div class="badge-sub">${t('within_7d')}</div>` : ''}</div>
    <div class="badge badge-piutang"><div class="badge-icon"><i data-lucide="hand-coins"></i></div><div class="badge-title">${t('receivable')}</div><div class="badge-count auto-fit">${formatRp(totalRecv)}</div><div class="badge-sub">${activeRecvs.length ? activeRecvs.length + ' ' + t('awaiting_payment') : ''}</div></div>`;
  icons();
}

function updateHealth(trx, today, monthPrefix, debts) {
  let mInc = 0, mExp = 0;
  trx.forEach(r => { if (r.date.startsWith(monthPrefix)) { if (r.type === 'income') mInc += r.amount; else mExp += r.amount; } });

  const totalBalance = getAccounts().reduce((s, a) => s + (a.balance || 0), 0);
  const activeDebts = debts.filter(d => (d.total_debt - d.paid_amount) > 0);
  const totalDebt = activeDebts.reduce((s, d) => s + (d.total_debt - d.paid_amount), 0);

  let score = 0;

  // Savings Ratio (0-40)
  if (mInc > 0) {
    const ratio = (mInc - mExp) / mInc;
    if (ratio >= 0.3) score += 40;
    else if (ratio >= 0.2) score += 32;
    else if (ratio >= 0.1) score += 24;
    else if (ratio > 0) score += 12;
  }

  // Debt Health (0-25)
  if (activeDebts.length === 0) { score += 25; }
  else {
    if (mInc > 0) {
      const dr = totalDebt / mInc;
      if (dr < 1) score += 20; else if (dr < 3) score += 12; else score += 4;
    } else { score += 8; }
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const overdue = activeDebts.filter(d => d.due_date && new Date(d.due_date + 'T00:00:00') < now);
    if (overdue.length > 0) score -= Math.min(overdue.length * 5, 15);
  }

  // Emergency Fund (0-20)
  if (mExp > 0) {
    const months = totalBalance / mExp;
    if (months >= 6) score += 20; else if (months >= 3) score += 15; else if (months >= 1) score += 10; else score += 4;
  } else { score += 10; }

  // Consistency (0-15) - punya akun dan transaksi
  if (getAccounts().length >= 1) score += 8;
  if (trx.length >= 3) score += 7;

  score = Math.max(0, Math.min(100, score));

  const gaugeFill = $('#gaugeFill');
  const gaugeNum = $('#gaugeNum');
  const healthStatus = $('#healthStatus');
  const healthDesc = $('#healthDesc');
  const healthMetrics = $('#healthMetrics');

  const circumference = 157;
  const offset = circumference - (circumference * score / 100);
  const gaugeColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--accent)' : score >= 40 ? 'var(--amber)' : 'var(--red)';

  gaugeFill.style.strokeDashoffset = circumference;
  setTimeout(() => {
    gaugeFill.setAttribute('stroke', gaugeColor);
    gaugeFill.style.strokeDashoffset = offset;
    gaugeNum.textContent = score;
    gaugeNum.style.color = gaugeColor;
  }, 400);

  let statusKey = 'health_critical';
  if (score >= 80) statusKey = 'health_excellent';
  else if (score >= 60) statusKey = 'health_good';
  else if (score >= 40) statusKey = 'health_fair';
  else if (score >= 20) statusKey = 'health_warning';

  healthStatus.textContent = t(statusKey);
  healthStatus.style.color = gaugeColor;
  healthDesc.textContent = t(statusKey);

  const savRatio = mInc > 0 ? Math.round(((mInc - mExp) / mInc) * 100) : 0;
  const debtRatio = mInc > 0 ? Math.round((totalDebt / mInc) * 100) : 0;
  const efMonths = mExp > 0 ? (totalBalance / mExp).toFixed(1) : '0';

  healthMetrics.innerHTML = `
    <div class="hm"><div class="hm-val" style="color:var(--green)">${savRatio}%</div><div class="hm-lbl">${t('savings_ratio')}</div></div>
    <div class="hm"><div class="hm-val" style="color:${debtRatio > 50 ? 'var(--red)' : 'var(--amber)'}">${debtRatio}%</div><div class="hm-lbl">${t('debt_ratio')}</div></div>
    <div class="hm"><div class="hm-val" style="color:var(--accent)">${efMonths}</div><div class="hm-lbl">${t('emergency_fund')}</div></div>`;

  generateAdvice(mInc, mExp, activeDebts, totalBalance);
}

function generateAdvice(mInc, mExp, debts, totalBalance) {
  const list = $('#saranList');
  const advices = [];

  if (mInc > 0 && mExp > 0) {
    const ratio = (mInc - mExp) / mInc;
    if (ratio < 0.1) advices.push({ title: currentLang === 'id' ? 'Tingkatkan tabungan segera' : 'Increase savings immediately', desc: currentLang === 'id' ? `Rasio tabungan hanya ${Math.round(ratio * 100)}%. Target minimal 20% untuk keuangan sehat.` : `Savings ratio is only ${Math.round(ratio * 100)}%. Minimum 20% target for healthy finances.` });
  }

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const overdue = debts.filter(d => d.due_date && new Date(d.due_date + 'T00:00:00') < now && (d.total_debt - d.paid_amount) > 0);
  if (overdue.length > 0) advices.push({ title: currentLang === 'id' ? `Bayar ${overdue.length} hutang yang lewat tempo` : `Pay ${overdue.length} overdue debt(s)`, desc: currentLang === 'id' ? 'Hutang lewat tempo bisa menambah denda dan menurunkan skor keuanganmu.' : 'Overdue debts can add penalties and lower your financial score.' });

  if (mExp > 0) {
    const efMonths = totalBalance / mExp;
    if (efMonths < 1) advices.push({ title: currentLang === 'id' ? 'Bangun dana darurat' : 'Build emergency fund', desc: currentLang === 'id' ? `Saldo hanya cukup untuk ${efMonths.toFixed(1)} bulan pengeluaran. Target minimal 3 bulan.` : `Balance only covers ${efMonths.toFixed(1)} months of expenses. Target at least 3 months.` });
  }

  if (mInc > 0) {
    const totalDebt = debts.filter(d => (d.total_debt - d.paid_amount) > 0).reduce((s, d) => s + (d.total_debt - d.paid_amount), 0);
    if (totalDebt / mInc > 3) advices.push({ title: currentLang === 'id' ? 'Kurangi rasio hutang' : 'Reduce debt ratio', desc: currentLang === 'id' ? `Rasio hutang terhadap pemasukan sangat tinggi. Prioritaskan pelunasan.` : 'Debt to income ratio is very high. Prioritize repayment.' });
  }

  if (advices.length === 0) {
    advices.push({ title: currentLang === 'id' ? 'Catat transaksi harian' : 'Record daily transactions', desc: currentLang === 'id' ? 'Pencatatan rutin membantu kamu memahami pola keuangan dengan lebih baik.' : 'Regular recording helps you understand your financial patterns better.' });
  }

  list.innerHTML = advices.slice(0, 4).map((a, i) => `<li class="saran-item"><div class="saran-num">${i + 1}</div><div class="saran-text"><div class="saran-main">${a.title}</div><div class="saran-detail">${a.desc}</div></div></li>`).join('');
}
