# 🧪 QA Automation Project (Playwright + TypeScript)

## 📌 Overview

This project is a QA automation practice framework built to demonstrate skills in modern test automation using Playwright (TypeScript).

It simulates real-world QA tasks such as UI testing, API validation, and regression scenarios, with a focus on maintainability, scalability, and clear test structure.

The goal of this project is to showcase practical automation engineering skills beyond basic test scripts.

---

## ⚙️ Tech Stack

- **Playwright** - Modern cross-browser testing framework
- **TypeScript** - Type-safe test scripts
- **Node.js** - Runtime environment
- **REST / GraphQL API** - API testing capabilities
- **GitHub Actions** - CI/CD integration
- **Page Object Model (POM)** - Scalable architecture pattern

---

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Steps

1. Clone the repository
   ```bash
   git clone https://github.com/julikghost/PET-PRoJ.git
   cd PET-PRoJ
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Install Playwright browsers
   ```bash
   npx playwright install
   ```

4. (Optional) Configure environment variables
   ```bash
   cp .env.example .env
   ```

---

## ▶️ Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test tests/ui/login.spec.ts
```

### Run with UI mode (interactive)
```bash
npx playwright test --ui
```

### Run in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run specific project/browser
```bash
npx playwright test --project=chromium
```

### Run with verbose output
```bash
npx playwright test --reporter=verbose
```

---

## 📁 Project Structure

```
PET-PRoJ/
├── src/
│   ├── pages/              # Page Object Model classes
│   ├── utils/              # Helper functions & test utilities
│   ├── config/             # Configuration files
│   └── fixtures/           # Test data & fixtures
├── tests/
│   ├── auth/               # Authentication & session setup
│   ├── ui/                 # UI automation tests
│   ├── api/                # API automation tests
│   ├── logistics/          # Business flow scenarios
│   └── smoke/              # Smoke test scenarios
├── pageObjects/            # Reusable page object definitions
├── pet-app/                # Demo React + Vite UI application
├── .github/workflows/      # CI/CD pipeline configurations
├── playwright.config.ts    # Playwright configuration
├── package.json            # Dependencies & scripts
└── README.md               # This file
```

---

## 🧩 What is Covered

### UI Automation
- Functional UI testing
- Regression & smoke test scenarios
- Cross-browser execution support
- Stable selectors & reusable components
- Role-based testing scenarios

### API Testing
- REST API validation
- GraphQL queries testing
- Response validation & schema checks
- Negative scenarios handling
- Payload verification

### Test Design
- Structured test cases following best practices
- Separation of test logic and page objects
- Reusable test utilities and fixtures
- Clean and maintainable architecture
- Data-driven testing approach

---

## 📊 Key Focus Areas

- ✅ Test stability and maintainability
- ✅ Real-world QA workflows
- ✅ Separation of concerns (tests / pages / utils)
- ✅ Scalable structure for future extension
- ✅ Reliable regression execution
- ✅ Clear test documentation

---

## ⚙️ Configuration

Key configuration in `playwright.config.ts`:

- **Browser selection** - Chromium, Firefox, WebKit
- **Base URL** - Target application URL
- **Timeout settings** - Global and per-test timeouts
- **Screenshots & Videos** - Captured on failure
- **Test workers** - Parallel execution control
- **Reporter options** - HTML, JSON, JUnit formats

Example custom configuration:
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
});
```

---

## 🔄 CI/CD Integration

Tests run automatically via **GitHub Actions** on:
- Push to `main` / `develop` branches
- Pull requests
- Manual trigger (workflow_dispatch)

### Workflow Features
- Automated test runs on push / PR
- Regression execution in pipeline
- Detailed test reporting and artifacts
- Cross-browser validation

See `.github/workflows/` for complete configurations.

---

## 📈 Test Reports

### View HTML Reports
```bash
npx playwright show-report
```

Reports include:
- Test execution timeline
- Pass/fail status with error details
- Screenshots and videos on failure
- Detailed trace logs

### Generate Specific Report Format
```bash
# JSON report
npx playwright test --reporter=json > results.json

# JUnit report (for CI integrations)
npx playwright test --reporter=junit
```

---

## 🎯 Purpose of the Project

This project was created to:

- ✨ Strengthen QA automation skills in Playwright + TypeScript
- 🏗️ Practice real-world test architecture patterns
- 🔄 Simulate regression and API testing workflows
- 📚 Build a portfolio-ready automation framework
- 💡 Demonstrate best practices in test design

---

## 🔧 Troubleshooting

### Tests not running
- Ensure Node.js v16+ is installed: `node --version`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Reinstall Playwright: `npx playwright install`

### Browser issues
- Clear Playwright cache: `npx playwright install --with-deps`
- Run in debug mode: `npx playwright test --debug`

### Port conflicts (pet-app)
- Check port usage: `lsof -i :5173` (macOS/Linux)
- Set custom port: `PET_DEV_PORT=5174 npm run dev`

### Stale session
- Delete session file: `rm storageState/session.json`
- Re-run authentication setup: `npx playwright test --project=logistics_session`

---

## 📚 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is open source and available under the MIT License.

---

## 👩‍💻 Author

**Yuliya Klepusevich**  
QA Engineer | Automation (Playwright, TypeScript)

- 🔗 **GitHub**: https://github.com/julikghost/PET-PRoJ
- 🔗 **LinkedIn**: https://linkedin.com/in/yuliya-klepusevich

---

## 📌 Notes

This is a learning/portfolio project and is continuously evolving as new automation practices and tools are explored. Feedback and suggestions are welcome!