"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeJobUrl } = require("../proxy/lib/application-history");

test("ApplicationHistory normalizes URLs - same job ID should match", () => {
  // Same job role, different tracking params should match
  const url1 = normalizeJobUrl("https://boards.greenhouse.io/acme/jobs/123?source=Indeed");
  const url2 = normalizeJobUrl("https://boards.greenhouse.io/acme/jobs/123?source=LinkedIn");
  
  assert.equal(url1, url2, "Same job ID with different tracking should normalize to same URL");
});

test("ApplicationHistory normalizes URLs - different job IDs should NOT match", () => {
  // Different job postings should not match
  const url100 = normalizeJobUrl("https://boards.greenhouse.io/acme/jobs/100");
  const url200 = normalizeJobUrl("https://boards.greenhouse.io/acme/jobs/200");
  
  assert.notEqual(url100, url200, "Different job IDs should have different normalized URLs");
});

test("ApplicationHistory normalizes URLs - different jobs with query params", () => {
  const url1 = normalizeJobUrl("https://boards.greenhouse.io/acme/jobs/100?gh_jid=1");
  const url2 = normalizeJobUrl("https://boards.greenhouse.io/acme/jobs/200?gh_jid=2");
  
  assert.notEqual(url1, url2, "Different job posts should not match even with gh_jid");
});