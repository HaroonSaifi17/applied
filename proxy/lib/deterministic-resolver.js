"use strict";

const {
  chooseOption,
  normalizeText,
  toBoolean,
} = require("./text-utils");

const FACT_MATCH_RULES = [
  {
    key: "firstName",
    keywords: ["first name", "given name", "forename", "fname"],
  },
  {
    key: "lastName",
    keywords: ["last name", "family name", "surname", "lname"],
  },
  {
    key: "fullName",
    keywords: ["full name", "legal name", "candidate name", "your name"],
  },
  {
    key: "email",
    keywords: ["email", "e-mail", "email address", "mail id", "work email", "personal email"],
  },
  {
    key: "phone",
    keywords: ["phone", "mobile", "telephone", "contact number", "phone number", "cell phone", "cell number"],
  },
  {
    key: "linkedInUrl",
    keywords: ["linkedin", "linkedin profile", "linkedin url"],
  },
  {
    key: "githubUrl",
    keywords: ["github", "github profile", "github url"],
  },
  {
    key: "websiteUrl",
    keywords: ["website", "portfolio", "personal site", "homepage", "portfolio url", "personal website"],
  },
  {
    key: "twitterUrl",
    keywords: ["twitter", "x profile", "x.com", "twitter url"],
  },
  {
    key: "leetcodeUrl",
    keywords: ["leetcode", "leetcode profile", "leetcode url"],
  },
  {
    key: "workAuthorization",
    keywords: ["authorized to work", "work authorization", "work permit", "eligible to work", "legally authorized", "authorization to work"],
  },
  {
    key: "needsSponsorship",
    keywords: ["visa sponsorship", "visa status", "require sponsorship", "require a visa", "need sponsorship", "sponsorship required"],
  },
  {
    key: "willingToRelocate",
    keywords: ["willing to relocate", "relocate", "relocation", "willing to relocate?"],
  },
  {
    key: "salaryExpectation",
    keywords: ["salary expectation", "expected salary", "expected ctc", "compensation", "pay expectation", "desired salary"],
  },
  {
    key: "currentCTC",
    keywords: ["current ctc", "current salary", "current compensation", "current pay"],
  },
  {
    key: "noticePeriod",
    keywords: ["notice period", "availability", "when can you start", "start date", "available to start", "earliest start date"],
  },
  {
    key: "totalExperience",
    keywords: ["total experience", "overall experience", "years of experience", "professional experience", "how many years"],
  },
  {
    key: "codingExperience",
    keywords: ["coding experience", "programming experience", "development experience"],
  },
  {
    key: "typescriptExperience",
    keywords: ["typescript experience", "years of typescript"],
  },
  {
    key: "javascriptExperience",
    keywords: ["javascript experience", "years of javascript"],
  },
  {
    key: "nodeExperience",
    keywords: ["node experience", "node.js experience", "nodejs experience"],
  },
  {
    key: "llmExperience",
    keywords: ["llm experience", "ai experience", "genai experience", "artificial intelligence experience"],
  },
  {
    key: "graduationYear",
    keywords: ["graduation year", "year of graduation", "passing year", "expected graduation"],
  },
  {
    key: "educationLevel",
    keywords: ["highest level of education", "education level", "highest education"],
  },
  {
    key: "degree",
    keywords: ["degree", "highest qualification", "degree type", "degree earned"],
  },
  {
    key: "employmentType",
    keywords: ["employment type", "work type", "job type"],
  },
  {
    key: "university",
    keywords: ["university", "college", "institution", "school", "education institution"],
  },
  {
    key: "cgpa",
    keywords: ["cgpa", "gpa", "grade point average", "academic performance"],
  },
  {
    key: "currentCompany",
    keywords: ["current company", "current employer", "present company", "where do you work"],
  },
  {
    key: "currentRole",
    keywords: ["current role", "job title", "current title", "designation"],
  },
  {
    key: "nationality",
    keywords: ["nationality", "national"],
  },
  {
    key: "languages",
    keywords: ["spoken languages", "language proficiency", "language skills"],
  },
  {
    key: "technicalSkills",
    keywords: ["technical skills", "tech stack", "programming languages", "technologies"],
  },
  {
    key: "aboutYou",
    keywords: ["about yourself", "about you", "bio", "summary", "tell me about yourself", "introduce yourself", "short bio"],
  },
  {
    key: "projects",
    keywords: ["project highlights", "key projects", "notable projects"],
  },
  {
    key: "achievements",
    keywords: ["achievements", "awards", "honors", "accomplishments"],
  },
  {
    key: "strengths",
    keywords: ["core strengths", "your strengths", "strengths"],
  },
  {
    key: "weaknesses",
    keywords: ["your weaknesses", "areas for improvement", "weaknesses"],
  },
  {
    key: "whyHireYou",
    keywords: ["why should we hire you", "why hire you", "why are you a good fit"],
  },
  {
    key: "hobbies",
    keywords: ["hobbies", "interests", "extracurricular"],
  },
  {
    key: "gender",
    keywords: ["gender", "sex"],
  },
  {
    key: "pronouns",
    keywords: ["pronouns"],
  },
  {
    key: "fresherStatus",
    keywords: ["fresh graduate", "recent graduate", "new graduate", "entry level", "fresher"],
  },
  {
    key: "location",
    keywords: ["current location", "where are you based", "location"],
  },
  {
    key: "address",
    keywords: ["street address", "full address", "home address", "address"],
  },
  {
    key: "city",
    keywords: ["current city", "town", "city"],
  },
  {
    key: "state",
    keywords: ["current state", "province", "region", "state"],
  },
  {
    key: "country",
    keywords: ["current country", "nation", "country"],
  },
  {
    key: "howDidYouHear",
    keywords: ["how did you hear", "referral source", "how did you find", "recruiter", "how did you hear about"],
  },
  {
    key: "coverLetter",
    keywords: ["cover letter", "coverletter", "cover note"],
  },
  {
    key: "dateOfBirth",
    keywords: ["date of birth", "dob", "birth date", "birthday"],
  },
  {
    key: "maritalStatus",
    keywords: ["marital status", "married", "single"],
  },
  {
    key: "nationality",
    keywords: ["nationalities", "what nationalities"],
  },
  {
    key: "discipline",
    keywords: ["discipline", "field of study", "major", "study area"],
  },
  {
    key: "postcode",
    keywords: ["postcode", "zip code", "postal code", "pincode", "pin code"],
  },
  {
    key: "preferredName",
    keywords: ["preferred name", "nickname", "what should we call you"],
  },
];

const BOOLEAN_FACT_KEYS = new Set([
  "workAuthorization",
  "needsSponsorship",
  "willingToRelocate",
]);

function fieldContext(field) {
  const optionsText = Array.isArray(field.options)
    ? field.options
        .map((option) => {
          if (option && typeof option === "object") {
            return `${option.label || ""} ${option.value || ""}`;
          }
          return String(option || "");
        })
        .join(" ")
    : "";

  return [
    field.label,
    field.name,
    field.placeholder,
    field.description,
    optionsText,
  ]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .join(" ");
}

function includesAny(text, patterns) {
  const target = normalizeText(text);
  if (!target) {
    return false;
  }

  return patterns.some((pattern) => {
    const normalizedPattern = normalizeText(pattern);
    if (!normalizedPattern) {
      return false;
    }
    const regex = new RegExp(`(?:^|[\\s,;|/])${normalizedPattern}(?:[\\s,;|/]|$)`, "i");
    return regex.test(target);
  });
}

function mapFieldToFactKey(field) {
  const context = fieldContext(field);

  for (const rule of FACT_MATCH_RULES) {
    if (includesAny(context, rule.keywords)) {
      return rule.key;
    }
  }

  const label = normalizeText(field.label);
  const name = normalizeText(field.name);

  if ((label.includes("authorized") && label.includes("work")) || label === "work authorization" || name === "workauth") {
    return "workAuthorization";
  }

  if (label === "name" || label === "full name" || name === "name" || name === "fullname") {
    return "fullName";
  }

  if (label === "first name" || name === "firstname" || name === "first_name") {
    return "firstName";
  }

  if (label === "last name" || name === "lastname" || name === "last_name") {
    return "lastName";
  }

  if (label === "address" || name === "address") {
    return "address";
  }

  if (label.includes("country") && !label.includes("authorized")) {
    return "country";
  }

  if (label.includes("education") && (label.includes("level") || label.includes("highest"))) {
    return "degree";
  }

  if (label.includes("employment type") || label.includes("work type") || label.includes("job type")) {
    return "workType";
  }

  if (label.includes("relocat")) {
    return "willingToRelocate";
  }

  if (label.includes("how did you hear") || label.includes("referral") || label.includes("source") || label.includes("how did you find")) {
    return "howDidYouHear";
  }

  if (label.includes("earliest start") || label.includes("available to start") || label.includes("start date") || label.includes("when can you")) {
    return "noticePeriod";
  }

  if (label.includes("pronouns")) {
    return "pronouns";
  }

  if (label.includes("gender") || label === "sex") {
    return "gender";
  }

  if (label.includes("nationality") || label === "national") {
    return "nationality";
  }

  if (label.includes("postcode") || label.includes("zip code") || label.includes("postal code") || name === "postcode" || name === "zipcode" || name === "zip_code") {
    return "postcode";
  }

  if (label.includes("discipline") || label.includes("field of study") || label.includes("major")) {
    return "discipline";
  }

  if (label.includes("preferred name") || label.includes("nickname") || name === "preferredname" || name === "preferred_name") {
    return "preferredName";
  }

  if (label.includes("hispanic") || label.includes("latino")) {
    return "hispanicLatino";
  }

  if (label.includes("veteran")) {
    return "veteranStatus";
  }

  if (label.includes("disability")) {
    return "disabilityStatus";
  }

  return null;
}

function normalizeOptionValue(field, rawValue) {
  if (!Array.isArray(field.options) || !field.options.length) {
    return null;
  }

  const option = chooseOption(rawValue, field.options);
  if (option !== null) {
    return option;
  }

  const boolValue = toBoolean(rawValue);
  if (boolValue !== null) {
    const boolOption = chooseOption(boolValue ? "yes" : "no", field.options);
    if (boolOption !== null) {
      return boolOption;
    }
  }

  const text = String(rawValue || "").trim().toLowerCase();
  if (text === "india" || text === "indian") {
    const indiaOption = field.options.find((opt) => {
      const label = String(opt.label || "").toLowerCase();
      const value = String(opt.value || "").toLowerCase();
      return label.includes("india") || value === "in" || value === "india";
    });
    if (indiaOption) {
      return indiaOption.value;
    }
  }

  if (text === "immediate" || text === "immediately") {
    const immediateOption = field.options.find((opt) => {
      const label = String(opt.label || "").toLowerCase();
      const value = String(opt.value || "").toLowerCase();
      return label.includes("immediate") || value.includes("immediate");
    });
    if (immediateOption) {
      return immediateOption.value;
    }
  }

  if (text === "full-time" || text === "full time" || text === "fulltime") {
    const fullTimeOption = field.options.find((opt) => {
      const label = String(opt.label || "").toLowerCase();
      const value = String(opt.value || "").toLowerCase();
      return label.includes("full") || value.includes("full");
    });
    if (fullTimeOption) {
      return fullTimeOption.value;
    }
  }

  if (text === "yes") {
    const yesOption = field.options.find((opt) => {
      const label = String(opt.label || "").toLowerCase();
      const value = String(opt.value || "").toLowerCase();
      return label === "yes" || label === "authorized" || value === "yes" || value === "1" || value === "authorized";
    });
    if (yesOption) {
      return yesOption.value;
    }
  }

  if (text === "no") {
    const noOption = field.options.find((opt) => {
      const label = String(opt.label || "").toLowerCase();
      const value = String(opt.value || "").toLowerCase();
      return label === "no" || label === "not authorized" || value === "no" || value === "0" || value === "not_authorized";
    });
    if (noOption) {
      return noOption.value;
    }
  }

  return null;
}

function normalizeValueForFieldType(field, value) {
  const type = String(field.type || "").toLowerCase();

  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (type === "checkbox") {
    return toBoolean(value);
  }

  if (type === "radio" || type === "select") {
    if (typeof value === "boolean") {
      const boolOption = chooseOption(value ? "yes" : "no", field.options);
      if (boolOption !== null) {
        return boolOption;
      }
      const trueOption = field.options.find((opt) => {
        const val = String(opt.value || "").toLowerCase();
        const lbl = String(opt.label || "").toLowerCase();
        return val === "1" || val === "true" || lbl === "yes" || lbl === "authorized";
      });
      const falseOption = field.options.find((opt) => {
        const val = String(opt.value || "").toLowerCase();
        const lbl = String(opt.label || "").toLowerCase();
        return val === "0" || val === "false" || lbl === "no" || lbl === "not authorized";
      });
      if (value && trueOption) return trueOption.value;
      if (!value && falseOption) return falseOption.value;
      return null;
    }
    return normalizeOptionValue(field, value);
  }

  const text = String(value).trim();
  return text || null;
}

function normalizeBooleanFactForField(field, factKey, value) {
  if (!BOOLEAN_FACT_KEYS.has(factKey)) {
    return null;
  }

  const boolValue = toBoolean(value);
  if (boolValue === null) {
    return null;
  }

  if (field.type === "select" || field.type === "radio") {
    const match = chooseOption(boolValue ? "yes" : "no", field.options || []);
    if (match !== null) return match;
  }

  return boolValue ? "Yes" : "No";
}

function confidenceForFact(factKey, normalizedValue) {
  if (BOOLEAN_FACT_KEYS.has(factKey)) {
    return 0.93;
  }

  if (typeof normalizedValue === "string" && normalizedValue.length >= 5) {
    return 0.9;
  }

  return 0.88;
}

function resolveDeterministic(fields, facts, answerMemory) {
  const filled = [];
  const unresolved = [];

  for (const field of fields) {
    const memoryValue = answerMemory.get(field.fingerprint);
    if (typeof memoryValue !== "undefined") {
      const normalizedMemory = normalizeValueForFieldType(field, memoryValue);
      if (normalizedMemory !== null) {
        filled.push({
          fieldId: field.id,
          value: normalizedMemory,
          confidence: 0.97,
          source: "memory",
          reason: "Matched from previous approved answer memory.",
        });
        continue;
      }
    }

    const factKey = mapFieldToFactKey(field);
    if (!factKey) {
      unresolved.push(field);
      continue;
    }

    const factValue = facts[factKey];

    let normalizedValue;
    const boolNorm = normalizeBooleanFactForField(field, factKey, factValue);
    if (boolNorm !== null) {
      normalizedValue = boolNorm;
    } else {
      normalizedValue = normalizeValueForFieldType(field, factValue);
    }

    if (normalizedValue === null || typeof normalizedValue === "undefined") {
      unresolved.push(field);
      continue;
    }

    filled.push({
      fieldId: field.id,
      value: normalizedValue,
      confidence: confidenceForFact(factKey, normalizedValue),
      source: "facts",
      reason: `Mapped from profile field: ${factKey}`,
    });
  }

  return {
    filled,
    unresolved,
  };
}

module.exports = {
  resolveDeterministic,
};
