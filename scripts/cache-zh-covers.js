const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const COVER_DIR = path.join(ROOT, "covers", "zh");
const FORCE = process.argv.includes("--force");
const REQUIRE_ALL = process.argv.includes("--require-all");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : Infinity;
const ATTEMPTS = 3;

function readRows() {
  const source = fs.readFileSync(path.join(ROOT, "zh-books.js"), "utf8");
  const payload = source.match(/const p="([^"]+)"/)?.[1];
  if (!payload) throw new Error("zh-books.js payload was not found.");
  const runtime = zlib.gunzipSync(Buffer.from(payload, "base64")).toString("utf8");
  return JSON.parse(runtime.match(/window\.ZH_BOOK_PATCHES=(.*)\.map\(/s)[1]);
}

function writeRows(rows) {
  const runtime = `window.ZH_BOOK_PATCHES=${JSON.stringify(rows)}.map(([category,sub,slot,title,author,workUrl,cover])=>({category,sub,slot,title,author,workUrl,cover}));
(function(){function a(b){const s=[...document.querySelectorAll(".category-section")].find(n=>n.querySelector("h2")?.textContent.trim()===b.category);if(!s)return false;const h=[...s.querySelectorAll(".shelf")].find(n=>n.querySelector("h3")?.textContent.trim()===b.sub);if(!h)return false;const c=h.querySelectorAll(".book")[b.slot];if(!c)return false;const l=c.querySelector(".cover"),t=c.querySelector(".book-title"),u=c.querySelector(".book-author");let i=c.querySelector(".cover-image");if(l){l.href=b.workUrl;l.classList.remove("is-placeholder")}if(t)t.textContent=b.title;if(u)u.textContent=b.author;if(b.cover){if(!i&&l){i=document.createElement("img");i.className="cover-image";i.loading="lazy";i.referrerPolicy="no-referrer";l.prepend(i)}if(i){i.referrerPolicy="no-referrer";i.src=b.cover;i.alt=b.title+" 封面"}}return true}function r(){if(new URLSearchParams(location.search).get("lang")!=="zh")return;if(!document.querySelector(".category-section"))return setTimeout(r,250);window.ZH_BOOK_PATCHES.forEach(a)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",r);else r();})();`;
  const payload = zlib.gzipSync(Buffer.from(runtime), { level: 9 }).toString("base64");
  fs.writeFileSync(
    path.join(ROOT, "zh-books.js"),
    `(function(){const p="${payload}";function b(s){const bin=atob(s),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a}async function r(){const ds=new DecompressionStream("gzip");const t=await new Response(new Blob([b(p)]).stream().pipeThrough(ds)).text();(0,eval)(t);return window.ZH_BOOK_PATCHES||[]}window.ZH_BOOKS_READY=r().catch(e=>{console.error("Chinese book data failed to load",e);return []});})();\n`,
  );
}

function extensionFrom(url, contentType) {
  if (/png/i.test(contentType)) return ".png";
  if (/webp/i.test(contentType)) return ".webp";
  if (/gif/i.test(contentType)) return ".gif";
  if (/jpe?g/i.test(contentType)) return ".jpg";
  const match = String(url).match(/\.(jpg|jpeg|png|webp|gif)(?:\?|$)/i);
  return match ? `.${match[1].toLowerCase().replace("jpeg", "jpg")}` : ".jpg";
}

function download(url, redirects = 0) {
  return new Promise((resolve) => {
    const lib = url.startsWith("http://") ? http : https;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://book.douban.com/",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      },
      (res) => {
        const location = res.headers.location;
        if (location && redirects < 4 && [301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          resolve(download(new URL(location, url).toString(), redirects + 1));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          resolve({ ok: false, status: res.statusCode, error: `HTTP ${res.statusCode}` });
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const bytes = Buffer.concat(chunks);
          const type = String(res.headers["content-type"] || "");
          const ok = /^image\//.test(type) && bytes.length > 200;
          resolve({
            ok,
            bytes,
            type,
            status: res.statusCode,
            error: ok ? "" : `invalid image response (${res.statusCode}, ${type || "no content-type"}, ${bytes.length} bytes)`,
          });
        });
      },
    );
    req.setTimeout(12000, () => {
      req.destroy();
      resolve({ ok: false, status: 0, error: "timeout" });
    });
    req.on("error", (error) => resolve({ ok: false, status: 0, error: error.message }));
  });
}

function proxyUrl(url) {
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
}

async function downloadWithRetries(url) {
  let last;
  const candidates = [url, proxyUrl(url)];
  for (const candidate of candidates) {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      last = await download(candidate);
      if (last.ok) return { ...last, sourceUrl: candidate };
      if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }
  return last;
}

async function main() {
  fs.mkdirSync(COVER_DIR, { recursive: true });
  const rows = readRows();
  let cached = 0;
  let reused = 0;
  const failed = [];

  for (let index = 0; index < rows.length && index < LIMIT; index += 1) {
    const row = rows[index];
    const current = String(row[6] || "");
    const number = String(index + 1).padStart(4, "0");
    if (current.startsWith("covers/zh/") && !FORCE) {
      const local = path.join(ROOT, current);
      if (fs.existsSync(local) && fs.statSync(local).size > 200) {
        reused += 1;
        continue;
      }
    }
    if (!/^https?:\/\//.test(current)) {
      failed.push({ number, title: row[3], cover: current, error: "not remote" });
      continue;
    }

    const result = await downloadWithRetries(current);
    if (!result.ok) {
      failed.push({ number, title: row[3], cover: current, error: result.error || result.status });
      continue;
    }
    const ext = extensionFrom(current, result.type);
    const relative = `covers/zh/${number}${ext}`;
    fs.writeFileSync(path.join(ROOT, relative), result.bytes);
    row[6] = relative;
    cached += 1;
    if (cached % 50 === 0) console.log(`cached ${cached}`);
  }

  writeRows(rows);
  console.log(JSON.stringify({ rows: rows.length, cached, reused, failed: failed.length, failedSamples: failed.slice(0, 20) }, null, 2));
  if (REQUIRE_ALL && failed.length) {
    throw new Error(`Failed to cache ${failed.length} covers.`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
