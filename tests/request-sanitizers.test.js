"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  sanitizeUrl,
  sanitizeFields,
  sanitizeApplicationContext,
  sanitizeConfidenceThreshold,
} = require("../proxy/lib/request-sanitizers");

test("sanitizeUrl keeps http/https and removes hash", () => {
  assert.equal(
    sanitizeUrl("https://boards.greenhouse.io/acme/jobs/123#section"),
    "https://boards.greenhouse.io/acme/jobs/123",
  );
});

test("sanitizeUrl rejects unsupported schemes", () => {
  assert.equal(sanitizeUrl("javascript:alert(1)"), "");
  assert.equal(sanitizeUrl("file:///tmp/form"), "");
});

test("sanitizeFields normalizes types and deduplicates ids", () => {
  const fields = sanitizeFields([
    { id: "email", label: "Email", type: "EMAIL" },
    { id: "email", label: "Email 2", type: "text" },
    { id: "exp", label: "Years", type: "unknown_type" },
  ]);

  assert.equal(fields.length, 2);
  assert.equal(fields[0].type, "email");
  assert.equal(fields[1].type, "text");
});

test("sanitizeApplicationContext keeps only title/company", () => {
  const context = sanitizeApplicationContext({
    title: "Senior Engineer",
    employer: "Acme",
    ignored: "value",
  });

  assert.deepEqual(context, {
    title: "Senior Engineer",
    company: "Acme",
  });
});

test("sanitizeConfidenceThreshold clamps and defaults", () => {
  assert.equal(sanitizeConfidenceThreshold(5), 1);
  assert.equal(sanitizeConfidenceThreshold(-5), 0);
  assert.equal(sanitizeConfidenceThreshold("not-a-number"), 0.7);
});
