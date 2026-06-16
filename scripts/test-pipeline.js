"use strict";

require("dotenv").config();

const { GroqClient } = require("../proxy/lib/groq-client.js");
const { parseJsonFromModel } = require("../proxy/lib/text-utils.js");
const fs = require("fs/promises");
const path = require("path");

const JD_KEYWORDS_SCHEMA = {
  name: "jd_keywords",
  strict: false,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      keywords: {
        type: "array",
        items: { type: "string" },
        description: "Top 15-25 most important keywords from the JD",
      },
      skills: {
        type: "array",
        items: { type: "string" },
        description: "Technical skills mentioned",
      },
      tools: {
        type: "array",
        items: { type: "string" },
        description: "Specific tools and platforms mentioned",
      },
      concepts: {
        type: "array",
        items: { type: "string" },
        description: "Concepts, methodologies, and domain terms",
      },
    },
    required: ["keywords", "skills", "tools", "concepts"],
  },
};

const POINT_REWRITE_SCHEMA = {
  name: "point_rewrite",
  strict: false,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      rewritten: {
        type: "string",
        description: "The rewritten resume point",
      },
      keywordsUsed: {
        type: "array",
        items: { type: "string" },
        description: "JD keywords incorporated",
      },
    },
    required: ["rewritten", "keywordsUsed"],
  },
};

const SKILLS_REORDER_SCHEMA = {
  name: "skills_reorder",
  strict: false,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      orderedSkills: {
        type: "array",
        items: { type: "string" },
        description: "Skills reordered by JD priority",
      },
    },
    required: ["orderedSkills"],
  },
};

const SAMPLE_JD = `
Senior Full Stack Developer

We are looking for a Senior Full Stack Developer to join our growing engineering team. 
You will work on building and maintaining scalable web applications using modern technologies.

Requirements:
- 3+ years of experience with TypeScript and JavaScript
- Strong proficiency in React.js, Next.js, or Angular
- Experience with Node.js and Express.js
- Familiarity with PostgreSQL and MongoDB databases
- Experience with Docker and CI/CD pipelines
- Knowledge of REST APIs and GraphQL
- Understanding of agile development methodologies
- Experience with Git version control

Nice to have:
- Experience with AWS or cloud services
- Knowledge of microservices architecture
- Experience with testing frameworks (Jest, Cypress)
- Familiarity with Redis caching
- Experience with message queues (RabbitMQ, Kafka)

Responsibilities:
- Design and develop scalable web applications
- Collaborate with product and design teams
- Write clean, maintainable code
- Participate in code reviews
- Mentor junior developers
- Contribute to architectural decisions
`;

const SAMPLE_POINT = {
  original:
    "Engineered a modular \\textbf{NPM Workspace Monorepo} integrating \\textbf{React}, \\textbf{Node.js}, and \\textbf{tRPC}; implemented structured script automation and programmatic validation loops to maintain code quality, streamline refactoring, and accelerate multi-package deployments across internal packages.",
  wordCount: 30,
};

const SAMPLE_SKILLS = [
  "React.js",
  "Next.js",
  "Angular",
  "Astro",
  "Tailwind CSS",
  "Redux",
  "ShadCN UI",
  "Vite",
];

const SAMPLE_PROFILE_SKILLS = [
  "TypeScript",
  "React",
  "Node.js",
  "Next.js",
  "Angular",
  "Astro",
  "MongoDB",
  "PostgreSQL",
  "Docker",
  "Git",
  "Nx",
  "Biome",
  "Express.js",
  "tRPC",
  "Spring Boot",
];

function wordCount(value) {
  const words = String(value || "").match(/[A-Za-z0-9+#.%-]+/g);
  return words ? words.length : 0;
}

async function testStep(name, fn) {
  process.stdout.write(`\n--- Testing: ${name} ---\n`);
  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = Date.now() - start;
    process.stdout.write(`PASS (${elapsed}ms)\n`);
    return { ok: true, result, elapsed };
  } catch (error) {
    const elapsed = Date.now() - start;
    process.stdout.write(`FAIL (${elapsed}ms): ${error.message}\n`);
    if (error.details) {
      process.stdout.write(`Details: ${JSON.stringify(error.details, null, 2)}\n`);
    }
    return { ok: false, error, elapsed };
  }
}

async function main() {
  const token = process.env.GROQ_API_KEY;
  if (!token) {
    process.stderr.write("GROQ_API_KEY not set. Add it to .env\n");
    process.exit(1);
  }

  process.stdout.write("Creating GroqClient...\n");
  const client = new GroqClient({ token });
  process.stdout.write(`Models: ${client.models.join(", ")}\n`);

  // Step 0: Test basic connectivity
  await testStep("Basic connectivity (completeStructured)", async () => {
    const result = await client.completeStructured(
      [
        { role: "user", content: 'Return JSON: {"test": true}' },
      ],
      {
        name: "test",
        strict: false,
        schema: {
          type: "object",
          properties: { test: { type: "boolean" } },
          required: ["test"],
        },
      },
    );
    process.stdout.write(`  Model: ${result.model}\n`);
    process.stdout.write(`  Parsed: ${JSON.stringify(result.parsed)}\n`);
    return result;
  });

  // Step 1: JD Keyword Extraction
  await testStep("Step 1: JD Keyword Extraction", async () => {
    const messages = [
      {
        role: "system",
        content: `Extract the most important keywords from this job description for ATS resume optimization.
Focus on: technical skills, tools, frameworks, methodologies, domain terms, and role-specific keywords.
Return 15-25 of the most impactful keywords that should appear in a resume for this role.
Only extract keywords that are actually mentioned or strongly implied in the JD.`,
      },
      {
        role: "user",
        content: `Job Description:\n\n${SAMPLE_JD}`,
      },
    ];

    const completion = await client.completeStructured(messages, JD_KEYWORDS_SCHEMA);
    const parsed = completion.parsed || parseJsonFromModel(completion.rawText) || {};
    process.stdout.write(`  Model: ${completion.model}\n`);
    process.stdout.write(`  Keywords: ${JSON.stringify(parsed.keywords)}\n`);
    process.stdout.write(`  Skills: ${JSON.stringify(parsed.skills)}\n`);
    process.stdout.write(`  Tools: ${JSON.stringify(parsed.tools)}\n`);
    process.stdout.write(`  Concepts: ${JSON.stringify(parsed.concepts)}\n`);
    return parsed;
  });

  // Step 2: Experience Point Tailoring
  await testStep("Step 2: Experience Point Tailoring", async () => {
    const messages = [
      {
        role: "system",
        content: `You are an expert ATS resume optimizer. Rewrite a single resume bullet point to naturally incorporate 1-2 JD keywords.

STRICT RULES:
1. The output MUST be exactly ${SAMPLE_POINT.wordCount} or ${SAMPLE_POINT.wordCount - 1} words.
2. Preserve the original meaning and structure.
3. Keep all LaTeX formatting commands (\\textbf{}, \\href{}, etc.) intact - they don't count as words.
4. Do NOT add new claims or experiences not in the original.
5. Use exact keywords from the JD.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          originalText: SAMPLE_POINT.original,
          originalWordCount: SAMPLE_POINT.wordCount,
          jdKeywords: [
            "TypeScript",
            "React",
            "Node.js",
            "Express",
            "PostgreSQL",
            "Docker",
            "CI/CD",
            "REST API",
            "agile",
            "Git",
          ],
          instruction: `Rewrite this bullet point to incorporate 1-2 relevant JD keywords. Output must be exactly ${SAMPLE_POINT.wordCount} or ${SAMPLE_POINT.wordCount - 1} words.`,
        }),
      },
    ];

    const completion = await client.completeStructured(messages, POINT_REWRITE_SCHEMA);
    const parsed = completion.parsed || parseJsonFromModel(completion.rawText) || {};
    const rewritten = String(parsed.rewritten || "").trim();
    const newCount = wordCount(rewritten.replace(/\\[a-zA-Z]+\{|\}/g, ""));
    process.stdout.write(`  Model: ${completion.model}\n`);
    process.stdout.write(`  Original (${SAMPLE_POINT.wordCount}w): ${SAMPLE_POINT.original.slice(0, 80)}...\n`);
    process.stdout.write(`  Rewritten (${newCount}w): ${rewritten.slice(0, 80)}...\n`);
    process.stdout.write(`  Keywords used: ${JSON.stringify(parsed.keywordsUsed)}\n`);
    process.stdout.write(`  Word count valid: ${Math.abs(newCount - SAMPLE_POINT.wordCount) <= 1}\n`);
    return parsed;
  });

  // Step 3: Skills Sub-section Reorder
  await testStep("Step 3: Skills Sub-section Reorder", async () => {
    const messages = [
      {
        role: "system",
        content: `You are an ATS resume optimizer. Reorder a skills sub-section for a resume.

RULES:
1. Reorder skills to put JD-matched ones first.
2. You may add 0-2 skills from the profile that are relevant to the JD.
3. Do NOT add unrelated skills.
4. Keep comma-separated format.
5. Return the complete ordered list.

Profile skills: ${SAMPLE_PROFILE_SKILLS.join(", ")}`,
      },
      {
        role: "user",
        content: JSON.stringify({
          category: "Frontend",
          currentSkills: SAMPLE_SKILLS,
          jdKeywords: ["React", "Next.js", "Angular", "TypeScript", "Docker"],
          instruction:
            "Reorder to prioritize JD-matched skills. Add 0-2 relevant profile skills.",
        }),
      },
    ];

    const completion = await client.completeStructured(messages, SKILLS_REORDER_SCHEMA);
    const parsed = completion.parsed || parseJsonFromModel(completion.rawText) || {};
    process.stdout.write(`  Model: ${completion.model}\n`);
    process.stdout.write(`  Original: ${SAMPLE_SKILLS.join(", ")}\n`);
    process.stdout.write(`  Reordered: ${JSON.stringify(parsed.orderedSkills)}\n`);
    return parsed;
  });

  // Step 4: LaTeX template parsing
  await testStep("Step 4: LaTeX template parsing", async () => {
    const templatePath = path.resolve(__dirname, "..", "profile-data", "Mohd_Haroon_Resume.tex");
    const template = await fs.readFile(templatePath, "utf8");

    const items = [];
    const marker = "\\resumeItem{";
    let offset = 0;
    while (offset < template.length) {
      const start = template.indexOf(marker, offset);
      if (start === -1) break;
      const contentStart = start + marker.length;
      let depth = 1;
      let cursor = contentStart;
      while (cursor < template.length && depth > 0) {
        const char = template[cursor];
        const previous = template[cursor - 1];
        if (char === "{" && previous !== "\\") depth += 1;
        else if (char === "}" && previous !== "\\") depth -= 1;
        cursor += 1;
      }
      if (depth !== 0) break;
      const original = template.slice(contentStart, cursor - 1).trim();
      const wc = wordCount(original.replace(/\\[a-zA-Z]+\{|\}/g, ""));
      items.push({ index: items.length, wordCount: wc, original: original.slice(0, 60) + "..." });
      offset = cursor;
    }

    const skillLines = [];
    const regex = /\\textbf\{([^}]+)\}\{:([^}]+)\}/g;
    let match;
    while ((match = regex.exec(template)) !== null) {
      skillLines.push({
        category: match[1].trim(),
        skillCount: match[2].trim().split(/,\s*/).length,
      });
    }

    process.stdout.write(`  Found ${items.length} resume items\n`);
    for (const item of items) {
      process.stdout.write(`    [${item.index}] ${item.wordCount}w: ${item.original}\n`);
    }
    process.stdout.write(`  Found ${skillLines.length} skill sub-sections\n`);
    for (const line of skillLines) {
      process.stdout.write(`    ${line.category}: ${line.skillCount} skills\n`);
    }
    return { items, skillLines };
  });

  process.stdout.write("\n=== All tests complete ===\n");
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error.message}\n${error.stack}\n`);
  process.exit(1);
});
