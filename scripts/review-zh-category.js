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

function titleKey(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[《》「」『』“”"'\[\]【】（）(){}·•,，.。!！?？:：;；、\s-]/g, "")
    .toLowerCase();
}

function flags(row, allRows) {
  const title = String(row[3] || "");
  const author = String(row[4] || "");
  const url = String(row[5] || "");
  const result = [];
  if (/导读|题库|试题|考试|教材编写组|练习|习题|课程|讲义|赏析|青少版|少儿版/.test(title + author)) result.push("edition-risk");
  if (/Douban|豆瓣读书/.test(author)) result.push("weak-author");
  if (!/^https:\/\/book\.douban\.com\/subject\/\d+\/?/.test(url)) result.push("url-check");
  const sameAuthorCount = allRows.filter((item) => titleKey(item[4]) && titleKey(item[4]) === titleKey(author)).length;
  if (sameAuthorCount >= 4) result.push(`author-many:${sameAuthorCount}`);
  if (title.length > 24) result.push("long-title");
  return result;
}

function groupBy(rows, index) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row[index];
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return map;
}

function main() {
  const rows = readRows();
  const categories = [...groupBy(rows, 0).keys()];
  const arg = process.argv[2] || "1";
  const category = /^\d+$/.test(arg) ? categories[Number(arg) - 1] : categories.find((item) => item.includes(arg));
  if (!category) {
    console.log("Categories:");
    categories.forEach((item, index) => console.log(`${index + 1}. ${item}`));
    process.exit(1);
  }

  const selected = rows.filter((row) => row[0] === category);
  const shelves = groupBy(selected, 1);
  const suspicious = selected
    .map((row) => ({ row, flags: flags(row, rows) }))
    .filter((item) => item.flags.length > 0);

  console.log(`# ${category}`);
  console.log("");
  console.log(`Books: ${selected.length}`);
  console.log(`Shelves: ${shelves.size}`);
  console.log(`Review flags: ${suspicious.length}`);
  console.log("");

  for (const [shelf, shelfRows] of shelves) {
    console.log(`## ${shelf}`);
    shelfRows
      .sort((a, b) => a[2] - b[2])
      .forEach((row) => {
        const mark = flags(row, rows);
        console.log(`${Number(row[2]) + 1}. ${row[3]} | ${row[4]} | ${row[5]}${mark.length ? ` | FLAGS: ${mark.join(",")}` : ""}`);
      });
    console.log("");
  }

  if (suspicious.length > 0) {
    console.log("## Flag Summary");
    suspicious.forEach(({ row, flags: rowFlags }) => {
      console.log(`- ${row[0]} / ${row[1]} #${Number(row[2]) + 1}: ${row[3]} [${rowFlags.join(", ")}]`);
    });
  }
}

main();
