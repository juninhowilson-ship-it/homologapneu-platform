# HomologaPneu - Test Matrix

**Complete test coverage mapping for all features**

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Unit Test (Jest) |
| 🎯 | E2E Test (Cypress) |
| 📱 | Mobile Test |
| ♿ | Accessibility Test |
| 🔒 | Security Test |
| ⚡ | Performance Test |

---

## 1. Authentication & Authorization

### Login
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| AUTH-001 | Valid email and password | ✅ 🎯 🔒 | P0 |
| AUTH-002 | Invalid email format | ✅ 🎯 | P0 |
| AUTH-003 | Empty email field | ✅ 🎯 | P0 |
| AUTH-004 | Empty password field | ✅ 🎯 | P0 |
| AUTH-005 | Wrong password | ✅ 🎯 🔒 | P0 |
| AUTH-006 | Non-existent user | ✅ 🎯 | P0 |
| AUTH-007 | Case-insensitive email | ✅ 🎯 | P1 |
| AUTH-008 | Rate limiting after 5 failed attempts | 🎯 🔒 | P0 |
| AUTH-009 | Session timeout after 30min inactivity | 🎯 🔒 | P1 |
| AUTH-010 | Secure password requirements (min 8 chars, uppercase, number) | ✅ | P1 |
| AUTH-011 | SQL injection in login | 🎯 🔒 | P0 |
| AUTH-012 | XSS payload in email | 🎯 🔒 | P0 |

### Logout
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| LOGOUT-001 | Successful logout | ✅ 🎯 | P0 |
| LOGOUT-002 | Redirect to login after logout | 🎯 | P0 |
| LOGOUT-003 | Session cleared | 🎯 🔒 | P0 |
| LOGOUT-004 | Cannot access protected pages after logout | 🎯 | P0 |
| LOGOUT-005 | Cookies deleted | 🔒 | P1 |

### Access Control
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| ACCESS-001 | User cannot access admin panel | 🎯 🔒 | P0 |
| ACCESS-002 | User cannot delete homologations | 🎯 🔒 | P0 |
| ACCESS-003 | User cannot access other user's data | 🎯 🔒 | P0 |
| ACCESS-004 | Admin can access all resources | 🎯 | P0 |
| ACCESS-005 | Anonymous user redirected to login | 🎯 | P0 |
| ACCESS-006 | JWT token validation | ✅ 🔒 | P0 |

---

## 2. Dashboard

### KPI Display
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| DASH-001 | Total homologações card displays | 🎯 | P0 |
| DASH-002 | Total manufacturers card displays | 🎯 | P0 |
| DASH-003 | Total vehicles card displays | 🎯 | P0 |
| DASH-004 | Total tires card displays | 🎯 | P0 |
| DASH-005 | Coverage percentage displays | 🎯 | P0 |
| DASH-006 | KPI values update on data change | ✅ 🎯 | P1 |
| DASH-007 | KPI cards responsive on mobile | 📱 | P1 |
| DASH-008 | KPI numbers formatted with thousand separator | ✅ 🎯 | P2 |

### Charts
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| CHART-001 | Homologations timeline chart renders | 🎯 ⚡ | P0 |
| CHART-002 | Top manufacturers bar chart renders | 🎯 ⚡ | P0 |
| CHART-003 | Chart tooltips show on hover | 🎯 | P1 |
| CHART-004 | Chart responsive on mobile | 📱 | P1 |
| CHART-005 | Chart legend toggles series | 🎯 | P2 |
| CHART-006 | Empty chart shows message | 🎯 | P2 |

### National Coverage Table
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| TABLE-001 | Table displays all states | 🎯 | P0 |
| TABLE-002 | Table sortable by column | 🎯 | P1 |
| TABLE-003 | Table filterable by state | 🎯 | P1 |
| TABLE-004 | Table paginated (10 per page) | 🎯 | P1 |
| TABLE-005 | Table responsive on mobile | 📱 | P1 |
| TABLE-006 | Table exports to CSV | 🎯 | P2 |

---

## 3. Search Functionality

### Basic Search
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| SEARCH-001 | Exact match search | ✅ 🎯 | P0 |
| SEARCH-002 | Case-insensitive search | ✅ 🎯 | P0 |
| SEARCH-003 | Accent-insensitive search | ✅ 🎯 | P0 |
| SEARCH-004 | Fuzzy matching (BMW vs BM) | ✅ 🎯 | P0 |
| SEARCH-005 | Search results ranking by relevance | ✅ 🎯 | P1 |
| SEARCH-006 | Real-time suggestions (500ms debounce) | 🎯 ⚡ | P1 |
| SEARCH-007 | Clear search button | 🎯 📱 | P1 |
| SEARCH-008 | Empty search shows all results | 🎯 | P2 |

### Search Validation
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| SEARCH-009 | SQL injection blocked | 🎯 🔒 | P0 |
| SEARCH-010 | XSS payload blocked | 🎯 🔒 | P0 |
| SEARCH-011 | Max 100 characters | ✅ | P1 |
| SEARCH-012 | No results message | 🎯 | P1 |
| SEARCH-013 | Error handling on API failure | 🎯 | P1 |

### Search Performance
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| SEARCH-014 | Search response <500ms | 🎯 ⚡ | P0 |
| SEARCH-015 | 1000+ results render in <2s | 🎯 ⚡ | P1 |
| SEARCH-016 | Search doesn't block UI | 🎯 ⚡ | P1 |

---

## 4. Filtering

### Filter Options
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| FILTER-001 | Filter by manufacturer | ✅ 🎯 | P0 |
| FILTER-002 | Filter by year | ✅ 🎯 | P0 |
| FILTER-003 | Filter by status (ATIVO/INATIVO) | ✅ 🎯 | P0 |
| FILTER-004 | Filter by tire size | 🎯 | P1 |
| FILTER-005 | Filter by wheel diameter | 🎯 | P1 |
| FILTER-006 | Multiple simultaneous filters | ✅ 🎯 | P0 |
| FILTER-007 | Filter persistence in URL | 🎯 | P1 |

### Filter Interaction
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| FILTER-008 | Filter sheet opens on mobile | 📱 | P1 |
| FILTER-009 | Filter results update instantly | 🎯 | P1 |
| FILTER-010 | Clear all filters button | 🎯 | P1 |
| FILTER-011 | Applied filters displayed as chips | 🎯 | P1 |
| FILTER-012 | Remove individual filter | 🎯 | P1 |

---

## 5. Homologation Details

### Display
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| DETAILS-001 | Vehicle info section loads | 🎯 | P0 |
| DETAILS-002 | Manufacturer name displays | 🎯 | P0 |
| DETAILS-003 | Model name displays | 🎯 | P0 |
| DETAILS-004 | Year displays | 🎯 | P0 |
| DETAILS-005 | Category displays (HATCH/SEDAN/etc) | 🎯 | P0 |

### Tires Section
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| TIRE-001 | Original tire highlighted | 🎯 | P0 |
| TIRE-002 | Tire model displays | 🎯 | P0 |
| TIRE-003 | Tire size displays | 🎯 | P0 |
| TIRE-004 | Tire manufacturer displays | 🎯 | P0 |
| TIRE-005 | RunFlat indicator displays | 🎯 | P1 |
| TIRE-006 | XL indicator displays | 🎯 | P1 |
| TIRE-007 | Multiple tires display in tabs | 🎯 | P1 |
| TIRE-008 | Tire image loads (lazy) | 🎯 ⚡ | P1 |

### Wheels Section
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| WHEEL-001 | Original wheel highlighted | 🎯 | P0 |
| WHEEL-002 | Wheel diameter displays | 🎯 | P0 |
| WHEEL-003 | Wheel width displays | 🎯 | P0 |
| WHEEL-004 | Wheel offset displays | 🎯 | P0 |
| WHEEL-005 | Bolt pattern displays | 🎯 | P0 |
| WHEEL-006 | Hub bore displays | 🎯 | P0 |
| WHEEL-007 | Multiple wheels display | 🎯 | P1 |

### Pressure Specs
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| PRESSURE-001 | Load condition displays | 🎯 | P0 |
| PRESSURE-002 | Front pressure displays | 🎯 | P0 |
| PRESSURE-003 | Rear pressure displays | 🎯 | P0 |
| PRESSURE-004 | Multiple load conditions display | 🎯 | P1 |

### Documents
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| DOCS-001 | Document list displays | 🎯 | P1 |
| DOCS-002 | Document download works | 🎯 | P1 |
| DOCS-003 | PDF preview on click | 🎯 | P2 |

---

## 6. Mobile Responsiveness

### iPhone X (375x812)
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| MOBILE-001 | Login form responsive | 📱 | P0 |
| MOBILE-002 | Dashboard KPI cards stack vertically | 📱 | P0 |
| MOBILE-003 | Search input full width | 📱 | P0 |
| MOBILE-004 | Results list scrollable | 📱 | P0 |
| MOBILE-005 | Hamburger menu visible | 📱 | P0 |
| MOBILE-006 | Filters in modal | 📱 | P0 |
| MOBILE-007 | Touch buttons 44x44px minimum | 📱 | P1 |
| MOBILE-008 | Charts responsive | 📱 | P1 |
| MOBILE-009 | Tables horizontally scrollable | 📱 | P1 |

### Landscape Orientation
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| MOBILE-010 | Layout adjusts to landscape | 📱 | P1 |
| MOBILE-011 | No horizontal scroll in landscape | 📱 | P1 |

---

## 7. Accessibility (WCAG 2.1 AA)

### Keyboard Navigation
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| A11Y-001 | Tab navigates all interactive elements | ♿ 🎯 | P0 |
| A11Y-002 | Tab order is logical | ♿ 🎯 | P0 |
| A11Y-003 | Enter activates buttons | ♿ 🎯 | P0 |
| A11Y-004 | Space toggles checkboxes | ♿ 🎯 | P0 |
| A11Y-005 | Escape closes modals | ♿ 🎯 | P0 |
| A11Y-006 | Arrow keys navigate dropdowns | ♿ 🎯 | P1 |
| A11Y-007 | No keyboard trap | ♿ 🎯 | P0 |
| A11Y-008 | Skip to main content link | ♿ | P1 |

### Screen Reader
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| A11Y-009 | Page structure announced correctly | ♿ 🎯 | P0 |
| A11Y-010 | Form labels associated | ♿ 🎯 | P0 |
| A11Y-011 | Required fields marked | ♿ 🎯 | P0 |
| A11Y-012 | Error messages announced | ♿ 🎯 | P0 |
| A11Y-013 | Success messages announced | ♿ 🎯 | P1 |
| A11Y-014 | Icons have descriptions | ♿ 🎯 | P0 |
| A11Y-015 | Images have alt text | ♿ 🎯 | P0 |
| A11Y-016 | Dynamic content announced | ♿ 🎯 | P1 |

### Color & Contrast
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| A11Y-017 | Text contrast 4.5:1 (normal) | ♿ 🎯 | P0 |
| A11Y-018 | Text contrast 3:1 (large text) | ♿ 🎯 | P0 |
| A11Y-019 | Focus indicator visible | ♿ 🎯 | P0 |
| A11Y-020 | Color not only indicator | ♿ 🎯 | P1 |

### Semantic HTML
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| A11Y-021 | Proper heading hierarchy | ♿ 🎯 | P0 |
| A11Y-022 | Single h1 per page | ♿ 🎯 | P0 |
| A11Y-023 | Semantic elements (nav, main, etc) | ♿ 🎯 | P0 |
| A11Y-024 | List markup for lists | ♿ | P1 |
| A11Y-025 | Table headers marked | ♿ | P1 |

---

## 8. Performance

### Page Load
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| PERF-001 | FCP (First Contentful Paint) <2s | ⚡ 🎯 | P0 |
| PERF-002 | LCP (Largest Contentful Paint) <2.5s | ⚡ 🎯 | P0 |
| PERF-003 | CLS (Cumulative Layout Shift) <0.1 | ⚡ 🎯 | P0 |
| PERF-004 | TBT (Total Blocking Time) <200ms | ⚡ 🎯 | P1 |
| PERF-005 | Speed Index <5s | ⚡ 🎯 | P1 |
| PERF-006 | Time to Interactive <3.8s | ⚡ | P1 |

### Lighthouse Scores
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| PERF-007 | Performance score ≥90 | ⚡ | P0 |
| PERF-008 | Accessibility score ≥90 | ⚡ ♿ | P0 |
| PERF-009 | Best Practices score ≥85 | ⚡ | P0 |
| PERF-010 | SEO score ≥90 | ⚡ | P0 |

### Database Queries
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| PERF-011 | List queries <200ms P95 | ⚡ | P1 |
| PERF-012 | Detail queries <100ms P95 | ⚡ | P1 |
| PERF-013 | Search queries <500ms P95 | ⚡ | P1 |
| PERF-014 | No N+1 queries | ⚡ ✅ | P0 |

### Caching
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| PERF-015 | Images cached 1 year | ⚡ | P1 |
| PERF-016 | JS/CSS cached 1 year | ⚡ | P1 |
| PERF-017 | HTML cached 1 hour | ⚡ | P1 |
| PERF-018 | API cache headers set | ⚡ | P1 |

---

## 9. Security

### Injection Prevention
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| SEC-001 | SQL injection blocked | 🔒 🎯 | P0 |
| SEC-002 | XSS payload blocked | 🔒 🎯 | P0 |
| SEC-003 | HTML escaping in output | 🔒 ✅ | P0 |
| SEC-004 | Parameterized queries used | 🔒 ✅ | P0 |

### Authentication
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| SEC-005 | Password hashed (bcrypt) | 🔒 ✅ | P0 |
| SEC-006 | Session timeout 30min | 🔒 | P0 |
| SEC-007 | JWT token validation | 🔒 ✅ | P0 |
| SEC-008 | Refresh token rotation | 🔒 ✅ | P1 |

### Authorization
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| SEC-009 | RBAC implemented | 🔒 ✅ | P0 |
| SEC-010 | Resource ownership validated | 🔒 | P0 |
| SEC-011 | Admin endpoints protected | 🔒 | P0 |

### CSRF Protection
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| SEC-012 | CSRF token on forms | 🔒 | P0 |
| SEC-013 | SameSite=Strict cookies | 🔒 | P0 |
| SEC-014 | Origin validation | 🔒 | P1 |

### Headers
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| SEC-015 | Content-Security-Policy | 🔒 | P0 |
| SEC-016 | X-Content-Type-Options: nosniff | 🔒 | P0 |
| SEC-017 | X-Frame-Options | 🔒 | P0 |
| SEC-018 | X-XSS-Protection | 🔒 | P0 |

### Secrets
| Test Case | Description | Coverage | Priority |
|-----------|-------------|----------|----------|
| SEC-019 | No secrets in .env.example | 🔒 ✅ | P0 |
| SEC-020 | Passwords not in logs | 🔒 | P0 |
| SEC-021 | API keys rotated regularly | 🔒 | P1 |

---

## Test Coverage Summary

| Category | Total | Implemented | Coverage |
|----------|-------|-------------|----------|
| Authentication | 12 | 8 | 67% |
| Dashboard | 18 | 12 | 67% |
| Search | 16 | 10 | 63% |
| Filters | 12 | 8 | 67% |
| Details | 38 | 28 | 74% |
| Mobile | 11 | 7 | 64% |
| Accessibility | 25 | 18 | 72% |
| Performance | 18 | 12 | 67% |
| Security | 21 | 15 | 71% |
| **TOTAL** | **171** | **118** | **69%** |

---

## Priorities Legend

- **P0 (Critical)**: Must pass before release
- **P1 (High)**: Should pass before release
- **P2 (Medium)**: Nice to have

---

**Last Updated**: 2026-08-03
