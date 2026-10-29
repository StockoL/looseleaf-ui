/**
 * LooseLeaf UI - CSS and Script Bundler
 * Inlines the @import chain from src/index.css into dist/looseleaf.css and
 * builds the drop-in scripts:
 *   src/scripts/behaviours/*.js -> dist/looseleaf.js (joined, in the order of index.json)
 *                               -> dist/behaviours/<name>.js (each on its own, for selective import)
 *   src/scripts/theme.js        -> dist/theme.js
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

const behavioursDir = path.join(srcDir, "scripts", "behaviours");

const LOOSELEAF_JS_HEADER = `/**
 * LooseLeaf UI - Behaviours
 * Enhancement only: every control already works without this file. Each module
 * below says why it needs script and what happens without it. They are also
 * published one by one in dist/behaviours/ for selective import. Event delegation
 * on the document; exports nothing; works as a classic or a module script; safe
 * to include twice, or alongside the individual modules.
 */
`;

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

  const { modules } = JSON.parse(readSource(path.join(behavioursDir, "index.json")));
  const onDisk = fs.readdirSync(behavioursDir).filter((file) => file.endsWith(".js")).map((file) => file.slice(0, -3));
  const unlisted = onDisk.filter((name) => !modules.includes(name));
  if (unlisted.length) throw new Error(`src/scripts/behaviours/index.json does not list: ${unlisted.join(", ")}`);

  const behavioursOut = path.join(distDir, "behaviours");
  fs.rmSync(behavioursOut, { recursive: true, force: true });
  fs.mkdirSync(behavioursOut);
  const sources = modules.map((name) => {
    const source = readSource(path.join(behavioursDir, `${name}.js`));
    fs.writeFileSync(path.join(behavioursOut, `${name}.js`), notice + source, "utf8");
    return source.trim();
  });
  fs.writeFileSync(path.join(distDir, "looseleaf.js"), `${notice}${LOOSELEAF_JS_HEADER}\n${sources.join("\n\n")}\n`, "utf8");
  fs.writeFileSync(path.join(distDir, "theme.js"), notice + readSource(path.join(srcDir, "scripts", "theme.js")), "utf8");

  const size = (file) => `${(fs.statSync(path.join(distDir, file)).size / 1024).toFixed(1)} KB`;
  console.log(`✨ LooseLeaf UI bundled dist/looseleaf.css, dist/looseleaf.js (${modules.length} modules, ${size("looseleaf.js")}), dist/behaviours/ and dist/theme.js`);
} catch (error) {
  console.error(`❌ CSS bundling failed: ${error.message}`);
  process.exit(1);
}
