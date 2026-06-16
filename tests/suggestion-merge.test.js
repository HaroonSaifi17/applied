"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { mergeSuggestions } = require("../proxy/lib/suggestion-merge");

function makeField(id) {
  return { id, fingerprint: `fp_${id}` };
}

describe("mergeSuggestions", () => {
  it("deterministic takes priority over AI", () => {
    const fields = [makeField("f1")];
    const deterministic = [{ fieldId: "f1", value: "DetValue", confidence: 0.9, source: "facts", reason: "mapped" }];
    const ai = [{ fieldId: "f1", value: "AiValue", confidence: 0.85, source: "ai", reason: "inferred" }];

    const result = mergeSuggestions(fields, deterministic, ai, 0.6);
    assert.equal(result.length, 1);
    assert.equal(result[0].value, "DetValue");
    assert.equal(result[0].source, "facts");
  });

  it("AI fills when no deterministic match", () => {
    const fields = [makeField("f1")];
    const deterministic = [];
    const ai = [{ fieldId: "f1", value: "AiValue", confidence: 0.85, source: "ai", reason: "inferred" }];

    const result = mergeSuggestions(fields, deterministic, ai, 0.6);
    assert.equal(result.length, 1);
    assert.equal(result[0].value, "AiValue");
    assert.equal(result[0].source, "ai");
  });

  it("returns 'none' source when no suggestion available", () => {
    const fields = [makeField("f1")];
    const result = mergeSuggestions(fields, [], [], 0.6);
    assert.equal(result.length, 1);
    assert.equal(result[0].source, "none");
    assert.equal(result[0].value, null);
    assert.equal(result[0].suggested, false);
  });

  it("sets suggested=true when confidence >= threshold", () => {
    const fields = [makeField("f1")];
    const deterministic = [{ fieldId: "f1", value: "val", confidence: 0.9, source: "facts", reason: "r" }];
    const result = mergeSuggestions(fields, deterministic, [], 0.6);
    assert.equal(result[0].suggested, true);
  });

  it("sets suggested=false when confidence < threshold", () => {
    const fields = [makeField("f1")];
    const deterministic = [{ fieldId: "f1", value: "val", confidence: 0.3, source: "facts", reason: "r" }];
    const result = mergeSuggestions(fields, deterministic, [], 0.6);
    assert.equal(result[0].suggested, false);
  });

  it("preserves fingerprint from field", () => {
    const fields = [makeField("f1")];
    const result = mergeSuggestions(fields, [], [], 0.6);
    assert.equal(result[0].fingerprint, "fp_f1");
  });

  it("handles multiple fields with mixed sources", () => {
    const fields = [makeField("f1"), makeField("f2"), makeField("f3")];
    const deterministic = [{ fieldId: "f1", value: "det", confidence: 0.9, source: "facts", reason: "r" }];
    const ai = [{ fieldId: "f2", value: "ai", confidence: 0.8, source: "ai", reason: "r" }];

    const result = mergeSuggestions(fields, deterministic, ai, 0.6);
    assert.equal(result.length, 3);
    assert.equal(result[0].source, "facts");
    assert.equal(result[1].source, "ai");
    assert.equal(result[2].source, "none");
  });

  it("skips items without fieldId", () => {
    const fields = [makeField("f1")];
    const deterministic = [{ value: "no-id", confidence: 0.9, source: "facts", reason: "r" }];
    const result = mergeSuggestions(fields, deterministic, [], 0.6);
    assert.equal(result[0].source, "none");
  });
});
