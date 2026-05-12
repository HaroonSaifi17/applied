"use strict";

const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const { parseJsonFromModel } = require("./text-utils");

const PROFILE_DIR = path.resolve(__dirname, "..", "..", "profile-data");
const TEMPLATE_PATH = path.join(PROFILE_DIR, "Mohd_Haroon_Resume.tex");
const OUTPUT_ROOT = path.join(PROFILE_DIR, "generated-resumes");
const TEMP_DIR = path.join(OUTPUT_ROOT, "temp");
const PDF_DIR = path.join(OUTPUT_ROOT, "pdf");

const RESPONSE_SCHEMA = {
  name: "targeted_resume_rewrite",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      rewrites: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            index: { type: "number" },
            text: { type: "string" },
            reason: { type: "string" },
          },
          required: ["index", "text", "reason"],
        },
      },
    },
    required: ["rewrites"],
  },
};

function slugify(value) {
  return String(value || "job")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "job";
}

function wordCount(value) {
  const words = String(value || "").match(/[A-Za-z0-9+#.%-]+/g);
  return words ? words.length : 0;
}

function escapeLatexText(value) {
  return String(value || "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([#$%&_{}])/g, "\\$1")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/~/g, "\\textasciitilde{}");
}

function protectLatexFormatting(value) {
  return escapeLatexText(value)
    .replace(/\\textbackslash\{\}textbf\\\{([^{}]+)\\\}/g, "\\textbf{$1}")
    .replace(/\\textbackslash\{\}href\\\{([^{}]+)\\\}\\\{([^{}]+)\\\}/g, "\\href{$1}{$2}")
    .replace(/\\textbackslash\{\}hfill/g, "\\hfill");
}

function extractResumeItems(tex) {
  const items = [];
  const marker = "\\resumeItem{";
  let offset = 0;

  while (offset < tex.length) {
    const start = tex.indexOf(marker, offset);
    if (start === -1) {
      break;
    }

    const contentStart = start + marker.length;
    let depth = 1;
    let cursor = contentStart;
    while (cursor < tex.length && depth > 0) {
      const char = tex[cursor];
      const previous = tex[cursor - 1];
      if (char === "{" && previous !== "\\") {
        depth += 1;
      } else if (char === "}" && previous !== "\\") {
        depth -= 1;
      }
      cursor += 1;
    }

    if (depth !== 0) {
      break;
    }

    const original = tex.slice(contentStart, cursor - 1).trim();
    items.push({
      index: items.length,
      original,
      wordCount: wordCount(original.replace(/\\[a-zA-Z]+\{|\}/g, "")),
      start,
      end: cursor,
    });
    offset = cursor;
  }
  return items;
}

function replaceResumeItems(tex, items, rewrites) {
  const rewriteByIndex = new Map(rewrites.map((entry) => [entry.index, entry.text]));
  let output = "";
  let cursor = 0;

  for (const item of items) {
    output += tex.slice(cursor, item.start);
    if (rewriteByIndex.has(item.index)) {
      output += `\\resumeItem{${protectLatexFormatting(rewriteByIndex.get(item.index))}}`;
    } else {
      output += tex.slice(item.start, item.end);
    }
    cursor = item.end;
  }

  output += tex.slice(cursor);
  return output;
}

function buildMessages(profile, context, items) {
  const job = {
    title: context.title || "",
    company: context.company || "",
    description: String(context.description || "").slice(0, 12000),
  };

  const payload = {
    job,
    candidateFacts: profile.facts || {},
    rules: [
      "Rewrite only resume bullets that can be truthfully improved using existing candidate facts.",
      "Do not invent employers, metrics, tools, years, degrees, links, or outcomes.",
      "Preserve each bullet meaning and keep each rewritten bullet within originalWordCount plus or minus one word.",
      "Prefer exact job-description keywords where truthful and natural.",
      "Return plain text bullet content only, with no leading bullet marker.",
    ],
    bullets: items.map((item) => ({
      index: item.index,
      originalWordCount: item.wordCount,
      text: item.original,
    })),
  };

  return [
    {
      role: "system",
      content: "You tailor LaTeX resume bullet text for ATS matching while preserving truth and strict word-count limits. Return strict JSON.",
    },
    {
      role: "user",
      content: JSON.stringify(payload),
    },
  ];
}

function normalizeRewrites(items, rawRewrites) {
  const itemByIndex = new Map(items.map((item) => [item.index, item]));
  const accepted = [];

  for (const rewrite of Array.isArray(rawRewrites) ? rawRewrites : []) {
    const index = Number(rewrite && rewrite.index);
    const item = itemByIndex.get(index);
    const text = String(rewrite && rewrite.text ? rewrite.text : "").trim();
    if (!item || !text) {
      continue;
    }

    const count = wordCount(text);
    if (Math.abs(count - item.wordCount) > 1) {
      continue;
    }

    accepted.push({
      index,
      text,
      reason: String(rewrite.reason || "").slice(0, 240),
    });
  }

  return accepted;
}

function runCommand(command, args, options) {
  return new Promise((resolve) => {
    const child = spawn(command, args, options);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ ok: false, error: error.message, stdout, stderr });
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

async function findLatexCompiler() {
  for (const command of ["pdflatex", "tectonic", "xelatex"]) {
    const result = await runCommand(command, ["--version"], { cwd: PROFILE_DIR });
    if (result.ok) {
      return command;
    }
  }
  return "";
}

async function compileLatex(texPath, outputDir) {
  const compiler = await findLatexCompiler();
  if (!compiler) {
    return {
      ok: false,
      warning: "No LaTeX compiler found. Install pdflatex, xelatex, or tectonic to produce PDFs.",
    };
  }

  const args = compiler === "tectonic"
    ? ["--outdir", outputDir, texPath]
    : ["-interaction=nonstopmode", "-halt-on-error", "-output-directory", outputDir, texPath];

  const result = await runCommand(compiler, args, { cwd: outputDir });
  return {
    ok: result.ok,
    compiler,
    warning: result.ok ? "" : (result.stderr || result.stdout || "LaTeX compilation failed.").slice(0, 1000),
  };
}

async function tailorResumeForJob(client, profile, context) {
  const description = String(context && context.description ? context.description : "").trim();
  if (!client || description.length < 80) {
    return {
      ok: false,
      skipped: true,
      warning: "Resume tailoring skipped because job description or AI client is unavailable.",
    };
  }

  const template = await fs.readFile(TEMPLATE_PATH, "utf8");
  const items = extractResumeItems(template);
  if (!items.length) {
    return {
      ok: false,
      warning: "No \\resumeItem bullets found in LaTeX template.",
    };
  }

  const completion = await client.completeStructured(buildMessages(profile, context, items), RESPONSE_SCHEMA);
  const parsed = completion.parsed || parseJsonFromModel(completion.rawText) || {};
  const rewrites = normalizeRewrites(items, parsed.rewrites);
  const tailored = replaceResumeItems(template, items, rewrites);

  await fs.mkdir(TEMP_DIR, { recursive: true });
  await fs.mkdir(PDF_DIR, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `${slugify(context.company)}-${slugify(context.title)}-${stamp}`;
  const texPath = path.join(TEMP_DIR, `${baseName}.tex`);
  await fs.writeFile(texPath, tailored, "utf8");

  const compile = await compileLatex(texPath, PDF_DIR);
  const pdfPath = path.join(PDF_DIR, `${baseName}.pdf`);

  return {
    ok: true,
    model: completion.model,
    rewriteCount: rewrites.length,
    texPath,
    pdfPath: compile.ok ? pdfPath : "",
    compile,
  };
}

module.exports = {
  extractResumeItems,
  normalizeRewrites,
  tailorResumeForJob,
  wordCount,
};
