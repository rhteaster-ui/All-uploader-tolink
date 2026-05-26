import formidable from 'formidable';
import fs from 'node:fs';
import FormData from 'form-data';

export const config = { api: { bodyParser: false } };

const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, maxFileSize: 1024 * 1024 * 1024 });
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

    const data = new FormData();
    data.append('reqtype', 'fileupload');
    data.append('fileToUpload', fs.createReadStream(file.filepath), file.originalFilename);

    const upstream = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      headers: data.getHeaders(),
      body: data
    });

    const text = await upstream.text();
    if (!upstream.ok || !text.startsWith('https://')) {
      res.status(502).json({ success: false, error: `Catbox error: ${text}` });
      return;
    }

    res.status(200).json({ success: true, data: { url: text.trim() } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Server error.' });
  }
}
