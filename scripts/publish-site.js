const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DEPLOY = path.join(ROOT, ".deploy-main");
const GIT = path.join(ROOT, ".tools", "Git", "cmd", "git.exe");
const FILES = [
  ".nojekyll",
  ".github/workflows/cache-zh-covers.yml",
  "README.md",
  "index.html",
  "app.js",
  "styles.css",
  "zh-books.js",
  "scripts/audit-zh-title-duplicates.js",
  "scripts/audit-zh-version-duplicates.js",
  "scripts/audit-zh-covers.js",
  "scripts/cache-zh-covers.js",
  "scripts/sync-cover-cache-from-deploy.js",
  "scripts/build-zh-pages-data.js",
  "scripts/refine-zh-books.js",
  "scripts/refine-zh-title-batch.js",
  "scripts/replace-zh-slot.js",
  "scripts/set-zh-slot.js",
  "scripts/check-site.js",
  "scripts/publish-site.js",
  "scripts/review-zh-category.js",
  "scripts/review-zh-all.js",
];
const DIRECTORIES = ["covers/zh"];
const SITE_URL = "https://xujiann.github.io/1001books/";

function run(command, args, options = {}) {
  const result = cp.spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed${detail ? `\n${detail}` : ""}`);
  }
  return result.stdout || "";
}

function fetchBuffer(url) {
  const https = require("https");
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "1001books-publish" } }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`${url} returned ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function write(file, value) {
  fs.writeFileSync(path.join(ROOT, file), value);
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function copy(file) {
  const source = path.join(ROOT, file);
  const target = path.join(DEPLOY, file);
  if (!fs.existsSync(source)) return false;
  ensureDir(target);
  fs.copyFileSync(source, target);
  return true;
}

function copyDirectory(directory) {
  const sourceRoot = path.join(ROOT, directory);
  const targetRoot = path.join(DEPLOY, directory);
  if (!fs.existsSync(sourceRoot)) return [];
  const copied = [];
  const stack = [sourceRoot];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const source = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(source);
        continue;
      }
      const relative = path.relative(ROOT, source).replace(/\\/g, "/");
      const target = path.join(targetRoot, path.relative(sourceRoot, source));
      ensureDir(target);
      fs.copyFileSync(source, target);
      copied.push(relative);
    }
  }
  return copied;
}

function sha(file, base) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(base, file))).digest("hex");
}

function shaBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function nextVersion() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function bumpAssetVersion(version) {
  const html = read("index.html");
  const updated = html.replace(/(\.(?:css|js)\?v=)[^"]+/g, `$1${version}`);
  if (updated !== html) write("index.html", updated);
}

function git(args, options = {}) {
  const safeArgs = ["-c", `safe.directory=${DEPLOY}`, "-C", DEPLOY, ...args];
  return run(GIT, safeArgs, options);
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    commit: args.includes("--commit") || args.includes("--push"),
    push: args.includes("--push"),
    verify: args.includes("--verify") || args.includes("--push"),
    noBump: args.includes("--no-bump"),
    message:
      args.includes("--message") && args[args.indexOf("--message") + 1]
        ? args[args.indexOf("--message") + 1]
        : "Publish site updates",
    version:
      args.includes("--version") && args[args.indexOf("--version") + 1]
        ? args[args.indexOf("--version") + 1]
        : nextVersion(),
  };
}

function main() {
  const options = parseArgs();
  if (!fs.existsSync(DEPLOY)) throw new Error(`Deploy mirror not found: ${DEPLOY}`);

  if (!options.noBump) {
    bumpAssetVersion(options.version);
    console.log(`Asset version: ${options.version}`);
  }

  console.log("Preflight check...");
  run(process.execPath, [path.join(ROOT, "scripts", "check-site.js"), "--no-deploy"]);

  console.log("Syncing files to .deploy-main...");
  const copied = [...FILES.filter(copy), ...DIRECTORIES.flatMap(copyDirectory)];
  copied.forEach((file) => console.log(`  ${file}`));

  console.log("Post-sync check...");
  run(process.execPath, [path.join(ROOT, "scripts", "check-site.js")]);

  const changed = git(["status", "--short"], { capture: true }).trim();
  if (!changed) {
    console.log("No deploy changes.");
    return;
  }

  console.log("Deploy changes:");
  console.log(changed);

  if (!options.commit) {
    console.log("Synced only. Add --commit or --push to publish.");
    return;
  }

  git(["add", ...copied]);
  git(["commit", "-m", options.message]);
  const head = git(["rev-parse", "--short", "HEAD"], { capture: true }).trim();
  console.log(`Committed ${head}`);

  if (options.push) {
    git(["push", "origin", "main"]);
    console.log("Pushed main.");
  }

  console.log("Local hashes:");
  ["index.html", "zh-books.js"].forEach((file) => console.log(`  ${file} ${sha(file, DEPLOY).toUpperCase()}`));

  if (options.verify) {
    return verifyOnline(["index.html", "zh-books.js"]);
  }
}

async function verifyOnline(files) {
  console.log("Verifying GitHub Pages...");
  const local = new Map(files.map((file) => [file, sha(file, DEPLOY)]));
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const results = [];
    for (const file of files) {
      const remote = shaBuffer(await fetchBuffer(`${SITE_URL}${file}?cb=${Date.now()}-${attempt}`));
      results.push({ file, remote, local: local.get(file), match: remote === local.get(file) });
    }
    results.forEach((item) => console.log(`  attempt ${attempt} ${item.file} match=${item.match}`));
    if (results.every((item) => item.match)) {
      console.log(`Verified: ${SITE_URL}`);
      return;
    }
    await delay(10000);
  }
  throw new Error("GitHub Pages did not match local hashes before timeout.");
}

Promise.resolve(main()).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
