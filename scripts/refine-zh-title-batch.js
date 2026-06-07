const fs = require("fs");
const https = require("https");
const zlib = require("zlib");

const replacements = new Map([
  ["战争与和平", ["战争论", "西线无战事", "伯罗奔尼撒战争史", "孙子兵法"]],
  ["全球通史", ["丝绸之路：一部全新的世界史", "极简欧洲史", "人类群星闪耀时", "枪炮、病菌与钢铁", "世界简史", "你一定爱读的极简世界史", "企鹅欧洲史"]],
  ["小王子", ["夏洛的网", "爱丽丝漫游奇境", "绿野仙踪", "柳林风声"]],
  ["史记", ["资治通鉴", "左传", "汉书", "中国通史"]],
  ["红楼梦", ["百年孤独", "堂吉诃德", "安娜·卡列尼娜", "包法利夫人"]],
  ["西方哲学史", ["哲学的故事", "苏菲的世界", "中国哲学简史", "西方哲学十五讲"]],
  ["菊与刀", ["金枝", "文化模式", "文明的进程", "乡土中国", "洁净与危险", "甜与权力", "文化的解释"]],
  ["经济学原理", ["国富论", "资本论", "就业、利息和货币通论", "经济学的思维方式"]],
  ["爱的艺术", ["亲密关系", "爱的五种语言", "少有人走的路"]],
  ["美丽新世界", ["我们", "华氏451", "动物农场"]],
  ["莎士比亚全集", ["麦克白", "李尔王", "威尼斯商人"]],
  ["中国近代史", ["剑桥中国晚清史", "天朝的崩溃", "中国现代史"]],
  ["昨日的世界", ["人类群星闪耀时", "一个陌生女人的来信", "茨威格自传"]],
  ["社会心理学", ["乌合之众", "影响力", "社会性动物"]],
  ["亲密关系", ["家庭、私有制和国家的起源", "爱的艺术", "沟通的艺术"]],
  ["忏悔录", ["上帝之城", "基督教的本质", "窄门"]],
  ["曾国藩家书", ["傅雷家书", "亲爱的安德烈", "查令十字街84号"]],
  ["聪明的投资者", ["证券分析", "漫步华尔街", "投资最重要的事"]],
  ["道德经", ["庄子", "列子", "中国道教史"]],
  ["第二性", ["厌女", "女性的奥秘", "性别麻烦"]],
  ["飞鸟集", ["新月集", "草叶集", "恶之花"]],
  ["高效能人士的七个习惯", ["原则", "精力管理", "刻意练习"]],
  ["格林童话", ["一千零一夜", "鹅妈妈童谣", "民间故事形态学"]],
  ["君主论", ["社会契约论", "利维坦", "论美国的民主"]],
  ["理想国", ["会饮篇", "斐多篇", "法律篇"]],
  ["逻辑学导论", ["逻辑哲学论", "批判性思维工具", "逻辑十九讲"]],
  ["尼各马可伦理学", ["伦理学", "实践理性批判", "道德形而上学奠基"]],
  ["认识电影", ["电影是什么？", "电影语言", "世界电影史"]],
  ["什么是数学", ["数学之美", "数学简史", "古今数学思想"]],
  ["诗经", ["楚辞", "古诗源", "唐诗三百首"]],
  ["时间简史", ["宇宙的琴弦", "果壳中的宇宙", "黑洞与时间弯曲"]],
  ["水浒传", ["三国演义", "西游记", "儒林外史"]],
  ["心理学与生活", ["津巴多普通心理学", "改变心理学的40项研究", "思考，快与慢"]],
  ["形而上学", ["存在与时间", "精神现象学", "作为意志和表象的世界"]],
  ["一九八四", ["动物农场", "我们", "华氏451"]],
  ["1984", ["动物农场", "我们", "华氏451"]],
  ["营销管理", ["定位", "引爆点", "长尾理论"]],
  ["政治学", ["政治学通识", "政治秩序的起源", "开放社会及其敌人"]],
  ["中国近代史", ["天朝的崩溃", "晚清七十年", "从鸦片战争到五四运动"]],
  ["中国书法史", ["书法有法", "中国书法理论史", "启功给你讲书法"]],
  ["卓有成效的管理者", ["管理的实践", "21世纪的管理挑战", "第五项修炼"]],
  ["自私的基因", ["盲眼钟表匠", "生命是什么", "生命的跃升"]],
  ["最好的告别", ["众病之王", "医生的修炼", "最好的抉择"]],
]);

function readRows() {
  const source = fs.readFileSync("zh-books.js", "utf8");
  const payload = source.match(/const p="([^"]+)"/)?.[1];
  const runtime = zlib.gunzipSync(Buffer.from(payload, "base64")).toString("utf8");
  return JSON.parse(runtime.match(/window\.ZH_BOOK_PATCHES=(.*)\.map\(/s)[1]);
}

function normalize(value) {
  return String(value || "")
    .replace(/[《》“”"'`、，。！？；：:·•—–\-\s]/g, "")
    .replace(/[（(].*?[）)]/g, "")
    .replace(/上下册|上下卷|上下|全册|全本|全译本|套装.*|珍藏版|纪念版|经典版|精装|新版|全集|选集|导读|插图版/g, "")
    .replace(/第[一二三四五六七八九十\d]+版/g, "")
    .replace(/\d+册/g, "")
    .toLowerCase();
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
    req.setTimeout(3500, () => {
      req.destroy();
      resolve([]);
    });
    req.on("error", () => resolve([]));
  });
}

async function exactBook(title, usedTitles, usedUrls) {
  const items = await suggest(title);
  for (const item of items) {
    if (!item || item.type !== "b" || !item.id || !item.pic) continue;
    const key = normalize(item.title || title);
    const url = item.url || `https://book.douban.com/subject/${item.id}/`;
    if (usedTitles.has(key) || usedUrls.has(url)) continue;
    return {
      title: item.title || title,
      author: [item.author_name, item.year].filter(Boolean).join(" / ") || "Douban",
      workUrl: url,
      cover: normalizeCover(item.pic || ""),
    };
  }
  return null;
}

function writeRows(rows) {
  const runtime = `window.ZH_BOOK_PATCHES=${JSON.stringify(rows)}.map(([category,sub,slot,title,author,workUrl,cover])=>({category,sub,slot,title,author,workUrl,cover}));
(function(){function a(b){const s=[...document.querySelectorAll(".category-section")].find(n=>n.querySelector("h2")?.textContent.trim()===b.category);if(!s)return false;const h=[...s.querySelectorAll(".shelf")].find(n=>n.querySelector("h3")?.textContent.trim()===b.sub);if(!h)return false;const c=h.querySelectorAll(".book")[b.slot];if(!c)return false;const l=c.querySelector(".cover"),t=c.querySelector(".book-title"),u=c.querySelector(".book-author");let i=c.querySelector(".cover-image");if(l){l.href=b.workUrl;l.classList.remove("is-placeholder")}if(t)t.textContent=b.title;if(u)u.textContent=b.author;if(b.cover){if(!i&&l){i=document.createElement("img");i.className="cover-image";i.loading="lazy";l.prepend(i)}if(i){i.src=b.cover;i.alt=b.title+" 封面"}}return true}function r(){if(new URLSearchParams(location.search).get("lang")!=="zh")return;if(!document.querySelector(".category-section"))return setTimeout(r,250);window.ZH_BOOK_PATCHES.forEach(a)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",r);else r();})();`;
  const payload = zlib.gzipSync(Buffer.from(runtime), { level: 9 }).toString("base64");
  fs.writeFileSync(
    "zh-books.js",
    `(function(){const p="${payload}";function b(s){const bin=atob(s),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a}async function r(){const ds=new DecompressionStream("gzip");const t=await new Response(new Blob([b(p)]).stream().pipeThrough(ds)).text();(0,eval)(t);return window.ZH_BOOK_PATCHES||[]}window.ZH_BOOKS_READY=r().catch(e=>{console.error("Chinese book data failed to load",e);return []});})();\n`,
  );
}

async function main() {
  const rows = readRows();
  const usedTitles = new Set(rows.map((row) => normalize(row[3])));
  const usedUrls = new Set(rows.map((row) => row[5]));
  const groups = new Map();
  rows.forEach((row, index) => {
    const key = normalize(row[3]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });

  let changed = 0;
  for (const [canonicalTitle, candidates] of replacements) {
    const key = normalize(canonicalTitle);
    const indices = groups.get(key) || [];
    if (indices.length <= 1) continue;
    console.log(`${canonicalTitle}: ${indices.length} copies`);
    for (const index of indices.slice(1)) {
      let replacement = null;
      while (candidates.length > 0 && !replacement) {
        replacement = await exactBook(candidates.shift(), usedTitles, usedUrls);
      }
      if (!replacement) {
        console.log(`  skip ${rows[index][3]}: no curated replacement`);
        continue;
      }
      usedTitles.add(normalize(replacement.title));
      usedUrls.add(replacement.workUrl);
      console.log(`  ${rows[index][3]} -> ${replacement.title}`);
      rows[index][3] = replacement.title;
      rows[index][4] = replacement.author;
      rows[index][5] = replacement.workUrl;
      rows[index][6] = replacement.cover;
      changed += 1;
    }
  }
  writeRows(rows);
  console.log(`changed ${changed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
