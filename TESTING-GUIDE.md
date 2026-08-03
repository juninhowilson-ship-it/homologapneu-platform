# QA & Testing Plan - HomologaPneu

**Version**: 1.0  
**Last Updated**: 2026-08-03  
**Owner**: QA Team

## Executive Summary

Comprehensive testing strategy for HomologaPneu with focus on:
- **80%+ unit test coverage** of services
- **Cypress E2E** test suite for critical user flows
- **WCAG 2.1 AA** accessibility compliance
- **OWASP Top 10** security testing
- **Lighthouse >90** performance targets

---

## 1. Unit Tests (Jest)

### Setup

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest
npm run test
```

### Configuration

- **Config**: `jest.config.js`
- **Setup**: `jest.setup.js`
- **Coverage Target**: 80% minimum (85% for services)

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Specific test file
npm test -- services/__tests__/homologacoes.test.ts
```

### Test Structure

```
services/
  __tests__/
    homologacoes.test.ts    # CRUD operations
    filtros.test.ts         # Search & filtering
    auth.test.ts            # Authentication
    validations.test.ts     # Input validation
```

### Key Test Categories

#### 1.1 CRUD Operations
- ✅ Create with valid data
- ✅ Create with invalid data (validation)
- ✅ Read by ID (found/not found)
- ✅ Update existing record
- ✅ Update non-existent record
- ✅ Delete record
- ✅ Delete non-existent record

#### 1.2 Search & Filtering
- ✅ Exact match search
- ✅ Fuzzy matching
- ✅ Accent-insensitive search
- ✅ Case-insensitive search
- ✅ Filter by manufacturer
- ✅ Filter by year
- ✅ Filter by status
- ✅ Combined filters
- ✅ No results handling

#### 1.3 Authentication
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Required field validation
- ✅ Session management
- ✅ Token refresh

#### 1.4 Error Handling
- ✅ Graceful error messages
- ✅ Database error handling
- ✅ Validation error messages
- ✅ Conflict error handling

### Test Example

```typescript
describe('HomologacoesService', () => {
  describe('findHomologacaoById', () => {
    it('deve retornar homologação quando encontrada', async () => {
      const mockData = { id: 1, status: 'ATIVO' }
      ;(repo.findById as jest.Mock).mockResolvedValue(mockData)

      const result = await findHomologacaoById(1)

      expect(result).toEqual(mockData)
      expect(repo.findById).toHaveBeenCalledWith(1)
    })

    it('deve lançar NotFoundError quando não encontrada', async () => {
      ;(repo.findById as jest.Mock).mockResolvedValue(null)

      await expect(findHomologacaoById(999)).rejects.toThrow(NotFoundError)
    })
  })
})
```

---

## 2. End-to-End Tests (Cypress)

### Setup

```bash
npm install --save-dev cypress @cypress/code-coverage
npx cypress open
```

### Configuration

- **Config**: `cypress.config.ts`
- **Support**: `cypress/support/e2e.ts`
- **Base URL**: `http://localhost:3000`

### Running Tests

```bash
# Open Cypress UI
npm run cypress:open

# Run all specs headless
npm run cypress:run

# Run specific spec
npm run cypress:run -- --spec "cypress/e2e/happy-path.cy.ts"

# With code coverage
npm run cypress:run -- --coverage
```

### Test Specs

#### 2.1 Happy Path (`cypress/e2e/happy-path.cy.ts`)

**Scenario**: Login → Dashboard → Search → View Details → Filter

```
✅ Authentication Flow
   - Login with valid credentials
   - Error on invalid credentials
   - Required field validation

✅ Dashboard Navigation
   - KPI cards load
   - Charts render
   - Table displays data

✅ Search Functionality
   - Simple search
   - Fuzzy matching
   - Accent-insensitive
   - No results handling
   - Clear search

✅ Homologação Details
   - Vehicle info section
   - Tire options section
   - Wheel options section
   - Pressure specs section

✅ Filters
   - Filter by manufacturer
   - Filter by year
   - Filter by status
   - Combined filters
   - Clear all filters

✅ Logout
   - Successful logout
   - Session cleanup
```

#### 2.2 Responsive Mobile (`cypress/e2e/responsive-mobile.cy.ts`)

**Viewport**: iPhone X (375x812)

```
✅ Navigation
   - Hamburger menu visible
   - Mobile menu open/close
   - Back button navigation

✅ Search (Mobile)
   - Full-width input
   - Type and search
   - Suggestions dropdown
   - Touch selection

✅ Results List
   - Mobile layout
   - Horizontal scroll
   - Click to open details
   - Back button

✅ KPI Cards
   - Stacked layout
   - Vertical scrolling

✅ Filters
   - Modal/sheet display
   - Apply and close

✅ Touch Interactions
   - 44x44px minimum buttons
   - Adequate spacing
   - Pull-to-refresh

✅ Performance
   - <3s dashboard load
   - Lazy loading images
   - Image height limits

✅ Orientation
   - Landscape support
```

#### 2.3 Accessibility (`cypress/e2e/accessibility-wcag.cy.ts`)

**Standard**: WCAG 2.1 Level AA

```
✅ Automated Checks (axe-core)
   - Color contrast
   - Label associations
   - ARIA attributes
   - All pages pass audit

✅ Keyboard Navigation
   - Tab order logical
   - Enter to activate buttons
   - Space to toggle
   - Escape to close modals
   - Arrow keys for navigation

✅ Screen Reader Support
   - Icon descriptions
   - Image alt text
   - aria-live regions
   - Role attributes
   - Required field indicators
   - Semantic HTML structure

✅ Focus Management
   - Visible focus indicator
   - Focus restoration on modal close
   - Focus trap in modals

✅ Semantic HTML
   - Single <h1>
   - Proper heading hierarchy
   - <button> for actions
   - <a> for navigation
   - <table> with proper structure
```

#### 2.4 Security (`cypress/e2e/security-tests.cy.ts`)

**Standard**: OWASP Top 10

```
✅ XSS Prevention
   - Script injection blocked
   - HTML escaping in results
   - CSP headers present

✅ SQL Injection
   - Prepared statements (Prisma)
   - URL parameter validation
   - Error message sanitization

✅ CSRF Protection
   - CSRF token validation
   - SameSite cookie attribute
   - Referer header validation

✅ Authentication
   - Credential validation
   - Session timeout
   - Unauthorized access blocked
   - Secure cookies

✅ Authorization
   - Role-based access control
   - Resource ownership validation
   - Admin operations restricted

✅ Input Validation
   - Size limits
   - Type validation
   - Enum values validation

✅ Security Headers
   - X-Content-Type-Options
   - X-Frame-Options
   - X-XSS-Protection
   - Strict-Transport-Security

✅ Sensitive Data
   - Passwords not exposed
   - Stack traces hidden
   - Sensitive data not logged
```

### Test Data Requirements

**User Accounts**:
```typescript
// Regular user
email: "test@example.com"
password: "Test@123"

// Admin user
email: "admin@example.com"
password: "Admin@123"
```

**Sample Data**:
- BMW 320i 2024 (Pirelli P7, 225/45R17)
- Mercedes C-Class 2023 (Michelin Pilot, 225/50R16)
- Audi A4 2024 (Continental ProContact, 215/55R17)

---

## 3. Performance Testing

### Lighthouse Targets

```
Performance:  ≥ 90
Accessibility: ≥ 90
Best Practices: ≥ 85
SEO:           ≥ 90
PWA:           ≥ 80
```

### Core Web Vitals

```
FCP (First Contentful Paint):     < 2s (target: 1.5s)
LCP (Largest Contentful Paint):   < 2.5s (target: 2s)
CLS (Cumulative Layout Shift):    < 0.1 (target: 0.05)
TBT (Total Blocking Time):        < 200ms (target: 100ms)
Speed Index:                      < 5s
```

### Running Performance Tests

```bash
npm run performance:lighthouse

# Or with Cypress
npm run cypress:run -- --spec "cypress/e2e/performance.cy.ts"
```

### Optimization Strategies

#### 3.1 Images
- ✅ Use Next.js Image component
- ✅ Lazy loading: `loading="lazy"`
- ✅ WebP format with fallback
- ✅ Responsive srcset

#### 3.2 Code Splitting
- ✅ Dynamic imports: `dynamic(() => import(...))`
- ✅ Route-based splitting
- ✅ Component-level splitting

#### 3.3 Caching
- ✅ SWR for API calls
- ✅ Static generation for pages
- ✅ Service worker for offline
- ✅ Browser cache headers

#### 3.4 Monitoring
- ✅ Web Vitals tracking
- ✅ Error tracking (Sentry)
- ✅ Performance monitoring (New Relic)
- ✅ User session recording

---

## 4. Accessibility (WCAG 2.1 AA)

### Checklist

#### 4.1 Structure & Semantics
- [ ] One `<h1>` per page
- [ ] Proper heading hierarchy (h2 after h1, etc.)
- [ ] `<nav>`, `<main>`, `<article>`, `<section>` used appropriately
- [ ] `<table>` with `<thead>`, `<tbody>`
- [ ] `<button>` for actions, `<a>` for navigation
- [ ] `<form>` with `<label>` for each input
- [ ] `<fieldset>` and `<legend>` for form groups

#### 4.2 Labels & Instructions
- [ ] All `<input>` have `<label>` or `aria-label`
- [ ] Form errors clearly described
- [ ] Required fields marked and announced
- [ ] Instructions for complex inputs

#### 4.3 Images & Icons
- [ ] All images have `alt` text
- [ ] Icons have `aria-label` or `aria-hidden="true"`
- [ ] Decorative images have empty `alt=""`
- [ ] Complex images have detailed description

#### 4.4 Color & Contrast
- [ ] Text contrast ≥ 4.5:1 (normal text)
- [ ] Text contrast ≥ 3:1 (large text ≥ 18pt or 14pt bold)
- [ ] Color not the only way to convey information
- [ ] Focus indicators visible (≥ 3px, ≥ 3:1 contrast)

#### 4.5 Keyboard Navigation
- [ ] All functionality available via keyboard
- [ ] Logical tab order
- [ ] No keyboard traps
- [ ] Visible focus indicator on all interactive elements
- [ ] Skip links for main content

#### 4.6 ARIA
- [ ] `role` attribute when semantic HTML insufficient
- [ ] `aria-label` for unlabeled buttons/icons
- [ ] `aria-labelledby` for complex labels
- [ ] `aria-describedby` for descriptions
- [ ] `aria-live="polite"` for dynamic content
- [ ] `aria-expanded` for collapsible sections
- [ ] `aria-selected` for tabs
- [ ] `aria-current="page"` for active nav

#### 4.7 Screen Reader
- [ ] Navigation structure is logical
- [ ] Page structure makes sense when read aloud
- [ ] No duplicate link text (e.g., multiple "Click here")
- [ ] Form errors announced
- [ ] Loading states announced
- [ ] Success messages announced

#### 4.8 Motion & Animation
- [ ] Animations don't autoplay
- [ ] `prefers-reduced-motion` respected
- [ ] No flashing > 3 times/second
- [ ] No seizure-inducing patterns

#### 4.9 Language
- [ ] `lang` attribute on `<html>`
- [ ] Language changes marked with `lang` attribute
- [ ] Page title is descriptive

#### 4.10 Links & Buttons
- [ ] Link text is descriptive
- [ ] No "Click here" links
- [ ] Button purposes clear
- [ ] Visited links visually distinct

---

## 5. Security Testing

### Checklist (OWASP Top 10)

#### 5.1 Injection (SQL, XSS)
- [ ] All user input sanitized
- [ ] Parameterized queries used (Prisma)
- [ ] DOMPurify for HTML content
- [ ] No `eval()` or `Function()` constructor
- [ ] CSP headers configured
- [ ] `X-XSS-Protection: 1; mode=block`

#### 5.2 Broken Authentication
- [ ] Strong password policy enforced
- [ ] Password never logged
- [ ] Session timeout implemented
- [ ] Password reset secure
- [ ] Multi-factor authentication (future)
- [ ] No session fixation vulnerabilities
- [ ] JWT or secure session tokens

#### 5.3 Broken Access Control
- [ ] Role-based access control
- [ ] User can only access own resources
- [ ] Admin operations restricted
- [ ] Privilege escalation impossible
- [ ] Directory traversal blocked

#### 5.4 Sensitive Data Exposure
- [ ] HTTPS only (in production)
- [ ] No sensitive data in URLs
- [ ] Secure cookies: `HttpOnly`, `Secure`, `SameSite`
- [ ] No sensitive data in logs
- [ ] No stack traces in production
- [ ] Password hashing with bcrypt/scrypt

#### 5.5 XML External Entities (XXE)
- [ ] XML parsing disabled for external entities
- [ ] File uploads restricted
- [ ] PDF/Excel parsing safe

#### 5.6 Broken Access Control
- [ ] CORS properly configured
- [ ] Origin validation
- [ ] Credentials not exposed in CORS

#### 5.7 Cross-Site Request Forgery (CSRF)
- [ ] CSRF token on all state-changing requests
- [ ] `SameSite=Strict` for sensitive cookies
- [ ] Origin/Referer validation
- [ ] Double-submit cookie pattern

#### 5.8 Using Components with Known Vulnerabilities
- [ ] `npm audit` regularly run
- [ ] Dependabot enabled
- [ ] No CVE vulnerabilities in dependencies
- [ ] Regular dependency updates

#### 5.9 Insufficient Logging
- [ ] All security events logged
- [ ] Login attempts logged
- [ ] Failed API calls logged
- [ ] Data access logged
- [ ] Logs not exposed to users

#### 5.10 API Security
- [ ] Rate limiting implemented
- [ ] Request size limits
- [ ] API authentication required
- [ ] API versioning
- [ ] API documentation (Swagger/OpenAPI)

### Running Security Audit

```bash
npm run security:audit

# Results in reports/security-audit-*.json
```

---

## 6. CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests & Quality

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Unit tests
      - name: Unit Tests
        run: npm test -- --coverage

      # E2E tests
      - name: Start Server
        run: npm run dev &
      - name: E2E Tests
        run: npm run cypress:run

      # Performance
      - name: Lighthouse
        run: npm run performance:lighthouse

      # Security
      - name: Security Audit
        run: npm run security:audit

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hook

```bash
#!/bin/sh
npm test -- --onlyChanged --bail
npm run lint
```

---

## 7. Test Reporting

### Coverage Reports

```
reports/
  coverage/
    index.html              # Coverage dashboard
    lcov.info              # LCOV format
  lighthouse-*.json        # Lighthouse results
  security-audit-*.json    # Security audit results
  cypress-videos/          # Test videos
  cypress-screenshots/     # Failed test screenshots
```

### Coverage Dashboard

```bash
# Generate coverage report
npm test -- --coverage

# Open report
open coverage/lcov-report/index.html
```

### Merging Requirements

- ✅ Unit test coverage ≥ 80%
- ✅ All E2E tests passing
- ✅ Lighthouse score ≥ 85
- ✅ No security vulnerabilities (critical/high)
- ✅ No accessibility violations (WCAG AA)

---

## 8. Troubleshooting

### Common Issues

#### Cypress Tests Timeout
```bash
# Increase timeout
cypress run --config requestTimeout=15000

# Check network tab
# Ensure server is running: npm run dev
```

#### Lighthouse "Could not reach server"
```bash
# Start dev server in separate terminal
npm run dev

# Then run lighthouse
npm run performance:lighthouse
```

#### Accessibility Test Failures
```bash
# Run with detailed output
npm test -- --verbose

# Check axe report in Cypress UI
npx cypress open
```

#### Mobile Viewport Issues
```bash
# Run specific mobile test
npm run cypress:run -- --spec "**/responsive-mobile.cy.ts"
```

---

## 9. Resources

### Documentation
- [Cypress Docs](https://docs.cypress.io)
- [Jest Docs](https://jestjs.io)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Vitals](https://web.dev/vitals/)

### Tools
- Cypress Inspector: `npx cypress open`
- Lighthouse CI: `npm run performance:lighthouse`
- axe DevTools: Browser extension
- WAVE: Browser extension

### Contacts
- QA Lead: [qa@homologapneu.com]
- Security: [security@homologapneu.com]
- Performance: [perf@homologapneu.com]

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-03 | QA Team | Initial plan |

---

**Last Updated**: 2026-08-03  
**Next Review**: 2026-09-03
