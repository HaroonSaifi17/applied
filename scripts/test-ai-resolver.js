"use strict";

require("dotenv").config();

const { GroqClient } = require("../proxy/lib/groq-client");
const { resolveDeterministic } = require("../proxy/lib/deterministic-resolver");
const { resolveWithAi } = require("../proxy/lib/ai-resolver");
const { ProfileStore } = require("../proxy/lib/profile-store");
const { AnswerMemory } = require("../proxy/lib/answer-memory");
const { getRelevantContext } = require("../proxy/lib/retrieval");
const { sanitizeFields } = require("../proxy/lib/request-sanitizers");

const UNRESOLVED_FIELDS = {
  greenhouse: [
    { id: "id:discipline", name: "", label: "Discipline", type: "text", required: false, options: [], placeholder: "", description: "" },
    { id: "id:hispanic", name: "", label: "Are you Hispanic/Latino?", type: "text", required: false, options: [], placeholder: "", description: "" },
  ],
  ashby: [
    { id: "id:howdidyouhear", name: "howdidyouhear", label: "How did you hear about us?", type: "text", required: true, options: [], placeholder: "", description: "" },
    { id: "id:additional", name: "additional", label: "Is there anything else you'd like to add in support of your application?", type: "textarea", required: false, options: [], placeholder: "", description: "" },
  ],
  workable: [
    { id: "id:postcode", name: "postcode", label: "postcode", type: "text", required: false, options: [], placeholder: "", description: "" },
    { id: "id:comment", name: "CA_11734", label: "Comment", type: "textarea", required: false, options: [], placeholder: "", description: "" },
  ],
  lever_life: [
    { id: "name:preferredName", name: "preferredName", label: "Preferred Name", type: "text", required: false, options: [], placeholder: "", description: "" },
    { id: "name:zipCode", name: "zipCode", label: "If in the United States, what is your zip code?", type: "text", required: false, options: [], placeholder: "", description: "" },
    { id: "name:howDidYouHear", name: "howDidYouHear", label: "How did you hear about this position?✱", type: "select", required: true, options: [{ label: "LinkedIn", value: "linkedin" }, { label: "Indeed", value: "indeed" }, { label: "Referral", value: "referral" }, { label: "Other", value: "other" }], placeholder: "", description: "" },
    { id: "name:salaryRequirement", name: "salaryRequirement", label: "What is your minimum salary requirement (USD)?✱", type: "text", required: true, options: [], placeholder: "", description: "" },
  ],
  general: [
    { id: "id:cover_letter", name: "cover_letter", label: "Cover Letter", type: "textarea", required: false, options: [], placeholder: "", description: "" },
    { id: "id:resume", name: "resume", label: "Resume", type: "file", required: true, options: [], placeholder: "", description: "" },
  ],
};

async function main() {
  const profileStore = new ProfileStore();
  await profileStore.reload();
  const profile = profileStore.getProfile();

  const answerMemory = new AnswerMemory();
  try { await answerMemory.load(); } catch {}

  const client = new GroqClient({ token: process.env.GROQ_API_KEY });

  console.log("Testing AI resolver with real unresolved fields...\n");

  let totalTests = 0;
  let passed = 0;
  let failed = 0;

  for (const [atsId, fields] of Object.entries(UNRESOLVED_FIELDS)) {
    console.log(`\n=== ${atsId.toUpperCase()} ===`);

    const context = getRelevantContext(profile, fields);

    try {
      const result = await resolveWithAi(client, profile, fields, context, {
        title: "Software Engineer",
        company: "Test Corp",
        description: "We are looking for a software engineer with experience in Node.js, React, and cloud technologies.",
        url: `https://example.com/jobs/123`,
      });

      console.log(`  Model: ${result.model}`);
      console.log(`  Resolved: ${result.filled.length}/${fields.length}`);

      for (const item of result.filled) {
        const field = fields.find(f => f.id === item.fieldId);
        const val = String(item.value).slice(0, 80);
        const status = item.confidence >= 0.45 ? "✓" : "~";
        console.log(`  ${status} [${item.source}] ${field ? field.label : item.fieldId} → "${val}" (conf=${item.confidence.toFixed(2)})`);
        totalTests++;
        if (item.confidence >= 0.45) passed++;
        else failed++;
      }

      for (const field of result.unresolvedAfterAi) {
        console.log(`  ✗ ${field.label} (unresolved after AI)`);
        totalTests++;
        failed++;
      }
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      totalTests += fields.length;
      failed += fields.length;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total: ${totalTests}, Passed: ${passed}, Failed: ${failed}`);
  console.log(`Success rate: ${totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : 0}%`);
}

main().catch(e => { console.error(e); process.exit(1); });
