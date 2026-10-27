/**
 * LooseLeaf UI - Guardrail Linter
 * Zero-dependency checks that keep src/ honest to the token architecture:
 *   1. CSS rules (no literals outside tokens, no outline:none, no !important, ...)
 *   2. Docs references (every `--token` and `.class` in backticks must exist)
 *   3. Every src/**\/*.css file is imported by src/index.css
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const toolsDir = path.join(rootDir, "tools");
const docsDir = path.join(rootDir, "docs");

const FORM_CONTROL_FILES = ["input.css", "select.css", "textarea.css"];
const ALLOWED_MEDIA = [/^\(\s*hover\s*:\s*hover\s*\)$/, /^\(\s*prefers-reduced-motion(\s*:\s*[a-z-]+)?\s*\)$/];

const violations = [];

function report(file, line, rule, snippet) {
  violations.push({ file: path.relative(rootDir, file).replace(/\\/g, "/"), line, rule, snippet: snippet.replace(/\s+/g, " ").trim().slice(0, 100) });
}

function walk(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, ext);
    return entry.name.endsWith(ext) ? [full] : [];
  });
}

// Files git ignores (local notes, scratch docs) are not part of the project.
function isGitIgnored(file) {
  try {
    execFileSync("git", ["check-ignore", "-q", file], { cwd: rootDir, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/* --------------------------------------------------------------------------
   CSS TOKENIZER
   Splits a stylesheet into preludes (selectors / at-rules, followed by "{")
   and declarations (followed by ";" or "}"), keeping the at-rule stack.
   -------------------------------------------------------------------------- */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
}

function lineAt(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

function parseCss(css) {
  const text = stripComments(css);
  const items = [];
  const stack = [];
  let start = 0;
  let parens = 0;
  let quote = null;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote && text[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") parens++;
    else if (ch === ")") parens--;
    else if (parens > 0) continue;
    else if (ch === "{" || ch === ";" || ch === "}") {
      const raw = text.slice(start, i);
      const chunk = raw.trim();
      const offset = start + raw.length - raw.trimStart().length;
      if (chunk) {
        const kind = ch === "{" ? "prelude" : "declaration";
        items.push({ kind, text: chunk, line: lineAt(text, offset), context: [...stack] });
      }
      if (ch === "{") stack.push(chunk);
      if (ch === "}") stack.pop();
      start = i + 1;
    }
  }
  return items;
}

function withoutVarRefs(value) {
  let previous;
  do {
    previous = value;
    value = value.replace(/var\(\s*--[\w-]+\s*\)/g, "");
  } while (value !== previous);
  return value;
}

function isAllowedMedia(prelude) {
  const query = prelude.replace(/^@media\s+/i, "").trim();
  return query.split(/\s+and\s+/i).every((part) => ALLOWED_MEDIA.some((pattern) => pattern.test(part.trim())));
}

// The reduced-motion kill switch legitimately needs !important and a near-zero duration.
function insideReducedMotionMedia(context) {
  return context.some((prelude) => /^@media\b/i.test(prelude) && /prefers-reduced-motion/i.test(prelude));
}

function insideHoverMedia(context) {
  return context.some((prelude) => /^@media\b/i.test(prelude) && /\(\s*hover\s*:\s*hover\s*\)/i.test(prelude));
}

/* --------------------------------------------------------------------------
   1. CSS RULES
   -------------------------------------------------------------------------- */
function checkCss(file) {
  const css = fs.readFileSync(file, "utf8");
  const isFormControl = FORM_CONTROL_FILES.includes(path.basename(file));

  // Stopgaps were marked for promotion into src/; none may outlive the blocks they stood in for.
  css.split("\n").forEach((line, index) => {
    if (/\bPROMOTE\b/.test(line)) report(file, index + 1, "PROMOTE stopgap left behind", line);
  });

  for (const item of parseCss(css)) {
    if (item.kind === "prelude") {
      if (/^@media\b/i.test(item.text) && !isAllowedMedia(item.text)) {
        report(file, item.line, "viewport @media (use @container)", item.text);
      }
      if (/:hover\b/.test(item.text) && !insideHoverMedia(item.context)) {
        report(file, item.line, ":hover outside @media (hover: hover)", item.text);
      }
      continue;
    }

    const match = item.text.match(/^(--[\w-]+|[a-z-]+)\s*:\s*([\s\S]*)$/i);
    if (!match) continue;
    const property = match[1].toLowerCase();
    const value = match[2];
    const reducedMotion = insideReducedMotionMedia(item.context);

    if (/!important/i.test(value) && !reducedMotion) report(file, item.line, "!important", item.text);
    if (/#[0-9a-f]{3,8}\b/i.test(value)) report(file, item.line, "raw hex colour", item.text);
    if (/\brgba?\(/i.test(value)) report(file, item.line, "raw rgb()/rgba() colour", item.text);
    if (/\b100vh\b/.test(value)) report(file, item.line, "100vh (use dvh)", item.text);

    if (/^border(-[a-z]+)*-radius$/.test(property) && /\d+px\b/.test(value)) {
      report(file, item.line, "px radius literal", item.text);
    }
    if (property === "box-shadow" && !/^none$/i.test(value.trim()) && /\d/.test(withoutVarRefs(value))) {
      report(file, item.line, "box-shadow literal", item.text);
    }
    if (property === "z-index" && /^-?\d/.test(value.trim())) {
      report(file, item.line, "z-index literal", item.text);
    }
    if (/^(transition|animation)(-[a-z-]+)?$/.test(property) && !reducedMotion && /(^|[\s,(])\d*\.?\d+m?s\b/.test(value)) {
      report(file, item.line, "duration literal", item.text);
    }
    if (property === "outline" && /^none\b/i.test(value.trim())) {
      report(file, item.line, "outline: none", item.text);
    }
    if (isFormControl && /--text-small\b/.test(value)) {
      report(file, item.line, "--text-small in a form control (iOS zoom)", item.text);
    }
  }
}

/* --------------------------------------------------------------------------
   2. DOCS REFERENCES
   -------------------------------------------------------------------------- */
function collectDefinitions(cssFiles) {
  const tokens = new Set();
  const classes = new Set();

  for (const file of cssFiles) {
    for (const item of parseCss(fs.readFileSync(file, "utf8"))) {
      if (item.kind === "prelude") {
        if (item.text.startsWith("@")) continue;
        for (const [, name] of item.text.matchAll(/\.([a-zA-Z][\w-]*)/g)) classes.add(name);
      } else {
        const declared = item.text.match(/^(--[\w-]+)\s*:/);
        if (declared) tokens.add(declared[1]);
      }
      // Tier 3 hooks are documented by being read with a fallback: var(--card-padding, ...)
      for (const [, name] of item.text.matchAll(/var\(\s*(--[\w-]+)/g)) tokens.add(name);
    }
  }
  return { tokens, classes };
}

// A trailing "*" (`--step-*`, `.text-*`) documents a family; it exists if anything has that prefix.
function isDefined(name, defined) {
  if (!name.endsWith("*")) return defined.has(name);
  const prefix = name.slice(0, -1);
  return [...defined].some((candidate) => candidate.startsWith(prefix));
}

function checkDocs(file, definitions) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  let fenced = false;

  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;

    for (const [, code] of line.matchAll(/`([^`]+)`/g)) {
      for (const [token] of code.matchAll(/(?<![\w-])--[a-z0-9][a-z0-9-]*\*?/g)) {
        if (!isDefined(token, definitions.tokens)) report(file, index + 1, `unknown token ${token}`, code);
      }
      for (const [, name] of code.matchAll(/(?<![\w/\\.-])\.([a-z][a-z0-9_-]*\*?)(?![\w(-])/g)) {
        if (!isDefined(name, definitions.classes)) report(file, index + 1, `unknown class .${name}`, code);
      }
    }
  });
}

/* --------------------------------------------------------------------------
   3. ORPHANED PARTIALS
   -------------------------------------------------------------------------- */
function checkImports(cssFiles) {
  const entryPath = path.join(srcDir, "index.css");
  const entry = stripComments(fs.readFileSync(entryPath, "utf8"));
  const imported = new Set(
    [...entry.matchAll(/@import\s+(?:url\()?["']([^"']+)["']/g)].map(([, ref]) => path.join(srcDir, ref)),
  );

  for (const file of cssFiles) {
    if (file === entryPath || imported.has(file)) continue;
    report(file, 1, "not imported by src/index.css", path.relative(srcDir, file));
  }
}

/* --------------------------------------------------------------------------
   RUN
   -------------------------------------------------------------------------- */
const srcCss = walk(srcDir, ".css");
const lintedCss = [...srcCss, ...walk(toolsDir, ".css")].filter((file) => path.basename(file) !== "variables.css");
const docFiles = [path.join(rootDir, "README.md"), ...walk(docsDir, ".md")].filter(
  (file) => fs.existsSync(file) && !isGitIgnored(file),
);

lintedCss.forEach(checkCss);
const definitions = collectDefinitions(srcCss);
docFiles.forEach((file) => checkDocs(file, definitions));
checkImports(srcCss);

if (violations.length === 0) {
  console.log("✨ LooseLeaf UI check passed with zero violations");
  process.exit(0);
}

for (const v of violations) {
  console.log(`${v.file}:${v.line}  ${v.rule}  ${v.snippet}`);
}

const byRule = violations.reduce((counts, v) => {
  const rule = v.rule.replace(/ (--|\.)[\w-]+$/, "");
  counts[rule] = (counts[rule] || 0) + 1;
  return counts;
}, {});

console.log("\nSummary:");
for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${rule}`);
}
console.error(`\n❌ LooseLeaf UI check failed with ${violations.length} violation(s)`);
process.exit(1);
