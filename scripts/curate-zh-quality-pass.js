const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const BOOKS = path.join(ROOT, "zh-books.js");

const replacements = [
  ["神话与起源", "史诗", 6, "尼伯龙根之歌", "[德] 佚名 / 中世纪史诗", "9780140441376"],
  ["文学与诗歌", "现代诗", 4, "吉檀迦利", "[印] 泰戈尔 / 1912", "9780486414172", "covers/zh/0242.jpg"],
  ["文学与诗歌", "现代诗", 5, "荒原", "[英] T. S. 艾略特 / 1922", "9780156948791", "covers/zh/0243.jpg"],
  ["文学与诗歌", "现代诗", 6, "杜伊诺哀歌", "[奥] 里尔克 / 1923", "9780393328844"],
  ["文学与诗歌", "戏剧", 4, "俄狄浦斯王", "[古希腊] 索福克勒斯", "9780156027649"],
  ["历史与记忆", "中世纪", 3, "中世纪文明", "[法] 雅克·勒高夫 / 1964", "9780631218460", "covers/zh/0318.jpg"],
  ["历史与记忆", "回忆录", 5, "活出生命的意义", "[奥] 维克多·弗兰克尔 / 1946", "9780807014295"],
  ["社会与政治", "传媒", 3, "公共舆论", "[美] 沃尔特·李普曼 / 1922", "9780684833279"],
  ["经济与商业", "商业", 6, "竞争战略", "[美] 迈克尔·波特 / 1980", "9780684841489"],
  ["生活与身体", "爱情", 7, "爱情刽子手", "[美] 欧文·亚隆 / 1989", "9780060958343"],
  ["生活与身体", "时尚", 3, "时尚之书", "Phaidon 编", "9780714871073", "covers/zh/0822.jpg"],
  ["生活与身体", "自我管理", 5, "原子习惯", "[美] 詹姆斯·克利尔 / 2018", "9780735211292"],
  ["语言与教育", "出版", 2, "古腾堡星汉璀璨", "[加拿大] 马歇尔·麦克卢汉 / 1962", "9780802060419"],
  ["未来与想象", "文明", 4, "文明的冲突与世界秩序的重建", "[美] 塞缪尔·亨廷顿 / 1996", "9780684844411"],
  ["科学与自然", "科学哲学", 5, "反对方法", "[奥] 保罗·费耶阿本德 / 1975", "9781844674428"],
  ["技术与工程", "农业", 7, "一根稻草的革命", "[日] 福冈正信 / 1975", "9781590173138"],
  ["技术与工程", "电气", 2, "交流电之战", "[美] 吉尔·琼斯 / 2003", "9780375758843"],
  ["技术与工程", "交通", 7, "集装箱改变世界", "[美] 马克·莱文森 / 2006", "9780691136400"],
  ["技术与工程", "设计", 4, "为真实的世界设计", "[美] 维克多·帕帕奈克 / 1971", "9780897331531"],
  ["社会与政治", "人类学", 5, "努尔人", "[英] E. E. 埃文思-普里查德 / 1940", "9780195003222"],
  ["社会与政治", "法律", 5, "法律帝国", "[美] 罗纳德·德沃金 / 1986", "9780674518360"],
  ["社会与政治", "国际关系", 6, "大棋局", "[美] 兹比格涅夫·布热津斯基 / 1997", "9780465094356"],
  ["经济与商业", "行为经济学", 4, "可预测的非理性", "[美] 丹·艾瑞里 / 2008", "9780061353239"],
  ["经济与商业", "行为经济学", 6, "稀缺", "[美] 塞德希尔·穆来纳森 / 埃尔德·沙菲尔 / 2013", "9780805092646"],
  ["经济与商业", "发展经济学", 3, "国家为什么会失败", "[美] 达伦·阿西莫格鲁 / 詹姆斯·罗宾逊 / 2012", "9780307719225"],
  ["语言与教育", "教育学", 7, "教育过程", "[美] 杰罗姆·布鲁纳 / 1960", "9780674897014"],
  ["语言与教育", "阅读", 6, "如何谈论你没读过的书", "[法] 皮埃尔·巴亚尔 / 2007", "9781596915435"],
];

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

function coverFor(isbn) {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
}

function main() {
  const rows = readRows();
  const changes = [];

  for (const [category, shelf, slot, title, author, isbn, localCover] of replacements) {
    const index = rows.findIndex((row) => row[0] === category && row[1] === shelf && Number(row[2]) === slot - 1);
    if (index < 0) throw new Error(`Slot not found: ${category} / ${shelf} #${slot}`);
    const before = rows[index];
    const number = String(index + 1).padStart(4, "0");
    const cachedCover = `covers/zh/${number}.jpg`;
    const cover = localCover || (fs.existsSync(path.join(ROOT, cachedCover)) ? cachedCover : coverFor(isbn));
    rows[index] = [category, shelf, slot - 1, title, author, `https://openlibrary.org/isbn/${isbn}`, cover];
    changes.push({ number, before: before[3], after: title });
  }

  writeRows(rows);
  console.log(JSON.stringify({ changed: changes.length, changes }, null, 2));
}

main();
