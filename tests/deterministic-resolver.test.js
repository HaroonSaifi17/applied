"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { resolveDeterministic } = require("../proxy/lib/deterministic-resolver");

const SAMPLE_FACTS = {
  firstName: "Mohd",
  lastName: "Haroon",
  fullName: "Mohd Haroon",
  email: "haroon@example.com",
  phone: "+911234567890",
  linkedInUrl: "https://linkedin.com/in/haroon",
  githubUrl: "https://github.com/haroon",
  websiteUrl: "https://haroon.dev",
  twitterUrl: "https://twitter.com/haroon",
  leetcodeUrl: "https://leetcode.com/haroon",
  workAuthorization: true,
  needsSponsorship: false,
  willingToRelocate: true,
  salaryExpectation: "15 LPA",
  currentCTC: "10 LPA",
  noticePeriod: "2 weeks",
  totalExperience: "3 years",
  codingExperience: "5 years",
  typescriptExperience: "3 years",
  javascriptExperience: "5 years",
  nodeExperience: "3 years",
  llmExperience: "1 year",
  graduationYear: "2023",
  educationLevel: "Bachelor's",
  degree: "B.Tech Computer Science",
  employmentType: "Full-time",
  university: "IIT Delhi",
  cgpa: "8.5",
  currentCompany: "TechCorp",
  currentRole: "Software Engineer",
  nationality: "Indian",
  languages: "English, Hindi",
  technicalSkills: "TypeScript, JavaScript, Node.js, React",
  aboutYou: "Self-taught developer with 5 years experience",
  projects: "MeowFi, PrepZone",
  achievements: "40% RPC reduction at MeowFi",
  strengths: "Fast learner, problem solver",
  weaknesses: "Overly detail-oriented",
  whyHireYou: "I bring strong technical skills and passion",
  hobbies: "Reading, coding",
  gender: "Male",
  pronouns: "he/him",
  fresherStatus: false,
  location: "Bangalore",
  address: "123 Main St",
  city: "Bangalore",
  state: "Karnataka",
  country: "India",
};

function makeField(overrides) {
  return {
    id: overrides.id || "test_field",
    name: overrides.name || "",
    label: overrides.label || "",
    placeholder: overrides.placeholder || "",
    description: overrides.description || "",
    type: overrides.type || "text",
    required: overrides.required || false,
    options: overrides.options || [],
    ...overrides,
  };
}

describe("resolveDeterministic", () => {
  it("resolves firstName field", () => {
    const field = makeField({ id: "f1", name: "first_name", label: "First Name", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "Mohd");
    assert.equal(result.filled[0].source, "facts");
    assert.equal(result.filled[0].fieldId, "f1");
  });

  it("resolves lastName field", () => {
    const field = makeField({ id: "f1", name: "last_name", label: "Last Name", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "Haroon");
  });

  it("resolves email field", () => {
    const field = makeField({ id: "f1", name: "email", label: "Email Address", type: "email" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "haroon@example.com");
  });

  it("resolves phone field", () => {
    const field = makeField({ id: "f1", name: "phone", label: "Phone Number", type: "tel" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "+911234567890");
  });

  it("resolves LinkedIn URL field", () => {
    const field = makeField({ id: "f1", name: "linkedin", label: "LinkedIn Profile", type: "url" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "https://linkedin.com/in/haroon");
  });

  it("resolves GitHub URL field", () => {
    const field = makeField({ id: "f1", name: "github", label: "GitHub Profile", type: "url" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "https://github.com/haroon");
  });

  it("resolves website URL field", () => {
    const field = makeField({ id: "f1", name: "website", label: "Portfolio", type: "url" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "https://haroon.dev");
  });

  it("resolves work authorization select (Yes/No options)", () => {
    const field = makeField({
      id: "f1",
      name: "work_auth",
      label: "Are you authorized to work?",
      type: "select",
      options: [
        { label: "Yes", value: "1" },
        { label: "No", value: "0" },
      ],
    });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "1");
  });

  it("resolves sponsorship select (No required)", () => {
    const field = makeField({
      id: "f1",
      name: "sponsorship",
      label: "Do you require visa sponsorship?",
      type: "select",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "no");
  });

  it("resolves years of experience select", () => {
    const field = makeField({
      id: "f1",
      name: "experience",
      label: "Years of Experience",
      type: "select",
      options: [
        { label: "0-1 years", value: "0" },
        { label: "1-3 years", value: "2" },
        { label: "3-5 years", value: "4" },
        { label: "5+ years", value: "5" },
      ],
    });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    // "3 years" should match "3-5 years" (value "4") via range-aware tiebreaker
    assert.equal(result.filled[0].value, "4");
  });

  it("resolves start date select (immediate)", () => {
    const field = makeField({
      id: "f1",
      name: "start_date",
      label: "When can you start?",
      type: "select",
      options: [
        { label: "Immediately", value: "immediate" },
        { label: "2 weeks", value: "2_weeks" },
        { label: "1 month", value: "1_month" },
      ],
    });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "2_weeks");
  });

  it("resolves country select", () => {
    const field = makeField({
      id: "f1",
      name: "country",
      label: "Country",
      type: "select",
      options: [
        { label: "India", value: "IN" },
        { label: "United States", value: "US" },
        { label: "United Kingdom", value: "GB" },
      ],
    });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "IN");
  });

  it("resolves relocation select", () => {
    const field = makeField({
      id: "f1",
      name: "relocation",
      label: "Willing to relocate?",
      type: "select",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "yes");
  });

  it("resolves radio field for work authorization", () => {
    const field = makeField({
      id: "f1",
      name: "workAuth",
      label: "Are you authorized to work in this location?",
      type: "radio",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "yes");
  });

  it("resolves location text field", () => {
    const field = makeField({ id: "f1", name: "location", label: "Current Location", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "Bangalore");
  });

  it("resolves city text field", () => {
    const field = makeField({ id: "f1", name: "city", label: "City", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "Bangalore");
  });

  it("resolves education level", () => {
    const field = makeField({
      id: "f1",
      name: "educationLevel",
      label: "Highest Level of Education",
      type: "select",
      options: [
        { label: "High School", value: "high_school" },
        { label: "Bachelor's Degree", value: "bachelors" },
        { label: "Master's Degree", value: "masters" },
      ],
    });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
  });

  it("resolves current company", () => {
    const field = makeField({ id: "f1", name: "currentCompany", label: "Current Company", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "TechCorp");
  });

  it("resolves current role", () => {
    const field = makeField({ id: "f1", name: "currentRole", label: "Current Role", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "Software Engineer");
  });

  it("resolves notice period", () => {
    const field = makeField({ id: "f1", name: "notice", label: "Notice Period", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "2 weeks");
  });

  it("resolves salary expectation", () => {
    const field = makeField({ id: "f1", name: "salary", label: "Salary Expectation", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "15 LPA");
  });

  it("prioritizes answer memory over facts", () => {
    const memory = new Map();
    memory.set("fingerprint_override", "Custom Value");
    const field = makeField({ id: "f1", name: "first_name", label: "First Name", type: "text", fingerprint: "fingerprint_override" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, memory);
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "Custom Value");
    assert.equal(result.filled[0].source, "memory");
    assert.equal(result.filled[0].confidence, 0.97);
  });

  it("returns unresolved for unknown fields", () => {
    const field = makeField({ id: "f1", name: "random_field", label: "Random Question", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 0);
    assert.equal(result.unresolved.length, 1);
    assert.equal(result.unresolved[0].id, "f1");
  });

  it("resolves multiple fields in one call", () => {
    const fields = [
      makeField({ id: "f1", name: "first_name", label: "First Name", type: "text" }),
      makeField({ id: "f2", name: "email", label: "Email", type: "email" }),
      makeField({ id: "f3", name: "phone", label: "Phone", type: "tel" }),
      makeField({ id: "f4", name: "unknown", label: "Unknown", type: "text" }),
    ];
    const result = resolveDeterministic(fields, SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 3);
    assert.equal(result.unresolved.length, 1);
    assert.equal(result.unresolved[0].id, "f4");
  });

  it("handles empty fields array", () => {
    const result = resolveDeterministic([], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 0);
    assert.equal(result.unresolved.length, 0);
  });

  it("handles empty facts object", () => {
    const field = makeField({ id: "f1", name: "first_name", label: "First Name", type: "text" });
    const result = resolveDeterministic([field], {}, new Map());
    assert.equal(result.filled.length, 0);
    assert.equal(result.unresolved.length, 1);
  });

  it("resolves full name field", () => {
    const field = makeField({ id: "f1", name: "fullname", label: "Full Name", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "Mohd Haroon");
  });

  it("resolves technical skills", () => {
    const field = makeField({ id: "f1", name: "skills", label: "Technical Skills", type: "textarea" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "TypeScript, JavaScript, Node.js, React");
  });

  it("resolves work type select", () => {
    const field = makeField({
      id: "f1",
      name: "work_type",
      label: "Employment Type",
      type: "select",
      options: [
        { label: "Full-time", value: "full_time" },
        { label: "Part-time", value: "part_time" },
        { label: "Contract", value: "contract" },
      ],
    });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "full_time");
  });

  it("assigns confidence 0.93 for boolean fact keys", () => {
    const field = makeField({
      id: "f1",
      name: "work_auth",
      label: "Work Authorization",
      type: "select",
      options: [
        { label: "Yes", value: "1" },
        { label: "No", value: "0" },
      ],
    });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled[0].confidence, 0.93);
  });

  it("resolves nationality field", () => {
    const field = makeField({ id: "f1", name: "nationality", label: "Nationality", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "Indian");
  });

  it("resolves languages field", () => {
    const field = makeField({ id: "f1", name: "languages", label: "Spoken Languages", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "English, Hindi");
  });

  it("resolves hobbies field", () => {
    const field = makeField({ id: "f1", name: "hobbies", label: "Hobbies", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "Reading, coding");
  });

  it("resolves about you field", () => {
    const field = makeField({ id: "f1", name: "about", label: "About Yourself", type: "textarea" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.ok(result.filled[0].value.length > 0);
  });

  it("resolves strengths field", () => {
    const field = makeField({ id: "f1", name: "strengths", label: "Your Strengths", type: "textarea" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "Fast learner, problem solver");
  });

  it("resolves weaknesses field", () => {
    const field = makeField({ id: "f1", name: "weaknesses", label: "Areas for Improvement", type: "textarea" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "Overly detail-oriented");
  });

  it("resolves why hire you field", () => {
    const field = makeField({ id: "f1", name: "whyHire", label: "Why Should We Hire You?", type: "textarea" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "I bring strong technical skills and passion");
  });

  it("resolves projects field", () => {
    const field = makeField({ id: "f1", name: "projects", label: "Key Projects", type: "textarea" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "MeowFi, PrepZone");
  });

  it("resolves achievements field", () => {
    const field = makeField({ id: "f1", name: "achievements", label: "Achievements", type: "textarea" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "40% RPC reduction at MeowFi");
  });

  it("resolves pronouns field", () => {
    const field = makeField({ id: "f1", name: "pronouns", label: "Pronouns", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "he/him");
  });

  it("resolves gender field", () => {
    const field = makeField({ id: "f1", name: "gender", label: "Gender", type: "select", options: [{ label: "Male", value: "male" }, { label: "Female", value: "female" }] });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "male");
  });

  it("resolves graduation year", () => {
    const field = makeField({ id: "f1", name: "gradYear", label: "Graduation Year", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "2023");
  });

  it("resolves university field", () => {
    const field = makeField({ id: "f1", name: "university", label: "University", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "IIT Delhi");
  });

  it("resolves CGPA field", () => {
    const field = makeField({ id: "f1", name: "cgpa", label: "CGPA", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "8.5");
  });

  it("resolves degree field", () => {
    const field = makeField({ id: "f1", name: "degree", label: "Degree", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "B.Tech Computer Science");
  });

  it("resolves coding experience", () => {
    const field = makeField({ id: "f1", name: "codingExp", label: "Coding Experience", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "5 years");
  });

  it("resolves address field", () => {
    const field = makeField({ id: "f1", name: "address", label: "Street Address", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "123 Main St");
  });

  it("resolves state field", () => {
    const field = makeField({ id: "f1", name: "state", label: "Current State", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "Karnataka");
  });

  it("resolves Twitter URL field", () => {
    const field = makeField({ id: "f1", name: "twitter", label: "Twitter Profile", type: "url" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "https://twitter.com/haroon");
  });

  it("resolves LeetCode URL field", () => {
    const field = makeField({ id: "f1", name: "leetcode", label: "LeetCode Profile", type: "url" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "https://leetcode.com/haroon");
  });

  it("resolves current CTC field", () => {
    const field = makeField({ id: "f1", name: "currentCTC", label: "Current CTC", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "10 LPA");
  });

  it("resolves LLM experience field", () => {
    const field = makeField({ id: "f1", name: "llmExp", label: "LLM Experience", type: "text" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "1 year");
  });

  it("resolves technical skills with textarea type", () => {
    const field = makeField({ id: "f1", name: "skills", label: "Technologies", type: "textarea" });
    const result = resolveDeterministic([field], SAMPLE_FACTS, new Map());
    assert.equal(result.filled.length, 1);
    assert.equal(result.filled[0].value, "TypeScript, JavaScript, Node.js, React");
  });
});
