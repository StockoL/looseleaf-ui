import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile, fontImports, themeStylesheet } from "./tokens-core.mjs";

const CLI = fileURLToPath(new URL("./cli.js", import.meta.url));
const TOKENS = fileURLToPath(new URL("../design-tokens.json", import.meta.url));
const { version } = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "looseleaf-cli-"));

test("compile writes the theme files the configurator exports", () => {
  const out = path.join(tmp(), "static", "theme");
  const result = run("compile", TOKENS, "--out", out);
  assert.equal(result.status, 0, result.stderr);

  const json = JSON.parse(fs.readFileSync(TOKENS, "utf8"));
  const css = fs.readFileSync(path.join(out, "looseleaf-tokens.css"), "utf8");
  assert.equal(css, themeStylesheet(compile(json).css, fontImports(json)), "same bytes as the configurator's export");

  const resolved = JSON.parse(fs.readFileSync(path.join(out, "tokens.resolved.json"), "utf8"));
  assert.deepEqual(Object.keys(resolved).slice(0, 2), ["$version", "$generated"]);
  assert.equal(resolved.$version, version);
  assert.match(resolved["color.action"].light, /^#[0-9a-f]{6}$/);
});

test("web fonts get their @import ahead of the layer", () => {
  const dir = tmp();
  const source = path.join(dir, "design-tokens.json");
  const json = JSON.parse(fs.readFileSync(TOKENS, "utf8"));
  json.font.heading = "'Fraunces', Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif";
  fs.writeFileSync(source, JSON.stringify(json));

  const result = run("compile", source, `--out=${dir}`);
  assert.equal(result.status, 0, result.stderr);
  const css = fs.readFileSync(path.join(dir, "looseleaf-tokens.css"), "utf8");
  assert.ok(css.startsWith('@import url("https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&display=swap");\n@layer global {'));
  assert.match(result.stdout, /Web fonts .*Fraunces/);
});

test("bad input fails with a clear message and a non-zero exit", () => {
  const dir = tmp();
  const broken = path.join(dir, "broken.json");
  fs.writeFileSync(broken, JSON.stringify({ gutter: "{space.nope}" }));
  const result = run("compile", broken, "--out", dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not compile: Unknown token reference/);
  assert.equal(fs.existsSync(path.join(dir, "looseleaf-tokens.css")), false);

  assert.equal(run("compile").status, 1);
  assert.equal(run("explode").status, 1);
  assert.match(run("--help").stdout, /Usage: looseleaf-ui compile/);
  assert.equal(run("--version").stdout.trim(), version);
});
