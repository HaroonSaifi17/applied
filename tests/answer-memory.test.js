"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const { AnswerMemory } = require("../proxy/lib/answer-memory");

describe("AnswerMemory", () => {
  let memory;

  beforeEach(() => {
    memory = new AnswerMemory();
  });

  it("starts empty", () => {
    assert.equal(memory.get("nonexistent"), undefined);
    assert.deepEqual(memory.entries(), []);
  });

  it("set and get values", () => {
    memory.set("key1", "value1");
    assert.equal(memory.get("key1"), "value1");
  });

  it("ignores empty keys", () => {
    memory.set("", "value");
    memory.set(null, "value");
    assert.equal(memory.get(""), undefined);
    assert.equal(memory.get(null), undefined);
  });

  it("overwrites existing values", () => {
    memory.set("key1", "old");
    memory.set("key1", "new");
    assert.equal(memory.get("key1"), "new");
  });

  it("stores different types", () => {
    memory.set("str", "hello");
    memory.set("num", 42);
    memory.set("bool", true);
    assert.equal(memory.get("str"), "hello");
    assert.equal(memory.get("num"), 42);
    assert.equal(memory.get("bool"), true);
  });

  it("entries returns all key-value pairs", () => {
    memory.set("a", 1);
    memory.set("b", 2);
    const entries = memory.entries();
    assert.equal(entries.length, 2);
  });
});
