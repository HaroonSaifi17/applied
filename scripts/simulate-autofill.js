"use strict";

const path = require("path");
const { resolveDeterministic } = require("../proxy/lib/deterministic-resolver");
const { ProfileStore } = require("../proxy/lib/profile-store");
const { AnswerMemory } = require("../proxy/lib/answer-memory");

const ATS_MOCK_FORMS = {
  greenhouse: {
    name: "Greenhouse",
    fields: [
      { id: "id:first_name", name: "first_name", label: "First Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:last_name", name: "last_name", label: "Last Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:email", name: "email", label: "Email", type: "email", required: true, options: [], placeholder: "", description: "" },
      { id: "id:phone", name: "phone", label: "Phone", type: "tel", required: false, options: [], placeholder: "", description: "" },
      { id: "id:location", name: "location", label: "Location", type: "text", required: false, options: [], placeholder: "", description: "" },
      { id: "id:linkedin", name: "linkedin", label: "LinkedIn Profile", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:github", name: "github", label: "GitHub Profile", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:website", name: "website", label: "Website / Portfolio", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true, options: [], placeholder: "", description: "" },
      { id: "id:cover_letter", name: "cover_letter", label: "Cover Letter", type: "textarea", required: false, options: [], placeholder: "", description: "" },
      { id: "id:work_auth", name: "work_auth", label: "Are you authorized to work in this country?", type: "select", required: true, options: [{ label: "Yes", value: "1" }, { label: "No", value: "0" }], placeholder: "", description: "" },
      { id: "id:sponsorship", name: "sponsorship", label: "Do you require visa sponsorship?", type: "select", required: true, options: [{ label: "Yes", value: "1" }, { label: "No", value: "0" }], placeholder: "", description: "" },
      { id: "id:experience", name: "experience", label: "Years of Experience", type: "select", required: true, options: [{ label: "0-1 years", value: "0" }, { label: "1-3 years", value: "2" }, { label: "3-5 years", value: "4" }, { label: "5+ years", value: "5" }], placeholder: "", description: "" },
      { id: "id:start_date", name: "start_date", label: "When can you start?", type: "select", required: false, options: [{ label: "Immediately", value: "immediate" }, { label: "2 weeks", value: "2_weeks" }, { label: "1 month", value: "1_month" }, { label: "Negotiable", value: "negotiable" }], placeholder: "", description: "" },
    ],
  },

  lever: {
    name: "Lever",
    fields: [
      { id: "id:fullname", name: "fullname", label: "Full Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:email", name: "email", label: "Email", type: "email", required: true, options: [], placeholder: "", description: "" },
      { id: "id:phone", name: "phone", label: "Phone", type: "tel", required: false, options: [], placeholder: "", description: "" },
      { id: "id:urls[LinkedIn]", name: "urls[LinkedIn]", label: "LinkedIn", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:urls[GitHub]", name: "urls[GitHub]", label: "GitHub", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:urls[Portfolio]", name: "urls[Portfolio]", label: "Portfolio", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:comments", name: "comments", label: "Additional Information", type: "textarea", required: false, options: [], placeholder: "", description: "" },
      { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true, options: [], placeholder: "", description: "" },
      { id: "id:location", name: "location", label: "Location", type: "text", required: false, options: [], placeholder: "", description: "" },
    ],
  },

  ashby: {
    name: "Ashby",
    fields: [
      { id: "id:name", name: "name", label: "Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:email", name: "email", label: "Email", type: "email", required: true, options: [], placeholder: "", description: "" },
      { id: "id:phone", name: "phone", label: "Phone", type: "tel", required: false, options: [], placeholder: "", description: "" },
      { id: "id:linkedin", name: "linkedin", label: "LinkedIn Profile URL", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:github", name: "github", label: "GitHub URL", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:website", name: "website", label: "Website", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:resume", name: "resume", label: "Resume / CV", type: "file", required: true, options: [], placeholder: "", description: "" },
      { id: "id:cover_letter", name: "cover_letter", label: "Cover Letter", type: "textarea", required: false, options: [], placeholder: "", description: "" },
      { id: "id:location", name: "location", label: "City", type: "text", required: false, options: [], placeholder: "", description: "" },
      { id: "id:work_auth", name: "work_auth", label: "Are you legally authorized to work in this country?", type: "select", required: true, options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }], placeholder: "", description: "" },
      { id: "id:sponsorship", name: "sponsorship", label: "Will you now or in the future require sponsorship?", type: "select", required: true, options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }], placeholder: "", description: "" },
    ],
  },

  workday: {
    name: "Workday",
    fields: [
      { id: "id:firstName", name: "firstName", label: "First Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:lastName", name: "lastName", label: "Last Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:email", name: "email", label: "Email Address", type: "email", required: true, options: [], placeholder: "", description: "" },
      { id: "id:phone", name: "phone", label: "Phone Number", type: "tel", required: false, options: [], placeholder: "", description: "" },
      { id: "id:address", name: "address", label: "Address", type: "text", required: false, options: [], placeholder: "", description: "" },
      { id: "id:city", name: "city", label: "City", type: "text", required: false, options: [], placeholder: "", description: "" },
      { id: "id:state", name: "state", label: "State", type: "select", required: false, options: [{ label: "Delhi", value: "DL" }, { label: "Karnataka", value: "KA" }, { label: "Maharashtra", value: "MH" }], placeholder: "", description: "" },
      { id: "id:country", name: "country", label: "Country", type: "select", required: false, options: [{ label: "India", value: "IN" }, { label: "United States", value: "US" }, { label: "United Kingdom", value: "GB" }], placeholder: "", description: "" },
      { id: "id:workAuth", name: "workAuth", label: "Work Authorization", type: "select", required: true, options: [{ label: "Authorized", value: "authorized" }, { label: "Not Authorized", value: "not_authorized" }], placeholder: "", description: "" },
      { id: "id:sponsorship", name: "sponsorship", label: "Visa Sponsorship Required", type: "select", required: true, options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }], placeholder: "", description: "" },
      { id: "id:startDate", name: "startDate", label: "Available Start Date", type: "select", required: false, options: [{ label: "Immediate", value: "immediate" }, { label: "2 Weeks", value: "2_weeks" }, { label: "1 Month", value: "1_month" }], placeholder: "", description: "" },
      { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true, options: [], placeholder: "", description: "" },
      { id: "id:coverLetter", name: "coverLetter", label: "Cover Letter", type: "textarea", required: false, options: [], placeholder: "", description: "" },
    ],
  },

  linkedin: {
    name: "LinkedIn",
    fields: [
      { id: "id:firstName", name: "firstName", label: "First name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:lastName", name: "lastName", label: "Last name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:emailAddress", name: "emailAddress", label: "Email address", type: "email", required: true, options: [], placeholder: "", description: "" },
      { id: "id:phoneNumber", name: "phoneNumber", label: "Phone number", type: "tel", required: false, options: [], placeholder: "", description: "" },
      { id: "id:location", name: "location", label: "City", type: "text", required: false, options: [], placeholder: "", description: "" },
      { id: "id:country", name: "country", label: "Country", type: "select", required: false, options: [{ label: "India", value: "in" }, { label: "United States", value: "us" }], placeholder: "", description: "" },
      { id: "id:workAuth", name: "workAuth", label: "Are you authorized to work in this location?", type: "radio", required: true, options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }], placeholder: "", description: "" },
      { id: "id:sponsorship", name: "sponsorship", label: "Do you now or will you require sponsorship?", type: "radio", required: true, options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }], placeholder: "", description: "" },
      { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true, options: [], placeholder: "", description: "" },
      { id: "id:yearsExperience", name: "yearsExperience", label: "Years of experience", type: "select", required: true, options: [{ label: "0 years", value: "0" }, { label: "1-2 years", value: "2" }, { label: "3-5 years", value: "4" }, { label: "6+ years", value: "6" }], placeholder: "", description: "" },
    ],
  },

  smartrecruiters: {
    name: "SmartRecruiters",
    fields: [
      { id: "id:firstName", name: "firstName", label: "First Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:lastName", name: "lastName", label: "Last Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:email", name: "email", label: "Email", type: "email", required: true, options: [], placeholder: "", description: "" },
      { id: "id:phone", name: "phone", label: "Phone", type: "tel", required: false, options: [], placeholder: "", description: "" },
      { id: "id:linkedinUrl", name: "linkedinUrl", label: "LinkedIn URL", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:resume", name: "resume", label: "Resume / CV", type: "file", required: true, options: [], placeholder: "", description: "" },
      { id: "id:coverLetter", name: "coverLetter", label: "Cover Letter", type: "textarea", required: false, options: [], placeholder: "", description: "" },
      { id: "id:location", name: "location", label: "City", type: "text", required: false, options: [], placeholder: "", description: "" },
      { id: "id:workAuthorization", name: "workAuthorization", label: "Work Authorization", type: "select", required: true, options: [{ label: "Authorized", value: "yes" }, { label: "Not Authorized", value: "no" }], placeholder: "", description: "" },
      { id: "id:startDate", name: "startDate", label: "Earliest Start Date", type: "select", required: false, options: [{ label: "Immediately", value: "immediate" }, { label: "2 Weeks", value: "2w" }, { label: "1 Month", value: "1m" }], placeholder: "", description: "" },
    ],
  },

  indeed: {
    name: "Indeed",
    fields: [
      { id: "id:firstName", name: "firstName", label: "First Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:lastName", name: "lastName", label: "Last Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:email", name: "email", label: "Email Address", type: "email", required: true, options: [], placeholder: "", description: "" },
      { id: "id:phoneNumber", name: "phoneNumber", label: "Phone Number", type: "tel", required: false, options: [], placeholder: "", description: "" },
      { id: "id:location", name: "location", label: "City, State", type: "text", required: false, options: [], placeholder: "", description: "" },
      { id: "id:resumeFile", name: "resumeFile", label: "Resume", type: "file", required: true, options: [], placeholder: "", description: "" },
      { id: "id:coverLetter", name: "coverLetter", label: "Cover Letter", type: "textarea", required: false, options: [], placeholder: "", description: "" },
      { id: "id:educationLevel", name: "educationLevel", label: "Highest Level of Education", type: "select", required: false, options: [{ label: "High School", value: "high_school" }, { label: "Bachelor's Degree", value: "bachelors" }, { label: "Master's Degree", value: "masters" }, { label: "Doctorate", value: "doctorate" }], placeholder: "", description: "" },
      { id: "id:yearsExperience", name: "yearsExperience", label: "Years of Experience", type: "select", required: false, options: [{ label: "Less than 1 year", value: "0" }, { label: "1-2 years", value: "2" }, { label: "3-5 years", value: "4" }, { label: "6+ years", value: "6" }], placeholder: "", description: "" },
    ],
  },

  workable: {
    name: "Workable",
    fields: [
      { id: "id:name", name: "name", label: "Full Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:email", name: "email", label: "Email", type: "email", required: true, options: [], placeholder: "", description: "" },
      { id: "id:phone", name: "phone", label: "Phone", type: "tel", required: false, options: [], placeholder: "", description: "" },
      { id: "id:linkedin", name: "linkedin", label: "LinkedIn", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:website", name: "website", label: "Website", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true, options: [], placeholder: "", description: "" },
      { id: "id:cover_letter", name: "cover_letter", label: "Cover Letter", type: "textarea", required: false, options: [], placeholder: "", description: "" },
      { id: "id:location", name: "location", label: "Location", type: "text", required: false, options: [], placeholder: "", description: "" },
      { id: "id:work_type", name: "work_type", label: "Employment Type", type: "select", required: false, options: [{ label: "Full-time", value: "full_time" }, { label: "Part-time", value: "part_time" }, { label: "Contract", value: "contract" }], placeholder: "", description: "" },
      { id: "id:relocation", name: "relocation", label: "Willing to relocate?", type: "select", required: false, options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }], placeholder: "", description: "" },
    ],
  },

  bamboohr: {
    name: "BambooHR",
    fields: [
      { id: "id:firstName", name: "firstName", label: "First Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:lastName", name: "lastName", label: "Last Name", type: "text", required: true, options: [], placeholder: "", description: "" },
      { id: "id:email", name: "email", label: "Email", type: "email", required: true, options: [], placeholder: "", description: "" },
      { id: "id:phone", name: "phone", label: "Phone", type: "tel", required: false, options: [], placeholder: "", description: "" },
      { id: "id:address", name: "address", label: "Address", type: "text", required: false, options: [], placeholder: "", description: "" },
      { id: "id:city", name: "city", label: "City", type: "text", required: false, options: [], placeholder: "", description: "" },
      { id: "id:state", name: "state", label: "State", type: "text", required: false, options: [], placeholder: "", description: "" },
      { id: "id:country", name: "country", label: "Country", type: "select", required: false, options: [{ label: "India", value: "IN" }, { label: "United States", value: "US" }], placeholder: "", description: "" },
      { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true, options: [], placeholder: "", description: "" },
      { id: "id:linkedin", name: "linkedin", label: "LinkedIn", type: "url", required: false, options: [], placeholder: "", description: "" },
      { id: "id:website", name: "website", label: "Portfolio / Website", type: "url", required: false, options: [], placeholder: "", description: "" },
    ],
  },
};

function printHeader(text) {
  process.stdout.write(`\n${"=".repeat(60)}\n`);
  process.stdout.write(`  ${text}\n`);
  process.stdout.write(`${"=".repeat(60)}\n`);
}

function printSection(text) {
  process.stdout.write(`\n--- ${text} ---\n`);
}

async function main() {
  printHeader("ATS AUTOFILL SIMULATION REPORT");

  const profileStore = new ProfileStore();
  await profileStore.reload();
  const profile = profileStore.getProfile();

  const answerMemory = new AnswerMemory();
  await answerMemory.load();

  process.stdout.write(`\nProfile loaded: ${profile.loadedAt}\n`);
  process.stdout.write(`Profile facts: ${Object.keys(profile.facts).length}\n`);
  process.stdout.write(`Answer bank: ${profile.answerBank.length} entries\n`);
  process.stdout.write(`Chunks: ${profile.chunks.length}\n`);

  const overallStats = {
    totalFields: 0,
    totalFilled: 0,
    totalUnresolved: 0,
    bySource: { facts: 0, memory: 0, ai: 0, none: 0 },
    byAts: {},
  };

  for (const [atsId, atsConfig] of Object.entries(ATS_MOCK_FORMS)) {
    printSection(`${atsConfig.name} (${atsConfig.fields.length} fields)`);

    const result = resolveDeterministic(atsConfig.fields, profile.facts, answerMemory);

    const filled = result.filled;
    const unresolved = result.unresolved;

    const fillRate = atsConfig.fields.length > 0
      ? ((filled.length / atsConfig.fields.length) * 100).toFixed(1)
      : "0.0";

    overallStats.totalFields += atsConfig.fields.length;
    overallStats.totalFilled += filled.length;
    overallStats.totalUnresolved += unresolved.length;

    for (const item of filled) {
      overallStats.bySource[item.source] = (overallStats.bySource[item.source] || 0) + 1;
    }

    overallStats.byAts[atsId] = {
      name: atsConfig.name,
      total: atsConfig.fields.length,
      filled: filled.length,
      unresolved: unresolved.length,
      fillRate: `${fillRate}%`,
    };

    process.stdout.write(`  Fill rate: ${filled.length}/${atsConfig.fields.length} (${fillRate}%)\n`);
    process.stdout.write(`  Resolved:\n`);
    for (const item of filled) {
      const value = typeof item.value === "boolean" ? (item.value ? "Yes" : "No") : String(item.value).slice(0, 50);
      process.stdout.write(`    [${item.confidence.toFixed(2)}] ${item.fieldId} = ${value} (${item.source})\n`);
    }

    if (unresolved.length) {
      process.stdout.write(`  Unresolved:\n`);
      for (const field of unresolved) {
        process.stdout.write(`    - ${field.id} [${field.label}] (${field.type})\n`);
      }
    }
  }

  printHeader("OVERALL SUMMARY");

  const overallFillRate = overallStats.totalFields > 0
    ? ((overallStats.totalFilled / overallStats.totalFields) * 100).toFixed(1)
    : "0.0";

  process.stdout.write(`\nTotal fields across all ATS: ${overallStats.totalFields}\n`);
  process.stdout.write(`Total filled (deterministic): ${overallStats.totalFilled}\n`);
  process.stdout.write(`Total unresolved: ${overallStats.totalUnresolved}\n`);
  process.stdout.write(`Overall fill rate: ${overallFillRate}%\n`);
  process.stdout.write(`\nBy source:\n`);
  for (const [source, count] of Object.entries(overallStats.bySource)) {
    process.stdout.write(`  ${source}: ${count}\n`);
  }

  process.stdout.write(`\nPer-ATS breakdown:\n`);
  for (const [atsId, stats] of Object.entries(overallStats.byAts)) {
    process.stdout.write(`  ${stats.name.padEnd(18)} ${stats.filled}/${stats.total} (${stats.fillRate})\n`);
  }

  printSection("GAPS & RECOMMENDATIONS");

  const allUnresolved = [];
  for (const [atsId, atsConfig] of Object.entries(ATS_MOCK_FORMS)) {
    const result = resolveDeterministic(atsConfig.fields, profile.facts, answerMemory);
    for (const field of result.unresolved) {
      allUnresolved.push({
        ats: atsConfig.name,
        fieldId: field.id,
        label: field.label,
        type: field.type,
      });
    }
  }

  const labelCounts = new Map();
  for (const item of allUnresolved) {
    const key = item.label.toLowerCase();
    if (!labelCounts.has(key)) {
      labelCounts.set(key, { label: item.label, type: item.type, atsList: [] });
    }
    labelCounts.get(key).atsList.push(item.ats);
  }

  if (labelCounts.size > 0) {
    process.stdout.write(`\nFields that could not be resolved deterministically:\n`);
    for (const [, info] of labelCounts) {
      process.stdout.write(`  "${info.label}" (${info.type}) - missing in: ${info.atsList.join(", ")}\n`);
    }
    process.stdout.write(`\nThese fields would need AI resolution or additional profile data.\n`);
  } else {
    process.stdout.write(`\nAll fields resolved deterministically! No gaps found.\n`);
  }

  process.stdout.write(`\n${"=".repeat(60)}\n`);
  process.stdout.write(`  Simulation complete.\n`);
  process.stdout.write(`${"=".repeat(60)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error.message}\n${error.stack}\n`);
  process.exit(1);
});
