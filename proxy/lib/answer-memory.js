"use strict";

const fs = require("fs/promises");
const path = require("path");

const DATA_DIRECTORY = path.resolve(__dirname, "..", "data");
const MEMORY_FILE = path.join(DATA_DIRECTORY, "answer-memory.json");

class AnswerMemory {
  constructor() {
    this.map = new Map();
  }

  get(key) {
    return this.map.get(key);
  }

  set(key, value) {
    if (!key) {
      return;
    }
    this.map.set(key, value);
  }

  entries() {
    return Array.from(this.map.entries());
  }

  async load() {
    try {
      const raw = await fs.readFile(MEMORY_FILE, "utf8");
      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object") {
        this.map = new Map();
        return;
      }

      const next = new Map();
      for (const [key, value] of Object.entries(parsed)) {
        next.set(key, value);
      }

      this.map = next;
    } catch (error) {
      if (error && error.code === "ENOENT") {
        this.map = new Map();
        return;
      }

      throw error;
    }
  }

  async persist() {
    await fs.mkdir(DATA_DIRECTORY, { recursive: true });

    const serialized = {};
    for (const [key, value] of this.map.entries()) {
      serialized[key] = value;
    }

    await fs.writeFile(MEMORY_FILE, JSON.stringify(serialized, null, 2), "utf8");
  }

  async addMany(entries) {
    if (!Array.isArray(entries) || !entries.length) {
      return;
    }

    let changed = false;
    for (const entry of entries) {
      if (!entry || !entry.fingerprint) {
        continue;
      }

      const normalizedValue = entry.value;
      if (typeof normalizedValue === "undefined" || normalizedValue === null) {
        continue;
      }

      this.map.set(entry.fingerprint, normalizedValue);
      changed = true;
    }

    if (changed) {
      await this.persist();
    }
  }
}

module.exports = {
  AnswerMemory,
};
