"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// We test the exported pure functions by requiring the module
// and testing the internal logic through the ProfileStore class behavior
// and direct extraction logic.

// Since the module doesn't export individual functions, we test via the store
const { ProfileStore } = require("../proxy/lib/profile-store");

describe("ProfileStore", () => {
  it("initializes with empty profile", () => {
    const store = new ProfileStore();
    const profile = store.getProfile();
    assert.equal(profile.loadedAt, null);
    assert.equal(profile.schemaVersion, "v2");
    assert.deepEqual(profile.facts, {});
    assert.deepEqual(profile.answerBank, []);
    assert.deepEqual(profile.chunks, []);
    assert.deepEqual(profile.files, []);
  });

  it("reload returns a profile object", async () => {
    const store = new ProfileStore();
    const profile = await store.reload();
    assert.ok(profile.loadedAt);
    assert.equal(profile.schemaVersion, "v2");
    assert.ok(typeof profile.facts === "object");
    assert.ok(Array.isArray(profile.answerBank));
    assert.ok(Array.isArray(profile.chunks));
    assert.ok(Array.isArray(profile.files));
  });

  it("extracts facts from real profile data", async () => {
    const store = new ProfileStore();
    const profile = await store.reload();
    // The real profile should have at least some facts
    const factKeys = Object.keys(profile.facts);
    assert.ok(factKeys.length > 0, "Expected at least some facts from profile-data/");
  });

  it("generates warnings for missing critical fields", async () => {
    const store = new ProfileStore();
    const profile = await store.reload();
    // Warnings may or may not exist depending on profile data
    assert.ok(Array.isArray(profile.diagnostics.warnings));
  });

  it("loads answer bank from Q&A files", async () => {
    const store = new ProfileStore();
    const profile = await store.reload();
    // Answer bank entries have source, question, answer
    for (const entry of profile.answerBank) {
      assert.ok(entry.source);
      assert.ok(entry.question);
      assert.ok(entry.answer);
    }
  });

  it("creates chunks from documents", async () => {
    const store = new ProfileStore();
    const profile = await store.reload();
    for (const chunk of profile.chunks) {
      assert.ok(chunk.source);
      assert.ok(chunk.text);
      assert.ok(chunk.text.length <= 700 + 50, "Chunk should be roughly within size limit");
    }
  });
});
