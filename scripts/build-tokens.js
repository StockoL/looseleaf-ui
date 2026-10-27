/**
 * LooseLeaf UI - Design Token Compiler
 * Parses design-tokens.json and writes native CSS Custom Properties.
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const tokenSourcePath = path.join(rootDir, "design-tokens.json");
const cssOutputPath = path.join(rootDir, "src", "01-global", "variables.css");

try {
  if (!fs.existsSync(tokenSourcePath)) {
    throw new Error(`Source file missing at: ${tokenSourcePath}`);
  }

  const rawData = fs.readFileSync(tokenSourcePath, "utf8");
  const tokenGroups = JSON.parse(rawData);

  let cssContent = `/* ==========================================================================
   AUTO-GENERATED CUSTOM PROPERTIES - DO NOT EDIT DIRECTLY
   ==========================================================================
   Generated on: ${new Date().toISOString().split("T")[0]}
   Source Document: design-tokens.json
   ========================================================================== */\n\n:root {\n`;

  for (const [category, tokens] of Object.entries(tokenGroups)) {
    // 1. Skip over documentation block comments in the JSON source
    if (category.startsWith("_")) continue;

    cssContent += `\n  /* --- ${category.toUpperCase()} --- */\n`;

    for (const [key, value] of Object.entries(tokens)) {
      // 2. Double check child keys to guarantee clean compiled selectors
      if (key.startsWith("_")) continue;

      cssContent += `  --${category}-${key}: ${value};\n`;
    }
  }

  cssContent += "}\n";

  const outputDir = path.dirname(cssOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(cssOutputPath, cssContent, "utf8");
  console.log(
    "✨ LooseLeaf UI tokens compiled cleanly to src/01-global/variables.css",
  );
} catch (error) {
  console.error(`❌ Token compilation failed: ${error.message}`);
  process.exit(1);
}
