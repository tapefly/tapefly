import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "deweb-proof");
const html = readFileSync(path.join(root, "index.html"), "utf8");
const css = readFileSync(path.join(root, "style.css"), "utf8");

test("the DeWEB proof page has no scripts or off-chain resources", () => {
  assert.equal(/<script\b/i.test(html), false);
  assert.equal(/@import/i.test(css), false);
  assert.equal(/\b(?:src|href|action|poster|formaction|background)\s*=\s*["'](?:https?:)?\/\//i.test(html), false);
  assert.equal(/url\(\s*["']?(?:https?:)?\/\//i.test(css), false);
  assert.match(html, /href="style\.css"/);
  assert.ok(statSync(path.join(root, "style.css")).size < 8_400_000);
});

test("the DeWEB proof page separates the Workshop proof from the live official circuit", () => {
  assert.match(html, /WORKSHOP-7x6\/1/);
  assert.match(html, /3da820cc456b3757eefec1e8727286e42f1e448251507635baef6dd069ca52ff/);
  assert.match(html, /128/);
  assert.match(html, /161 B/);
  assert.match(html, /官方 Circuit #2 已在 X Layer 上链/);
  assert.match(html, /这份工坊证明页面自身尚未绑定 processor/);
  assert.match(html, /没有发送 X Layer 交易/);
});
