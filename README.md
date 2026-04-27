# Applied — Smart Job Application Assistant

![Applied Logo](extension/logo.svg)

A privacy-first, AI-powered browser extension for one-click job applications.

### Tech Stack
`JavaScript` `Node.js` `Express` `AI/LLM` `Browser Extensions`

## Key Features

- **Structural Matching:** High-accuracy field detection for Greenhouse, Lever, Ashby, and Workday.
- **Hybrid Resolver:** Fast deterministic matching + advanced AI (GitHub Models) for complex fields.
- **Local Proxy:** Your sensitive data stays on your machine.
- **Duplicate Prevention:** Detects prior applications automatically.
- **Knowledge Memory:** Learns from your previous answers.

## Compatibility
- **Firefox:** Fully supported (Manifest V2).
- **Chrome:** Supported (Manifest V2, Developer Mode).

## Getting Started

### 1. Prerequisites
- Node.js 18+
- [GitHub Token](https://github.com/settings/tokens) (Optional, for AI features)

### 2. Setup Proxy
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env # Add your GITHUB_TOKEN here

# Start the proxy
npm start
```

### 3. Install Extension
1. Open your browser's Extensions page.
2. Enable **Developer Mode**.
3. Click **Load Unpacked** and select the `extension/` folder.

## Profile Configuration

Place your resume (`.pdf`) and professional details (`profile.v2.json`) in the `profile-data/` directory.

## Privacy

Applied is designed with privacy as a priority. All personal data is stored locally. AI resolution is opt-in and anonymizes data before processing.

---
Built with ❤️ for job seekers.
