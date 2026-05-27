const notifEl = document.getElementById('notif');
const uploadForm = document.getElementById('uploadForm');
const filesInput = document.getElementById('files');
const resultEl = document.getElementById('result');
const submitBtn = document.getElementById('submitBtn');
let deferredPrompt;

const showNotif = (message, type = 'ok') => {
  notifEl.textContent = message;
  notifEl.className = `top-notif show ${type}`;
  setTimeout(() => notifEl.classList.remove('show'), 2800);
};

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  showNotif('PWA siap di-install. Klik tombol install.', 'ok');
  renderInstallButton();
});

const renderInstallButton = () => {
  if (!deferredPrompt || document.getElementById('installBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'installBtn';
  btn.type = 'button';
  btn.textContent = 'Install App';
  btn.style.marginTop = '10px';
  uploadForm.appendChild(btn);
  btn.addEventListener('click', async () => {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    showNotif(choice.outcome === 'accepted' ? 'Install dimulai.' : 'Install dibatalkan.',
      choice.outcome === 'accepted' ? 'ok' : 'err');
    deferredPrompt = null;
    btn.remove();
  });
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const files = filesInput.files;
  if (!files || files.length === 0) {
    showNotif('Pilih file dulu.', 'err');
    return;
  }

  submitBtn.disabled = true;
  resultEl.innerHTML = '';

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    submitBtn.textContent = `Uploading ${i + 1}/${files.length}…`;

    // Buat placeholder card dengan status loading
    const box = document.createElement('div');
    box.className = 'box';
    box.innerHTML = `
      <div class="file-meta">
        <strong>${file.name}</strong>
        <span class="size">${formatSize(file.size)}</span>
      </div>
      <div class="status-line uploading">⏳ Mengupload…</div>`;
    resultEl.appendChild(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Upload gagal: ${file.name}`);
      }

      const url = payload.data.url;

      // Ganti placeholder dengan hasil sukses
      box.innerHTML = `
        <div class="file-meta">
          <strong>${file.name}</strong>
          <span class="size">${formatSize(file.size)}</span>
        </div>
        <div class="url">${url}</div>
        <div class="row">
          <button type="button" class="btn-copy" data-url="${url}">Copy Link</button>
          <a class="btn-open" href="${url}" target="_blank" rel="noopener noreferrer">Buka Link</a>
        </div>`;

      box.querySelector('.btn-copy').addEventListener('click', async (e) => {
        await navigator.clipboard.writeText(e.currentTarget.dataset.url);
        showNotif('Link dicopy.', 'ok');
      });

      successCount++;
    } catch (error) {
      box.innerHTML = `
        <div class="file-meta">
          <strong>${file.name}</strong>
          <span class="size">${formatSize(file.size)}</span>
        </div>
        <div class="status-line error">❌ ${error.message || 'Upload gagal.'}</div>`;
      failCount++;
    }
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Upload Sekarang';

  if (failCount === 0) {
    showNotif(`${successCount} file berhasil diupload.`, 'ok');
  } else if (successCount === 0) {
    showNotif(`Semua ${failCount} file gagal diupload.`, 'err');
  } else {
    showNotif(`${successCount} sukses, ${failCount} gagal.`, 'err');
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/service-worker.js');
    } catch {
      showNotif('Service worker gagal aktif.', 'err');
    }
  });
}
