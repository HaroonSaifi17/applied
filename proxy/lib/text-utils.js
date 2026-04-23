"use strict";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toWords(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }
  return normalized.split(" ").filter(Boolean);
}

function overlapScore(query, text) {
  const queryWords = new Set(toWords(query));
  const textWords = new Set(toWords(text));

  if (!queryWords.size || !textWords.size) {
    return 0;
  }

  let overlap = 0;
  for (const word of queryWords) {
    if (textWords.has(word)) {
      overlap += 1;
    }
  }

  return overlap / queryWords.size;
}

function splitIntoChunks(text, maxChars = 850) {
  const value = String(text || "").trim();
  if (!value) {
    return [];
  }

  const paragraphs = value
    .split(/\n\s*\n/g)
    .map((entry) => entry.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const chunks = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      chunks.push(paragraph);
      continue;
    }

    let start = 0;
    while (start < paragraph.length) {
      const piece = paragraph.slice(start, start + maxChars).trim();
      if (piece) {
        chunks.push(piece);
      }
      start += maxChars;
    }
  }

  return chunks;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function parseJsonFromModel(rawText) {
  const text = String(rawText || "").trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    // Continue to fence extraction.
  }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // Continue to object extraction.
    }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const slice = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  }

  return null;
}

function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const truthy = new Set(["yes", "true", "1", "y", "checked", "confirm", "acknowledge"]);
  const falsy = new Set(["no", "false", "0", "n", "unchecked"]);

  if (truthy.has(normalized)) {
    return true;
  }
  if (falsy.has(normalized)) {
    return false;
  }

  return null;
}

function getOptionObjects(options) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => {
      if (option && typeof option === "object") {
        return {
          label: String(option.label || option.value || "").trim(),
          value: String(option.value || option.label || "").trim(),
        };
      }

      const value = String(option || "").trim();
      return {
        label: value,
        value,
      };
    })
    .filter((option) => option.label || option.value);
}

function chooseOption(rawValue, options) {
  const optionObjects = getOptionObjects(options);
  const value = String(rawValue || "").trim();

  if (!value) {
    return null;
  }

  if (!optionObjects.length) {
    return value;
  }

  const normalizedValue = normalizeText(value);
  const directMatch = optionObjects.find((option) => {
    return (
      normalizeText(option.value) === normalizedValue ||
      normalizeText(option.label) === normalizedValue
    );
  });

  if (directMatch) {
    return directMatch.value;
  }

  const boolValue = toBoolean(value);
  if (boolValue !== null) {
    const boolLabel = boolValue ? "yes" : "no";
    const boolMatch = optionObjects.find((option) => {
      const normLabel = normalizeText(option.label);
      const normValue = normalizeText(option.value);
      return normLabel === boolLabel || normValue === boolLabel;
    });

    if (boolMatch) {
      return boolMatch.value;
    }
  }

  let best = null;
  for (const option of optionObjects) {
    const score = Math.max(
      overlapScore(normalizedValue, option.label),
      overlapScore(normalizedValue, option.value),
    );

    if (!best || score > best.score) {
      best = {
        score,
        value: option.value,
      };
    }
  }

  if (best && best.score >= 0.5) {
    return best.value;
  }

  return null;
}

module.exports = {
  clamp,
  chooseOption,
  normalizeText,
  overlapScore,
  parseJsonFromModel,
  splitIntoChunks,
  toBoolean,
  toWords,
};
