"use strict";

const { resolveDeterministic } = require("../proxy/lib/deterministic-resolver");
const { ProfileStore } = require("../proxy/lib/profile-store");
const { AnswerMemory } = require("../proxy/lib/answer-memory");
const { mergeSuggestions } = require("../proxy/lib/suggestion-merge");
const { sanitizeFields } = require("../proxy/lib/request-sanitizers");
const fs = require("fs/promises");
const path = require("path");

const REAL_FIELDS = {
  greenhouse: [
    { id: "id:first_name", name: "", label: "First Name*", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:last_name", name: "", label: "Last Name*", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:email", name: "", label: "Email*", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:country", name: "", label: "Country", type: "text", required: false, options: [], placeholder: "" },
    { id: "id:phone", name: "", label: "Phone", type: "tel", required: false, options: [], placeholder: "" },
    { id: "id:school--0", name: "", label: "School", type: "text", required: false, options: [], placeholder: "" },
    { id: "id:degree--0", name: "", label: "Degree", type: "text", required: false, options: [], placeholder: "" },
    { id: "id:discipline--0", name: "", label: "Discipline", type: "text", required: false, options: [], placeholder: "" },
    { id: "id:question_4005279006", name: "", label: "LinkedIn Profile", type: "text", required: false, options: [], placeholder: "" },
    { id: "id:question_4005280006", name: "", label: "Website", type: "text", required: false, options: [], placeholder: "" },
    { id: "id:question_4005281006", name: "", label: "Are you authorized to work in the US for any employer? *", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:question_4005282006", name: "", label: "Will you now or in the future require sponsorship to continue working in the US?  *", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:question_4005309006", name: "", label: "What is your ideal role?  Please describe the functional area and/or job title for which you would like to be considered.  *", type: "textarea", required: true, options: [], placeholder: "" },
    { id: "id:gender", name: "", label: "Gender", type: "text", required: false, options: [], placeholder: "" },
    { id: "id:hispanic_ethnicity", name: "", label: "Are you Hispanic/Latino?", type: "text", required: false, options: [], placeholder: "" },
  ],
  lever: [
    { id: "name:name", name: "name", label: "Full name✱", type: "text", required: true, options: [], placeholder: "" },
    { id: "name:email", name: "email", label: "Email✱", type: "email", required: true, options: [], placeholder: "" },
    { id: "name:phone", name: "phone", label: "Phone ✱", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:location-input", name: "location", label: "Current location", type: "text", required: false, options: [], placeholder: "" },
    { id: "name:org", name: "org", label: "Current company", type: "text", required: false, options: [], placeholder: "" },
    { id: "name:urls[LinkedIn]", name: "urls[LinkedIn]", label: "LinkedIn URL", type: "text", required: false, options: [], placeholder: "" },
    { id: "name:urls[GitHub]", name: "urls[GitHub]", label: "GitHub URL", type: "text", required: false, options: [], placeholder: "" },
    { id: "name:urls[Other Website]", name: "urls[Other Website]", label: "Other website", type: "text", required: false, options: [], placeholder: "" },
  ],
  ashby: [
    { id: "id:_systemfield_name", name: "_systemfield_name", label: "Name", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:_systemfield_email", name: "_systemfield_email", label: "Email", type: "email", required: true, options: [], placeholder: "" },
    { id: "id:8b0986be-02fe-4f78-8809-375a9a9513b5", name: "8b0986be-02fe-4f78-8809-375a9a9513b5", label: "Phone Number", type: "tel", required: true, options: [], placeholder: "" },
    { id: "id:c0b876da-703f-4d5c-9198-7bba9edc4001", name: "c0b876da-703f-4d5c-9198-7bba9edc4001", label: "Linkedin profile", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:1b12211b-2236-48c8-84de-7c78f97ad920", name: "1b12211b-2236-48c8-84de-7c78f97ad920", label: "How did you hear about us?", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:b4b95c78-362c-4854-bfaf-3c76c711357b", name: "b4b95c78-362c-4854-bfaf-3c76c711357b", label: "Is there anything else you'd like to add in support of your application?", type: "textarea", required: false, options: [], placeholder: "" },
  ],
  workable: [
    { id: "id:firstname", name: "firstname", label: "First name", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:lastname", name: "lastname", label: "Last name", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:email", name: "email", label: "Email", type: "email", required: true, options: [], placeholder: "" },
    { id: "name:phone", name: "phone", label: "Phone", type: "tel", required: true, options: [], placeholder: "" },
    { id: "id:address", name: "address", label: "Address", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:city", name: "city", label: "city", type: "text", required: false, options: [], placeholder: "" },
    { id: "id:postcode", name: "postcode", label: "postcode", type: "text", required: false, options: [], placeholder: "" },
    { id: "id:country", name: "country", label: "country", type: "text", required: false, options: [], placeholder: "" },
    { id: "id:CA_11734", name: "CA_11734", label: "Comment", type: "textarea", required: false, options: [], placeholder: "" },
    { id: "id:QA_11265489", name: "QA_11265489", label: "What nationalities do you have? (all)", type: "text", required: true, options: [], placeholder: "" },
  ],
  lever_life: [
    { id: "name:name", name: "name", label: "Full name✱", type: "text", required: true, options: [], placeholder: "" },
    { id: "name:email", name: "email", label: "Email✱", type: "email", required: true, options: [], placeholder: "" },
    { id: "name:phone", name: "phone", label: "Phone ✱", type: "text", required: true, options: [], placeholder: "" },
    { id: "id:location-input", name: "location", label: "Current location ✱", type: "text", required: false, options: [], placeholder: "" },
    { id: "name:org", name: "org", label: "Current company", type: "text", required: false, options: [], placeholder: "" },
    { id: "name:urls[Portfolio]", name: "urls[Portfolio]", label: "Portfolio URL", type: "text", required: false, options: [], placeholder: "" },
    { id: "name:urls[GitHub]", name: "urls[GitHub]", label: "GitHub URL", type: "text", required: false, options: [], placeholder: "" },
    { id: "name:urls[Other]", name: "urls[Other]", label: "Other website", type: "text", required: false, options: [], placeholder: "" },
    { id: "name:preferredName", name: "preferredName", label: "Preferred Name", type: "text", required: false, options: [], placeholder: "" },
    { id: "name:streetAddress", name: "streetAddress", label: "Street Address✱", type: "text", required: true, options: [], placeholder: "" },
    { id: "name:country", name: "country", label: "Select Country✱", type: "select", required: true, options: [{label:"United States",value:"US"},{label:"India",value:"IN"},{label:"United Kingdom",value:"UK"}], placeholder: "" },
    { id: "name:zipCode", name: "zipCode", label: "If in the United States, what is your zip code?", type: "text", required: false, options: [], placeholder: "" },
    { id: "name:workAuth", name: "workAuth", label: "Are you legally authorized to work in the United States?✱", type: "select", required: true, options: [{label:"Yes",value:"yes"},{label:"No",value:"no"}], placeholder: "" },
    { id: "name:sponsorship", name: "sponsorship", label: "Do you now, or will you in the future, require sponsorship for employment visa status?", type: "select", required: true, options: [{label:"Yes",value:"yes"},{label:"No",value:"no"}], placeholder: "" },
    { id: "name:howDidYouHear", name: "howDidYouHear", label: "How did you hear about this position?✱", type: "select", required: true, options: [{label:"LinkedIn",value:"linkedin"},{label:"Indeed",value:"indeed"},{label:"Referral",value:"referral"},{label:"Other",value:"other"}], placeholder: "" },
    { id: "name:salaryRequirement", name: "salaryRequirement", label: "What is your minimum salary requirement (USD)?✱", type: "text", required: true, options: [], placeholder: "" },
    { id: "name:gender", name: "gender", label: "Gender", type: "select", required: false, options: [{label:"Male",value:"male"},{label:"Female",value:"female"},{label:"Decline to self-identify",value:"decline"}], placeholder: "" },
    { id: "name:race", name: "race", label: "Race", type: "select", required: false, options: [{label:"Hispanic or Latino",value:"hispanic"},{label:"White",value:"white"},{label:"Black",value:"black"},{label:"Asian",value:"asian"}], placeholder: "" },
    { id: "name:veteran", name: "veteran", label: "Veteran status", type: "select", required: false, options: [{label:"I am a veteran",value:"yes"},{label:"I am not a veteran",value:"no"},{label:"Decline to self-identify",value:"decline"}], placeholder: "" },
  ],
};

async function main() {
  const profileStore = new ProfileStore();
  await profileStore.reload();
  const profile = profileStore.getProfile();

  const answerMemory = new AnswerMemory();
  try { await answerMemory.load(); } catch {}

  console.log("Profile facts:", Object.keys(profile.facts).join(", "));
  console.log("");

  for (const [atsId, fields] of Object.entries(REAL_FIELDS)) {
    console.log(`\n=== ${atsId.toUpperCase()} (${fields.length} fields) ===`);

    const result = resolveDeterministic(fields, profile.facts, answerMemory);

    const fillableFields = fields.filter(f => f.type !== "file");
    const filledCount = result.filled.length;
    const totalFillable = fillableFields.length;
    const fillRate = totalFillable > 0 ? (filledCount / totalFillable) * 100 : 0;

    console.log(`Fill rate: ${filledCount}/${totalFillable} (${fillRate.toFixed(1)}%)`);

    console.log("\nFilled:");
    for (const f of result.filled) {
      const field = fields.find(x => x.id === f.fieldId);
      const val = String(f.value).slice(0, 60);
      console.log(`  ✓ [${f.source}] ${field ? field.label : f.fieldId} → "${val}" (conf=${f.confidence})`);
    }

    console.log("\nUnresolved:");
    for (const u of result.unresolved) {
      const field = fields.find(x => x.id === u.id);
      console.log(`  ✗ ${field ? field.label : u.id} (type=${field ? field.type : "?"}, name=${field ? field.name : "?"})`);
    }

    // Also test merge
    const merged = mergeSuggestions(fields, result.filled, [], 0.6);
    const suggested = merged.filter(m => m.suggested);
    console.log(`\nMerged suggestions: ${suggested.length}/${merged.length} suggested`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
