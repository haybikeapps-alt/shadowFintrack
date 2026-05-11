import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let cachedProfile = null;
let cachedAccounts = [];

export function getProfile() { return cachedProfile; }
export function getAccounts() { return cachedAccounts; }
export function getUserId() { return sb.auth.currentUser?.id; }

export async function initProfile() {
  const uid = getUserId();
  if (!uid) return;
  let { data } = await sb.from('profiles').select('*').eq('id', uid).single();
  if (!data) {
    const meta = sb.auth.currentUser?.user_metadata || {};
    const { data: newData } = await sb.from('profiles').insert({ id: uid, name: meta.name || 'User', email: sb.auth.currentUser?.email || '' }).select().single();
    data = newData;
  }
  cachedProfile = data || { id: uid, name: 'User', email: '', phone: '', photo: null, theme: 'light', lang: 'id' };
  const { data: accs } = await sb.from('accounts').select('*').eq('user_id', uid).order('created_at', { ascending: true });
  cachedAccounts = accs || [];
}

export async function updateProfile(updates) {
  const uid = getUserId();
  const { data, error } = await sb.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', uid).select().single();
  if (!error && data) cachedProfile = data;
  return { data, error };
}

export async function addAccount(name, type, balance) {
  const uid = getUserId();
  const { data, error } = await sb.from('accounts').insert({ user_id: uid, name, type, balance }).select().single();
  if (!error && data) cachedAccounts.push(data);
  return { data, error };
}

export async function updateAccount(id, updates) {
  const { data, error } = await sb.from('accounts').update(updates).eq('id', id).select().single();
  if (!error && data) { const i = cachedAccounts.findIndex(a => a.id === id); if (i >= 0) cachedAccounts[i] = data; }
  return { data, error };
}

export async function deleteAccount(id) {
  await sb.from('accounts').delete().eq('id', id);
  cachedAccounts = cachedAccounts.filter(a => a.id !== id);
}

export async function addTransaction(row) {
  const uid = getUserId();
  const { data, error } = await sb.from('transactions').insert({ user_id: uid, ...row }).select().single();
  if (row.account_id && row.type === 'income') {
    const acc = cachedAccounts.find(a => a.id === row.account_id);
    if (acc) { await updateAccount(acc.id, { balance: acc.balance + row.amount }); }
  } else if (row.account_id && row.type === 'expense') {
    const acc = cachedAccounts.find(a => a.id === row.account_id);
    if (acc) { await updateAccount(acc.id, { balance: Math.max(0, acc.balance - row.amount) }); }
  }
  return { data, error };
}

export async function addMutation(row) {
  const uid = getUserId();
  const { data, error } = await sb.from('mutations').insert({ user_id: uid, ...row }).select().single();
  if (!error) {
    const fromAcc = cachedAccounts.find(a => a.id === row.from_account_id);
    const toAcc = cachedAccounts.find(a => a.id === row.to_account_id);
    if (fromAcc) await updateAccount(fromAcc.id, { balance: Math.max(0, fromAcc.balance - row.amount) });
    if (toAcc) await updateAccount(toAcc.id, { balance: toAcc.balance + row.amount });
  }
  return { data, error };
}

export async function addDebt(row) {
  const uid = getUserId();
  const { data, error } = await sb.from('debts').insert({ user_id: uid, ...row }).select().single();
  return { data, error };
}

export async function updateDebt(id, updates) {
  const { data, error } = await sb.from('debts').update(updates).eq('id', id).select().single();
  return { data, error };
}

export async function deleteDebt(id) {
  await sb.from('debts').delete().eq('id', id);
}

export async function addReceivable(row) {
  const uid = getUserId();
  const { data, error } = await sb.from('receivables').insert({ user_id: uid, ...row }).select().single();
  if (!error && row.source_account_id) {
    const acc = cachedAccounts.find(a => a.id === row.source_account_id);
    if (acc) await updateAccount(acc.id, { balance: Math.max(0, acc.balance - row.amount) });
  }
  return { data, error };
}

export async function updateReceivable(id, updates) {
  const { data, error } = await sb.from('receivables').update(updates).eq('id', id).select().single();
  return { data, error };
}

export async function deleteReceivable(id) {
  await sb.from('receivables').delete().eq('id', id);
}

export async function addLog(type, action, detail) {
  const uid = getUserId();
  if (!uid) return;
  await sb.from('logs').insert({ user_id: uid, type, action, detail: detail || null });
}

export async function fetchTransactions(dateFrom) {
  const uid = getUserId();
  let q = sb.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false }).order('created_at', { ascending: false });
  if (dateFrom) q = q.gte('date', dateFrom);
  const { data } = await q;
  return data || [];
}

export async function fetchMutations(dateFrom) {
  const uid = getUserId();
  let q = sb.from('mutations').select('*').eq('user_id', uid).order('date', { ascending: false }).order('created_at', { ascending: false });
  if (dateFrom) q = q.gte('date', dateFrom);
  const { data } = await q;
  return data || [];
}

export async function fetchDebts() {
  const { data } = await sb.from('debts').select('*').eq('user_id', getUserId()).order('created_at', { ascending: false });
  return data || [];
}

export async function fetchReceivables() {
  const { data } = await sb.from('receivables').select('*').eq('user_id', getUserId()).order('created_at', { ascending: false });
  return data || [];
}

export async function fetchLogs(limit = 100) {
  const { data } = await sb.from('logs').select('*').eq('user_id', getUserId()).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

export async function bulkImportTransactions(rows) {
  const uid = getUserId();
  const toInsert = rows.map(r => ({ user_id: uid, ...r }));
  const { data, error } = await sb.from('transactions').insert(toInsert).select();
  if (!error) {
    for (const r of rows) {
      const acc = cachedAccounts.find(a => a.name === r.account_name);
      if (acc) {
        if (r.type === 'income') await updateAccount(acc.id, { balance: acc.balance + r.amount });
        else await updateAccount(acc.id, { balance: Math.max(0, acc.balance - r.amount) });
      }
    }
  }
  return { data, error };
}

export async function resetAllData() {
  const uid = getUserId();
  await sb.from('logs').delete().eq('user_id', uid);
  await sb.from('transactions').delete().eq('user_id', uid);
  await sb.from('mutations').delete().eq('user_id', uid);
  await sb.from('receivables').delete().eq('user_id', uid);
  await sb.from('debts').delete().eq('user_id', uid);
  await sb.from('accounts').delete().eq('user_id', uid);
  cachedAccounts = [];
}
