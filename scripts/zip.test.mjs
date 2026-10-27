import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { crc32, zip } from "./zip.mjs";

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array()), 0);
});

test("zip writes a store-only archive with one header per file", () => {
  const archive = zip([
    { name: "a.txt", data: "hello" },
    { name: "b.bin", data: new Uint8Array([0, 1, 2]) },
  ]);
  const view = new DataView(archive.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50, "starts with a local file header");
  assert.equal(view.getUint32(archive.length - 22, true), 0x06054b50, "ends with the end-of-central-directory record");
  assert.equal(view.getUint16(archive.length - 12, true), 2, "two entries");
});

test("zip round-trips through unzip -t and unzip -p", (t) => {
  try {
    execFileSync("unzip", ["-v"], { stdio: "ignore" });
  } catch {
    t.skip("unzip is not installed");
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "looseleaf-zip-"));
  const file = path.join(dir, "bundle.zip");
  const css = "@layer global {\n  :root { --colour: oklch(70% 0.1 150); }\n}\n";
  fs.writeFileSync(file, zip([{ name: "looseleaf-tokens.css", data: css }, { name: "README.txt", data: "Thémé ✓\n" }]));
  try {
    const tested = execFileSync("unzip", ["-t", file], { encoding: "utf8" });
    assert.match(tested, /No errors detected/);
    assert.equal(execFileSync("unzip", ["-p", file, "looseleaf-tokens.css"], { encoding: "utf8" }), css);
    assert.equal(execFileSync("unzip", ["-p", file, "README.txt"], { encoding: "utf8" }), "Thémé ✓\n");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
