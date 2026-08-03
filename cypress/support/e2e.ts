// Support file for Cypress E2E tests
import '@cypress/code-coverage/support'

// Custom commands
Cypress.Commands.add('login', (email?: string, password?: string) => {
  const testEmail = email || Cypress.env('testUsername')
  const testPassword = password || Cypress.env('testPassword')

  cy.visit('/login')
  cy.get('input[name="email"]').type(testEmail)
  cy.get('input[name="password"]').type(testPassword)
  cy.get('button[type="submit"]').click()
  cy.url().should('include', '/dashboard')
})

Cypress.Commands.add('loginAsAdmin', () => {
  cy.login('admin@example.com', 'Admin@123')
})

Cypress.Commands.add('logout', () => {
  cy.visit('/dashboard')
  cy.get('[data-testid="user-menu"]').click()
  cy.get('[data-testid="logout-button"]').click()
  cy.url().should('include', '/login')
})

Cypress.Commands.add('waitForApi', (method: string, url: string) => {
  cy.intercept(method, url).as('apiCall')
  cy.wait('@apiCall')
})

Cypress.Commands.add('shouldBeAccessible', () => {
  cy.injectAxe()
  cy.checkA11y()
})

// Error handling
Cypress.on('uncaught:exception', (err) => {
  // Ignore specific errors that are not test failures
  if (
    err.message.includes('ResizeObserver loop limit exceeded') ||
    err.message.includes('Non-Error promise rejection detected')
  ) {
    return false
  }
  return true
})

// Session hooks
beforeEach(() => {
  // Reset application state before each test
  cy.clearCookies()
  cy.clearLocalStorage()
})

afterEach(() => {
  // Clean up after each test
  cy.clearCookies()
})

// Type declarations
declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>
      loginAsAdmin(): Chainable<void>
      logout(): Chainable<void>
      waitForApi(method: string, url: string): Chainable<void>
      shouldBeAccessible(): Chainable<void>
    }
  }
}

export {}
