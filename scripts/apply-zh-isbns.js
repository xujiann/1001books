const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "zh-data", "zh-isbns.json");
const INPUT = process.argv[2];

function usage() {
  console.log("Usage: node scripts/apply-zh-isbns.js <csv>");
  console.log("CSV columns: number,isbn[,source]");
  process.exit(1);
}

function normalizeIsbn(value) {
  return String(value || "").replace(/[^0-9Xx]/g, "").toUpperCase();
}

function coverFor(isbn) {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
}

function parseLine(line) {
  const parts = line.split(",").map((part) => part.trim());
  if (parts[0]?.toLowerCase() === "number") return null;
  const number = String(parts[0] || "").padStart(4, "0");
  const isbn = normalizeIsbn(parts[1] || "");
  const source = parts[2] || "manual";
  if (!/^\d{4}$/.test(number) || !/^(97[89]\d{10}|\d{9}[\dX])$/.test(isbn)) return null;
  return { number, isbn, source };
}

function main() {
  if (!INPUT) usage();
  if (!fs.existsSync(DATA_FILE)) throw new Error(`Missing ISBN data: ${DATA_FILE}`);
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const byNumber = new Map(data.books.map((book) => [book.number, book]));
  const rows = fs.readFileSync(path.resolve(INPUT), "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let applied = 0;

  for (const row of rows) {
    const item = parseLine(row);
    if (!item) continue;
    const book = byNumber.get(item.number);
    if (!book) continue;
    book.isbn = item.isbn;
    book.isbnSource = item.source;
    book.status = "known";
    book.coverCandidates = Array.from(new Set([...(book.coverCandidates || []), coverFor(item.isbn)]));
    applied += 1;
  }

  data.summary.generatedAt = new Date().toISOString();
  data.summary.known = data.books.filter((book) => book.isbn && book.status === "known").length;
  data.summary.candidates = data.books.filter((book) => book.isbn && book.status === "candidate").length;
  data.summary.missing = data.books.filter((book) => !book.isbn).length;
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);
  console.log(JSON.stringify({ applied, ...data.summary }, null, 2));
}

main();
