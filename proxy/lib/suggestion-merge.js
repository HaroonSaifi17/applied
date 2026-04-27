"use strict";

function normalizeSuggestionMap(items) {
  const map = new Map();

  for (const item of items) {
    if (!item || !item.fieldId) {
      continue;
    }

    map.set(item.fieldId, item);
  }

  return map;
}

function mergeSuggestions(fields, deterministic, ai, threshold) {
  const combined = [];
  const deterministicMap = normalizeSuggestionMap(deterministic);
  const aiMap = normalizeSuggestionMap(ai);

  for (const field of fields) {
    const deterministicItem = deterministicMap.get(field.id);
    const aiItem = aiMap.get(field.id);

    if (deterministicItem) {
      combined.push({
        fieldId: field.id,
        fingerprint: field.fingerprint,
        source: deterministicItem.source,
        value: deterministicItem.value,
        confidence: deterministicItem.confidence,
        reason: deterministicItem.reason,
        suggested: deterministicItem.confidence >= threshold,
      });
      continue;
    }

    if (aiItem) {
      combined.push({
        fieldId: field.id,
        fingerprint: field.fingerprint,
        source: aiItem.source,
        value: aiItem.value,
        confidence: aiItem.confidence,
        reason: aiItem.reason,
        suggested: aiItem.confidence >= threshold,
      });
      continue;
    }

    combined.push({
      fieldId: field.id,
      fingerprint: field.fingerprint,
      source: "none",
      value: null,
      confidence: 0,
      reason: "No suggestion available.",
      suggested: false,
    });
  }

  return combined;
}

module.exports = {
  mergeSuggestions,
};
