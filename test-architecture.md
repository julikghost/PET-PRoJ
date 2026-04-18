# Test Architecture

This document outlines the architecture for the testing framework utilized in our project, which includes various components such as test scenarios, specifications, and utilities.

```mermaid
graph TD

A[Test Scenarios] --> B[Test Specs (Playwright)]
B --> C[Page Objects Layer]
C --> D[UI Actions / API Clients]
D --> E[Application Under Test]

B --> F[Assertions Layer]
F --> G[Test Results]

C --> H[Utils / Helpers]
D --> H

B --> I[Test Data]
I --> D

G --> J[Reports (HTML / CI artifacts)]
J --> K[CI/CD Pipeline (GitHub Actions / GitLab CI)]

K --> B
```