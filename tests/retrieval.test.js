"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  buildQuestionText,
  getRelevantContext,
  normalizeFieldFingerprint,
} = require("../proxy/lib/retrieval");

describe("buildQuestionText", () => {
  it("combines label, name, placeholder, description", () => {
    const field = {
      label: "First Name",
      name: "firstName",
      placeholder: "Enter first name",
      description: "Your legal first name",
      options: [],
    };
    const text = buildQuestionText(field);
    assert.ok(text.includes("First Name"));
    assert.ok(text.includes("firstName"));
    assert.ok(text.includes("Enter first name"));
    assert.ok(text.includes("Your legal first name"));
  });

  it("includes option labels and values", () => {
    const field = {
      label: "Country",
      name: "country",
      placeholder: "",
      description: "",
      options: [
        { label: "India", value: "IN" },
        { label: "US", value: "US" },
      ],
    };
    const text = buildQuestionText(field);
    assert.ok(text.includes("India"));
    assert.ok(text.includes("IN"));
  });

  it("handles missing fields gracefully", () => {
    const field = {};
    const text = buildQuestionText(field);
    assert.equal(typeof text, "string");
  });
});

describe("normalizeFieldFingerprint", () => {
  it("creates fingerprint from field properties", () => {
    const field = {
      name: "email",
      label: "Email",
      type: "text",
      options: [],
    };
    const fp = normalizeFieldFingerprint(field);
    assert.ok(typeof fp === "string");
    assert.ok(fp.length > 0);
  });

  it("includes options in fingerprint", () => {
    const field1 = {
      name: "country",
      label: "Country",
      type: "select",
      options: [{ label: "India", value: "IN" }],
    };
    const field2 = {
      name: "country",
      label: "Country",
      type: "select",
      options: [{ label: "US", value: "US" }],
    };
    assert.notEqual(normalizeFieldFingerprint(field1), normalizeFieldFingerprint(field2));
  });
});

describe("getRelevantContext", () => {
  const profile = {
    chunks: [
      { source: "resume.txt", text: "Experience in TypeScript and Node.js development" },
      { source: "answers.txt", text: "Skills: React, Angular, Vue.js" },
      { source: "resume.txt", text: "Education: B.Tech Computer Science from IIT Delhi" },
    ],
    answerBank: [
      { source: "answers.txt", question: "Why should we hire you?", answer: "I am a fast learner with strong technical skills" },
      { source: "answers.txt", question: "What are your strengths?", answer: "Problem solving and communication" },
    ],
  };

  it("returns chunks and answers when no unresolved fields", () => {
    const result = getRelevantContext(profile, []);
    assert.ok(result.chunks.length > 0);
    assert.ok(result.answers.length > 0);
  });

  it("ranks relevant chunks higher for specific fields", () => {
    const fields = [
      { label: "Technical Skills", name: "skills", placeholder: "", description: "", options: [] },
    ];
    const result = getRelevantContext(profile, fields, 5, 5);
    assert.ok(result.chunks.length > 0);
  });

  it("handles empty profile gracefully", () => {
    const emptyProfile = { chunks: [], answerBank: [] };
    const result = getRelevantContext(emptyProfile, []);
    assert.equal(result.chunks.length, 0);
    assert.equal(result.answers.length, 0);
  });
});
