const fs = require("fs");
const https = require("https");
const http = require("http");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const REMOTE = process.argv.includes("--remote");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : Infinity;

function readRows() {
  const source = fs.readFileSync(path.join(ROOT, "zh-books.js"), "utf8");
  const payload = source.match(/const p="([^"]+)"/)?.[1];
  if (!payload) throw new Error("zh-books.js payload was not found.");
  const runtime = zlib.gunzipSync(Buffer.from(payload, "base64")).toString("utf8");
  return JSON.parse(runtime.match(/window\.ZH_BOOK_PATCHES=(.*)\.map\(/s)[1]);
}

function location(row) {
  return `${row[0]}/${row[1]}#${Number(row[2]) + 1}`;
}

function checkUrl(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith("http://") ? http : https;
    const req = lib.request(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://book.douban.com/",
          Range: "bytes=0-128",
        },
        timeout: 8000,
      },
      (res) => {
        const type = String(res.headers["content-type"] || "");
        res.resume();
        resolve({ status: res.statusCode || 0, type, ok: res.statusCode >= 200 && res.statusCode < 400 && /^image\//.test(type) });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, type: "", ok: false, error: "timeout" });
    });
    req.on("error", (error) => resolve({ status: 0, type: "", ok: false, error: error.message }));
    req.end();
  });
}

async function main() {
  const rows = readRows();
  const missing = rows.filter((row) => !row[6]);
  const malformed = rows.filter((row) => row[6] && !/^https?:\/\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(row[6]));
  const nonDouban = rows.filter((row) => row[6] && !/doubanio\.com|douban\.com/.test(row[6]));

  const result = {
    rows: rows.length,
    missingCover: missing.length,
    malformedCoverUrl: malformed.length,
    nonDoubanCoverHost: nonDouban.length,
  };

  if (REMOTE) {
    const targets = rows.filter((row) => row[6]).slice(0, Number.isFinite(LIMIT) ? LIMIT : rows.length);
    const broken = [];
    for (const row of targets) {
      const status = await checkUrl(row[6]);
      if (!status.ok) broken.push({ location: location(row), title: row[3], cover: row[6], ...status });
    }
    result.remoteChecked = targets.length;
    result.remoteBroken = broken.length;
    result.remoteBrokenSamples = broken.slice(0, 30);
  }

  console.log(JSON.stringify(result, null, 2));

  if (missing.length) {
    console.log("Missing cover rows:");
    missing.slice(0, 30).forEach((row) => console.log(`- ${location(row)} | ${row[3]}`));
  }
  if (malformed.length) {
    console.log("Malformed cover rows:");
    malformed.slice(0, 30).forEach((row) => console.log(`- ${location(row)} | ${row[3]} | ${row[6]}`));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
