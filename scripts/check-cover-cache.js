const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");

function readRows() {
  const source = fs.readFileSync(path.join(ROOT, "zh-books.js"), "utf8");
  const payload = source.match(/const p="([^"]+)"/)?.[1];
  if (!payload) throw new Error("zh-books.js payload was not found.");
  const runtime = zlib.gunzipSync(Buffer.from(payload, "base64")).toString("utf8");
  return JSON.parse(runtime.match(/window\.ZH_BOOK_PATCHES=(.*)\.map\(/s)[1]);
}

function main() {
  const rows = readRows();
  const remote = [];
  const missing = [];
  let local = 0;

  rows.forEach((row, index) => {
    const number = String(index + 1).padStart(4, "0");
    const title = row[3];
    const cover = String(row[6] || "");
    if (!cover.startsWith("covers/zh/")) {
      remote.push({ number, title, cover });
      return;
    }
    const file = path.join(ROOT, cover);
    if (!fs.existsSync(file) || fs.statSync(file).size <= 200) {
      missing.push({ number, title, cover });
      return;
    }
    local += 1;
  });

  const summary = {
    rows: rows.length,
    local,
    remote: remote.length,
    missing: missing.length,
    remoteSamples: remote.slice(0, 20),
    missingSamples: missing.slice(0, 20),
  };
  console.log(JSON.stringify(summary, null, 2));

  if (process.argv.includes("--require-all") && (remote.length || missing.length)) {
    throw new Error(`Cover cache incomplete: ${local}/${rows.length} local covers.`);
  }
}

main();
