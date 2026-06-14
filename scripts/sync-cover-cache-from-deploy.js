const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DEPLOY = path.join(ROOT, ".deploy-main");
const GIT = path.join(ROOT, ".tools", "Git", "cmd", "git.exe");
const COVER_DIR = path.join("covers", "zh");
const REPORT_DIR = "reports";

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

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function copyFile(relative) {
  const source = path.join(DEPLOY, relative);
  const target = path.join(ROOT, relative);
  if (!fs.existsSync(source)) throw new Error(`Missing deploy file: ${relative}`);
  ensureDir(target);
  fs.copyFileSync(source, target);
}

function copyDirectory(relativeDir) {
  const sourceRoot = path.join(DEPLOY, relativeDir);
  const targetRoot = path.join(ROOT, relativeDir);
  if (!fs.existsSync(sourceRoot)) throw new Error(`Missing deploy directory: ${relativeDir}`);
  const stack = [sourceRoot];
  let copied = 0;
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const source = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(source);
        continue;
      }
      const target = path.join(targetRoot, path.relative(sourceRoot, source));
      ensureDir(target);
      fs.copyFileSync(source, target);
      copied += 1;
    }
  }
  return copied;
}

function git(args, options = {}) {
  return run(GIT, ["-c", `safe.directory=${DEPLOY}`, "-C", DEPLOY, ...args], options);
}

function main() {
  if (!fs.existsSync(DEPLOY)) throw new Error(`Deploy mirror not found: ${DEPLOY}`);
  git(["fetch", "origin", "main"]);
  git(["merge", "--ff-only", "origin/main"]);
  copyFile("zh-books.js");
  const covers = copyDirectory(COVER_DIR);
  let reports = 0;
  if (fs.existsSync(path.join(DEPLOY, REPORT_DIR))) {
    reports = copyDirectory(REPORT_DIR);
  }
  run(process.execPath, [path.join(ROOT, "scripts", "check-site.js"), "--no-deploy"]);
  run(process.execPath, [path.join(ROOT, "scripts", "audit-zh-covers.js")]);
  console.log(JSON.stringify({ syncedCovers: covers, syncedReports: reports }, null, 2));
}

main();
