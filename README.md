# Job Autofill Pro

<p align="center">
  <a href="https://github.com/HaroonSaifi17/job-autofill-pro/releases/latest">
    <img src="https://img.shields.io/github/v/release/HaroonSaifi17/job-autofill-pro?include_prereleases&label=version" alt="Version">
  </a>
  <a href="https://github.com/HaroonSaifi17/job-autofill-pro/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/HaroonSaifi17/job-autofill-pro" alt="License">
  </a>
  <a href="https://github.com/HaroonSaifi17/job-autofill-pro/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/HaroonSaifi17/job-autofill-pro/test.yml?branch=master" alt="Build">
  </a>
</p>

A privacy-first browser extension that automatically fills job application forms using your profile data. Your information never leaves your device.

<p align="center">
  <img src="https://placehold.co/600x120/1a1a2e/00d9ff?text=Job+Autofill+Pro" alt="Demo">
</p>

## Why This Project?

- **Zero Cloud Storage** — Your resume, personal details, and answers never leave your machine
- **Smart Field Matching** — Combines deterministic rules + AI for accurate field detection
- **Multi-Platform Support** — Works with Greenhouse, Lever, Ashby, Workday, and custom forms
- **Application History** — Tracks where you've applied to avoid duplicate submissions
- **Open Source** — Inspect the code, contribute, or fork for your own needs

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Profile Data Format](#profile-data-format)
- [Usage](#usage)
- [Supported Platforms](#supported-platforms)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Quick Start

```bash
# 1. Clone and install dependencies
git clone https://github.com/HaroonSaifi17/job-autofill-pro.git
cd job-autofill-pro
npm install

# 2. Configure your profile (edit profile-data/profile.v2.json)
# 3. Start the local AI proxy (optional but recommended)
npm run start:proxy

# 4. Load the extension in Firefox/Chrome
#    - Firefox: about:debugging → Load Temporary Add-on → manifest.json
#    - Chrome:  chrome://extensions → Developer mode → Load unpacked
```

---

## Features

### Core Functionality

| Feature | Description |
|---------|-------------|
| **One-Click Fill** | Fill all form fields with a single click |
| **Smart Field Detection** | Automatically identifies input, select, radio, checkbox fields |
| **Custom Select Handling** | Supports React Select, Greenhouse, Ashby, Workday dropdowns |
| **Dual Resolution** | Deterministic (rule-based) + AI-powered matching |
| **Application History** | Remembers where you've applied to prevent duplicates |
| **Privacy-First** | All processing happens locally — no external servers |

### Advanced Capabilities

- **Context-Aware Matching** — Uses job title/company to distinguish similar postings
- **Confidence Scoring** — Only suggests high-confidence matches
- **Answer Memory** — Remembers manual corrections for future forms
- **Submit Detection** — Records applications only after successful form submission
- **Resilient Field IDs** — Stable field identification survives DOM re-renders

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Job Autofill Pro                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌────────────────────────────────────┐  │
│  │   Your Profile   │     │         Browser Extension          │  │
│  │  (profile-data/) │────▶│  ┌─────────────┐  ┌─────────────┐ │  │
│  │                  │     │  │  Background │  │  Content    │ │  │
│  │  • profile.json  │     │  │  Script     │──│  Script     │ │  │
│  │  • answers.txt  │     │  │             │  │             │ │  │
│  │  • resume.pdf   │     │  └─────────────┘  └─────────────┘ │  │
│  └──────────────────┘     └────────────────────────────────────┘  │
│                                    │                                 │
│                                    ▼                                 │
│                         ┌──────────────────────┐                    │
│                         │   Local AI Proxy    │                    │
│                         │    (Express.js)     │                    │
│                         │                      │                    │
│                         │  ┌───────────────┐  │                    │
│                         │  │  Deterministic │  │                    │
│                         │  │  Resolver      │  │                    │
│                         │  └───────────────┘  │                    │
│                         │  ┌───────────────┐  │                    │
│                         │  │  AI Resolver  │  │                    │
│                         │  │ (GitHub Models)│  │                    │
│                         │  └───────────────┘  │                    │
│                         │  ┌───────────────┐  │                    │
│                         │  │  Application  │  │                    │
│                         │  │  History      │  │                    │
│                         │  └───────────────┘  │                    │
│                         └──────────────────────┘                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Overview

| Component | Responsibility |
|-----------|----------------|
| `content-script.js` | Detects forms, extracts fields, applies values |
| `background.js` | Coordinates between content script and proxy |
| `server.js` | Local Express proxy for AI resolution |
| `deterministic-resolver.js` | Rule-based field matching from profile facts |
| `ai-resolver.js` | GitHub Models API for complex field inference |
| `application-history.js` | Tracks applied jobs, prevents duplicates |
| `profile-store.js` | Parses profile files (JSON, PDF, TXT, MD) |

---

## Installation

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥18.0.0 | For running the proxy |
| npm | ≥9.0.0 | Comes with Node.js |
| Firefox | ≥109.0 | Or Chrome/Chromium ≥109 |

### Step 1: Clone the Repository

```bash
git clone https://github.com/HaroonSaifi17/job-autofill-pro.git
cd job-autofill-pro
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Your Profile

Edit `profile-data/profile.v2.json` with your details. See [Profile Data Format](#profile-data-format) for all supported fields.

### Step 4: Start the Proxy (Recommended)

The proxy enables AI-powered field resolution. Create a `.env` file:

```bash
# .env
GITHUB_TOKEN=ghp_your_github_token_here
```

Start the proxy:

```bash
npm run start:proxy
```

You should see:

```
[proxy] listening on http://127.0.0.1:8787
[proxy] profile files loaded: 3
[proxy] models: openai/gpt-5-mini, openai/gpt-4.1, openai/gpt-4o
```

> **Note**: Without `GITHUB_TOKEN`, the extension falls back to deterministic-only matching.

### Step 5: Load the Extension

#### Firefox

1. Open `about:debugging`
2. Click **This Firefox** → **Temporary Add-on**
3. Select `extension/manifest.json`

#### Chrome/Chromium

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` directory

---

## Configuration

### Extension Settings

Access via extension popup or `about:addons` → Job Autofill Pro → Settings:

| Setting | Default | Description |
|---------|---------|-------------|
| Proxy URL | `http://127.0.0.1:8787` | Local proxy endpoint |
| Confidence Threshold | `0.6` | Minimum confidence (0.1-1.0) to auto-fill |

### Environment Variables (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | No | GitHub token for AI model access |
| `HOST` | No | Proxy bind address (default: `127.0.0.1`) |
| `PORT` | No | Proxy port (default: `8787`) |

---

## Profile Data Format

Create or edit `profile-data/profile.v2.json`:

```json
{
  "fullName": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "location": "San Francisco, CA",
  "city": "San Francisco",
  "state": "CA",
  "country": "USA",
  
  "linkedInUrl": "https://linkedin.com/in/johndoe",
  "githubUrl": "https://github.com/johndoe",
  "websiteUrl": "https://johndoe.dev",
  
  "currentRole": "Senior Software Engineer",
  "currentCompany": "Tech Corp",
  "totalExperience": "5",
  "codingExperience": "5",
  "noticePeriod": "2 weeks",
  
  "degree": "Bachelor of Science in Computer Science",
  "university": "Stanford University",
  "graduationYear": "2019",
  
  "technicalSkills": "JavaScript, TypeScript, React, Node.js, Python, PostgreSQL",
  "projects": "Built a real-time collaboration tool using WebSockets and React...",
  "achievements": "Won first place in internal hackathon 2022...",
  
  "workAuthorization": true,
  "needsSponsorship": false,
  "willingToRelocate": true,
  
  "aboutYou": "Passionate software engineer with 5 years of experience...",
  "strengths": "Problem-solving, team leadership, rapid learning",
  "weaknesses": "Sometimes over-engineer solutions",
  "whyHireYou": "I bring a unique combination of frontend and backend skills...",
  "hobbies": "Open source contributions, hiking, photography"
}
```

### Supported Profile Fields

| Category | Fields |
|----------|--------|
| **Identity** | fullName, firstName, lastName, email, phone |
| **Location** | location, city, state, country |
| **Links** | linkedInUrl, githubUrl, websiteUrl |
| **Experience** | currentRole, currentCompany, totalExperience, codingExperience, noticePeriod |
| **Education** | degree, university, graduationYear, cgpa |
| **Skills** | technicalSkills, typescriptExperience, javascriptExperience, nodeExperience, llmExperience |
| **Background** | aboutYou, projects, achievements, strengths, weaknesses, whyHireYou, hobbies |
| **Authorization** | workAuthorization, needsSponsorship, willingToRelocate |
| **Compensation** | currentCTC, salaryExpectation |

---

## Usage

### First-Time Setup

1. Start the proxy: `npm run start:proxy`
2. Load the extension in your browser
3. Configure your profile in `profile-data/profile.v2.json`
4. Click the extension icon in your toolbar to activate

### Filling a Form

1. Navigate to a job application page (Greenhouse, Lever, etc.)
2. The extension detects supported forms automatically
3. Click the **Fill** button in the floating overlay
4. Fields are populated based on:
   - Deterministic match (profile facts)
   - AI inference (for complex/custom questions)
5. Review and submit the form
6. Application is recorded automatically on submit

### Application History

The extension tracks where you've applied:

- **Duplicate Detection**: Warns if you've already applied to the same position
- **Apply Anyway**: Override duplicate warning if needed
- **View History**: Check `/application-history` endpoint or extension options

---

## Supported Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| Greenhouse | ✅ Full | Custom select support, application history |
| Lever | ✅ Full | Standard form handling |
| Ashby | ✅ Full | Custom select support |
| Workday | ⚠️ Partial | Basic input/select support |
| Custom Sites | ✅ Full | Generic autofill for unknown platforms |

---

## Troubleshooting

### Extension Not Loading

```
about:debugging → Check for errors in console
```

### Proxy Not Starting

```bash
# Check port availability
lsof -i :8787

# Or use a different port
PORT=8788 npm run start:proxy
```

### Fields Not Filling

1. **Check console**: `Ctrl+Shift+J` → Look for errors
2. **Verify profile**: Ensure `profile-data/profile.v2.json` is valid JSON
3. **Check AI token**: If using AI features, verify `GITHUB_TOKEN` is set
4. **Supported site**: Confirm the site is in [Supported Platforms](#supported-platforms)

### False Duplicate Warnings

This was a known issue — update to the latest version. If still occurring:

1. Click **Apply Anyway** to bypass
2. The system learns from corrections
3. Check application history: `curl http://127.0.0.1:8787/application-history`

### Getting "No fields found"

- The site may use a non-standard form framework
- Try clicking directly into a form field first
- Check the browser console for JavaScript errors

---

## Development

### Project Structure

```
job-autofill-pro/
├── extension/                 # Browser extension
│   ├── manifest.json       # Extension manifest
│   ├── background.js       # Background service worker
│   ├── content-script.js   # Page injection script
│   ├── overlay.css         # UI styles
│   └── options/            # Options page
│
├── proxy/                   # Local AI proxy server
│   ├── server.js           # Express app entry point
│   └── lib/               # Core modules
│       ├── ai-resolver.js         # AI-powered field matching
│       ├── deterministic-resolver.js # Rule-based matching
│       ├── application-history.js  # Job application tracking
│       ├── profile-store.js        # Profile file parsing
│       ├── request-sanitizers.js   # Input validation
│       └── resolve-cache.js       # Response caching
│
├── profile-data/            # Your profile files
│   ├── profile.v2.json    # Main profile (JSON)
│   ├── answers.v2.txt    # Q&A pairs (TXT)
│   └── *.pdf              # Resume, cover letter
│
└── tests/                   # Test suite
    └── *.test.js
```

### Running Tests

```bash
npm test
```

### Development Workflow

```bash
# Watch mode for proxy
npm run dev:proxy

# Reload extension in browser after changes
# Firefox: about:debugging → Reload button
# Chrome: Extension card → Reload icon
```

---

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

### Quick Start

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/job-autofill-pro.git`
3. **Create** a feature branch: `git checkout -b feature/amazing-feature`
4. **Make** your changes
5. **Test** with `npm test`
6. **Commit** with clear messages: `git commit -m "Add amazing feature"`
7. **Push**: `git push origin feature/amazing-feature`
8. **Open** a Pull Request

### Coding Standards

- Use **Vanilla JavaScript** (no frameworks in extension)
- 2-space indentation
- ESLint-compatible style
- Include tests for new features

---

## Security

### Data Privacy

- **Local Processing**: All data stays on your machine
- **No Telemetry**: No analytics or tracking
- **No External Calls**: Except to GitHub Models API (when configured)

### Best Practices

1. **Don't commit secrets**: Add `.env` to `.gitignore`
2. **Validate input**: All user data is sanitized server-side
3. **HTTPS only**: Proxy only binds to localhost

### Reporting Security Issues

Please report vulnerabilities via GitHub Issues or contact maintainers directly. We'll respond within 48 hours.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

### What This Means

- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ❌ No liability
- ❌ No warranty

---

## Credits

- **Author**: [Haroon Saifi](https://github.com/HaroonSaifi17)
- **Inspiration**: GitHub Copilot, LinkedIn Easy Apply extensions
- **AI Models**: [GitHub Models](https://github.com/marketplace/models) (GPT-4o, GPT-4.1)

---

## FAQ

### Q: Is my data safe?

**A**: Yes. All processing happens locally on your machine. The extension never sends your resume or personal information to any external server (except the optional GitHub Models API which processes requests anonymously).

### Q: Which browsers are supported?

**A**: Firefox (primary) and Chrome/Chromium. The extension uses Manifest V3.

### Q: Do I need the proxy?

**A**: No, but recommended. Without the proxy, only deterministic (rule-based) field matching is available. The proxy adds AI-powered inference for complex/custom form questions.

### Q: How do I get a GitHub Token?

**A**: 
1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Generate new token (Classic)
3. Select `read:models` scope
4. Copy token to `.env` file

### Q: Can I use this for commercial purposes?

**A**: Yes, under the MIT license. See [License](#license) for details.

---

<p align="center">
  <strong>Made with ❤️ for job seekers everywhere</strong>
</p>
