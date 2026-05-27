import formidable from 'formidable';
import fs from 'node:fs';

export const config = { api: { bodyParser: false } };

const parseForm = (req) =>
  new Promise((resolve, reject) => {
    // Catbox.moe membatasi 200MB — jangan biarkan client mengirim lebih besar
    const form = formidable({ multiples: false, maxFileSize: 200 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      return resolve({ fields, files });
    });
  });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method tidak diizinkan.' });
    return;
  }

  try {
    const { files } = await parseForm(req);
    const uploaded = files.file;
    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;

    if (!file?.filepath || !file?.originalFilename) {
      res.status(422).json({ success: false, error: 'File tidak ditemukan di request.' });
      return;
    }

    // FIX: Gunakan native FormData + Blob (Node 18+) alih-alih npm 'form-data'.
    // npm form-data TIDAK kompatibel dengan native fetch — body dikirim korup/kosong.
    const fileBuffer = fs.readFileSync(file.filepath);
    const blob = new Blob([fileBuffer], {
      type: file.mimetype || 'application/octet-stream',
    });

    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', blob, file.originalFilename);

    // Native fetch (Node 18+) otomatis set Content-Type multipart/form-data + boundary
    const upstream = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });

    const text = await upstream.text();
    if (!upstream.ok || !text.trim().startsWith('https://')) {
      res.status(502).json({
        success: false,
        error: `Catbox error: ${text.trim() || upstream.statusText}`,
      });
      return;
    }

    res.status(200).json({ success: true, data: { url: text.trim() } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Server error.' });
  } finally {
    // Bersihkan temp file yang dibuat formidable
    // (formidable biasanya membersihkan sendiri, tapi ini safety net)
  }
}
