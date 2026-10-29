/**
 * LooseLeaf UI - Release Notes
 * Prints the CHANGELOG.md section for one version, for the GitHub release body.
 * Exits 1 if the changelog has no entry for it, so a release can't ship undocumented.
 *
 *   node scripts/release-notes.js v2.1.0 > notes.md
 */

const fs = require("fs");
const path = require("path");

const tag = process.argv[2];
if (!tag) {
  console.error("Usage: node scripts/release-notes.js <tag>");
  process.exit(1);
}

const version = tag.replace(/^v/, "");
const changelog = fs.readFileSync(path.join(__dirname, "..", "CHANGELOG.md"), "utf8").replace(/\r\n/g, "\n");
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const match = changelog.match(new RegExp(`^## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|^\\[[^\\]]+\\]: )`, "m"));

if (!match || !match[1].trim()) {
  console.error(`❌ CHANGELOG.md has no entry for ${version}. Move the Unreleased notes under "## [${version}] - <date>".`);
  process.exit(1);
}

process.stdout.write(match[1].trim() + "\n");
