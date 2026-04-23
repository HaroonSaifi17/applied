# Greenhouse AI Autofill (Firefox + localhost proxy)

This project gives you a Firefox extension that fills Greenhouse job applications using:

- deterministic field mapping from your local profile data
- AI for unresolved questions through a localhost proxy
- GitHub Models model fallback (`openai/gpt-5-mini` -> `openai/gpt-4.1` -> `openai/gpt-4o`)

No auto-submit is performed. You review and choose what to apply.

## Structure

- `extension/` Firefox WebExtension (MV3)
- `proxy/` local Node.js server that reads profile files and calls GitHub Models
- `profile-data/` your personal files (ignored by git)

## 1) Add your personal data files

Create your files directly under `profile-data/`:

- `profile-data/profile.md`
- `profile-data/answers.txt`
- `profile-data/resume.pdf`

Use `profile-data/templates/README.md` for sample format.

## 2) Configure token

1. Create a GitHub PAT with `models:read` permission.
2. Copy `.env.example` to `.env`.
3. Set your token:

```bash
GITHUB_TOKEN=ghp_...
PORT=8787
HOST=127.0.0.1
```

## 3) Install dependencies and run proxy

```bash
npm install
npm run start:proxy
```

Proxy should start on `http://127.0.0.1:8787`.

## 4) Load extension in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `extension/manifest.json`.

## 5) Use it

1. Open a Greenhouse job application page.
2. Click the extension icon.
3. Click **Scan and Suggest**.
4. Review each field suggestion.
5. Click **Apply Suggested**.

If you update files in `profile-data/`, open extension settings and click **Reload profile files**.

## Notes

- The proxy binds to localhost only for safety.
- Resume file upload fields are usually browser-protected and may require manual selection.
- Model usage can still be rate-limited by GitHub.
- Approved answers are saved locally in `proxy/data/answer-memory.json`.
