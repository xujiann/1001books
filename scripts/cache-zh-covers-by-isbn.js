const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const ISBN_DATA = path.join(ROOT, "zh-data", "zh-isbns.json");
const COVER_DIR = path.join(ROOT, "covers", "zh");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : Infinity;

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

function download(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith("http://") ? http : https;
    const req = lib.get(
      url,
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" } },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          resolve({ ok: false, error: `HTTP ${res.statusCode}` });
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const bytes = Buffer.concat(chunks);
          const type = String(res.headers["content-type"] || "");
          const ok = /^image\//.test(type) && bytes.length > 500;
          resolve({ ok, bytes, type, error: ok ? "" : `${res.statusCode} ${type || "no content-type"} ${bytes.length}` });
        });
      },
    );
    req.setTimeout(12000, () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });
    req.on("error", (error) => resolve({ ok: false, error: error.message }));
  });
}

function extension(url, type) {
  if (/png/i.test(type)) return ".png";
  if (/webp/i.test(type)) return ".webp";
  if (/gif/i.test(type)) return ".gif";
  const match = String(url).match(/\.(jpg|jpeg|png|webp|gif)(?:\?|$)/i);
  return match ? `.${match[1].toLowerCase().replace("jpeg", "jpg")}` : ".jpg";
}

async function main() {
  if (!fs.existsSync(ISBN_DATA)) throw new Error(`Missing ISBN data: ${ISBN_DATA}`);
  fs.mkdirSync(COVER_DIR, { recursive: true });
  const data = JSON.parse(fs.readFileSync(ISBN_DATA, "utf8"));
  const rows = readRows();
  let cached = 0;
  let applied = 0;
  const failed = [];
  const books = data.books.slice(0, LIMIT);

  for (const book of books) {
    const index = Number(book.number) - 1;
    if (book.cachedCover && fs.existsSync(path.join(ROOT, book.cachedCover)) && rows[index]) {
      rows[index][6] = book.cachedCover;
      applied += 1;
      continue;
    }
    const candidates = Array.from(new Set(book.coverCandidates || [])).filter(Boolean);
    if (!candidates.length) continue;
    for (const url of candidates) {
      const result = await download(url);
      if (!result.ok) {
        failed.push({ number: book.number, title: book.title, url, error: result.error });
        continue;
      }
      const relative = `covers/zh/${book.number}${extension(url, result.type)}`;
      fs.writeFileSync(path.join(ROOT, relative), result.bytes);
      book.cachedCover = relative;
      if (rows[index]) {
        rows[index][6] = relative;
        applied += 1;
      }
      cached += 1;
      break;
    }
  }

  data.summary.cachedByIsbn = data.books.filter((book) => book.cachedCover).length;
  fs.writeFileSync(ISBN_DATA, `${JSON.stringify(data, null, 2)}\n`);
  if (applied > 0) writeRows(rows);
  console.log(JSON.stringify({ checked: books.length, cached, applied, failed: failed.length, failedSamples: failed.slice(0, 20) }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
