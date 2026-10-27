import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { compile } from "./tokens-core.mjs";

const require = createRequire(import.meta.url);
const { bundle } = require("./build-tools.js");

test("the classic-script bundle compiles byte-identically to the ES modules", () => {
  const context = { window: {} };
  vm.runInNewContext(bundle(), context);
  const lib = context.window.LooseLeafTokens;

  const json = JSON.parse(fs.readFileSync(new URL("../design-tokens.json", import.meta.url), "utf8"));
  assert.equal(lib.compile(json).css, compile(json).css);
  assert.equal(typeof lib.contrastReport, "function");
  assert.equal(typeof lib.oklchToHex, "function");
  assert.equal(typeof lib.typeScale, "function");
});
