import { $, toast, icons, compressImg } from './utils.js';
import { t } from './i18n.js';
import { getProfile, updateProfile, addLog } from './data.js';

export function populateProfileForm() {
  const p = getProfile();
  if (!p) return;
  $('#profileName').value = p.name || '';
  $('#profileEmail').value = p.email || '';
  $('#profilePhone').value = p.phone || '';
  updatePhotoPreview(p.photo);
}

function updatePhotoPreview(photo) {
  const img = $('#profilePhotoImg');
  const ico = $('#profilePhotoIcon');
  if (photo) { img.src = photo; img.style.display = 'block'; ico.style.display = 'none'; }
  else { img.style.display = 'none'; ico.style.display = ''; }
}

export function updateAllLogos(photo) {
  if (!photo) return;
  const targets = ['#logoBtn', '#sbLogoWrap', '#aboutLogo'];
  targets.forEach(sel => {
    const el = $(sel);
    if (!el) return;
    let img = el.querySelector('img');
    if (!img) {
      const old = el.querySelector('svg, span');
      if (old) old.style.display = 'none';
      img = document.createElement('img');
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0';
      if (sel === '#sbLogoWrap') img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
      if (sel === '#aboutLogo') img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
      el.appendChild(img);
    }
    img.src = photo;
  });
}

export function initProfile() {
  $('#profilePhotoBtn').addEventListener('click', () => $('#photoInput').click());

  $('#photoInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast(t('image_only')); return; }
    if (file.size > 2 * 1024 * 1024) { toast(t('max_2mb')); return; }
    try {
      const compressed = await compressImg(file, 400, 0.5);
      await updateProfile({ photo: compressed });
      updatePhotoPreview(compressed);
      updateAllLogos(compressed);
      await addLog('profile', 'Foto profil diubah');
      toast(t('photo_changed'));
    } catch { toast('Error'); }
  });

  $('#profileSaveBtn').addEventListener('click', async () => {
    const name = $('#profileName').value.trim();
    if (!name) { toast(t('name_empty')); $('#profileName').focus(); return; }
    const email = $('#profileEmail').value.trim();
    const phone = $('#profilePhone').value.trim();
    await updateProfile({ name, email, phone });
    await addLog('profile', 'Profile diperbarui', 'Nama: ' + name);
    $('#dashUserName').textContent = name;
    toast(t('profile_saved'));
  });
}
