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

function normalizeTitle(value) {
  let title = String(value || "")
    .normalize("NFKC")
    .replace(/[《》「」『』“”"'\[\]【】（）(){}·•,，.。!！?？:：;；、\s-]/g, "")
    .replace(/布拉克本全译本|插图珍藏版|珍藏版|纪念版|典藏版|经典版|精装版|新版|修订版|全译本|全本|全集|初版全集|故事集|故事选|选集|注析|今注|讲义|导读|全书|全[一二三四五六七八九十\d]+册|第[一二三四五六七八九十\d]+版|\d+周年/g, "")
    .replace(/[上下中]册|[上下中]卷/g, "")
    .replace(/[ⅠⅡⅢIVX]+$/i, "")
    .replace(/[一二三四五六七八九十\d]+$/g, "")
    .toLowerCase();
  title = title
    .replace(/^荷马史诗/, "")
    .replace(/安徒生童话.*/, "安徒生童话")
    .replace(/格林童话.*/, "格林童话")
    .replace(/三体.*/, "三体")
    .replace(/设计心理学.*/, "设计心理学")
    .replace(/第五项修炼.*/, "第五项修炼")
    .replace(/第二性.*/, "第二性")
    .replace(/小家越住越大.*/, "小家越住越大");
  return title;
}

function normalizeAuthor(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\[[^\]]+\]|【[^】]*】|（[^）]*）|\([^)]*\)/g, "")
    .replace(/著|编|译|注|校|撰|主编|Douban|豆瓣读书/g, "")
    .split(/[\/,，;；]/)[0]
    .trim()
    .toLowerCase();
}

function groupKey(row) {
  const title = normalizeTitle(row[3]);
  return `${row[0]}|${row[1]}|${title}`;
}

function location(row) {
  return `${row[0]}/${row[1]}#${Number(row[2]) + 1}`;
}

function main() {
  const rows = readRows();
  const groups = new Map();
  rows.forEach((row) => {
    const key = groupKey(row);
    const titleCore = normalizeTitle(row[3]);
    if (!titleCore || titleCore.length < 2) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  const duplicates = [...groups.values()]
    .filter((items) => items.length > 1)
    .sort((a, b) => b.length - a.length || a[0][3].localeCompare(b[0][3], "zh"));

  console.log(
    JSON.stringify(
      {
        versionDuplicateGroups: duplicates.length,
        extraVersionDuplicateSlots: duplicates.reduce((sum, items) => sum + items.length - 1, 0),
      },
      null,
      2,
    ),
  );

  duplicates.forEach((items) => {
    console.log(`${items.length}x ${normalizeTitle(items[0][3])} / ${normalizeAuthor(items[0][4])}`);
    items.forEach((row) => {
      const cover = row[6] ? "cover" : "no-cover";
      console.log(`  - ${location(row)} | ${row[3]} | ${row[4]} | ${cover}`);
    });
  });
}

main();
