const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");

function usage() {
  console.log("Usage:");
  console.log("  node scripts/set-zh-slot.js <category> <shelf> <slot-1-to-7> <title> <author> <url> <cover>");
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
(function(){function a(b){const s=[...document.querySelectorAll(".category-section")].find(n=>n.querySelector("h2")?.textContent.trim()===b.category);if(!s)return false;const h=[...s.querySelectorAll(".shelf")].find(n=>n.querySelector("h3")?.textContent.trim()===b.sub);if(!h)return false;const c=h.querySelectorAll(".book")[b.slot];if(!c)return false;const l=c.querySelector(".cover"),t=c.querySelector(".book-title"),u=c.querySelector(".book-author");let i=c.querySelector(".cover-image");if(l){l.href=b.workUrl;l.classList.remove("is-placeholder")}if(t)t.textContent=b.title;if(u)u.textContent=b.author;if(b.cover){if(!i&&l){i=document.createElement("img");i.className="cover-image";i.loading="lazy";l.prepend(i)}if(i){i.src=b.cover;i.alt=b.title+" 封面"}}return true}function r(){if(new URLSearchParams(location.search).get("lang")!=="zh")return;if(!document.querySelector(".category-section"))return setTimeout(r,250);window.ZH_BOOK_PATCHES.forEach(a)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",r);else r();})();`;
  const payload = zlib.gzipSync(Buffer.from(runtime), { level: 9 }).toString("base64");
  fs.writeFileSync(
    path.join(ROOT, "zh-books.js"),
    `(function(){const p="${payload}";function b(s){const bin=atob(s),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a}async function r(){const ds=new DecompressionStream("gzip");const t=await new Response(new Blob([b(p)]).stream().pipeThrough(ds)).text();(0,eval)(t);return window.ZH_BOOK_PATCHES||[]}window.ZH_BOOKS_READY=r().catch(e=>{console.error("Chinese book data failed to load",e);return []});})();\n`,
  );
}

function main() {
  const [category, shelf, slotText, title, author, url, cover] = process.argv.slice(2);
  if (!category || !shelf || !slotText || !title || !author || !url || !cover) usage();
  const slot = Number(slotText) - 1;
  if (!Number.isInteger(slot) || slot < 0 || slot > 6) usage();

  const rows = readRows();
  const index = rows.findIndex((row) => row[0] === category && row[1] === shelf && Number(row[2]) === slot);
  if (index < 0) throw new Error(`Slot not found: ${category} / ${shelf} #${slot + 1}`);
  const before = rows[index];
  rows[index] = [before[0], before[1], before[2], title, author, url, cover];
  writeRows(rows);
  console.log(`${before[3]} -> ${title}`);
}

main();
