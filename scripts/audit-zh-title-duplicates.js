const fs = require("fs");
const zlib = require("zlib");

function readRows() {
  const source = fs.readFileSync("zh-books.js", "utf8");
  const payload = source.match(/const p="([^"]+)"/)?.[1];
  const runtime = zlib.gunzipSync(Buffer.from(payload, "base64")).toString("utf8");
  return JSON.parse(runtime.match(/window\.ZH_BOOK_PATCHES=(.*)\.map\(/s)[1]);
}

function titleKey(value) {
  return String(value || "")
    .replace(/[《》“”"'`、，。！？；：:·•—–\-\s]/g, "")
    .replace(/[（(].*?[）)]/g, "")
    .replace(/上下册|上下卷|上下|全册|全本|全译本|套装.*|珍藏版|纪念版|经典版|精装|新版|全集|选集|导读|插图版/g, "")
    .replace(/第[一二三四五六七八九十\d]+版/g, "")
    .replace(/\d+册/g, "")
    .toLowerCase();
}

const rows = readRows();
const groups = new Map();
rows.forEach((row, index) => {
  const key = titleKey(row[3]);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ index, row });
});

const duplicates = [...groups.values()]
  .filter((group) => group.length > 1)
  .sort((a, b) => b.length - a.length || a[0].row[3].localeCompare(b[0].row[3], "zh"));

console.log(
  JSON.stringify(
    {
      titleDuplicateGroups: duplicates.length,
      extraTitleDuplicateSlots: duplicates.reduce((sum, group) => sum + group.length - 1, 0),
    },
    null,
    2,
  ),
);

for (const group of duplicates.slice(0, 80)) {
  console.log(
    `${group.length}x ${group[0].row[3]} => ${group
      .map((item) => `${item.row[0]}/${item.row[1]}#${Number(item.row[2]) + 1} ${item.row[4]}`)
      .join(" ; ")}`,
  );
}
