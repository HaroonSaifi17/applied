"use strict";

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const DATA_DIRECTORY = path.resolve(__dirname, "..", "data");
const HISTORY_FILE = path.join(DATA_DIRECTORY, "application-history.json");

const JOB_QUERY_KEY_PATTERN = /(?:^|[_&])(?:job|jid|jobid|posting|position|opening|openingid|req|requisition|gh_jid|lever)[_=&]?/i;

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizePathname(pathname) {
  const clean = String(pathname || "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "")
    .toLowerCase();
  return clean || "/";
}

function normalizeJobUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const origin = `${parsed.protocol}//${host}`;
    const pathname = normalizePathname(parsed.pathname);

    const relevantQuery = [];
    for (const [key, value] of parsed.searchParams.entries()) {
      if (!JOB_QUERY_KEY_PATTERN.test(key)) {
        continue;
      }

      const trimmedValue = String(value || "").trim();
      if (!trimmedValue) {
        continue;
      }

      relevantQuery.push([String(key || "").toLowerCase(), trimmedValue.toLowerCase()]);
    }

    relevantQuery.sort(([left], [right]) => left.localeCompare(right));
    if (!relevantQuery.length) {
      return `${origin}${pathname}`;
    }

    const search = relevantQuery
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");
    return `${origin}${pathname}?${search}`;
  } catch {
    return "";
  }
}

function normalizeValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeJobKey(url, company, position) {
  const normalizedUrl = normalizeJobUrl(url);
  const domain = extractDomain(url);
  const normalized = `${domain}|${normalizedUrl}|${normalizeValue(company)}|${normalizeValue(position)}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function extractJobInfo(url, fields, context = {}) {
  const candidateFields = Array.isArray(fields) ? fields : [];

  const companyField = candidateFields.find(
    (f) => f.label && /company|employer|organization/i.test(f.label),
  );
  const positionField = candidateFields.find(
    (f) =>
      f.label &&
      /position|role|job title|title|how would you like us to title you/i.test(f.label),
  );
  const titleField = candidateFields.find(
    (f) => f.label && /job title|posting title/i.test(f.label),
  );

  const contextCompany = normalizeValue(context.company || context.employer || "");
  const contextPosition = normalizeValue(
    context.position || context.title || context.jobTitle || "",
  );
  const fieldCompany = normalizeValue(companyField?.value || "");
  const fieldPosition = normalizeValue(
    positionField?.value || titleField?.value || "",
  );

  return {
    company: contextCompany || fieldCompany,
    position: contextPosition || fieldPosition,
    normalizedUrl: normalizeJobUrl(url),
  };
}

class ApplicationHistory {
  constructor() {
    this.entries = new Map();
  }

  async load() {
    try {
      const raw = await fs.readFile(HISTORY_FILE, "utf8");
      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object") {
        this.entries = new Map();
        return;
      }

      const next = new Map();
      for (const [key, value] of Object.entries(parsed)) {
        next.set(key, {
          url: value.url,
          normalizedUrl: value.normalizedUrl || normalizeJobUrl(value.url),
          company: value.company,
          position: value.position,
          appliedAt: value.appliedAt,
          context: value.context || {},
          fields: value.fields || [],
        });
      }

      this.entries = next;
    } catch (error) {
      if (error && error.code === "ENOENT") {
        this.entries = new Map();
        return;
      }

      throw error;
    }
  }

  async persist() {
    await fs.mkdir(DATA_DIRECTORY, { recursive: true });

    const serialized = {};
    for (const [key, value] of this.entries) {
      serialized[key] = value;
    }

    await fs.writeFile(HISTORY_FILE, JSON.stringify(serialized, null, 2), "utf8");
  }

  hasApplied(url, fields, context = {}) {
    const { company, position } = extractJobInfo(url, fields, context);
    const key = normalizeJobKey(url, company, position);
    return this.entries.has(key);
  }

  getApplication(url, fields, context = {}) {
    const { company, position } = extractJobInfo(url, fields, context);
    const key = normalizeJobKey(url, company, position);
    return this.entries.get(key);
  }

  async recordApplication(url, fields, context = {}) {
    const { company, position, normalizedUrl } = extractJobInfo(url, fields, context);
    const key = normalizeJobKey(url, company, position);

    this.entries.set(key, {
      url,
      normalizedUrl,
      company,
      position,
      appliedAt: new Date().toISOString(),
      context: {
        title: normalizeValue(context.title || context.jobTitle || ""),
        company: normalizeValue(context.company || context.employer || ""),
      },
      fields: fields.slice(0, 20),
    });

    await this.persist();
  }

  getAll() {
    return Array.from(this.entries.values()).sort(
      (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
    );
  }

  size() {
    return this.entries.size;
  }
}

module.exports = {
  ApplicationHistory,
  extractDomain,
  normalizeJobKey,
  extractJobInfo,
  normalizeJobUrl,
};
