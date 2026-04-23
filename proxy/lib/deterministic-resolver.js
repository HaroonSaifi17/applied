"use strict";

const {
  chooseOption,
  normalizeText,
  toBoolean,
} = require("./text-utils");

const KEYWORD_GROUPS = {
  firstName: ["first name", "given name", "forename", "your first"],
  lastName: ["last name", "family name", "surname", "your last"],
  fullName: ["full name", "legal name", "your name", "name", "fullname"],
  email: ["email", "e-mail", "email address", "mail id", "your email"],
  phone: ["phone", "mobile", "telephone", "cell", "contact number", "phone number"],
  location: ["location", "where are you based", "city, state", "current location", "address", "your location", "base location", "city of residence"],
  city: ["city", "town", "current city"],
  state: ["state", "province", "region"],
  country: ["country", "nation", "nationality", "country of origin"],
  linkedInUrl: ["linkedin", "linkedin profile", "linkedin url", "linkedin link"],
  githubUrl: ["github", "github profile", "github url", "github link", "github portfolio"],
  websiteUrl: ["website", "portfolio", "personal site", "portfolio website", "personal website", "link to portfolio"],
  salaryExpectation: ["salary", "compensation", "expected pay", "expected ctc", "ctc", "expected salary", "salary range"],
  workAuthorization: ["authorized to work", "work authorization", "eligible to work", "work permit", "can you work", "authorized"],
  needsSponsorship: ["visa sponsorship", "require sponsorship", "sponsorship", "need visa", "require visa", "need sponsorship"],
  coverLetterText: ["cover letter", "cover letter text", "write a cover letter", "tell us about yourself"],
  codingExperience: ["coding experience", "programming experience", "development experience", "years of coding", "years of programming", "software development", "technical experience", "skill exp", "total coding", "dev experience"],
  experienceLevel: ["experience level", "years of experience", "total years", "professional experience", "current role", "job title", "years of professional", "total experience", "exp", "total yrs"],
  typescriptExperience: ["typescript experience", "typescript", "ts experience", "ts exp", "years of typescript"],
  javascriptExperience: ["javascript experience", "javascript", "js experience", "js exp"],
  totalExperience: ["total experience", "overall experience", "combined experience", "experience"],
  fresherStatus: ["fresh graduate", "fresher", "recent graduate", "new graduate", "graduated", "graduation date", "are you a fresh"],
  education: ["college", "university", "institute", "institution", "degree", "cgpa", "education", "qualification"],
  technicalSkills: ["technical skills", "skills", "programming languages", "languages you know", "frameworks worked with", "tech stack", "key skills", "your skills", "tech skills"],
  resume: ["resume", "cv", "upload resume", "attach resume", "attach your resume", "upload cv", "attach cv", "resume file"],
  coverLetter: ["cover letter", "attach cover letter", "upload cover letter"],
  noticePeriod: ["notice period", "last working day", "availability", "when can you start", "available from", "join date", "serving notice"],
  achievements: ["achievements", "awards", "honors", "recognition"],
  projects: ["projects", "portfolio", "work samples"],
  aboutYou: ["about yourself", "tell me about yourself", "describe yourself", "introduce yourself", "brief about", "bio"],
  strengths: ["strengths", "what are your strengths", "your strengths"],
  weaknesses: ["weaknesses", "what are your weaknesses", "your weaknesses"],
  whyHireYou: ["why should we hire you", "why hire you", "what makes you a good fit", "why want", "why join us"],
  hobbies: ["hobbies", "interests"],
  willingToLearn: ["willing to learn", "learn new technologies"],
  currentCompany: ["current company", "current organization", "present company"],
  graduationYear: ["graduation year", "passing year", "year of graduation", "year passed", "complete", "expected to graduate"],
  university: ["university", "college name", "institution name"],
  degree: ["degree", "qualification", "major"],
};

function fieldLabel(field) {
  return [field.label, field.name, field.placeholder, field.description]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .join(" ");
}

function includesAny(target, patterns) {
  const normalized = normalizeText(target);
  return patterns.some((pattern) => normalized.includes(normalizeText(pattern)));
}

function mapFieldToFact(field) {
  const target = fieldLabel(field);

  for (const [factKey, patterns] of Object.entries(KEYWORD_GROUPS)) {
    if (includesAny(target, patterns)) {
      return factKey;
    }
  }

  return null;
}

function resolveBooleanField(field, factValue) {
  if (typeof factValue !== "boolean") {
    return null;
  }

  const boolAsText = factValue ? "Yes" : "No";

  if (field.type === "checkbox") {
    return factValue;
  }

  if (field.type === "radio" || field.type === "select") {
    const option = chooseOption(boolAsText, field.options);
    return option;
  }

  if (field.type === "text" || field.type === "textarea") {
    return boolAsText;
  }

  return boolAsText;
}

function resolveOptionField(field, factValue) {
  if (!Array.isArray(field.options) || !field.options.length) {
    return null;
  }

  const option = chooseOption(factValue, field.options);
  if (option !== null) {
    return option;
  }

  const boolValue = toBoolean(factValue);
  if (boolValue !== null) {
    const boolOption = chooseOption(boolValue ? "yes" : "no", field.options);
    if (boolOption !== null) {
      return boolOption;
    }
  }

  return null;
}

function normalizeForFieldType(field, value) {
  const type = String(field.type || "").toLowerCase();

  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (type === "checkbox") {
    const boolValue = toBoolean(value);
    if (boolValue === null) {
      return null;
    }
    return boolValue;
  }

  if (type === "select" || type === "radio") {
    return resolveOptionField(field, value);
  }

  const stringValue = String(value).trim();
  return stringValue || null;
}

function resolveDeterministic(fields, facts, answerMemory) {
  const filled = [];
  const unresolved = [];

  for (const field of fields) {
    const memoryValue = answerMemory.get(field.fingerprint);
    if (typeof memoryValue !== "undefined") {
      const normalizedMemory = normalizeForFieldType(field, memoryValue);
      if (normalizedMemory !== null) {
        filled.push({
          fieldId: field.id,
          value: normalizedMemory,
          confidence: 0.96,
          source: "memory",
          reason: "Matched from your previous approved answer.",
        });
        continue;
      }
    }

    const factKey = mapFieldToFact(field);
    if (!factKey) {
      unresolved.push(field);
      continue;
    }

    const factValue = facts[factKey];

    if (factKey === "workAuthorization" || factKey === "needsSponsorship") {
      const boolResolved = resolveBooleanField(field, factValue);
      if (boolResolved !== null) {
        filled.push({
          fieldId: field.id,
          value: boolResolved,
          confidence: 0.92,
          source: "facts",
          reason: `Mapped from your ${factKey} profile preference.`,
        });
        continue;
      }
    }

    const normalizedValue = normalizeForFieldType(field, factValue);
    if (normalizedValue !== null) {
      filled.push({
        fieldId: field.id,
        value: normalizedValue,
        confidence: 0.9,
        source: "facts",
        reason: `Mapped from your ${factKey} profile data.`,
      });
      continue;
    }

    unresolved.push(field);
  }

  return {
    filled,
    unresolved,
  };
}

module.exports = {
  resolveDeterministic,
};
