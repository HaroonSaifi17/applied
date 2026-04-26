# Job Autofill Pro

A browser extension that automatically fills job application forms using your profile data. Built with privacy in mind - your data stays local and is only used to fill forms on your device.

## Features

- **Automatic Form Filling**: One-click autofill for job application forms
- **Smart Field Detection**: Automatically detects and fills:
  - Personal info (name, email, phone)
  - Experience details (years, current role, company)
  - Education (degree, university, graduation year)
  - Skills and links (GitHub, LinkedIn, portfolio)
  - Custom questions (Yes/No options, dropdowns, radio buttons)

- **Multi-Site Support**: Works with popular job boards including:
  - Greenhouse (boards.greenhouse.io)
  - Lever (lever.co)
  - And many more

- **React Select Handling**: Properly handles custom dropdown components used by modern job sites
- **Numeric Value Mapping**: Correctly maps "Yes"/"No" to numeric values (1/0) as required by some forms

- **Privacy-First**: Your profile data stays on your device

## Supported Job Boards

| Platform | Status | Notes |
|----------|--------|-------|
| Greenhouse | Supported | Full support including custom selects |
| Lever | Supported | Standard input handling |
| Workday | Partial | Basic field support |
| Ashby | Supported | Standard support |
| Custom Sites | Supported | Generic autofill |

## Installation

### Development/Testing

1. Clone the repository:
```bash
git clone https://github.com/HaroonSaifi17/job-autofill-pro.git
cd job-autofill-pro
```

2. Load in Firefox:
   - Go to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select `extension/manifest.json`

### Building for Production

1. Package the extension:
```bash
cd extension
zip -r ../job-autofill-pro.zip *
```

2. Load in Firefox:
   - Go to `about:addons`
   - Click gear icon → "Install Add-on From File"
   - Select the zip file

## Usage

1. **Configure your profile**: Edit `profile-data/profile.v2.json` with your details

2. **Fill a form**: 
   - Navigate to a job application page
   - Click the extension icon in toolbar
   - Click "Fill" to autofill all fields

### Profile Data Format

```json
{
  "fullName": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "linkedInUrl": "https://linkedin.com/in/johndoe",
  "githubUrl": "https://github.com/johndoe",
  "websiteUrl": "https://johndoe.dev",
  "location": "New York",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "currentRole": "Software Engineer",
  "totalExperience": "5",
  "codingExperience": "5",
  "noticePeriod": "Immediate",
  "currentCTC": "100000",
  "expectedCTC": "150000"
}
```

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User Profile   │────>│  Content Script │────>│  Job Form       │
│  (JSON file)    │     │  (Browser Ext)   │     │  (Target Site) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              v
                       ┌──────────────────┐
                       │  AI Resolver     │
                       │  (Local Proxy)   │
                       └──────────────────┘
```

1. **Field Detection**: Scans the page for form elements (inputs, selects, radio buttons)
2. **Field Mapping**: Uses the resolver to match profile fields to form fields
3. **Smart Filling**: 
   - Native inputs: Direct value setting + events
   - React/Select components: Bypassing React state + proper events
   - Greenhouse selects: Sets both display and hidden inputs

## API Integration (Optional)

The extension can optionally use a local AI proxy for better field matching:

1. Start the local proxy:
```bash
npm install
npm run start:proxy
```

2. Configure in extension (optional)

## Tech Stack

- **JavaScript**: Vanilla JS (no framework dependencies)
- **Browser APIs**: Web Extensions API
- **Styling**: CSS

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by tools like GitHub Copilot and similar autofill extensions
- Greenhouse select handling based on React state management patterns