"use strict";

const { normalizeFieldFingerprint } = require("./retrieval");

const ALLOWED_FIELD_TYPES = new Set([
  "text",
  "email",
  "tel",
  "number",
  "url",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "file",
]);

function sanitizeUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }

    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function normalizeFieldType(value) {
  const normalized = String(value || "text").trim().toLowerCase();
  return ALLOWED_FIELD_TYPES.has(normalized) ? normalized : "text";
}

function sanitizeIncomingField(field, index) {
  const normalized = {
    id: String(field.id || field.name || `field_${index}`),
    name: String(field.name || "").trim(),
    label: String(field.label || "").trim(),
    placeholder: String(field.placeholder || "").trim(),
    description: String(field.description || "").trim(),
    type: normalizeFieldType(field.type),
    required: !!field.required,
    options: Array.isArray(field.options)
      ? field.options
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
          .filter((option) => option.label || option.value)
      : [],
  };

  normalized.fingerprint = normalizeFieldFingerprint(normalized);
  return normalized;
}

function sanitizeFields(fields) {
  if (!Array.isArray(fields)) {
    return [];
  }

  const seenIds = new Set();
  const sanitized = [];

  for (let i = 0; i < fields.length; i += 1) {
    const candidate = fields[i] || {};
    const field = sanitizeIncomingField(candidate, i);
    if (!field.id || seenIds.has(field.id)) {
      continue;
    }

    seenIds.add(field.id);
    sanitized.push(field);
  }

  return sanitized;
}

function sanitizeApplicationContext(context) {
  if (!context || typeof context !== "object") {
    return {};
  }

  const normalized = {};

  const title = String(context.title || context.jobTitle || "").trim();
  const company = String(context.company || context.employer || "").trim();

  if (title) {
    normalized.title = title;
  }
  if (company) {
    normalized.company = company;
  }

  return normalized;
}

function sanitizeConfidenceThreshold(value, fallback = 0.7) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, numeric));
}

module.exports = {
  sanitizeUrl,
  normalizeFieldType,
  sanitizeIncomingField,
  sanitizeFields,
  sanitizeApplicationContext,
  sanitizeConfidenceThreshold,
};
