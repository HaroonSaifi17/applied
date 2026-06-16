"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeText,
  toWords,
  overlapScore,
  splitIntoChunks,
  clamp,
  parseJsonFromModel,
  toBoolean,
  chooseOption,
} = require("../proxy/lib/text-utils");

describe("normalizeText", () => {
  it("lowercases and trims whitespace", () => {
    assert.equal(normalizeText("  Hello World  "), "hello world");
  });

  it("collapses multiple spaces", () => {
    assert.equal(normalizeText("a   b   c"), "a b c");
  });

  it("removes newlines and tabs", () => {
    assert.equal(normalizeText("line1\nline2\tline3"), "line1 line2 line3");
  });

  it("strips special characters", () => {
    assert.equal(normalizeText("first-name! @#$"), "first name");
  });

  it("returns empty string for null/undefined/empty", () => {
    assert.equal(normalizeText(null), "");
    assert.equal(normalizeText(undefined), "");
    assert.equal(normalizeText(""), "");
    assert.equal(normalizeText(0), "");
  });

  it("handles numbers", () => {
    assert.equal(normalizeText("123"), "123");
  });
});

describe("toWords", () => {
  it("splits normalized text into words", () => {
    assert.deepEqual(toWords("Hello World"), ["hello", "world"]);
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(toWords(""), []);
    assert.deepEqual(toWords(null), []);
  });

  it("handles extra whitespace", () => {
    assert.deepEqual(toWords("  a   b  c  "), ["a", "b", "c"]);
  });
});

describe("overlapScore", () => {
  it("returns 1 for identical text", () => {
    assert.equal(overlapScore("hello world", "hello world"), 1);
  });

  it("returns 0 for completely different text", () => {
    assert.equal(overlapScore("apple banana", "xyz qwerty"), 0);
  });

  it("returns partial score for partial overlap", () => {
    const score = overlapScore("hello world", "hello there world");
    assert.ok(score > 0 && score <= 1);
  });

  it("returns 0 for empty inputs", () => {
    assert.equal(overlapScore("", "hello"), 0);
    assert.equal(overlapScore("hello", ""), 0);
    assert.equal(overlapScore("", ""), 0);
  });

  it("is case-insensitive", () => {
    assert.equal(overlapScore("Hello World", "hello world"), 1);
  });
});

describe("splitIntoChunks", () => {
  it("splits text by double newlines", () => {
    const chunks = splitIntoChunks("para1\n\npara2\n\npara3");
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0], "para1");
    assert.equal(chunks[1], "para2");
    assert.equal(chunks[2], "para3");
  });

  it("respects maxChars limit", () => {
    const long = "a".repeat(1000);
    const chunks = splitIntoChunks(long, 500);
    assert.ok(chunks.length >= 2);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 500);
    }
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(splitIntoChunks(""), []);
    assert.deepEqual(splitIntoChunks(null), []);
  });

  it("handles single paragraph within limit", () => {
    const chunks = splitIntoChunks("short text");
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0], "short text");
  });
});

describe("clamp", () => {
  it("clamps value within range", () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-1, 0, 10), 0);
    assert.equal(clamp(15, 0, 10), 10);
  });

  it("handles NaN by returning min", () => {
    assert.equal(clamp(NaN, 0, 10), 0);
  });
});

describe("parseJsonFromModel", () => {
  it("parses valid JSON", () => {
    const result = parseJsonFromModel('{"key": "value"}');
    assert.deepEqual(result, { key: "value" });
  });

  it("parses JSON from markdown code fence", () => {
    const result = parseJsonFromModel('```json\n{"key": "value"}\n```');
    assert.deepEqual(result, { key: "value" });
  });

  it("parses JSON embedded in text", () => {
    const result = parseJsonFromModel('Here is the result: {"key": "value"} done.');
    assert.deepEqual(result, { key: "value" });
  });

  it("returns null for invalid JSON", () => {
    assert.equal(parseJsonFromModel("not json"), null);
    assert.equal(parseJsonFromModel(""), null);
    assert.equal(parseJsonFromModel(null), null);
  });
});

describe("toBoolean", () => {
  it("converts truthy strings", () => {
    assert.equal(toBoolean("yes"), true);
    assert.equal(toBoolean("true"), true);
    assert.equal(toBoolean("1"), true);
    assert.equal(toBoolean("Y"), true);
    assert.equal(toBoolean("checked"), true);
  });

  it("converts falsy strings", () => {
    assert.equal(toBoolean("no"), false);
    assert.equal(toBoolean("false"), false);
    assert.equal(toBoolean("0"), false);
    assert.equal(toBoolean("N"), false);
  });

  it("returns null for ambiguous values", () => {
    assert.equal(toBoolean("maybe"), null);
    assert.equal(toBoolean(""), null);
    assert.equal(toBoolean(null), null);
  });

  it("passes through booleans", () => {
    assert.equal(toBoolean(true), true);
    assert.equal(toBoolean(false), false);
  });
});

describe("chooseOption", () => {
  const options = [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
    { label: "Maybe", value: "maybe" },
  ];

  it("matches by exact label/value", () => {
    assert.equal(chooseOption("yes", options), "yes");
    assert.equal(chooseOption("no", options), "no");
  });

  it("matches boolean to yes/no options", () => {
    assert.equal(chooseOption("true", options), "yes");
    assert.equal(chooseOption("false", options), "no");
  });

  it("returns null for no match", () => {
    assert.equal(chooseOption("unknown", options), null);
  });

  it("returns raw value when no options provided", () => {
    assert.equal(chooseOption("hello", []), "hello");
  });

  it("returns null for empty value", () => {
    assert.equal(chooseOption("", options), null);
    assert.equal(chooseOption(null, options), null);
  });

  it("handles string options", () => {
    assert.equal(chooseOption("apple", ["apple", "banana"]), "apple");
  });

  it("uses fuzzy matching for partial matches", () => {
    const opts = [
      { label: "Full-time", value: "full_time" },
      { label: "Part-time", value: "part_time" },
    ];
    assert.equal(chooseOption("Full-time", opts), "full_time");
  });
});
