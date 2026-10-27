/**
 * LooseLeaf UI - Lockstep Versioning
 * The npm package and django-looseleaf share one version, recorded in three places:
 * package.json, packages/django-looseleaf/pyproject.toml and django_looseleaf.__version__.
 *
 *   node scripts/bump-version.js 2.1.0      write all three, then rebuild (the version is
 *                                           stamped into tokens.resolved.json and tokens-lib.js)
 *   node scripts/bump-version.js --check v2.1.0
 *                                           exit 1 unless all three equal the tag (release CI)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const LOCATIONS = [
  {
    file: "package.json",
    read: (text) => JSON.parse(text).version,
    write: (text, version) => text.replace(/("version":\s*")[^"]*(")/, `$1${version}$2`),
  },
  {
    file: "packages/django-looseleaf/pyproject.toml",
    read: (text) => text.match(/^version = "([^"]*)"/m)?.[1],
    write: (text, version) => text.replace(/^(version = ")[^"]*(")/m, `$1${version}$2`),
  },
  {
    file: "packages/django-looseleaf/src/django_looseleaf/__init__.py",
    read: (text) => text.match(/^__version__ = "([^"]*)"/m)?.[1],
    write: (text, version) => text.replace(/^(__version__ = ")[^"]*(")/m, `$1${version}$2`),
  },
];

const readFile = (file) => fs.readFileSync(path.join(rootDir, file), "utf8");

function current() {
  return LOCATIONS.map(({ file, read }) => ({ file, version: read(readFile(file)) }));
}

function check(tag) {
  const expected = tag.replace(/^v/, "");
  const found = current();
  const mismatched = found.filter(({ version }) => version !== expected);
  for (const { file, version } of found) console.log(`${version === expected ? "✓" : "✗"} ${file}: ${version}`);
  if (mismatched.length) {
    console.error(`❌ Tag ${tag} does not match ${mismatched.length} version location(s). Run: node scripts/bump-version.js ${expected}`);
    process.exit(1);
  }
  console.log(`✨ All versions match ${tag}`);
}

function bump(version) {
  if (!SEMVER.test(version)) {
    console.error(`❌ "${version}" is not a semantic version (e.g. 2.1.0)`);
    process.exit(1);
  }
  for (const { file, read, write } of LOCATIONS) {
    const text = readFile(file);
    const updated = write(text, version);
    if (read(updated) !== version) throw new Error(`Could not find the version in ${file}`);
    fs.writeFileSync(path.join(rootDir, file), updated, "utf8");
    console.log(`✓ ${file}: ${read(text)} -> ${version}`);
  }
  execSync("npm run build", { cwd: rootDir, stdio: "inherit" });
  console.log(`✨ Version ${version} written everywhere. Commit, then tag v${version} to release.`);
}

const [first, second] = process.argv.slice(2);
if (first === "--check" && second) check(second);
else if (first && !first.startsWith("-")) bump(first);
else {
  console.error("Usage: node scripts/bump-version.js <version> | --check <tag>");
  process.exit(1);
}
