const DB_NAME = "TechMultiStorageDB";
const STORE_NAME = "UploadHistory";
let db;

const $ = (id) => document.getElementById(id);

const el = {
  uploadForm: $("uploadForm"),
  fileInput: $("fileInput"),
  defaultUploadState: $("defaultUploadState"),
  filePreviewContainer: $("filePreviewContainer"),
  previewGrid: $("previewGrid"),
  selectedCountText: $("selectedCountText"),
  clearSelectionBtn: $("clearSelectionBtn"),
  progressContainer: $("progressContainer"),
  statusText: $("statusText"),
  progressCount: $("progressCount"),
  progressBar: $("progressBar"),
  historyList: $("historyList"),
  historyCount: $("historyCount"),
  emptyHistory: $("emptyHistory"),
  deleteAllBtn: $("deleteAllBtn")
};

const initDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onerror = () => reject(new Error("IndexedDB error"));
  request.onsuccess = (e) => { db = e.target.result; resolve(); };
  request.onupgradeneeded = (e) => {
    const database = e.target.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
  };
});

const idb = (mode, action) => new Promise((resolve, reject) => {
  const tx = db.transaction([STORE_NAME], mode);
  const store = tx.objectStore(STORE_NAME);
  const req = action(store);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const formatBytes = (bytes) => bytes === 0 ? "0 B" : `${(bytes / (1024 ** Math.floor(Math.log(bytes) / Math.log(1024)))).toFixed(1)} ${["B","KB","MB","GB"][Math.floor(Math.log(bytes) / Math.log(1024))]}`;

const toast = (msg) => {
  const bar = document.createElement("div");
  bar.className = "fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold";
  bar.textContent = msg;
  document.body.appendChild(bar);
  setTimeout(() => bar.remove(), 2500);
};

function renderPreview(files) {
  el.previewGrid.innerHTML = "";
  if (!files.length) {
    el.defaultUploadState.classList.remove("hidden");
    el.filePreviewContainer.classList.add("hidden");
    return;
  }
  el.defaultUploadState.classList.add("hidden");
  el.filePreviewContainer.classList.remove("hidden");
  el.selectedCountText.textContent = `${files.length} File Terpilih`;
  files.forEach((file) => {
    const card = document.createElement("div");
    card.className = "border border-gray-200 rounded-lg p-3 bg-white";
    card.innerHTML = `<p class="text-xs font-bold truncate">${file.name}</p><p class="text-[11px] text-gray-500 mt-1">${formatBytes(file.size)}</p>`;
    el.previewGrid.appendChild(card);
  });
}

async function uploadToApi(file) {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'content-type': file.type || 'application/octet-stream', 'x-file-name': encodeURIComponent(file.name) },
    body: await file.arrayBuffer()
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Upload gagal');
  return data.url;
}

async function renderHistory() {
  const items = (await idb("readonly", (s) => s.getAll())).sort((a, b) => b.createdAt - a.createdAt);
  el.historyList.innerHTML = '';
  el.historyCount.textContent = `${items.length} file`;
  el.deleteAllBtn.classList.toggle('hidden', items.length === 0);
  if (!items.length) {
    el.historyList.innerHTML = `<div id="emptyHistory" class="text-center py-12"><p class="text-sm text-gray-400 font-medium">Belum ada data di dalam riwayat.</p></div>`;
    return;
  }
  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'border border-gray-200 rounded-xl p-4 bg-white flex justify-between gap-3';
    row.innerHTML = `<div><p class="text-sm font-bold">${item.name}</p><a href="${item.url}" target="_blank" class="text-xs text-blue-600 break-all">${item.url}</a></div><button class="text-xs text-red-600 font-bold">Hapus</button>`;
    row.querySelector('button').onclick = async () => { await idb("readwrite", (s) => s.delete(item.id)); await renderHistory(); };
    el.historyList.appendChild(row);
  });
}

el.fileInput.addEventListener('change', () => renderPreview([...el.fileInput.files]));
el.clearSelectionBtn.addEventListener('click', () => { el.fileInput.value = ''; renderPreview([]); });
el.deleteAllBtn.addEventListener('click', async () => { await idb("readwrite", (s) => s.clear()); await renderHistory(); toast('Riwayat dihapus'); });

el.uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const files = [...el.fileInput.files];
  if (!files.length) return toast('Pilih file dulu');

  el.progressContainer.classList.remove('hidden');
  let done = 0;
  for (const file of files) {
    el.statusText.textContent = `Uploading ${file.name}`;
    try {
      const url = await uploadToApi(file);
      await idb("readwrite", (s) => s.add({ name: file.name, size: file.size, url, createdAt: Date.now() }));
    } catch (err) {
      toast(`Gagal: ${file.name}`);
    }
    done += 1;
    el.progressCount.textContent = `${done}/${files.length}`;
    el.progressBar.style.width = `${(done / files.length) * 100}%`;
  }
  await renderHistory();
  toast('Upload selesai');
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => null);

(async () => { await initDB(); await renderHistory(); })();
