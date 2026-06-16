# Applied - Smart Job Application Assistant

![Applied Logo](extension/logo.svg)

Applied is a privacy-first browser extension that helps autofill job application forms using a local proxy with deterministic rules and optional AI.

## Tech Stack

`JavaScript` `Node.js` `Express` `Browser Extension` `AI/LLM`

## Key Features

- **Hybrid resolver:** deterministic mapping first, AI only for unresolved fields.
- **Low-latency caching:** response cache plus in-flight deduplication for repeated clicks.
- **Answer memory:** remembers approved answers and reuses them on matching fields.
- **Duplicate application guard:** tracks submitted applications and warns before reapplying.
- **Local-first architecture:** proxy runs on localhost; profile data stays local.

## Browser Support

- **Firefox:** fully supported (Manifest V2).
- **Chrome/Chromium:** supported in Developer Mode.

## ATS Support Matrix

Coverage is based on real-world testing against live ATS application forms.

| ATS / Site      | Support Level | Fill Rate (Real Forms) | Notes                                                              |
| --------------- | ------------- | ---------------------- | ------------------------------------------------------------------ |
| Greenhouse      | High          | 86.7%                  | 17 fields extracted from live Form Bio application.                |
| Lever           | Complete      | 100%                   | 19 fields extracted from live Enveda/Life.Church applications.     |
| Ashby           | Medium-High   | 66.7%                  | 6 fields extracted from live Cognition/Brellium applications.      |
| Workday         | Medium-High   | 84.6%                  | Async prompt/dropdown handling supported.                          |
| LinkedIn Jobs   | Medium        | 90.0%                  | Common Easy Apply fields supported.                                |
| SmartRecruiters | Medium        | 80.0%                  | Common text/select/radio flows supported.                          |
| Indeed          | Medium        | 77.8%                  | Common text/select/radio flows supported.                          |
| Workable        | Medium-High   | 80.0%                  | 11 fields extracted from live Walaris application.                 |
| BambooHR        | High          | 90.9%                  | Strong coverage on standard fields.                                |

**Overall deterministic fill rate: 83.5%** across all 9 ATS platforms (97 fields, 81 filled).

## User Flow

1. Start the local proxy with `npm run start:proxy`.
2. Open a supported job application page. The extension auto-triggers the Applied widget.
3. Click **Fill application**.
4. Applied scans the form and job description, resolves answers locally/with AI, fills approved fields, and creates a tailored resume from `profile-data/Mohd_Haroon_Resume.tex`.
5. Attach the generated resume from `profile-data/generated-resumes/pdf/`. If no LaTeX compiler is installed, use the generated `.tex` from `profile-data/generated-resumes/temp/`.

Resume tailoring preserves truthfulness and enforces each rewritten bullet to stay within the original bullet word count plus or minus one word.

## Getting Started

### 1) Prerequisites

- Node.js 18+
- [Groq API key](https://console.groq.com/) (optional; required only for AI resolver)

### 2) Setup Proxy

```bash
npm install
cp .env.example .env
# add GROQ_API_KEY in .env if you want AI resolution
npm run start:proxy
```

### 3) Install Extension

1. Open your browser extensions page.
2. Enable **Developer Mode**.
3. Click **Load Unpacked** and select `extension/`.

## Profile Data

Put your structured profile files in `profile-data/`:

- `profile.v2.json` (primary profile facts)
- `answers.v2.txt` (optional answer bank for long-form responses)
- `Mohd_Haroon_Resume.tex` (LaTeX resume template used for job-specific resume generation)

Then reload profile data from the extension UI or call the proxy reload endpoint.

## Testing

Run the full test suite:

```bash
npm test
```

### Test Coverage

- **209 unit tests** across 7 test files
- **68 ATS simulation tests** covering all 9 supported platforms
- **53 deterministic resolver tests** for field mapping accuracy
- **Real-world validation** against live Greenhouse, Lever, Ashby, and Workable application forms

### Running Simulations

```bash
# Run the full ATS simulation
node scripts/simulate-autofill.js

# Test resolver against real extracted fields
node scripts/test-real-resolver.js
```

## Architecture

```
extension/          # Browser extension (Manifest V2)
  content-script.js # Field extraction, DOM manipulation, autofill
  background.js     # Service worker, message routing
  overlay.css       # UI styling
  options/          # Extension options page

proxy/              # Local Node.js proxy server
  server.js         # Express server, API endpoints
  lib/
    deterministic-resolver.js  # Rule-based field-to-fact mapping
    ai-resolver.js             # Groq AI-powered field resolution
    groq-client.js             # Groq API client with retry logic
    profile-store.js           # Profile loading and fact extraction
    text-utils.js              # Text normalization, option matching
    suggestion-merge.js        # Merge deterministic + AI suggestions
    retrieval.js               # Context ranking and chunk retrieval
    request-sanitizers.js      # Input sanitization
    answer-memory.js           # Persistent answer cache

tests/              # Node.js test suite
scripts/            # Development and testing scripts
profile-data/       # User profile data (local only)
```

## Privacy

Personal data remains local to your machine. AI usage is optional and controlled by your proxy configuration.
