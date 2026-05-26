import axios from "axios";
import FormData from "form-data";

const CATBOX_API = "https://catbox.moe/user/api.php";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyBuffer = Buffer.concat(chunks);

    const contentType = req.headers["content-type"] || "application/octet-stream";
    const filename = decodeURIComponent(req.headers["x-file-name"] || "upload.bin");
    const userhash = (req.headers["x-catbox-userhash"] || "").toString();

    if (!bodyBuffer.length) {
      return res.status(400).json({ ok: false, error: "Empty file body" });
    }

    const form = new FormData();
    form.append("reqtype", "fileupload");
    if (userhash) form.append("userhash", userhash);
    form.append("fileToUpload", bodyBuffer, { filename, contentType });

    const catboxRes = await axios.post(CATBOX_API, form, {
      timeout: 120000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
      headers: {
        ...form.getHeaders(),
        accept: "*/*",
        "user-agent": "Mozilla/5.0"
      }
    });

    const raw = typeof catboxRes.data === "string" ? catboxRes.data.trim() : "";
    const ok = catboxRes.status === 200 && /^https?:\/\//i.test(raw);

    if (!ok) {
      return res.status(502).json({ ok: false, status: catboxRes.status, error: raw || "Upload gagal ke Catbox" });
    }

    return res.status(200).json({ ok: true, url: raw, filename });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || "Internal server error" });
  }
}

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "100mb"
  }
};
