"use strict";

const crypto = require("crypto");

function makeCacheKey(url, fields, context, confidenceThreshold, profileLoadedAt) {
  const payload = JSON.stringify({
    url,
    context,
    confidenceThreshold,
    profileLoadedAt,
    fields: fields.map((field) => ({
      id: field.id,
      name: field.name,
      label: field.label,
      type: field.type,
      options: field.options,
    })),
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
}

function trimCache(cache, maxSize) {
  if (!(cache instanceof Map) || cache.size <= maxSize) {
    return;
  }

  const entries = Array.from(cache.entries())
    .sort((left, right) => left[1].cachedAt - right[1].cachedAt);
  const staleCount = cache.size - maxSize;
  for (let i = 0; i < staleCount; i += 1) {
    cache.delete(entries[i][0]);
  }
}

module.exports = {
  makeCacheKey,
  trimCache,
};
