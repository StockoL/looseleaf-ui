/**
 * LooseLeaf UI - Django Static Sync
 * Copies the built dist/ assets into the django-looseleaf package so the
 * Python side never re-derives anything and can't drift from the npm build.
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const packageDir = path.join(rootDir, "packages", "django-looseleaf", "src", "django_looseleaf");
const staticDir = path.join(packageDir, "static", "looseleaf");

const assets = [
  { file: "looseleaf.css", target: staticDir },
  { file: "looseleaf.js", target: staticDir },
  { file: "theme.js", target: staticDir },
  { file: "tokens.resolved.json", target: packageDir },
];

try {
  if (!fs.existsSync(packageDir)) {
    console.log("⏭️  django-looseleaf package not present yet, skipping static sync");
    process.exit(0);
  }

  fs.mkdirSync(staticDir, { recursive: true });

  const copied = [];
  for (const { file, target } of assets) {
    const source = path.join(distDir, file);
    if (!fs.existsSync(source)) continue;
    fs.copyFileSync(source, path.join(target, file));
    copied.push(file);
  }

  // The behaviour modules, one by one, for projects that import them selectively
  const behavioursSource = path.join(distDir, "behaviours");
  if (fs.existsSync(behavioursSource)) {
    const behavioursTarget = path.join(staticDir, "behaviours");
    fs.rmSync(behavioursTarget, { recursive: true, force: true });
    fs.cpSync(behavioursSource, behavioursTarget, { recursive: true });
    copied.push("behaviours/");
  }

  if (copied.length === 0) {
    throw new Error(`No built assets found in ${distDir}. Run npm run build:css first.`);
  }

  console.log(`✨ LooseLeaf UI synced ${copied.join(", ")} into django-looseleaf`);
} catch (error) {
  console.error(`❌ Django static sync failed: ${error.message}`);
  process.exit(1);
}
