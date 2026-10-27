/**
 * LooseLeaf UI - CSS and Script Bundler
 * Inlines the @import chain from src/index.css into dist/looseleaf.css and
 * copies the drop-in scripts to dist/ (no bundling needed):
 *   src/scripts/behaviors.js -> dist/looseleaf.js
 *   src/scripts/theme.js     -> dist/theme.js
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const entryPath = path.join(srcDir, "index.css");
const cssOutputPath = path.join(distDir, "looseleaf.css");

const SCRIPTS = [
  { from: "behaviors.js", to: "looseleaf.js" },
  { from: "theme.js", to: "theme.js" },
];

// Every partial must be imported into a cascade layer: @import "path" layer(name);
const layeredImport = /@import\s+"([^"]+)"\s+layer\(([^)]+)\)\s*;/g;
const anyImport = /@import\b[^;]*;/g;

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

try {
  if (!fs.existsSync(entryPath)) {
    throw new Error(`Entry file missing at: ${entryPath}`);
  }

  const entryContent = fs.readFileSync(entryPath, "utf8");

  const unlayered = (stripComments(entryContent).match(anyImport) || []).filter(
    (statement) => !new RegExp(layeredImport.source).test(statement),
  );
  if (unlayered.length) {
    throw new Error(`@import without layer() in src/index.css: ${unlayered.join(" ")}`);
  }

  const bundled = entryContent.replace(layeredImport, (match, importPath, layerName) => {
    const resolvedPath = path.join(srcDir, importPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Imported file missing at: ${resolvedPath} (referenced as "${importPath}")`);
    }

    const partial = fs.readFileSync(resolvedPath, "utf8").trim();
    return `@layer ${layerName} {\n${partial}\n}\n`;
  });

  // No build date: rebuilding unchanged sources must not produce a diff.
  const header = `/* ==========================================================================
   AUTO-GENERATED BUNDLE - DO NOT EDIT DIRECTLY
   ==========================================================================
   Source Document: src/index.css
   ========================================================================== */\n\n`;

  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(cssOutputPath, header + bundled, "utf8");

  for (const { from, to } of SCRIPTS) {
    fs.copyFileSync(path.join(srcDir, "scripts", from), path.join(distDir, to));
  }

  console.log("✨ LooseLeaf UI bundled dist/looseleaf.css and copied dist/looseleaf.js, dist/theme.js");
} catch (error) {
  console.error(`❌ CSS bundling failed: ${error.message}`);
  process.exit(1);
}
