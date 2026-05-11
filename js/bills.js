import { $, $$, formatRp, parseRpInput, initFmtInputs, openModal, closeModal, toast, icons, compressImg, getDueInfo, todayStr } from './utils.js';
import { t, currentLang } from './i18n.js';
import { getAccounts, addDebt, updateDebt, deleteDebt, addReceivable, updateReceivable, deleteReceivable, addLog, updateAccount, fetchDebts, fetchReceivables } from './data.js';
import { renderDashboard, updateSaldo } from './dashboard.js';

let tagType = null;

export function initBills() {
  $('#tagDebtBtn').addEventListener('click', () => {
    if (tagType === 'debt') { tagType = null; $('#tagDebtBtn').classList.remove('on-d'); $('#tagForm').innerHTML = ''; renderTagAllList(); return; }
    tagType = 'debt'; $('#tagDebtBtn').classList.add('on-d'); $('#tagRecvBtn').classList.remove('on-r');
    $('#tagList').innerHTML = ''; renderTagForm();
  });
  $('#tagRecvBtn').addEventListener('click', () => {
    if (tagType === 'receivable') { tagType = null; $('#tagRecvBtn').classList.remove('on-r'); $('#tagForm').innerHTML = ''; renderTagAllList(); return; }
    tagType = 'receivable'; $('#tagRecvBtn').classList.add('on-r'); $('#tagDebtBtn').classList.remove('on-d');
    $('#tagList').innerHTML = ''; renderTagForm();
  });
}

export function resetBills() {
  tagType = null;
  $('#tagDebtBtn').classList.remove('on-d');
  $('#tagRecvBtn').classList.remove('on-r');
  $('#tagForm').innerHTML = '';
}

export async function renderTagAllList() {
  const [debts, recvs] = await Promise.all([fetchDebts(), fetchReceivables()]);
  const activeDebts = debts.filter(d => (d.total_debt - d.paid_amount) > 0);
  const activeRecvs = recvs.filter(r => (r.amount - r.paid_amount) > 0);

  if (!activeDebts.length && !activeRecvs.length) {
    $('#tagList').innerHTML = `<div class="tag-empty"><div class="tag-empty-t">${t('no_bills')}</div><div class="tag-empty-s">${t('no_bills_sub')}</div></div>`;
    return;
  }

  let html = '';
  if (activeDebts.length) {
    html += `<div style="font-size:.72rem;font-weight:600;color:var(--red);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">${t('debt')}</div>`;
    html += activeDebts.map(d => renderDebtCard(d)).join('');
  }
  if (activeRecvs.length) {
    html += `<div style="font-size:.72rem;font-weight:600;color:var(--amber);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;margin-top:${activeDebts.length ? '16' : '0'}px">${t('receivable')}</div>`;
    html += activeRecvs.map(r => renderRecvCard(r)).join('');
  }
  $('#tagList').innerHTML = html;
  icons();
  attachTagEvents($('#tagList'));
}

async function renderTagList() {
  if (!tagType) { renderTagAllList(); return; }
  if (tagType === 'debt') {
    const debts = await fetchDebts();
    const active = debts.filter(d => (d.total_debt - d.paid_amount) > 0);
    if (!active.length) { $('#tagList').innerHTML = `<div class="tag-empty"><div class="tag-empty-t">${t('no_debts')}</div><div class="tag-empty-s">${t('no_debts_sub')}</div></div>`; return; }
    $('#tagList').innerHTML = active.map(d => renderDebtCard(d)).join('');
  } else {
    const recvs = await fetchReceivables();
    const active = recvs.filter(r => (r.amount - r.paid_amount) > 0);
    if (!active.length) { $('#tagList').innerHTML = `<div class="tag-empty"><div class="tag-empty-t">${t('no_recvs')}</div><div class="tag-empty-s">${t('no_recvs_sub')}</div></div>`; return; }
    $('#tagList').innerHTML = active.map(r => renderRecvCard(r)).join('');
  }
  icons();
  attachTagEvents($('#tagList'));
}

function renderDebtCard(d) {
  const di = getDueInfo(d.due_date);
  const rem = d.total_debt - d.paid_amount;
  return `<div class="tag-card"><div class="tag-card-head"><div><div class="tag-card-name">${d.name}</div>${d.description ? `<div class="tag-card-desc">${d.paid_count || 0}/${d.total_tenor || '?'}</div>` : ''}</div><span class="tag-badge ${di.cls}">${di.text}</span></div><div class="tag-info"><div class="tag-info-item"><span>${t('installment')}</span><span>${formatRp(d.installment_amount)}</span></div><div class="tag-info-item"><span>${t('total')}</span><span>${formatRp(d.total_debt)}</span></div><div class="tag-info-item"><span>${t('paid')}</span><span>${formatRp(d.paid_amount)}</span></div><div class="tag-info-item"><span>${t('remaining')}</span><span>${formatRp(rem)}</span></div></div><div class="tag-actions"><button class="tag-act-btn primary" data-dfull="${d.id}">${t('full_pay')}</button><button class="tag-act-btn primary" data-dmin="${d.id}">${t('min_pay')}</button><button class="tag-act-btn danger" data-ddel="${d.id}">${t('delete')}</button></div></div>`;
}

function renderRecvCard(r) {
  const rem = r.amount - r.paid_amount;
  return `<div class="tag-card"><div class="tag-card-head"><div style="display:flex;gap:10px;align-items:flex-start"><div style="flex:1"><div class="tag-card-name">${r.name}</div><div class="tag-card-desc">${t('borrow_date')}: ${r.borrow_date}</div>${r.contact ? `<div class="tag-card-desc">${t('contact')}: ${r.contact}</div>` : ''}</div>${r.receipt_image ? `<div class="tag-recv-img" data-rimg="${r.id}"><img src="${r.receipt_image}" alt="Bukti"></div>` : ''}</div></div><div class="tag-info"><div class="tag-info-item"><span>${t('nominal')}</span><span>${formatRp(r.amount)}</span></div><div class="tag-info-item"><span>${t('received')}</span><span>${formatRp(r.paid_amount)}</span></div><div class="tag-info-item"><span>${t('remaining')}</span><span>${formatRp(rem)}</span></div></div><div class="tag-actions"><button class="tag-act-btn primary" data-rfull="${r.id}">${t('full_pay')}</button><button class="tag-act-btn primary" data-rcicil="${r.id}">${t('cicil_pay')}</button><button class="tag-act-btn danger" data-rdel="${r.id}">${t('delete')}</button></div></div>`;
}

function attachTagEvents(container) {
  container.querySelectorAll('[data-dfull]').forEach(b => b.addEventListener('click', () => handleDebtFull(b.dataset.dfull)));
  container.querySelectorAll('[data-dmin]').forEach(b => b.addEventListener('click', () => handleDebtMin(b.dataset.dmin)));
  container.querySelectorAll('[data-ddel]').forEach(b => b.addEventListener('click', () => handleDebtDel(b.dataset.ddel)));
  container.querySelectorAll('[data-rimg]').forEach(b => b.addEventListener('click', () => {
    const r = window._recvCache?.find(x => x.id === b.dataset.rimg);
    if (r && r.receipt_image) { $('#tagImgView').src = r.receipt_image; openModal('tagImgModal'); }
  }));
  container.querySelectorAll('[data-rfull]').forEach(b => b.addEventListener('click', () => handleRecvFull(b.dataset.rfull)));
  container.querySelectorAll('[data-rcicil]').forEach(b => b.addEventListener('click', () => handleRecvCicil(b.dataset.rcicil)));
  container.querySelectorAll('[data-rdel]').forEach(b => b.addEventListener('click', () => handleRecvDel(b.dataset.rdel)));
}

function renderTagForm() {
  if (!tagType) { $('#tagForm').innerHTML = ''; return; }
  const today = todayStr();
  if (tagType === 'debt') {
    $('#tagForm').innerHTML = `<div class="tag-form">
      <div class="form-group"><label class="form-label">${t('debt_name')}</label><input type="text" class="form-input" id="tdName"></div>
      <div class="form-group"><label class="form-label">${t('tenor')}</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><input type="number" class="form-input" id="tdPaid" placeholder="${t('paid_count')}" min="0" value="0"><input type="number" class="form-input" id="tdTenor" placeholder="${t('total_tenor')}" min="1"></div></div>
      <div class="form-group"><label class="form-label">${t('installment')}</label><input type="text" inputmode="numeric" class="form-input" id="tdInstall" placeholder="0" data-fmt-rp></div>
      <div class="form-group"><label class="form-label">${t('due_date')}</label><input type="date" class="form-input" id="tdDue" value="${today}"></div>
      <button class="form-btn form-btn-primary" id="tdAdd">${t('add_debt')}</button>
    </div>`;
    icons();
    initFmtInputs($('#tagForm'));
    $('#tdAdd').addEventListener('click', async () => {
      const name = $('#tdName').value.trim();
      const paid = parseInt($('#tdPaid').value) || 0;
      const tenor = parseInt($('#tdTenor').value) || 0;
      const inst = parseRpInput($('#tdInstall'));
      const due = $('#tdDue').value;
      if (!name) { toast(t('name_required')); return; }
      if (tenor < 1) { toast(t('tenor_required')); return; }
      if (inst <= 0) { toast(t('invalid_amount')); return; }
      if (!due) { toast(t('name_required')); return; }
      const remaining = Math.max(0, tenor - paid);
      const total = remaining * inst;
      await addDebt({ name, description: paid + '/' + tenor, installment_amount: inst, total_debt: total, paid_amount: 0, paid_count: 0, total_tenor: tenor, due_date: due });
      await addLog('tagihan', 'Hutang ditambahkan', '"' + name + '" ' + formatRp(total));
      renderTagList();
      renderTagForm();
      toast(t('debt_added'));
    });
  } else {
    const accounts = getAccounts();
    $('#tagForm').innerHTML = `<div class="tag-form">
      <div class="form-group"><label class="form-label">${t('party_name')}</label><input type="text" class="form-input" id="trName"></div>
      <div class="form-group"><label class="form-label">${t('borrow_date')}</label><input type="date" class="form-input" id="trDate" value="${today}"></div>
      <div class="form-group"><label class="form-label">${t('nominal')}</label><input type="text" inputmode="numeric" class="form-input" id="trAmount" placeholder="0" data-fmt-rp></div>
      <div class="form-group"><label class="form-label">${t('source_account')}</label><select class="form-input" id="trSource">${accounts.map(a => `<option value="${a.id}">${a.name} (${formatRp(a.balance)})</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">${t('contact')}</label><input type="text" class="form-input" id="trContact"></div>
      <div class="form-group"><label class="form-label">${t('receipt')}</label>
        <div class="tag-upload-wrap"><div class="tag-upload" id="trUpload"><i data-lucide="camera"></i><span>${t('tap_to_upload')}</span></div><input type="file" accept="image/*" class="hidden-input" id="trFile"></div>
      </div>
      <button class="form-btn form-btn-primary" id="trAdd">${t('add_recv')}</button>
    </div>`;
    icons();
    initFmtInputs($('#tagForm'));
    let pendingImg = null;
    $('#trUpload').addEventListener('click', () => $('#trFile').click());
    $('#trFile').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      if (!f.type.startsWith('image/')) { toast(t('image_only')); return; }
      if (f.size > 2 * 1024 * 1024) { toast(t('max_2mb')); return; }
      try { pendingImg = await compressImg(f); $('#trUpload').innerHTML = `<img src="${pendingImg}" alt="Bukti">`; $('#trUpload').style.borderStyle = 'solid'; } catch { toast('Error'); }
    });
    $('#trAdd').addEventListener('click', async () => {
      const name = $('#trName').value.trim();
      const date = $('#trDate').value;
      const amount = parseRpInput($('#trAmount'));
      const contact = $('#trContact').value.trim();
      const sourceId = $('#trSource').value;
      if (!name) { toast(t('name_required')); return; }
      if (amount <= 0) { toast(t('invalid_amount')); return; }
      if (!date) { toast(t('name_required')); return; }
      const acc = getAccounts().find(a => a.id === sourceId);
      if (!acc || acc.balance < amount) { toast(t('mut_insufficient')); return; }
      await addReceivable({ name, borrow_date: date, amount, contact, source_account_id: sourceId, receipt_image: pendingImg || null, paid_amount: 0 });
      await addLog('tagihan', 'Piutang ditambahkan', '"' + name + '" ' + formatRp(amount));
      renderTagList();
      renderTagForm();
      renderDashboard();
      updateSaldo();
      toast(t('recv_added'));
    });
  }
}

function makeAccSelect(id, defaultId) {
  const accounts = getAccounts();
  if (!accounts.length) return '';
  return `<div class="form-group"><label class="form-label">${id.includes('Pay') ? t('pay_from') : t('receive_to')}</label><select class="form-input" id="${id}">${accounts.map(a => `<option value="${a.id}"${a.id === defaultId ? ' selected' : ''}>${a.name} (${formatRp(a.balance)})</option>`).join('')}</select></div>`;
}

async function handleDebtFull(id) {
  const debts = await fetchDebts();
  const d = debts.find(x => x.id === id); if (!d) return;
  const rem = d.total_debt - d.paid_amount;
  const pay = Math.min(d.installment_amount, rem);
  $('#tagConfirmMsg').textContent = `${t('full_pay')}: ${formatRp(pay)}`;
  $('#tagConfirmExtra').innerHTML = makeAccSelect('tagConfSrc');
  $('#tagConfirmYes').textContent = t('pay');
  openModal('tagConfirmModal');
  icons();
  window._tagConfirmCb = async () => {
    const accId = document.getElementById('tagConfSrc')?.value;
    const acc = getAccounts().find(a => a.id === accId);
    if (!acc) { toast(t('choose_account')); return; }
    if (acc.balance < pay) { toast(t('mut_insufficient')); return; }
    await updateAccount(acc.id, { balance: acc.balance - pay });
    const newPaid = d.paid_amount + pay;
    const newCount = (d.paid_count || 0) + 1;
    await updateDebt(id, { paid_amount: Math.min(newPaid, d.total_debt), paid_count: Math.min(newCount, d.total_tenor || 999) });
    await addLog('tagihan', 'Bayar hutang', '"' + d.name + '" ' + formatRp(pay));
    renderTagList();
    renderDashboard();
    updateSaldo();
    toast(t('debt_paid'));
  };
}

async function handleDebtMin(id) {
  const debts = await fetchDebts();
  const d = debts.find(x => x.id === id); if (!d) return;
  const rem = d.total_debt - d.paid_amount;
  $('#tagPayTitle').textContent = t('min_pay');
  $('#tagPayExtra').innerHTML = makeAccSelect('tagPaySrc');
  $('#tagPayAmount').value = '';
  $('#tagPayAmount').readOnly = false;
  openModal('tagPayModal');
  icons();
  initFmtInputs($('#tagPayModal'));
  window._tagPayCb = async () => {
    const amt = parseRpInput($('#tagPayAmount'));
    if (amt <= 0) { toast(t('invalid_amount')); return; }
    if (amt > rem) { toast(t('invalid_amount')); return; }
    const accId = document.getElementById('tagPaySrc')?.value;
    const acc = getAccounts().find(a => a.id === accId);
    if (!acc) { toast(t('choose_account')); return; }
    if (acc.balance < amt) { toast(t('mut_insufficient')); return; }
    await updateAccount(acc.id, { balance: acc.balance - amt });
    await updateDebt(id, { paid_amount: d.paid_amount + amt });
    await addLog('tagihan', 'Cicil hutang', '"' + d.name + '" ' + formatRp(amt));
    renderTagList();
    renderDashboard();
    updateSaldo();
    toast(t('debt_paid'));
  };
}

async function handleDebtDel(id) {
  $('#tagConfirmMsg').textContent = t('will_delete');
  $('#tagConfirmExtra').innerHTML = '';
  $('#tagConfirmYes').textContent = t('delete');
  openModal('tagConfirmModal');
  window._tagConfirmCb = async () => {
    await deleteDebt(id);
    await addLog('tagihan', 'Hutang dihapus');
    renderTagList();
    toast(t('debt_deleted'));
  };
}

async function handleRecvFull(id) {
  const recvs = await fetchReceivables();
  window._recvCache = recvs;
  const r = recvs.find(x => x.id === id); if (!r) return;
  const rem = r.amount - r.paid_amount;
  $('#tagConfirmMsg').textContent = `${r.name} — ${formatRp(rem)}`;
  $('#tagConfirmExtra').innerHTML = makeAccSelect('tagConfSrc', r.source_account_id);
  $('#tagConfirmYes').textContent = t('received_btn');
  openModal('tagConfirmModal');
  icons();
  window._tagConfirmCb = async () => {
    const accId = document.getElementById('tagConfSrc')?.value || r.source_account_id;
    const acc = getAccounts().find(a => a.id === accId);
    if (acc) await updateAccount(acc.id, { balance: acc.balance + rem });
    await updateReceivable(id, { paid_amount: r.amount });
    await addLog('tagihan', 'Piutang lunas', '"' + r.name + '" ' + formatRp(rem));
    renderTagList();
    renderDashboard();
    updateSaldo();
    toast(t('recv_received'));
  };
}

async function handleRecvCicil(id) {
  const recvs = await fetchReceivables();
  window._recvCache = recvs;
  const r = recvs.find(x => x.id === id); if (!r) return;
  const rem = r.amount - r.paid_amount;
  $('#tagPayTitle').textContent = t('cicil_pay');
  $('#tagPayExtra').innerHTML = makeAccSelect('tagPaySrc', r.source_account_id);
  $('#tagPayAmount').value = '';
  $('#tagPayAmount').readOnly = false;
  openModal('tagPayModal');
  icons();
  initFmtInputs($('#tagPayModal'));
  window._tagPayCb = async () => {
    const amt = parseRpInput($('#tagPayAmount'));
    if (amt <= 0) { toast(t('invalid_amount')); return; }
    if (amt > rem) { toast(t('invalid_amount')); return; }
    const accId = document.getElementById('tagPaySrc')?.value || r.source_account_id;
    const acc = getAccounts().find(a => a.id === accId);
    if (acc) await updateAccount(acc.id, { balance: acc.balance + amt });
    await updateReceivable(id, { paid_amount: r.paid_amount + amt });
    await addLog('tagihan', 'Cicil piutang', '"' + r.name + '" ' + formatRp(amt));
    renderTagList();
    renderDashboard();
    updateSaldo();
    toast(t('recv_received'));
  };
}

async function handleRecvDel(id) {
  $('#tagConfirmMsg').textContent = t('will_delete');
  $('#tagConfirmExtra').innerHTML = '';
  $('#tagConfirmYes').textContent = t('delete');
  openModal('tagConfirmModal');
  window._tagConfirmCb = async () => {
    await deleteReceivable(id);
    await addLog('tagihan', 'Piutang dihapus');
    renderTagList();
    toast(t('recv_deleted'));
  };
}

export function initTagModals() {
  $('#tagConfirmYes').addEventListener('click', () => {
    closeModal('tagConfirmModal');
    if (window._tagConfirmCb) { window._tagConfirmCb(); window._tagConfirmCb = null; }
  });
  $('#tagPayYes').addEventListener('click', () => {
    closeModal('tagPayModal');
    if (window._tagPayCb) { window._tagPayCb(); window._tagPayCb = null; }
  });
}
