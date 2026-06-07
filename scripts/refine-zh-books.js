const fs = require("fs");
const https = require("https");
const zlib = require("zlib");

const BOOKS_PER_SHELF = 7;
const INPUT = "zh-books.js";
const OUTPUT = "zh-books.js";
const LOG = "refine-zh-progress.log";

function readRows() {
  const source = fs.readFileSync(INPUT, "utf8");
  const payload = source.match(/const p="([^"]+)"/)?.[1];
  if (!payload) throw new Error("Chinese payload not found");
  const runtime = zlib.gunzipSync(Buffer.from(payload, "base64")).toString("utf8");
  const json = runtime.match(/window\.ZH_BOOK_PATCHES=(.*)\.map\(/s)?.[1];
  if (!json) throw new Error("Chinese rows not found");
  return JSON.parse(json);
}

function authorBase(value) {
  return String(value || "")
    .replace(/\s*\/\s*\d{4}.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return String(value || "")
    .replace(/[《》“”"'`、，。！？；：:·•—–\-\s]/g, "")
    .toLowerCase();
}

function duplicateKey(book) {
  return `${normalize(book.title)}|${normalize(authorBase(book.author))}`;
}

function urlKey(url) {
  return String(url || "").match(/subject\/(\d+)/)?.[1] || String(url || "");
}

function rowToBook(row, number) {
  const [category, sub, slot, title, author, workUrl, cover] = row;
  return { category, sub, slot, title, author, workUrl, cover, number };
}

function bookToRow(book, slot) {
  return [book.category, book.sub, slot, book.title, book.author, book.workUrl, book.cover];
}

function shelfShape(books) {
  const shelves = [];
  const index = new Map();
  for (const book of books) {
    const key = `${book.category}\u0000${book.sub}`;
    if (!index.has(key)) {
      index.set(key, { category: book.category, sub: book.sub, books: [] });
      shelves.push(index.get(key));
    }
    index.get(key).books.push(book);
  }
  return shelves;
}

function normalizeCover(value) {
  return String(value || "").replace(/\\\//g, "/").replace("/s/", "/l/");
}

async function suggest(query) {
  const url = `https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`;
  return new Promise((resolve) => {
    const req = https.get(
      url,
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
        res.on("data", (chunk) => {
          body += chunk;
          if (body.length > 200000) req.destroy();
        });
        res.on("end", () => {
          try {
            resolve(res.statusCode === 200 ? JSON.parse(body) : []);
          } catch {
            resolve([]);
          }
        });
      },
    );
    req.setTimeout(2200, () => {
      req.destroy();
      resolve([]);
    });
    req.on("error", () => resolve([]));
  });
}

function fromSuggestion(item, category, sub, slot) {
  return {
    category,
    sub,
    slot,
    title: item.title || sub,
    author: [item.author_name, item.year].filter(Boolean).join(" / ") || "Douban",
    workUrl: item.url || `https://book.douban.com/subject/${item.id}/`,
    cover: normalizeCover(item.pic || ""),
  };
}

async function collectCandidates(queries, category, sub, usedKeys, usedUrls) {
  const candidates = [];
  const seenKeys = new Set();
  const seenUrls = new Set();
  for (const query of queries) {
    const items = await suggest(query);
    for (const item of items) {
      if (!item || item.type !== "b" || !item.id) continue;
      const book = fromSuggestion(item, category, sub, 0);
      const key = duplicateKey(book);
      const url = urlKey(book.workUrl);
      if (!book.cover || usedKeys.has(key) || usedUrls.has(url) || seenKeys.has(key) || seenUrls.has(url)) continue;
      seenKeys.add(key);
      seenUrls.add(url);
      candidates.push(book);
    }
    if (candidates.length >= BOOKS_PER_SHELF) break;
  }
  return candidates;
}

function queryPlan(category, sub) {
  const aliases = {
    天文: ["天文学", "宇宙", "大众天文学", "天体物理"],
    戏剧: ["剧本", "戏剧", "戏剧理论", "莎士比亚"],
    诗歌: ["诗集", "诗歌", "现代诗", "古典诗词"],
    散文: ["散文", "随笔", "散文集"],
    游记: ["旅行文学", "游记", "旅行", "地理游记"],
    书信: ["书信集", "家书", "通信集"],
    物理: ["物理学", "物理", "量子物理", "宇宙"],
    美学: ["美学", "艺术哲学", "审美"],
    思想: ["思想史", "中国思想", "西方思想"],
    禅修: ["禅", "禅修", "正念", "冥想"],
    灵修: ["灵修", "心灵", "修行"],
    民俗: ["民俗学", "民俗", "民间文化"],
    故事: ["故事集", "短篇故事", "小说故事"],
    人类学: ["人类学", "文化人类学", "民族志"],
    近代史: ["中国近代史", "近代史", "晚清史"],
    传记: ["传记", "人物传记", "名人传记"],
    回忆录: ["回忆录", "自传", " memoir"],
    考古: ["考古学", "考古", "文明考古"],
    印度: ["印度史", "印度哲学", "印度宗教"],
    道教: ["道教", "道家", "道教史"],
  };
  const suffixes = ["", "经典", "名著", "入门", "史"];
  const base = suffixes.flatMap((suffix) => (suffix ? [`${sub}${suffix}`, `${sub} ${suffix}`] : [sub]));
  return [
    ...(aliases[sub] || []),
    ...base,
    `${category}${sub}`,
    `${category} 经典`,
    `${category} 名著`,
  ];
}

function writeCompressedPatch(books) {
  const rows = books.map((book) => bookToRow(book, book.slot));
  const runtime = `window.ZH_BOOK_PATCHES=${JSON.stringify(rows)}.map(([category,sub,slot,title,author,workUrl,cover])=>({category,sub,slot,title,author,workUrl,cover}));
(function(){function a(b){const s=[...document.querySelectorAll(".category-section")].find(n=>n.querySelector("h2")?.textContent.trim()===b.category);if(!s)return false;const h=[...s.querySelectorAll(".shelf")].find(n=>n.querySelector("h3")?.textContent.trim()===b.sub);if(!h)return false;const c=h.querySelectorAll(".book")[b.slot];if(!c)return false;const l=c.querySelector(".cover"),t=c.querySelector(".book-title"),u=c.querySelector(".book-author");let i=c.querySelector(".cover-image");if(l){l.href=b.workUrl;l.classList.remove("is-placeholder")}if(t)t.textContent=b.title;if(u)u.textContent=b.author;if(b.cover){if(!i&&l){i=document.createElement("img");i.className="cover-image";i.loading="lazy";l.prepend(i)}if(i){i.src=b.cover;i.alt=b.title+" 封面"}}return true}function r(){if(new URLSearchParams(location.search).get("lang")!=="zh")return;if(!document.querySelector(".category-section"))return setTimeout(r,250);window.ZH_BOOK_PATCHES.forEach(a)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",r);else r();})();`;
  const payload = zlib.gzipSync(Buffer.from(runtime), { level: 9 }).toString("base64");
  const loader = `(function(){const p="${payload}";function b(s){const bin=atob(s),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a}async function r(){const ds=new DecompressionStream("gzip");const t=await new Response(new Blob([b(p)]).stream().pipeThrough(ds)).text();(0,eval)(t);return window.ZH_BOOK_PATCHES||[]}window.ZH_BOOKS_READY=r().catch(e=>{console.error("Chinese book data failed to load",e);return []});})();\n`;
  fs.writeFileSync(OUTPUT, loader);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(line) {
  fs.appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`);
  console.log(line);
}

async function main() {
  fs.writeFileSync(LOG, "");
  const rows = readRows();
  const books = rows.map(rowToBook);
  const usedKeys = new Set();
  const usedUrls = new Set();
  const shelves = shelfShape(books);
  const holes = [];

  for (const shelf of shelves) {
    shelf.books.forEach((book, index) => {
      const key = duplicateKey(book);
      const url = urlKey(book.workUrl);
      if (usedKeys.has(key)) {
        holes.push({ shelf, index, old: book });
      } else {
        usedKeys.add(key);
        usedUrls.add(url);
      }
    });
  }

  log(`duplicates to replace: ${holes.length}`);
  const globalQueries = [...new Set(shelves.flatMap((shelf) => queryPlan(shelf.category, shelf.sub)))];
  let globalIndex = 0;

  for (const hole of holes) {
    const { shelf, index } = hole;
    const localQueries = queryPlan(shelf.category, shelf.sub);
    let candidates = await collectCandidates(localQueries, shelf.category, shelf.sub, usedKeys, usedUrls);

    while (candidates.length === 0 && globalIndex < globalQueries.length) {
      candidates = await collectCandidates([globalQueries[globalIndex]], shelf.category, shelf.sub, usedKeys, usedUrls);
      globalIndex += 1;
    }

    if (candidates.length === 0) throw new Error(`No replacement for ${shelf.category}/${shelf.sub} #${index + 1}`);
    const replacement = candidates[0];
    replacement.slot = index;
    usedKeys.add(duplicateKey(replacement));
    usedUrls.add(urlKey(replacement.workUrl));
    shelf.books[index] = replacement;
    log(`replace ${hole.old.title} -> ${replacement.title} (${shelf.category}/${shelf.sub} #${index + 1})`);
  }

  const refined = shelves.flatMap((shelf) => shelf.books.map((book, index) => ({ ...book, slot: index })));
  if (refined.length !== 1001) throw new Error(`Expected 1001 books, got ${refined.length}`);
  writeCompressedPatch(refined);
  log("refined zh-books.js written");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
