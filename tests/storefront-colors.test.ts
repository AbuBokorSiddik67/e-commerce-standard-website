import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, onHex, readableOnLight } from "../src/lib/storefront-colors";

test("storefront brand controls choose a legible button foreground", () => {
  for (const hex of ["#FFFFFF", "#000000", "#777777", "#2563EB", "#00FFFF", "#0000CC"]) {
    const text = onHex(hex) === "0 0% 0%" ? "#000000" : "#FFFFFF";
    assert(contrastRatio(hex, text) >= 4.5, `${hex} on ${text}`);
  }
});

test("storefront text and links fall back on light surfaces when the custom color is too light", () => {
  assert.equal(readableOnLight("#FFFF22"), "222 47% 11%");
  assert.equal(readableOnLight("#1D4ED8"), "224 76% 48%");
});
