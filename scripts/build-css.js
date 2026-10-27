/**
 * LooseLeaf UI - CSS Bundler
 * Inlines the @import chain from src/index.css into a single dist/looseleaf.css.
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const entryPath = path.join(srcDir, "index.css");
const cssOutputPath = path.join(rootDir, "dist", "looseleaf.css");

const importPattern = /@import\s+"([^"]+)"\s+layer\(([^)]+)\)\s*;/g;

try {
  if (!fs.existsSync(entryPath)) {
    throw new Error(`Entry file missing at: ${entryPath}`);
  }

  const entryContent = fs.readFileSync(entryPath, "utf8");

  const bundled = entryContent.replace(
    importPattern,
    (match, importPath, layerName) => {
      const resolvedPath = path.join(srcDir, importPath);

      if (!fs.existsSync(resolvedPath)) {
        throw new Error(
          `Imported file missing at: ${resolvedPath} (referenced as "${importPath}")`,
        );
      }

      const partial = fs.readFileSync(resolvedPath, "utf8").trim();
      return `@layer ${layerName} {\n${partial}\n}\n`;
    },
  );

  const header = `/* ==========================================================================
   AUTO-GENERATED BUNDLE - DO NOT EDIT DIRECTLY
   ==========================================================================
   Generated on: ${new Date().toISOString().split("T")[0]}
   Source Document: src/index.css
   ========================================================================== */\n\n`;

  const outputDir = path.dirname(cssOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(cssOutputPath, header + bundled, "utf8");
  console.log("✨ LooseLeaf UI stylesheets bundled cleanly to dist/looseleaf.css");
} catch (error) {
  console.error(`❌ CSS bundling failed: ${error.message}`);
  process.exit(1);
}
