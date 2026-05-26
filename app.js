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
    showNotif(choice.outcome === 'accepted' ? 'Install dimulai.' : 'Install dibatalkan.', choice.outcome === 'accepted' ? 'ok' : 'err');
    deferredPrompt = null;
    btn.remove();
  });
};

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const files = filesInput.files;
  if (!files || files.length === 0) {
    showNotif('Pilih file dulu.', 'err');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';
  resultEl.innerHTML = '';

  try {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Upload gagal: ${file.name}`);
      }

      const box = document.createElement('div');
      box.className = 'box';
      box.innerHTML = `<strong>${file.name}</strong><div class="url">${payload.data.url}</div>`;
      const row = document.createElement('div');
      row.className = 'row';
      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy Link';
      copyBtn.type = 'button';
      copyBtn.onclick = async () => {
        await navigator.clipboard.writeText(payload.data.url);
        showNotif('Link dicopy.', 'ok');
      };
      row.appendChild(copyBtn);
      box.appendChild(row);
      resultEl.appendChild(box);
    }
    showNotif('Semua file berhasil diupload.', 'ok');
  } catch (error) {
    showNotif(error.message || 'Upload gagal.', 'err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload Sekarang';
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
