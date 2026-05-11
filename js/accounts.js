import { $, $$, formatRp, parseRpInput, fmtRpInput, icons, initAutoFit, initFmtInputs, openModal, closeModal, toast } from './utils.js';
import { t } from './i18n.js';
import { getAccounts, addAccount, updateAccount, deleteAccount, addLog } from './data.js';
import { renderDashboard, updateSaldo } from './dashboard.js';

const ACC_ICONS = { Cash: 'wallet', Bank: 'landmark', 'E-Wallet': 'smartphone', Crypto: 'bitcoin', Asuransi: 'shield' };
let editingId = null;

export function renderCOA() {
  const list = $('#coaList');
  const accounts = getAccounts();
  list.innerHTML = accounts.map(a => `<div class="coa-card"><div class="coa-card-icon"><i data-lucide="${ACC_ICONS[a.type] || 'wallet'}"></i></div><div class="coa-card-info"><div class="coa-card-name">${a.name} <span class="perm-badge">${t('permanent')}</span></div><div class="coa-card-type">${a.type}</div></div><div class="coa-card-val">${formatRp(a.balance)}</div><div class="coa-card-actions"><button class="coa-btn" data-edit="${a.id}" title="Edit"><i data-lucide="pencil"></i></button><button class="coa-btn" data-del="${a.id}" title="Hapus"><i data-lucide="trash-2"></i></button></div></div>`).join('');
  icons();
  list.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
    const a = getAccounts().find(x => x.id === b.dataset.edit);
    if (!a) return;
    editingId = a.id;
    $('#editAccTitle').textContent = 'Edit ' + a.name;
    $('#editAccBalance').value = a.balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    openModal('editAccountModal');
    initFmtInputs($('#editAccountModal'));
    $('#editAccBalance').focus();
  }));
  list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    const a = getAccounts().find(x => x.id === b.dataset.del);
    if (!a) return;
    await deleteAccount(a.id);
    await addLog('coa', 'Akun dihapus', '"' + a.name + '"');
    renderCOA();
    renderDashboard();
    toast(t('account_deleted'));
  }));
}

export function initAccounts() {
  $('#coaAddBtn').addEventListener('click', () => {
    $('#newAccName').value = '';
    $('#newAccType').value = '';
    $('#newAccBalance').value = '';
    openModal('addAccountModal');
    initFmtInputs($('#addAccountModal'));
  });

  $('#addAccPost').addEventListener('click', async () => {
    const name = $('#newAccName').value.trim();
    const type = $('#newAccType').value;
    const balance = parseRpInput($('#newAccBalance'));
    if (!name) { toast(t('name_required')); return; }
    if (!type) { toast(t('type_required')); return; }
    if (balance < 0) { toast(t('no_negative')); return; }
    closeModal('addAccountModal');
    openModal('confirmModal');
    $('#confirmMsg').textContent = t('correct');
    window._confirmCb = async () => {
      closeModal('confirmModal');
      await addAccount(name, type, balance);
      await addLog('coa', 'Akun ditambahkan', '"' + name + '" (' + type + ')');
      renderCOA();
      renderDashboard();
      toast(`"${name}" ${t('account_added')}`);
      window._confirmCb = null;
    };
  });

  $('#editAccSave').addEventListener('click', async () => {
    const val = parseRpInput($('#editAccBalance'));
    if (isNaN(val) || val < 0) { toast(t('invalid_amount')); return; }
    closeModal('editAccountModal');
    await updateAccount(editingId, { balance: val });
    await addLog('coa', 'Saldo diperbarui', formatRp(val));
    renderCOA();
    renderDashboard();
    updateSaldo();
    toast(t('account_updated'));
    editingId = null;
  });
}
