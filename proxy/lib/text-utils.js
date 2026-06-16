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
    
  }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      
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

function extractFirstNumber(text) {
  const match = String(text || "").match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function parseRangeEndpoints(label) {
  const normalized = normalizeText(label);
  const rangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:to|-|–|—)\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return { low: parseFloat(rangeMatch[1]), high: parseFloat(rangeMatch[2]) };
  }
  const singleMatch = normalized.match(/(\d+(?:\.\d+)?)\s*\+?/);
  if (singleMatch) {
    const num = parseFloat(singleMatch[1]);
    if (normalized.includes("+")) {
      return { low: num, high: Infinity };
    }
    return { low: num, high: num };
  }
  return null;
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

  const inputNumber = extractFirstNumber(value);
  let candidates = [];
  for (const option of optionObjects) {
    const score = Math.max(
      overlapScore(normalizedValue, option.label),
      overlapScore(normalizedValue, option.value),
    );
    candidates.push({ score, value: option.value, label: option.label });
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length && candidates[0].score >= 0.5) {
    if (candidates.length > 1 && candidates[0].score === candidates[1].score && inputNumber !== null) {
      let best = candidates[0];
      let bestDistance = Infinity;
      for (const candidate of candidates) {
        if (candidate.score < candidates[0].score) break;
        const range = parseRangeEndpoints(candidate.label);
        if (range) {
          if (inputNumber >= range.low && inputNumber <= range.high) {
            const distance = Math.abs(inputNumber - (range.low + range.high) / 2);
            if (distance < bestDistance) {
              bestDistance = distance;
              best = candidate;
            }
          }
        }
      }
      if (bestDistance < Infinity) {
        return best.value;
      }
    }

    return candidates[0].value;
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
