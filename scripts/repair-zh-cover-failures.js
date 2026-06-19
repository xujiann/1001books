const fs = require("fs");
const https = require("https");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const BOOKS = path.join(ROOT, "zh-books.js");
const TARGETS = new Set(["0024", "0072", "0073", "0076", "0161", "0242", "0243", "0318", "0439", "0822"]);

function readRows() {
  const source = fs.readFileSync(BOOKS, "utf8");
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
    BOOKS,
    `(function(){const p="${payload}";function b(s){const bin=atob(s),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a}async function r(){const ds=new DecompressionStream("gzip");const t=await new Response(new Blob([b(p)]).stream().pipeThrough(ds)).text();(0,eval)(t);return window.ZH_BOOK_PATCHES||[]}window.ZH_BOOKS_READY=r().catch(e=>{console.error("Chinese book data failed to load",e);return []});})();\n`,
  );
}

function normalizeCover(value) {
  return String(value || "").replace(/\\\//g, "/").replace("/s/", "/l/");
}

function baseTitle(value) {
  return String(value || "").replace(/[（(].*?[)）]/g, "").replace(/[·:：].*$/, "").trim();
}

function suggest(query) {
  return new Promise((resolve) => {
    const req = https.get(
      `https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Referer: "https://book.douban.com/",
          "User-Agent": "Mozilla/5.0 AppleWebKit/537.36 Chrome/125 Safari/537.36",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(res.statusCode === 200 ? JSON.parse(body) : []);
          } catch {
            resolve([]);
          }
        });
      },
    );
    req.setTimeout(8000, () => {
      req.destroy();
      resolve([]);
    });
    req.on("error", () => resolve([]));
  });
}

function googleBooks(query) {
  return new Promise((resolve) => {
    https
      .get(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`,
        { headers: { "User-Agent": "1001books-cover-repair" } },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              resolve(res.statusCode === 200 ? JSON.parse(body).items || [] : []);
            } catch {
              resolve([]);
            }
          });
        },
      )
      .on("error", () => resolve([]))
      .setTimeout(8000, function timeout() {
        this.destroy();
        resolve([]);
      });
  });
}

function googleCover(item) {
  const links = item?.volumeInfo?.imageLinks || {};
  return links.extraLarge || links.large || links.medium || links.thumbnail || "";
}

async function main() {
  const rows = readRows();
  const changes = [];

  for (let index = 0; index < rows.length; index += 1) {
    const number = String(index + 1).padStart(4, "0");
    if (!TARGETS.has(number)) continue;
    const row = rows[index];
    let items = await suggest(baseTitle(row[3]));
    if (!items.length) {
      items = await suggest(`${baseTitle(row[3])} ${String(row[4]).replace(/\s*\/.*$/, "")}`);
    }
    const item =
      items.find((candidate) => candidate.type === "b" && candidate.pic && baseTitle(candidate.title).includes(baseTitle(row[3]))) ||
      items.find((candidate) => candidate.type === "b" && candidate.pic);
    if (!item) {
      const googleItems = await googleBooks(`${baseTitle(row[3])} ${String(row[4]).replace(/\s*\/.*$/, "")}`);
      const googleItem = googleItems.find((candidate) => googleCover(candidate));
      const cover = googleCover(googleItem);
      if (!cover) {
        changes.push({ number, title: row[3], changed: false });
        continue;
      }
      row[5] = googleItem.volumeInfo?.infoLink || row[5];
      row[6] = cover.replace(/^http:\/\//, "https://");
      changes.push({ number, title: row[3], changed: true, source: "google-books", cover: row[6] });
      continue;
    }
    row[5] = item.url || row[5];
    row[6] = normalizeCover(item.pic);
    changes.push({ number, title: row[3], changed: true, source: "douban", cover: row[6] });
  }

  writeRows(rows);
  console.log(JSON.stringify({ changes }, null, 2));
}

main();
