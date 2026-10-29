/**
 * LooseLeaf UI - CSS and Script Bundler
 * Inlines the @import chain from src/index.css into dist/looseleaf.css and
 * copies the drop-in scripts to dist/ (no bundling needed):
 *   src/scripts/behaviors.js -> dist/looseleaf.js
 *   src/scripts/theme.js     -> dist/theme.js
 * Each output opens with the MIT notice, which must stay with the file.
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const entryPath = path.join(srcDir, "index.css");
const cssOutputPath = path.join(distDir, "looseleaf.css");

const { version } = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const copyright = fs.readFileSync(path.join(rootDir, "LICENSE"), "utf8").match(/^Copyright .+$/m)[0];
// "/*!" survives minifiers that strip other comments
const notice = `/*! LooseLeaf UI v${version} | MIT License | ${copyright} | https://github.com/StockoL/looseleaf-ui */
`;

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

// Git may check sources out with CRLF or LF; outputs are always LF so they are byte-identical everywhere.
function readSource(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

try {
  if (!fs.existsSync(entryPath)) {
    throw new Error(`Entry file missing at: ${entryPath}`);
  }

  const entryContent = readSource(entryPath);

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

    const partial = readSource(resolvedPath).trim();
    return `@layer ${layerName} {\n${partial}\n}\n`;
  });

  // No build date: rebuilding unchanged sources must not produce a diff.
  const header = `${notice}/* ==========================================================================
   AUTO-GENERATED BUNDLE - DO NOT EDIT DIRECTLY
   ==========================================================================
   Source Document: src/index.css
   ========================================================================== */\n\n`;

  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(cssOutputPath, header + bundled, "utf8");

  for (const { from, to } of SCRIPTS) {
    fs.writeFileSync(path.join(distDir, to), notice + readSource(path.join(srcDir, "scripts", from)), "utf8");
  }

  console.log("✨ LooseLeaf UI bundled dist/looseleaf.css and copied dist/looseleaf.js, dist/theme.js");
} catch (error) {
  console.error(`❌ CSS bundling failed: ${error.message}`);
  process.exit(1);
}
