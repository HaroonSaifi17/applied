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

test("normalizeRewrites enforces n plus or minus one word", () => {
  const items = [
    { index: 0, wordCount: 5 },
    { index: 1, wordCount: 5 },
  ];

  const rewrites = normalizeRewrites(items, [
    { index: 0, text: "Built typed backend API services" },
    { index: 1, text: "This rewrite has far too many words for the original bullet" },
  ]);

  assert.equal(rewrites.length, 1);
  assert.equal(rewrites[0].index, 0);
  assert.equal(wordCount(rewrites[0].text), 5);
});
