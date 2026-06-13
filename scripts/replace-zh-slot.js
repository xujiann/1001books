const fs = require("fs");
const https = require("https");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");

function usage() {
  console.log("Usage:");
  console.log("  node scripts/replace-zh-slot.js <category> <shelf> <slot-1-to-7> <douban-query>");
  process.exit(1);
}

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

function normalizeCover(value) {
  return String(value || "").replace(/\\\//g, "/").replace("/s/", "/l/");
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
    req.setTimeout(5000, () => {
      req.destroy();
      resolve([]);
    });
    req.on("error", () => resolve([]));
  });
}

async function main() {
  const [category, shelf, slotText, query] = process.argv.slice(2);
  if (!category || !shelf || !slotText || !query) usage();
  const slot = Number(slotText) - 1;
  if (!Number.isInteger(slot) || slot < 0 || slot > 6) usage();

  const rows = readRows();
  const index = rows.findIndex((row) => row[0] === category && row[1] === shelf && Number(row[2]) === slot);
  if (index < 0) throw new Error(`Slot not found: ${category} / ${shelf} #${slot + 1}`);

  const items = await suggest(query);
  const item = items.find((candidate) => candidate && candidate.type === "b" && candidate.id && candidate.pic);
  if (!item) throw new Error(`No Douban book result for: ${query}`);

  const before = rows[index];
  rows[index] = [
    before[0],
    before[1],
    before[2],
    item.title || query,
    [item.author_name, item.year].filter(Boolean).join(" / ") || "Douban",
    item.url || `https://book.douban.com/subject/${item.id}/`,
    normalizeCover(item.pic),
  ];
  writeRows(rows);
  console.log(`${before[3]} -> ${rows[index][3]}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
