const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DEPLOY = path.join(ROOT, ".deploy-main");
const SKIP_DEPLOY = process.argv.includes("--no-deploy");
const CORE_FILES = ["index.html", "app.js", "styles.css", "zh-books.js", ".nojekyll"];
const SCRIPT_FILES = [
  "scripts/audit-zh-title-duplicates.js",
  "scripts/build-zh-pages-data.js",
  "scripts/refine-zh-books.js",
  "scripts/refine-zh-title-batch.js",
  "scripts/replace-zh-slot.js",
  "scripts/check-site.js",
  "scripts/publish-site.js",
  "scripts/review-zh-category.js",
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function sha(file, base = ROOT) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(base, file))).digest("hex").toUpperCase();
}

function readZhRows(base = ROOT) {
  const source = fs.readFileSync(path.join(base, "zh-books.js"), "utf8");
  const payload = source.match(/const p="([^"]+)"/)?.[1];
  if (!payload) throw new Error("zh-books.js payload was not found.");
  const runtime = zlib.gunzipSync(Buffer.from(payload, "base64")).toString("utf8");
  const rowsJson = runtime.match(/window\.ZH_BOOK_PATCHES=(.*)\.map\(/s)?.[1];
  if (!rowsJson) throw new Error("ZH_BOOK_PATCHES rows were not found.");
  return JSON.parse(rowsJson);
}

function titleKey(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[《》「」『』“”"'\[\]【】（）(){}·•,，.。!！?？:：;；、\s-]/g, "")
    .replace(/上下册|上下卷|上中下|全[一二三四五六七八九十\d]+册|全本|全集|选集|修订版|新版|珍藏版|纪念版|典藏版|精装|导读|插图版/g, "")
    .replace(/第[一二三四五六七八九十\d]+版/g, "")
    .replace(/\d+周年/g, "")
    .toLowerCase();
}

function auditRows(rows) {
  const shelfKeys = new Set();
  const groups = new Map();
  const authorTitle = new Map();
  const urlGroups = new Map();
  let missingCover = 0;
  let missingUrl = 0;
  let badSlot = 0;

  for (const row of rows) {
    const [category, sub, slot, title, author, workUrl, cover] = row;
    shelfKeys.add(`${category}/${sub}`);
    if (!cover) missingCover += 1;
    if (!workUrl) missingUrl += 1;
    if (!Number.isInteger(slot) || slot < 0 || slot > 6) badSlot += 1;

    const key = titleKey(title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);

    const authorKey = `${key}|${titleKey(author)}`;
    if (!authorTitle.has(authorKey)) authorTitle.set(authorKey, []);
    authorTitle.get(authorKey).push(row);

    if (workUrl) {
      if (!urlGroups.has(workUrl)) urlGroups.set(workUrl, []);
      urlGroups.get(workUrl).push(row);
    }
  }

  const duplicateTitleGroups = [...groups.values()].filter((items) => items.length > 1);
  const duplicateAuthorTitleGroups = [...authorTitle.values()].filter((items) => items.length > 1);
  const duplicateUrlGroups = [...urlGroups.values()].filter((items) => items.length > 1);

  return {
    rows: rows.length,
    shelves: shelfKeys.size,
    missingCover,
    missingUrl,
    badSlot,
    duplicateTitleGroups: duplicateTitleGroups.length,
    extraTitleDuplicateSlots: duplicateTitleGroups.reduce((sum, items) => sum + items.length - 1, 0),
    duplicateAuthorTitleGroups: duplicateAuthorTitleGroups.length,
    duplicateUrlGroups: duplicateUrlGroups.length,
    duplicateSamples: duplicateTitleGroups.slice(0, 10).map((items) => ({
      title: items[0][3],
      count: items.length,
      locations: items.map((row) => `${row[0]}/${row[1]}#${Number(row[2]) + 1}`),
    })),
  };
}

function versionAudit() {
  const html = read("index.html");
  const refs = [...html.matchAll(/(?:href|src)="([^"]+\.(?:css|js))\?v=([^"]+)"/g)].map((match) => ({
    file: match[1],
    version: match[2],
  }));
  return {
    refs,
    versions: [...new Set(refs.map((item) => item.version))],
  };
}

function compareDeploy() {
  if (!fs.existsSync(DEPLOY)) return { exists: false, mismatches: CORE_FILES };
  const files = [...CORE_FILES, ...SCRIPT_FILES].filter((file) => exists(file) && fs.existsSync(path.join(DEPLOY, file)));
  const mismatches = files.filter((file) => sha(file, ROOT) !== sha(file, DEPLOY));
  const missingInDeploy = [...CORE_FILES, ...SCRIPT_FILES].filter((file) => exists(file) && !fs.existsSync(path.join(DEPLOY, file)));
  return { exists: true, checked: files.length, mismatches, missingInDeploy };
}

function statusLine(name, ok, detail) {
  return `${ok ? "OK " : "ERR"} ${name}${detail ? `: ${detail}` : ""}`;
}

function main() {
  const rows = readZhRows(ROOT);
  const rowAudit = auditRows(rows);
  const versions = versionAudit();
  const deploy = SKIP_DEPLOY ? { skipped: true } : compareDeploy();

  const checks = [
    ["Chinese rows", rowAudit.rows === 1001, String(rowAudit.rows)],
    ["Chinese shelves", rowAudit.shelves === 143, String(rowAudit.shelves)],
    ["Missing covers", rowAudit.missingCover === 0, String(rowAudit.missingCover)],
    ["Missing urls", rowAudit.missingUrl === 0, String(rowAudit.missingUrl)],
    ["Book slots", rowAudit.badSlot === 0, String(rowAudit.badSlot)],
    ["Duplicate titles", rowAudit.duplicateTitleGroups === 0, `${rowAudit.duplicateTitleGroups} groups, ${rowAudit.extraTitleDuplicateSlots} extra slots`],
    ["Duplicate author+title", rowAudit.duplicateAuthorTitleGroups === 0, `${rowAudit.duplicateAuthorTitleGroups} groups`],
    ["Duplicate urls", rowAudit.duplicateUrlGroups === 0, `${rowAudit.duplicateUrlGroups} groups`],
    ["Asset version count", versions.versions.length === 1, versions.versions.join(", ") || "none"],
    ...(SKIP_DEPLOY
      ? []
      : [
          ["Deploy mirror exists", deploy.exists, DEPLOY],
          ["Deploy mirror matches", deploy.exists && deploy.mismatches.length === 0, deploy.mismatches.join(", ") || "matched"],
          ["Deploy has scripts", deploy.exists && deploy.missingInDeploy.length === 0, deploy.missingInDeploy.join(", ") || "present"],
        ]),
  ];

  console.log("1001books site check");
  console.log(JSON.stringify({ zh: rowAudit, assetVersions: versions.versions, deploy }, null, 2));
  console.log("");
  checks.forEach(([name, ok, detail]) => console.log(statusLine(name, ok, detail)));

  if (rowAudit.duplicateSamples.length > 0) {
    console.log("");
    console.log("Duplicate samples:");
    rowAudit.duplicateSamples.forEach((item) => console.log(`- ${item.count}x ${item.title}: ${item.locations.join("; ")}`));
  }

  const failed = checks.filter(([, ok]) => !ok);
  if (failed.length > 0) {
    console.error("");
    console.error(`Failed checks: ${failed.length}`);
    process.exit(1);
  }
}

main();
