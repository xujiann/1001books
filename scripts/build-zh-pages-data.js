const fs = require("fs");
const zlib = require("zlib");

const BOOKS_PER_SHELF = 7;
const categories = [
  ["神话与起源", ["神话", "史诗", "民间故事", "传说", "寓言", "宗教", "民俗", "故事", "文化", "人类学", "古典"]],
  ["哲学与思想", ["哲学", "思想", "伦理学", "形而上学", "认识论", "政治哲学", "心理学", "逻辑学", "美学", "存在主义", "社会思想"]],
  ["宗教与灵性", ["佛教", "基督教", "伊斯兰", "印度", "犹太", "道教", "神秘主义", "禅修", "宗教史", "神学", "灵修"]],
  ["文学与诗歌", ["诗歌", "现代诗", "小说", "短篇小说", "戏剧", "散文", "游记", "书信", "文学评论", "儿童文学", "名著"]],
  ["历史与记忆", ["古代史", "中世纪", "近代史", "现代史", "世界史", "地方史", "传记", "回忆录", "战争", "城市史", "考古"]],
  ["科学与自然", ["数学", "物理", "化学", "天文", "地理", "生物", "医学", "生态", "科学史", "科学哲学", "科普"]],
  ["技术与工程", ["建筑", "机械", "电气", "计算机", "人工智能", "材料", "交通", "能源", "农业", "设计", "互联网"]],
  ["社会与政治", ["社会学", "人类学", "政治", "国际关系", "法律", "公共政策", "女性主义", "教育", "传媒", "民族", "城市"]],
  ["经济与商业", ["经济学", "金融", "管理", "创业", "营销", "会计", "商业", "劳动", "发展经济学", "消费", "行为经济学"]],
  ["艺术与审美", ["绘画", "雕塑", "音乐", "电影", "摄影", "舞蹈", "建筑史", "设计", "书法", "工艺", "艺术史"]],
  ["生活与身体", ["美食", "健康", "运动", "家庭", "爱情", "旅行", "园艺", "时尚", "家居", "礼仪", "自我管理"]],
  ["语言与教育", ["语言学", "文字", "修辞", "翻译", "词典", "教育学", "学习", "阅读", "写作", "出版", "图书馆"]],
  ["未来与想象", ["科幻", "乌托邦", "反乌托邦", "未来", "太空", "气候", "赛博朋克", "后人类", "末世", "文明", "时间旅行"]],
];

const fallbacks = [
  "红楼梦", "百年孤独", "人类简史", "乡土中国", "万历十五年", "艺术的故事", "时间简史",
  "如何阅读一本书", "小王子", "三体", "苏菲的世界", "全球通史", "美的历程", "社会学的想象力",
  "经济学原理", "设计心理学", "最好的告别", "语言本能", "未来简史", "金枝", "论语", "史记",
  "瓦尔登湖", "乌合之众", "枪炮病菌与钢铁", "梦的解析", "娱乐至死", "原则", "影响力",
];
const suggestCache = new Map();

async function main() {
  const books = [];
  const seen = new Set();
  let number = 1;
  for (const [category, shelves] of categories) {
    for (const shelf of shelves) {
      const shelfBooks = [];
      const queries = [shelf, `${shelf} 经典`, `${shelf} 书`, category, ...fallbacks];
      for (const query of queries) {
        for (const item of await suggest(query)) {
          if (!item || item.type !== "b" || !item.id || seen.has(item.id)) continue;
          seen.add(item.id);
          shelfBooks.push(toBook(item, query, category, shelf, shelfBooks.length));
          if (shelfBooks.length >= BOOKS_PER_SHELF) break;
        }
        if (shelfBooks.length >= BOOKS_PER_SHELF) break;
        await delay(120);
      }
      for (const query of queries) {
        if (shelfBooks.length >= BOOKS_PER_SHELF) break;
        for (const item of await suggest(query)) {
          if (!item || item.type !== "b" || !item.id) continue;
          shelfBooks.push(toBook(item, query, category, shelf, shelfBooks.length));
          if (shelfBooks.length >= BOOKS_PER_SHELF) break;
        }
        await delay(120);
      }
      if (shelfBooks.length !== BOOKS_PER_SHELF) throw new Error(`${category}/${shelf} only found ${shelfBooks.length}`);
      books.push(...shelfBooks);
      console.log(`${category} / ${shelf}: ${books.length}/1001`);
      number += BOOKS_PER_SHELF;
    }
  }
  writeCompressedPatch(books);
}

function toBook(item, query, category, shelf, slot) {
  return {
    category,
    sub: shelf,
    slot,
    title: item.title || query,
    author: [item.author_name, item.year].filter(Boolean).join(" / ") || "豆瓣读书",
    workUrl: item.url || `https://book.douban.com/subject/${item.id}/`,
    cover: normalizeCover(item.pic || ""),
  };
}

async function suggest(query) {
  if (suggestCache.has(query)) return suggestCache.get(query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let results = [];
  try {
    const response = await fetch(`https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: {
        Referer: "https://book.douban.com/",
        "User-Agent": "Mozilla/5.0 AppleWebKit/537.36 Chrome/125 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });
    results = response.ok ? await response.json() : [];
  } catch {
    results = [];
  } finally {
    clearTimeout(timeout);
  }
  suggestCache.set(query, results);
  return results;
}

function writeCompressedPatch(books) {
  const rows = books.map((book) => [book.category, book.sub, book.slot, book.title, book.author, book.workUrl, book.cover]);
  const runtime = `window.ZH_BOOK_PATCHES=${JSON.stringify(rows)}.map(([category,sub,slot,title,author,workUrl,cover])=>({category,sub,slot,title,author,workUrl,cover}));
(function(){function a(b){const s=[...document.querySelectorAll(".category-section")].find(n=>n.querySelector("h2")?.textContent.trim()===b.category);if(!s)return false;const h=[...s.querySelectorAll(".shelf")].find(n=>n.querySelector("h3")?.textContent.trim()===b.sub);if(!h)return false;const c=h.querySelectorAll(".book")[b.slot];if(!c)return false;const l=c.querySelector(".cover"),t=c.querySelector(".book-title"),u=c.querySelector(".book-author");let i=c.querySelector(".cover-image");if(l){l.href=b.workUrl;l.classList.remove("is-placeholder")}if(t)t.textContent=b.title;if(u)u.textContent=b.author;if(b.cover){if(!i&&l){i=document.createElement("img");i.className="cover-image";i.loading="lazy";i.referrerPolicy="no-referrer";l.prepend(i)}if(i){i.referrerPolicy="no-referrer";i.src=b.cover;i.alt=b.title+" 封面"}}return true}function r(){if(new URLSearchParams(location.search).get("lang")!=="zh")return;if(!document.querySelector(".category-section"))return setTimeout(r,250);window.ZH_BOOK_PATCHES.forEach(a)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",r);else r();})();`;
  const payload = zlib.gzipSync(Buffer.from(runtime), { level: 9 }).toString("base64");
  const loader = `(function(){const p="${payload}";function b(s){const bin=atob(s),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a}async function r(){const ds=new DecompressionStream("gzip");const t=await new Response(new Blob([b(p)]).stream().pipeThrough(ds)).text();(0,eval)(t);return window.ZH_BOOK_PATCHES||[]}window.ZH_BOOKS_READY=r().catch(e=>{console.error("Chinese book data failed to load",e);return []});})();\n`;
  fs.writeFileSync("zh-books.js", loader);
  console.log(`wrote zh-books.js with ${books.length} books, ${books.filter((book) => book.cover).length} covers`);
}

function normalizeCover(value) {
  return String(value || "").replace(/\\\//g, "/").replace("/s/", "/l/");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
