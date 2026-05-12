"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractResumeItems,
  normalizeRewrites,
  wordCount,
} = require("../proxy/lib/resume-tailor");

test("extractResumeItems handles nested LaTeX commands", () => {
  const tex = "\\resumeItem{Built \\textbf{typed APIs} with Node.js and React.}\n\\resumeItem{Reduced RPC requests by 40\\%.}";
  const items = extractResumeItems(tex);

  assert.equal(items.length, 2);
  assert.equal(items[0].original, "Built \\textbf{typed APIs} with Node.js and React.");
  assert.equal(items[1].original, "Reduced RPC requests by 40\\%.");
});

test("normalizeRewrites enforces exactly n or n-1 word count", () => {
  const items = [
    { index: 0, wordCount: 5 },
    { index: 1, wordCount: 5 },
    { index: 2, wordCount: 5 },
  ];

  const rewrites = normalizeRewrites(items, [
    { index: 0, text: "Built typed backend API services" }, // 5 words (n)
    { index: 1, text: "Built typed API services" }, // 4 words (n-1)
    { index: 2, text: "This rewrite has far too many words" }, // 7 words (invalid)
  ]);

  assert.equal(rewrites.length, 2);
  assert.equal(rewrites[0].index, 0);
  assert.equal(rewrites[1].index, 1);
});
