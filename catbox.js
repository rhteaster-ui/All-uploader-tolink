import axios from "axios";
import FormData from "form-data";
import fs from "node:fs";
import path from "node:path";

const API = "https://catbox.moe/user/api.php";
const INPUT = "./image.png";
const USER_HASH = "";

async function upload() {
  const form = new FormData();

  form.append("reqtype", "fileupload");

  if (USER_HASH) {
    form.append("userhash", USER_HASH);
  }

  form.append("fileToUpload", fs.createReadStream(INPUT), {
    filename: path.basename(INPUT),
    contentType: "application/octet-stream"
  });

  const res = await axios.post(API, form, {
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

  const resultUrl = typeof res.data === "string" && res.data.startsWith("https://")
    ? res.data.trim()
    : null;

  return {
    Status: res.status === 200 && !!resultUrl,
    Code: res.status,
    Input: INPUT,
    Result_url: resultUrl || res.data
  };
}

upload()
  .then((data) => console.log(JSON.stringify(data, null, 2)))
  .catch((err) => {
    console.log(
      JSON.stringify(
        {
          Status: false,
          Code: err.response?.status || 500,
          Input: INPUT,
          Result_url: err.message
        },
        null,
        2
      )
    );
  });