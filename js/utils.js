export const $ = s => document.querySelector(s);
export const $$ = s => document.querySelectorAll(s);

export function formatRp(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e12) return sign + 'Rp ' + (abs / 1e12).toFixed(1).replace('.', ',') + ' T';
  if (abs >= 1e9) return sign + 'Rp ' + (abs / 1e9).toFixed(1).replace('.', ',') + ' M';
  return sign + 'Rp ' + abs.toLocaleString('id-ID');
}

export function fmtRpInput(el) {
  let raw = el.value.replace(/\D/g, '');
  if (raw === '') { el.value = ''; return; }
  el.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseRpInput(el) {
  return parseInt(el.value.replace(/\D/g, '')) || 0;
}

export function autoFitText(el) {
  const style = getComputedStyle(el);
  const maxW = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  if (maxW <= 0) return;
  el.style.fontSize = '';
  const orig = parseFloat(style.fontSize);
  if (el.scrollWidth <= maxW) return;
  const min = orig * 0.6;
  let size = orig;
  while (size > min && el.scrollWidth > maxW) { size -= 0.5; el.style.fontSize = size + 'px'; }
}

export function initAutoFit() {
  $$('.auto-fit').forEach(el => {
    autoFitText(el);
    new ResizeObserver(() => autoFitText(el)).observe(el);
  });
}

export function initFmtInputs(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-fmt-rp]').forEach(el => {
    if (el._fmtInit) return;
    el._fmtInit = true;
    el.addEventListener('input', () => fmtRpInput(el));
    el.addEventListener('focus', () => el.select());
    el.addEventListener('blur', () => { if (!el.value) el.value = ''; });
  });
}

let toastTimer = null;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

export function showLoading() { $('#loadingOverlay')?.classList.add('active'); }
export function hideLoading() { $('#loadingOverlay')?.classList.remove('active'); }

export function openModal(id) { document.getElementById(id)?.classList.add('active'); }
export function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

export function compressImg(file, maxW = 600, q = 0.5) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxW) { h = (maxW / w) * h; w = maxW; }
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = rej;
      img.src = e.target.result;
    };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

export function getDueInfo(ds) {
  if (!ds) return { text: '', cls: 'tag-badge-ok' };
  const due = new Date(ds + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due - today) / 864e5);
  if (diff > 7) return { text: '', cls: 'tag-badge-ok' };
  if (diff > 0) return { text: '', cls: 'tag-badge-warn' };
  if (diff === 0) return { text: '', cls: 'tag-badge-due' };
  return { text: '', cls: 'tag-badge-overdue' };
}

export const ACC_ICONS = { 'Cash': 'wallet', 'Bank': 'landmark', 'E-Wallet': 'smartphone', 'Crypto': 'bitcoin', 'Asuransi': 'shield' };

export function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function icons() { lucide.createIcons(); }
