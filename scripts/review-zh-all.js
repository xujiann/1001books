const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");

function readRows() {
  const source = fs.readFileSync(path.join(ROOT, "zh-books.js"), "utf8");
  const payload = source.match(/const p="([^"]+)"/)?.[1];
  if (!payload) throw new Error("zh-books.js payload was not found.");
  const runtime = zlib.gunzipSync(Buffer.from(payload, "base64")).toString("utf8");
  return JSON.parse(runtime.match(/window\.ZH_BOOK_PATCHES=(.*)\.map\(/s)[1]);
}

function clean(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[《》「」『』“”"'\[\]【】（）(){}·•,，.。!！?？:：;；、\s-]/g, "")
    .replace(/上下册|上下卷|上中下|全[一二三四五六七八九十\d]+册|全本|全集|选集|修订版|新版|珍藏版|纪念版|典藏版|精装|导读|插图版/g, "")
    .replace(/第[一二三四五六七八九十\d]+版/g, "")
    .replace(/\d+周年/g, "")
    .toLowerCase();
}

function authorName(author) {
  return String(author || "")
    .replace(/\[[^\]]+\]|\([^)]*\)|（[^）]*）|【[^】]*】/g, "")
    .split(/[\/,，;；]/)[0]
    .trim();
}

function rowFlags(row, allRows) {
  const [category, shelf, slot, title, author, workUrl] = row;
  const text = `${title} ${author}`;
  const flags = [];

  if (/导读|题库|试题|考试|教材编写组|练习|习题|课程|赏析|青少版|少儿版/.test(text)) flags.push("edition-risk");
  if (/Douban|豆瓣读书/.test(author)) flags.push("weak-author");
  if (!/^https:\/\/book\.douban\.com\/subject\/\d+\/?/.test(String(workUrl || ""))) flags.push("url-check");
  if (String(title || "").length > 28) flags.push("long-title");

  const a = clean(authorName(author));
  if (a) {
    const inCategory = allRows.filter((item) => item[0] === category && clean(authorName(item[4])) === a).length;
    const inShelf = allRows.filter((item) => item[0] === category && item[1] === shelf && clean(authorName(item[4])) === a).length;
    if (inShelf >= 3) flags.push(`author-repeats-in-shelf:${inShelf}`);
    else if (inCategory >= 5) flags.push(`author-repeats-in-category:${inCategory}`);
  }

  const titleBase = clean(title).replace(/[一二三四五六七八九十1234567890]+$/g, "");
  if (titleBase.length >= 3) {
    const related = allRows.filter((item) => item[0] === category && clean(item[3]).startsWith(titleBase)).length;
    if (related >= 3) flags.push(`series-or-variant:${related}`);
  }

  return { category, shelf, slot: Number(slot) + 1, title, author, workUrl, flags };
}

function main() {
  const rows = readRows();
  const flagged = rows.map((row) => rowFlags(row, rows)).filter((item) => item.flags.length > 0);
  const byCategory = new Map();
  flagged.forEach((item) => {
    if (!byCategory.has(item.category)) byCategory.set(item.category, []);
    byCategory.get(item.category).push(item);
  });

  console.log("Chinese curation review");
  console.log(JSON.stringify({ rows: rows.length, flagged: flagged.length, categoriesWithFlags: byCategory.size }, null, 2));
  console.log("");

  [...byCategory.entries()].forEach(([category, items], index) => {
    console.log(`${index + 1}. ${category}: ${items.length} flags`);
    items.slice(0, 20).forEach((item) => {
      console.log(`   - ${item.shelf} #${item.slot}: ${item.title} | ${item.author} | ${item.flags.join(",")}`);
    });
    if (items.length > 20) console.log(`   ... ${items.length - 20} more`);
  });
}

main();
