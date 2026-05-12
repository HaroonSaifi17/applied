"use strict";

const { tailorResumeForJob } = require("../proxy/lib/resume-tailor");
const { GitHubModelsClient } = require("../proxy/lib/github-models-client");
const fs = require("fs/promises");

async function run() {
  const client = new GitHubModelsClient();
  const context = {
    title: "Software Engineer, Backend",
    company: "Stripe",
    description: "We are looking for a backend engineer experienced with Node.js, distributed systems, API design, and high-performance databases. You will work on payment processing, integrating with bank APIs, and ensuring 99.999% uptime. Must have experience with microservices and AWS.",
  };
  
  const result = await tailorResumeForJob(client, {}, context);
  console.log("Result OK:", result.ok);
  if (result.texPath) {
    console.log("Generated TEX path:", result.texPath);
    const tex = await fs.readFile(result.texPath, "utf8");
    console.log("Snippet of tailored TEX (first 500 chars):");
    console.log(tex.substring(0, 500));
  } else {
    console.log("Result:", result);
  }
}

run().catch(console.error);
