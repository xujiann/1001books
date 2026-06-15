const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "zh-data", "zh-isbns.json");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : Infinity;
const QUERY_LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--query-limit="));
const QUERY_LIMIT = QUERY_LIMIT_ARG ? Number(QUERY_LIMIT_ARG.split("=")[1]) : Infinity;
const ONLINE = process.argv.includes("--online");
const FORCE = process.argv.includes("--force");
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";

function readRows() {
  const source = fs.readFileSync(path.join(ROOT, "zh-books.js"), "utf8");
  const payload = source.match(/const p="([^"]+)"/)?.[1];
  if (!payload) throw new Error("zh-books.js payload was not found.");
  const runtime = zlib.gunzipSync(Buffer.from(payload, "base64")).toString("utf8");
  return JSON.parse(runtime.match(/window\.ZH_BOOK_PATCHES=(.*)\.map\(/s)[1]);
}

function isbnFromText(value) {
  const text = String(value || "");
  const match = text.match(/(?:isbn\/|ISBN[:=]?\s*)(97[89][0-9Xx-]{10,17}|[0-9Xx-]{10,13})/i);
  return match ? normalizeIsbn(match[1]) : "";
}

function normalizeIsbn(value) {
  return String(value || "").replace(/[^0-9Xx]/g, "").toUpperCase();
}

function location(row, index) {
  return {
    number: String(index + 1).padStart(4, "0"),
    category: row[0],
    shelf: row[1],
    slot: Number(row[2]) + 1,
  };
}

function openLibraryCover(isbn) {
  return isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : "";
}

function googleBooksCover(volume) {
  const links = volume?.volumeInfo?.imageLinks || {};
  return links.extraLarge || links.large || links.medium || links.thumbnail || "";
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "1001books-isbn-builder" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://book.douban.com/",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function cleanAuthor(author) {
  return String(author || "")
    .replace(/\[[^\]]+\]|\([^)]+\)|（[^）]+）/g, " ")
    .replace(/\s*\/\s*\d{4}.*$/, "")
    .replace(/[著编译校注]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function queryDouban(book) {
  if (!/^https:\/\/book\.douban\.com\/subject\/\d+\/?/.test(book.workUrl || "")) return null;
  const html = await fetchText(book.workUrl);
  const match =
    html.match(/ISBN:\s*([0-9Xx-]{10,17})/) ||
    html.match(/<span[^>]*>\s*ISBN:\s*<\/span>\s*([0-9Xx-]{10,17})/i);
  const isbn = normalizeIsbn(match?.[1] || "");
  if (!isbn) return null;
  return {
    isbn,
    source: "douban-subject",
    cover: openLibraryCover(isbn),
    matchedTitle: book.title,
    workUrl: book.workUrl,
  };
}

async function queryOpenLibrary(book) {
  const params = new URLSearchParams({
    title: book.title,
    author: cleanAuthor(book.author),
    limit: "5",
    fields: "title,author_name,isbn,cover_i,key",
  });
  const data = await fetchJson(`https://openlibrary.org/search.json?${params.toString()}`);
  const doc = (data.docs || []).find((item) => Array.isArray(item.isbn) && item.isbn.length);
  if (!doc) return null;
  const isbn13 = doc.isbn.find((isbn) => /^97[89]\d{10}$/.test(normalizeIsbn(isbn)));
  const isbn = normalizeIsbn(isbn13 || doc.isbn[0]);
  return {
    isbn,
    source: "openlibrary-search",
    cover: openLibraryCover(isbn),
    matchedTitle: doc.title || "",
    workUrl: doc.key ? `https://openlibrary.org${doc.key}` : "",
  };
}

async function queryGoogleBooks(book) {
  const author = cleanAuthor(book.author);
  const query = [`intitle:${book.title}`, author ? `inauthor:${author}` : ""].filter(Boolean).join(" ");
  const params = new URLSearchParams({ q: query, maxResults: "5" });
  if (GOOGLE_BOOKS_API_KEY) params.set("key", GOOGLE_BOOKS_API_KEY);
  const data = await fetchJson(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
  for (const item of data.items || []) {
    const identifiers = item.volumeInfo?.industryIdentifiers || [];
    const isbn13 = identifiers.find((id) => id.type === "ISBN_13")?.identifier;
    const isbn10 = identifiers.find((id) => id.type === "ISBN_10")?.identifier;
    const isbn = normalizeIsbn(isbn13 || isbn10 || "");
    if (!isbn) continue;
    return {
      isbn,
      source: "google-books",
      cover: googleBooksCover(item),
      matchedTitle: item.volumeInfo?.title || "",
      workUrl: item.volumeInfo?.infoLink || "",
    };
  }
  return null;
}

async function enrich(book) {
  if (!ONLINE) return null;
  try {
    return (await queryDouban(book)) || (await queryOpenLibrary(book)) || (await queryGoogleBooks(book));
  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  const rows = readRows();
  const existing = fs.existsSync(OUTPUT) ? JSON.parse(fs.readFileSync(OUTPUT, "utf8")) : { books: [] };
  const existingByNumber = new Map((existing.books || []).map((book) => [String(book.number), book]));
  const result = [];
  let queryCount = 0;

  for (let index = 0; index < rows.length && index < LIMIT; index += 1) {
    const row = rows[index];
    const title = row[3];
    const author = row[4];
    const workUrl = row[5];
    const cover = row[6];
    const directIsbn = isbnFromText(workUrl) || isbnFromText(cover);
    const previous = existingByNumber.get(String(index + 1).padStart(4, "0"));
    const record = {
      ...location(row, index),
      title,
      author,
      workUrl,
      currentCover: cover,
      isbn: directIsbn || (!FORCE ? previous?.isbn || "" : ""),
      isbnSource: directIsbn ? "existing-url" : !FORCE ? previous?.isbnSource || "" : "",
      coverCandidates: [],
      status: directIsbn || (!FORCE && previous?.isbn) ? "known" : "missing",
    };
    if (record.isbn) {
      const candidates = [previous?.coverCandidates || [], openLibraryCover(record.isbn)].flat().filter(Boolean);
      record.coverCandidates = Array.from(new Set(candidates));
      if (previous?.cachedCover) record.cachedCover = previous.cachedCover;
      if (previous?.matchedTitle) record.matchedTitle = previous.matchedTitle;
      if (previous?.matchedUrl) record.matchedUrl = previous.matchedUrl;
    }

    if (!record.isbn && queryCount < QUERY_LIMIT) {
      queryCount += 1;
      const enriched = await enrich({ title, author });
      if (enriched?.isbn) {
        record.isbn = enriched.isbn;
        record.isbnSource = enriched.source;
        record.coverCandidates = [enriched.cover, openLibraryCover(enriched.isbn)].filter(Boolean);
        record.matchedTitle = enriched.matchedTitle;
        record.matchedUrl = enriched.workUrl;
        record.status = "candidate";
      } else if (enriched?.error) {
        record.error = enriched.error;
      }
    }
    result.push(record);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    rows: result.length,
    known: result.filter((item) => item.status === "known").length,
    candidates: result.filter((item) => item.status === "candidate").length,
    missing: result.filter((item) => item.status === "missing").length,
  };
  fs.writeFileSync(OUTPUT, `${JSON.stringify({ summary, books: result }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
