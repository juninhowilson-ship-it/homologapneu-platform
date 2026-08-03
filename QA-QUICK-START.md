# QA Testing - Quick Start Guide

## Installation

### 1. Install Dependencies

```bash
# Unit Testing
npm install --save-dev jest @testing-library/react @testing-library/jest-dom ts-jest @types/jest ts-node

# E2E Testing
npm install --save-dev cypress @cypress/code-coverage @testing-library/cypress axe-core @axe-core/react

# Performance Testing
npm install --save-dev lighthouse chrome-launcher

# Code Coverage
npm install --save-dev nyc
```

### 2. Verify Installation

```bash
npm test -- --version
npx cypress --version
```

---

## Running Tests

### Unit Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm test:coverage

# Watch mode (auto-rerun on changes)
npm test:watch

# Run specific test file
npm test -- services/__tests__/homologacoes.test.ts

# Run matching pattern
npm test -- --testNamePattern="homologação"
```

**Coverage Target**: 80% minimum  
**Report Location**: `coverage/lcov-report/index.html`

### E2E Tests

```bash
# Open Cypress UI (interactive)
npm run cypress:open

# Run headless (CI/CD)
npm run cypress:run

# Run mobile tests (iPhone X)
npm run cypress:run:mobile

# Run specific spec
npm run cypress:run -- --spec "cypress/e2e/happy-path.cy.ts"

# Record to Cypress Cloud (requires token)
npm run cypress:run -- --record --key xxx
```

**Test Duration**: ~5-10 minutes per run

### Performance Tests

```bash
# Run Lighthouse audit
npm run performance:lighthouse

# Results saved to: reports/lighthouse-*.json
```

**Targets**:
- Performance: ≥90
- Accessibility: ≥90
- Best Practices: ≥85
- SEO: ≥90
- FCP: <2s
- LCP: <2.5s

### Security Audit

```bash
# Run security checks
npm run security:audit

# Results saved to: reports/security-audit-*.json
```

**Checks**:
- npm vulnerabilities
- Exposed secrets
- CSP headers
- CORS configuration
- Authentication implementation
- Input validation
- Database security

---

## Full QA Suite (One Command)

```bash
# Runs all tests (unit, e2e, performance, security)
npm run qa:full
```

**Duration**: ~30-45 minutes  
**Requires**: Development server running (`npm run dev`)

---

## Test Data

### Login Credentials

```
Regular User:
  Email: test@example.com
  Password: Test@123

Admin User:
  Email: admin@example.com
  Password: Admin@123
```

### Sample Vehicles

| Manufacturer | Model | Year | Tire | Wheel |
|---|---|---|---|---|
| BMW | 320i | 2024 | Pirelli P7 225/45R17 | 17" 5x120 |
| Mercedes-Benz | Classe C | 2023 | Michelin Pilot 225/50R16 | 16" 5x112 |
| Audi | A4 | 2024 | Continental 215/55R17 | 17" 5x112 |

---

## CI/CD Integration

### Pre-commit Hook

```bash
#!/bin/sh
# .husky/pre-commit
npm test -- --onlyChanged --bail
```

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: QA Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run cypress:run
      - run: npm run security:audit

      - uses: codecov/codecov-action@v3
```

---

## Troubleshooting

### Tests Won't Run

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Verify config files exist
ls jest.config.js jest.setup.js cypress.config.ts
```

### Cypress Timeout

```bash
# Increase timeout in cypress.config.ts
requestTimeout: 15000
defaultCommandTimeout: 10000

# Or run with flag
npm run cypress:run -- --config requestTimeout=20000
```

### Lighthouse Can't Connect

```bash
# Ensure dev server is running in separate terminal
npm run dev

# Then run lighthouse
npm run performance:lighthouse
```

### Low Coverage

```bash
# Check coverage report
open coverage/lcov-report/index.html

# Run tests with verbose output
npm test -- --verbose --coverage --collectCoverageFrom='services/**/*.ts'
```

---

## Key Metrics

### Coverage Target

| Category | Target |
|----------|--------|
| Statements | 80% |
| Branches | 70% |
| Functions | 80% |
| Lines | 80% |
| Services | 85% |

### Performance Target

| Metric | Target |
|--------|--------|
| Lighthouse | ≥90 (all categories except PWA ≥80) |
| FCP | <2s |
| LCP | <2.5s |
| CLS | <0.1 |
| TBT | <200ms |

### Accessibility

| Standard | Coverage |
|----------|----------|
| WCAG | 2.1 Level AA |
| Keyboard Navigation | 100% |
| Screen Reader | All pages |
| Color Contrast | 4.5:1 (normal) / 3:1 (large) |

### Security

| Check | Required |
|-------|----------|
| OWASP Top 10 | All critical checks pass |
| npm audit | No critical/high vulnerabilities |
| Secret scanning | No exposed secrets |
| CSRF protection | All state-changing endpoints |
| XSS prevention | CSP + HTML escaping |

---

## Files Overview

```
project-root/
├── jest.config.js                 # Jest configuration
├── jest.setup.js                  # Test environment setup
├── cypress.config.ts              # Cypress configuration
├── cypress/
│   ├── e2e/
│   │   ├── happy-path.cy.ts       # Main user flow tests
│   │   ├── responsive-mobile.cy.ts # iPhone X tests
│   │   ├── accessibility-wcag.cy.ts # A11y tests
│   │   └── security-tests.cy.ts   # Security tests
│   └── support/
│       └── e2e.ts                # Custom commands
├── services/__tests__/
│   ├── homologacoes.test.ts       # CRUD tests
│   ├── filtros.test.ts            # Search/filter tests
│   └── ...
├── scripts/
│   ├── performance-lighthouse.js  # Performance testing
│   └── security-audit.ts          # Security audit
└── reports/                       # Test results
    ├── coverage/                  # Coverage report
    ├── lighthouse-*.json          # Lighthouse results
    └── security-audit-*.json      # Security results
```

---

## Merge Checklist

Before merging to main branch:

- [ ] Unit tests passing: `npm test`
- [ ] Coverage ≥80%: `npm test:coverage`
- [ ] E2E tests passing: `npm run cypress:run`
- [ ] Mobile tests passing: `npm run cypress:run:mobile`
- [ ] No security vulnerabilities: `npm run security:audit`
- [ ] No console errors in tests
- [ ] No accessibility violations
- [ ] Performance targets met (if applicable)

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server

# Testing
npm test                 # All unit tests
npm test:watch          # Watch mode
npm run cypress:open    # Cypress UI
npm run cypress:run     # Headless tests

# Quality
npm run qa:full         # Complete QA suite
npm run performance:lighthouse
npm run security:audit

# Code quality
npm run lint            # ESLint
npm run lint --fix      # Auto-fix

# Database
npm run db:seed         # Seed test data
npm run db:studio       # Prisma studio

# Reports
npm test:coverage       # Coverage report
npm run report:database # Database report
npm run report:executive # Executive summary
```

---

## Resources

- **Jest Docs**: https://jestjs.io/docs/getting-started
- **Cypress Docs**: https://docs.cypress.io
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Web Vitals**: https://web.dev/vitals/

---

## Support

For questions or issues:
1. Check [TESTING-GUIDE.md](./TESTING-GUIDE.md) for detailed info
2. Review test files in `services/__tests__/` and `cypress/e2e/`
3. Check GitHub Actions workflow for CI/CD examples

---

**Last Updated**: 2026-08-03
