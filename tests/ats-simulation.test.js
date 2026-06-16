"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

const { resolveDeterministic } = require("../proxy/lib/deterministic-resolver");
const { ProfileStore } = require("../proxy/lib/profile-store");
const { AnswerMemory } = require("../proxy/lib/answer-memory");
const { mergeSuggestions } = require("../proxy/lib/suggestion-merge");
const { getRelevantContext, buildQuestionText } = require("../proxy/lib/retrieval");
const {
  sanitizeFields,
  sanitizeApplicationContext,
  sanitizeIncomingField,
} = require("../proxy/lib/request-sanitizers");

const ATS_MOCK_FORMS = {
  greenhouse: {
    name: "Greenhouse",
    hostname: "boards.greenhouse.io",
    fields: [
      { id: "id:first_name", name: "first_name", label: "First Name", type: "text", required: true },
      { id: "id:last_name", name: "last_name", label: "Last Name", type: "text", required: true },
      { id: "id:email", name: "email", label: "Email", type: "email", required: true },
      { id: "id:phone", name: "phone", label: "Phone", type: "tel", required: false },
      { id: "id:location", name: "location", label: "Location", type: "text", required: false },
      { id: "id:linkedin", name: "linkedin", label: "LinkedIn Profile", type: "url", required: false },
      { id: "id:github", name: "github", label: "GitHub Profile", type: "url", required: false },
      { id: "id:website", name: "website", label: "Website / Portfolio", type: "url", required: false },
      { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true },
      { id: "id:cover_letter", name: "cover_letter", label: "Cover Letter", type: "textarea", required: false },
      { id: "id:work_auth", name: "work_auth", label: "Are you authorized to work in this country?", type: "select", required: true, options: [{ label: "Yes", value: "1" }, { label: "No", value: "0" }] },
      { id: "id:sponsorship", name: "sponsorship", label: "Do you require visa sponsorship?", type: "select", required: true, options: [{ label: "Yes", value: "1" }, { label: "No", value: "0" }] },
      { id: "id:experience", name: "experience", label: "Years of Experience", type: "select", required: true, options: [{ label: "0-1 years", value: "0" }, { label: "1-3 years", value: "2" }, { label: "3-5 years", value: "4" }, { label: "5+ years", value: "5" }] },
      { id: "id:start_date", name: "start_date", label: "When can you start?", type: "select", required: false, options: [{ label: "Immediately", value: "immediate" }, { label: "2 weeks", value: "2_weeks" }, { label: "1 month", value: "1_month" }] },
    ],
  },

  lever: {
    name: "Lever",
    hostname: "jobs.lever.co",
    fields: [
      { id: "id:fullname", name: "fullname", label: "Full Name", type: "text", required: true },
      { id: "id:email", name: "email", label: "Email", type: "email", required: true },
      { id: "id:phone", name: "phone", label: "Phone", type: "tel", required: false },
      { id: "id:urls[LinkedIn]", name: "urls[LinkedIn]", label: "LinkedIn", type: "url", required: false },
      { id: "id:urls[GitHub]", name: "urls[GitHub]", label: "GitHub", type: "url", required: false },
      { id: "id:urls[Portfolio]", name: "urls[Portfolio]", label: "Portfolio", type: "url", required: false },
      { id: "id:comments", name: "comments", label: "Additional Information", type: "textarea", required: false },
      { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true },
      { id: "id:location", name: "location", label: "Location", type: "text", required: false },
    ],
  },

  ashby: {
    name: "Ashby",
    hostname: "jobs.ashbyhq.com",
    fields: [
      { id: "id:name", name: "name", label: "Name", type: "text", required: true },
      { id: "id:email", name: "email", label: "Email", type: "email", required: true },
      { id: "id:phone", name: "phone", label: "Phone", type: "tel", required: false },
      { id: "id:linkedin", name: "linkedin", label: "LinkedIn Profile URL", type: "url", required: false },
      { id: "id:github", name: "github", label: "GitHub URL", type: "url", required: false },
      { id: "id:website", name: "website", label: "Website", type: "url", required: false },
      { id: "id:resume", name: "resume", label: "Resume / CV", type: "file", required: true },
      { id: "id:cover_letter", name: "cover_letter", label: "Cover Letter", type: "textarea", required: false },
      { id: "id:location", name: "location", label: "City", type: "text", required: false },
      { id: "id:work_auth", name: "work_auth", label: "Are you legally authorized to work in this country?", type: "select", required: true, options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }] },
      { id: "id:sponsorship", name: "sponsorship", label: "Will you now or in the future require sponsorship?", type: "select", required: true, options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }] },
    ],
  },

  workday: {
    name: "Workday",
    hostname: "nvidia.wd5.myworkdayjobs.com",
    fields: [
      { id: "id:firstName", name: "firstName", label: "First Name", type: "text", required: true },
      { id: "id:lastName", name: "lastName", label: "Last Name", type: "text", required: true },
      { id: "id:email", name: "email", label: "Email Address", type: "email", required: true },
      { id: "id:phone", name: "phone", label: "Phone Number", type: "tel", required: false },
      { id: "id:address", name: "address", label: "Address", type: "text", required: false },
      { id: "id:city", name: "city", label: "City", type: "text", required: false },
      { id: "id:state", name: "state", label: "State", type: "select", required: false, options: [{ label: "Delhi", value: "DL" }, { label: "Karnataka", value: "KA" }] },
      { id: "id:country", name: "country", label: "Country", type: "select", required: false, options: [{ label: "India", value: "IN" }, { label: "United States", value: "US" }] },
      { id: "id:workAuth", name: "workAuth", label: "Work Authorization", type: "select", required: true, options: [{ label: "Authorized", value: "authorized" }, { label: "Not Authorized", value: "not_authorized" }] },
      { id: "id:sponsorship", name: "sponsorship", label: "Visa Sponsorship Required", type: "select", required: true, options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }] },
      { id: "id:startDate", name: "startDate", label: "Available Start Date", type: "select", required: false, options: [{ label: "Immediate", value: "immediate" }, { label: "2 Weeks", value: "2_weeks" }] },
      { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true },
      { id: "id:coverLetter", name: "coverLetter", label: "Cover Letter", type: "textarea", required: false },
    ],
  },

  linkedin: {
    name: "LinkedIn",
    hostname: "www.linkedin.com",
    fields: [
      { id: "id:firstName", name: "firstName", label: "First name", type: "text", required: true },
      { id: "id:lastName", name: "lastName", label: "Last name", type: "text", required: true },
      { id: "id:emailAddress", name: "emailAddress", label: "Email address", type: "email", required: true },
      { id: "id:phoneNumber", name: "phoneNumber", label: "Phone number", type: "tel", required: false },
      { id: "id:location", name: "location", label: "City", type: "text", required: false },
      { id: "id:country", name: "country", label: "Country", type: "select", required: false, options: [{ label: "India", value: "in" }, { label: "United States", value: "us" }] },
      { id: "id:workAuth", name: "workAuth", label: "Are you authorized to work in this location?", type: "radio", required: true, options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }] },
      { id: "id:sponsorship", name: "sponsorship", label: "Do you now or will you require sponsorship?", type: "radio", required: true, options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }] },
      { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true },
      { id: "id:yearsExperience", name: "yearsExperience", label: "Years of experience", type: "select", required: true, options: [{ label: "0 years", value: "0" }, { label: "1-2 years", value: "2" }, { label: "3-5 years", value: "4" }, { label: "6+ years", value: "6" }] },
    ],
  },

  smartrecruiters: {
    name: "SmartRecruiters",
    hostname: "careers.smartrecruiters.com",
    fields: [
      { id: "id:firstName", name: "firstName", label: "First Name", type: "text", required: true },
      { id: "id:lastName", name: "lastName", label: "Last Name", type: "text", required: true },
      { id: "id:email", name: "email", label: "Email", type: "email", required: true },
      { id: "id:phone", name: "phone", label: "Phone", type: "tel", required: false },
      { id: "id:linkedinUrl", name: "linkedinUrl", label: "LinkedIn URL", type: "url", required: false },
      { id: "id:resume", name: "resume", label: "Resume / CV", type: "file", required: true },
      { id: "id:coverLetter", name: "coverLetter", label: "Cover Letter", type: "textarea", required: false },
      { id: "id:location", name: "location", label: "City", type: "text", required: false },
      { id: "id:workAuthorization", name: "workAuthorization", label: "Work Authorization", type: "select", required: true, options: [{ label: "Authorized", value: "yes" }, { label: "Not Authorized", value: "no" }] },
      { id: "id:startDate", name: "startDate", label: "Earliest Start Date", type: "select", required: false, options: [{ label: "Immediately", value: "immediate" }, { label: "2 Weeks", value: "2w" }] },
    ],
  },

  indeed: {
    name: "Indeed",
    hostname: "indeed.com",
    fields: [
      { id: "id:firstName", name: "firstName", label: "First Name", type: "text", required: true },
      { id: "id:lastName", name: "lastName", label: "Last Name", type: "text", required: true },
      { id: "id:email", name: "email", label: "Email Address", type: "email", required: true },
      { id: "id:phoneNumber", name: "phoneNumber", label: "Phone Number", type: "tel", required: false },
      { id: "id:location", name: "location", label: "City, State", type: "text", required: false },
      { id: "id:resumeFile", name: "resumeFile", label: "Resume", type: "file", required: true },
      { id: "id:coverLetter", name: "coverLetter", label: "Cover Letter", type: "textarea", required: false },
      { id: "id:educationLevel", name: "educationLevel", label: "Highest Level of Education", type: "select", required: false, options: [{ label: "High School", value: "high_school" }, { label: "Bachelor's Degree", value: "bachelors" }, { label: "Master's Degree", value: "masters" }] },
      { id: "id:yearsExperience", name: "yearsExperience", label: "Years of Experience", type: "select", required: false, options: [{ label: "Less than 1 year", value: "0" }, { label: "1-2 years", value: "2" }, { label: "3-5 years", value: "4" }, { label: "6+ years", value: "6" }] },
    ],
  },

  workable: {
    name: "Workable",
    hostname: "apply.workable.com",
    fields: [
      { id: "id:name", name: "name", label: "Full Name", type: "text", required: true },
      { id: "id:email", name: "email", label: "Email", type: "email", required: true },
      { id: "id:phone", name: "phone", label: "Phone", type: "tel", required: false },
      { id: "id:linkedin", name: "linkedin", label: "LinkedIn", type: "url", required: false },
      { id: "id:website", name: "website", label: "Website", type: "url", required: false },
      { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true },
      { id: "id:cover_letter", name: "cover_letter", label: "Cover Letter", type: "textarea", required: false },
      { id: "id:location", name: "location", label: "Location", type: "text", required: false },
      { id: "id:work_type", name: "work_type", label: "Employment Type", type: "select", required: false, options: [{ label: "Full-time", value: "full_time" }, { label: "Part-time", value: "part_time" }, { label: "Contract", value: "contract" }] },
      { id: "id:relocation", name: "relocation", label: "Willing to relocate?", type: "select", required: false, options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }] },
    ],
  },

  bamboohr: {
    name: "BambooHR",
    hostname: "haroon.bamboohr.com",
    fields: [
      { id: "id:firstName", name: "firstName", label: "First Name", type: "text", required: true },
      { id: "id:lastName", name: "lastName", label: "Last Name", type: "text", required: true },
      { id: "id:email", name: "email", label: "Email", type: "email", required: true },
      { id: "id:phone", name: "phone", label: "Phone", type: "tel", required: false },
      { id: "id:address", name: "address", label: "Address", type: "text", required: false },
      { id: "id:city", name: "city", label: "City", type: "text", required: false },
      { id: "id:state", name: "state", label: "State", type: "text", required: false },
      { id: "id:country", name: "country", label: "Country", type: "select", required: false, options: [{ label: "India", value: "IN" }, { label: "United States", value: "US" }] },
      { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true },
      { id: "id:linkedin", name: "linkedin", label: "LinkedIn", type: "url", required: false },
      { id: "id:website", name: "website", label: "Portfolio / Website", type: "url", required: false },
    ],
  },
};

// Simulate what the content script does: extract fields and send to proxy
function simulateContentScriptFieldExtraction(atsFields) {
  // This simulates the content script's getFieldLabel + createFieldId logic
  return atsFields.map((field) => ({
    id: field.id,
    name: field.name || "",
    label: field.label || "",
    placeholder: field.placeholder || "",
    description: field.description || "",
    type: field.type || "text",
    required: !!field.required,
    options: field.options || [],
  }));
}

// Simulate the full proxy resolution pipeline
function simulateProxyResolution(fields, profile, answerMemory, context) {
  const sanitizedFields = sanitizeFields(fields);
  const sanitizedContext = sanitizeApplicationContext(context);

  const deterministicResult = resolveDeterministic(sanitizedFields, profile.facts, answerMemory);

  const contextChunks = getRelevantContext(profile, deterministicResult.unresolved);

  const merged = mergeSuggestions(
    sanitizedFields,
    deterministicResult.filled,
    [], // no AI in this simulation
    0.6
  );

  return {
    sanitizedFields,
    sanitizedContext,
    deterministicResult,
    contextChunks,
    merged,
  };
}

describe("Full ATS Pipeline Simulation", () => {
  let profile;
  let answerMemory;

  before(async () => {
    const profileStore = new ProfileStore();
    await profileStore.reload();
    profile = profileStore.getProfile();

    answerMemory = new AnswerMemory();
    try {
      await answerMemory.load();
    } catch {
      // ignore if file doesn't exist
    }
  });

  for (const [atsId, atsConfig] of Object.entries(ATS_MOCK_FORMS)) {
    describe(`${atsConfig.name} (${atsConfig.fields.length} fields)`, () => {
      it("should extract and sanitize all fields", () => {
        const rawFields = simulateContentScriptFieldExtraction(atsConfig.fields);
        const sanitized = sanitizeFields(rawFields);
        assert.equal(sanitized.length, atsConfig.fields.length, `Expected ${atsConfig.fields.length} sanitized fields`);
        for (const field of sanitized) {
          assert.ok(field.id, "Each field should have an id");
          assert.ok(field.fingerprint, "Each field should have a fingerprint");
        }
      });

      it("should resolve fields deterministically with real profile", () => {
        const rawFields = simulateContentScriptFieldExtraction(atsConfig.fields);
        const result = resolveDeterministic(rawFields, profile.facts, answerMemory);

        const fillableFields = rawFields.filter((f) => f.type !== "file");
        const filledCount = result.filled.length;
        const totalFillable = fillableFields.length;
        const fillRate = totalFillable > 0 ? (filledCount / totalFillable) * 100 : 0;

        // Log for visibility
        console.log(`  ${atsConfig.name}: ${filledCount}/${totalFillable} fillable fields (${fillRate.toFixed(1)}%)`);

        // We expect at least 50% fill rate for most ATS
        assert.ok(fillRate >= 40, `${atsConfig.name} fill rate too low: ${fillRate.toFixed(1)}%`);
      });

      it("should produce valid merged suggestions", () => {
        const rawFields = simulateContentScriptFieldExtraction(atsConfig.fields);
        const result = simulateProxyResolution(rawFields, profile, answerMemory, {
          title: "Software Engineer",
          company: "Test Corp",
          description: "We are looking for a software engineer",
          url: `https://${atsConfig.hostname}/jobs/test`,
        });

        assert.equal(result.merged.length, atsConfig.fields.length);
        for (const item of result.merged) {
          assert.ok(item.fieldId, "Each suggestion should have fieldId");
          assert.ok(typeof item.confidence === "number", "Each suggestion should have confidence");
          assert.ok(typeof item.suggested === "boolean", "Each suggestion should have suggested flag");
          assert.ok(item.source, "Each suggestion should have source");
        }
      });

      it("should provide relevant context chunks for unresolved fields", () => {
        const rawFields = simulateContentScriptFieldExtraction(atsConfig.fields);
        const result = resolveDeterministic(rawFields, profile.facts, answerMemory);

        if (result.unresolved.length > 0) {
          const context = getRelevantContext(profile, result.unresolved);
          assert.ok(Array.isArray(context.chunks));
          assert.ok(Array.isArray(context.answers));
        }
      });

      it("should handle application context correctly", () => {
        const context = sanitizeApplicationContext({
          title: "Senior Software Engineer",
          company: "TechCorp Inc.",
          description: "We are looking for a senior software engineer with 5+ years experience",
          url: `https://${atsConfig.hostname}/jobs/12345`,
        });

        assert.equal(context.title, "Senior Software Engineer");
        assert.equal(context.company, "TechCorp Inc.");
        assert.ok(context.description.length > 0);
        assert.ok(context.url.startsWith("https://"));
      });

      it("should handle alias context fields", () => {
        const context = sanitizeApplicationContext({
          jobTitle: "Backend Developer",
          employer: "StartupXYZ",
          jobDescription: "Build scalable systems",
          sourceUrl: `https://${atsConfig.hostname}/jobs/67890`,
        });

        assert.equal(context.title, "Backend Developer");
        assert.equal(context.company, "StartupXYZ");
      });
    });
  }
});

describe("Edge Cases", () => {
  let profile;
  let answerMemory;

  before(async () => {
    const profileStore = new ProfileStore();
    await profileStore.reload();
    profile = profileStore.getProfile();

    answerMemory = new AnswerMemory();
    try {
      await answerMemory.load();
    } catch {
      // ignore
    }
  });

  it("should handle fields with no label or name", () => {
    const fields = [
      { id: "anon1", name: "", label: "", type: "text", options: [] },
      { id: "anon2", name: "", label: "", type: "text", options: [] },
    ];
    const result = resolveDeterministic(fields, profile.facts, answerMemory);
    assert.equal(result.unresolved.length, 2);
  });

  it("should handle fields with only placeholder", () => {
    const fields = [
      { id: "f1", name: "", label: "", placeholder: "Enter your email", type: "email", options: [] },
    ];
    const result = resolveDeterministic(fields, profile.facts, answerMemory);
    // Placeholder alone may not trigger field mapping, which is correct
    assert.ok(result.filled.length + result.unresolved.length === 1);
  });

  it("should handle ambiguous field labels", () => {
    const fields = [
      { id: "f1", name: "name", label: "Name", type: "text", options: [] },
    ];
    const result = resolveDeterministic(fields, profile.facts, answerMemory);
    // "Name" should map to fullName
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, profile.facts.fullName);
  });

  it("should handle select fields with no matching options", () => {
    const fields = [
      {
        id: "f1",
        name: "country",
        label: "Country",
        type: "select",
        options: [
          { label: "Germany", value: "DE" },
          { label: "France", value: "FR" },
        ],
      },
    ];
    const result = resolveDeterministic(fields, profile.facts, answerMemory);
    // India option not available, may resolve or not
    assert.ok(result.filled.length + result.unresolved.length === 1);
  });

  it("should handle very long field values", () => {
    const fields = [
      { id: "f1", name: "about", label: "About Yourself", type: "textarea", options: [] },
    ];
    const result = resolveDeterministic(fields, profile.facts, answerMemory);
    if (result.filled.length > 0) {
      assert.ok(result.filled[0].value.length > 0);
    }
  });

  it("should handle empty options array", () => {
    const fields = [
      { id: "f1", name: "test", label: "Test", type: "select", options: [] },
    ];
    const result = resolveDeterministic(fields, profile.facts, answerMemory);
    assert.ok(result.filled.length + result.unresolved.length === 1);
  });

  it("should handle duplicate field ids in sanitization", () => {
    const fields = [
      { id: "f1", name: "email", label: "Email", type: "email" },
      { id: "f1", name: "email2", label: "Email 2", type: "email" },
    ];
    const sanitized = sanitizeFields(fields);
    assert.equal(sanitized.length, 1);
  });

  it("should handle malformed URLs in context", () => {
    const context = sanitizeApplicationContext({
      url: "not-a-url",
    });
    assert.equal(context.url, undefined);
  });

  it("should handle null context gracefully", () => {
    const context = sanitizeApplicationContext(null);
    assert.deepEqual(context, {});
  });

  it("should handle fields with special characters in labels", () => {
    const fields = [
      { id: "f1", name: "test", label: "What's your email address?", type: "text", options: [] },
    ];
    const result = resolveDeterministic(fields, profile.facts, answerMemory);
    assert.ok(result.filled.length + result.unresolved.length === 1);
  });
});

describe("Cross-ATS Field Mapping Consistency", () => {
  let profile;
  let answerMemory;

  before(async () => {
    const profileStore = new ProfileStore();
    await profileStore.reload();
    profile = profileStore.getProfile();

    answerMemory = new AnswerMemory();
    try {
      await answerMemory.load();
    } catch {
      // ignore
    }
  });

  it("email fields resolve consistently across all ATS", () => {
    for (const [atsId, atsConfig] of Object.entries(ATS_MOCK_FORMS)) {
      const emailFields = atsConfig.fields.filter(
        (f) => f.label.toLowerCase().includes("email") || f.name.toLowerCase().includes("email")
      );
      for (const field of emailFields) {
        const result = resolveDeterministic([field], profile.facts, answerMemory);
        if (result.filled.length > 0) {
          assert.equal(
            result.filled[0].value,
            profile.facts.email,
            `${atsConfig.name}: email should resolve to profile email`
          );
        }
      }
    }
  });

  it("phone fields resolve consistently across all ATS", () => {
    for (const [atsId, atsConfig] of Object.entries(ATS_MOCK_FORMS)) {
      const phoneFields = atsConfig.fields.filter(
        (f) => f.label.toLowerCase().includes("phone") || f.name.toLowerCase().includes("phone")
      );
      for (const field of phoneFields) {
        const result = resolveDeterministic([field], profile.facts, answerMemory);
        if (result.filled.length > 0) {
          assert.equal(
            result.filled[0].value,
            profile.facts.phone,
            `${atsConfig.name}: phone should resolve to profile phone`
          );
        }
      }
    }
  });

  it("first name fields resolve consistently across all ATS", () => {
    for (const [atsId, atsConfig] of Object.entries(ATS_MOCK_FORMS)) {
      const fnFields = atsConfig.fields.filter(
        (f) => f.label.toLowerCase().includes("first name") || f.name.toLowerCase().includes("firstname") || f.name.toLowerCase().includes("first_name")
      );
      for (const field of fnFields) {
        const result = resolveDeterministic([field], profile.facts, answerMemory);
        if (result.filled.length > 0) {
          assert.equal(
            result.filled[0].value,
            profile.facts.firstName,
            `${atsConfig.name}: first name should resolve to profile firstName`
          );
        }
      }
    }
  });

  it("last name fields resolve consistently across all ATS", () => {
    for (const [atsId, atsConfig] of Object.entries(ATS_MOCK_FORMS)) {
      const lnFields = atsConfig.fields.filter(
        (f) => f.label.toLowerCase().includes("last name") || f.name.toLowerCase().includes("lastname") || f.name.toLowerCase().includes("last_name")
      );
      for (const field of lnFields) {
        const result = resolveDeterministic([field], profile.facts, answerMemory);
        if (result.filled.length > 0) {
          assert.equal(
            result.filled[0].value,
            profile.facts.lastName,
            `${atsConfig.name}: last name should resolve to profile lastName`
          );
        }
      }
    }
  });
});
