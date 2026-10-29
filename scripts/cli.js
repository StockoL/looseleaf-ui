#!/usr/bin/env node
/**
 * LooseLeaf UI - Command Line
 *
 *   npx looseleaf-ui compile design-tokens.json --out static/theme/
 *
 * Compiles a design-tokens.json into the two theme files the configurator's
 * Theme bundle contains: looseleaf-tokens.css (wrapped in @layer global, with any
 * web-font @import first) and tokens.resolved.json. Same compiler, same output.
 */

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const { version } = require("../package.json");

const USAGE = `Usage: looseleaf-ui compile <design-tokens.json> [--out <dir>]

Writes looseleaf-tokens.css and tokens.resolved.json to <dir> (default: the
current directory). Load the CSS after looseleaf.css, or point django-looseleaf's
LOOSELEAF_THEME at the folder.`;

function fail(message) {
  console.error(`looseleaf-ui: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { positional: [], out: "." };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out" || arg === "-o") {
      if (!argv[i + 1]) fail("--out needs a directory");
      args.out = argv[++i];
    } else if (arg.startsWith("--out=")) {
      args.out = arg.slice("--out=".length);
    } else if (arg.startsWith("-")) {
      fail(`unknown option ${arg}\n\n${USAGE}`);
    } else {
      args.positional.push(arg);
    }
  }
  return args;
}

async function compileCommand(input, outDir) {
  const core = await import(pathToFileURL(path.join(__dirname, "tokens-core.mjs")).href);

  let json;
  try {
    json = JSON.parse(fs.readFileSync(input, "utf8"));
  } catch (error) {
    fail(`could not read ${input}: ${error.message}`);
  }

  let compiled;
  try {
    compiled = core.compile(json);
  } catch (error) {
    fail(`${input} does not compile: ${error.message}`);
  }

  const meta = { $version: version, $generated: new Date().toISOString() };
  const css = core.themeStylesheet(compiled.css, core.fontImports(json));
  const resolved = JSON.stringify(core.resolvedTokens(compiled.tokens, meta), null, 2) + "\n";

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "looseleaf-tokens.css"), css, "utf8");
  fs.writeFileSync(path.join(outDir, "tokens.resolved.json"), resolved, "utf8");

  for (const row of core.contrastReport(compiled.tokens).filter((r) => !r.passes)) {
    console.warn(
      `⚠️  Contrast ${row.ratio.toFixed(2)}:1 below ${core.CONTRAST_TARGET}:1 (${row.scheme}): ${row.foreground} on ${row.background}`,
    );
  }
  const fonts = core.webFonts(json);
  if (fonts.length) console.log(`Web fonts (imported from Google Fonts by the CSS): ${fonts.join(", ")}`);
  console.log(`✨ Wrote looseleaf-tokens.css and tokens.resolved.json to ${path.resolve(outDir)}`);
}

async function main(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h" || command === "help") {
    console.log(USAGE);
    return;
  }
  if (command === "--version" || command === "-v") {
    console.log(version);
    return;
  }
  if (command !== "compile") fail(`unknown command "${command}"\n\n${USAGE}`);

  const { positional, out } = parseArgs(rest);
  if (positional.length !== 1) fail(`compile takes one design-tokens.json\n\n${USAGE}`);
  await compileCommand(positional[0], out);
}

main(process.argv.slice(2)).catch((error) => fail(error.message));
