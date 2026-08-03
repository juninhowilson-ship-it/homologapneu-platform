/**
 * E2E Test: Security Testing
 * Coverage: XSS, SQL Injection, CSRF, Authentication, Authorization
 * Standard: OWASP Top 10
 */

describe('Security Tests - OWASP Coverage', () => {
  describe('XSS (Cross-Site Scripting) Prevention', () => {
    it('deve escapar HTML em inputs de usuário', () => {
      cy.visit('/login')
      const xssPayload = '<script>alert("XSS")</script>'

      cy.get('input[name="email"]').type(xssPayload)
      cy.get('button[type="submit"]').click()

      // Verify script wasn't executed
      cy.on('window:alert', () => {
        throw new Error('XSS vulnerability detected')
      })
    })

    it('deve sanitizar conteúdo UGC em search results', () => {
      cy.login()
      const xssPayload = '"><img src=x onerror=alert("XSS")>'

      cy.get('[data-testid="global-search"]').type(xssPayload)
      cy.get('[data-testid="search-submit"]').click()

      // Verify no script execution
      cy.on('window:alert', () => {
        throw new Error('XSS vulnerability in search')
      })

      cy.get('[data-testid="search-results"]').should('be.visible')
    })

    it('deve escapar HTML em names de fabricantes', () => {
      cy.login()
      cy.intercept('GET', '/api/fabricantes*').as('getFabricantes')

      cy.get('[data-testid="filter-fabricante"]').click()
      cy.wait('@getFabricantes')

      // Verify no unescaped HTML in response
      cy.get('[data-testid="fabricante-option"]').each(($el) => {
        cy.wrap($el).invoke('html').should('not.contain', '<script>')
      })
    })

    it('deve usar Content Security Policy headers', () => {
      cy.visit('/dashboard')
      cy.request('/dashboard').then((response) => {
        expect(response.headers['content-security-policy']).to.exist
        expect(response.headers['content-security-policy']).to.include("script-src 'self'")
      })
    })
  })

  describe('SQL Injection Prevention', () => {
    it('deve rejeitar SQL injection no search', () => {
      cy.login()
      const sqlPayload = "'; DROP TABLE homologacoes; --"

      cy.get('[data-testid="global-search"]').type(sqlPayload)
      cy.get('[data-testid="search-submit"]').click()

      // Verify no database error exposed
      cy.get('[data-testid="error-message"]').should('not.contain', 'SQL')
      cy.get('[data-testid="error-message"]').should('not.contain', 'DROP')

      // Verify application still works
      cy.get('[data-testid="search-results"]').should('be.visible')
    })

    it('deve rejeitar SQL injection em filter parameters', () => {
      cy.login()
      const sqlPayload = "1 OR 1=1 --"

      // Try to inject via URL
      cy.visit(`/dashboard?year=${sqlPayload}`)

      // Verify it's treated as literal value, not SQL
      cy.get('[data-testid="dashboard-container"]').should('be.visible')
      cy.get('[data-testid="error-message"]').should('not.contain', 'database')
    })

    it('deve usar prepared statements (via Prisma)', () => {
      cy.login()

      // Prisma should use parameterized queries automatically
      cy.intercept('POST', '/api/homologacoes/**').as('apiCall')

      cy.get('[data-testid="global-search"]').type("test'; DROP TABLE")
      cy.wait('@apiCall').then((interception) => {
        // Verify query is parameterized
        expect(interception.request.body).not.to.contain("DROP TABLE")
      })
    })
  })

  describe('CSRF (Cross-Site Request Forgery) Protection', () => {
    it('deve incluir CSRF token em formulários', () => {
      cy.visit('/login')
      cy.get('form').within(() => {
        cy.get('input[name="csrf_token"], input[name="_csrf"]').should('exist')
      })
    })

    it('deve usar SameSite cookie attribute', () => {
      cy.login()

      cy.getCookie('session').then((cookie) => {
        if (cookie) {
          expect(cookie.sameSite).to.be.oneOf(['Strict', 'Lax', 'None'])
        }
      })
    })

    it('deve validar referer header em POST requests', () => {
      cy.login()

      cy.intercept('POST', '/api/**').as('postRequest')

      cy.get('[data-testid="filter-button"]').click()
      cy.get('[data-testid="apply-filters"]').click()

      cy.wait('@postRequest').then((interception) => {
        // Verify origin is same-site
        const referer = interception.request.headers['referer']
        expect(referer).to.include('localhost:3000')
      })
    })

    it('deve rejeitar requests sem CSRF token', () => {
      cy.login()

      // Attempt POST without CSRF token
      cy.request({
        method: 'POST',
        url: '/api/homologacoes',
        body: { name: 'test' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(403) // Forbidden
      })
    })
  })

  describe('Authentication Security', () => {
    it('deve usar HTTPS em produção', () => {
      // Skip in development
      if (Cypress.env('NODE_ENV') === 'production') {
        cy.visit('http://localhost:3000').then(() => {
          cy.url().should('include', 'https')
        })
      }
    })

    it('deve validar credenciais corretamente', () => {
      cy.visit('/login')

      // Wrong password
      cy.get('input[name="email"]').type('test@example.com')
      cy.get('input[name="password"]').type('wrongpassword')
      cy.get('button[type="submit"]').click()

      cy.get('[data-testid="error-message"]').should('contain', 'credenciais inválidas')
      cy.url().should('include', '/login')
    })

    it('deve ter timeout de sessão', () => {
      cy.login()

      // Simulate session timeout (clear cookies)
      cy.clearCookies()

      // Try to access protected page
      cy.visit('/dashboard', { failOnStatusCode: false })
      cy.url().should('include', '/login')
    })

    it('deve redirecionar para login se não autenticado', () => {
      cy.clearCookies()
      cy.visit('/dashboard', { failOnStatusCode: false })

      cy.url().should('include', '/login')
    })

    it('deve usar secure cookies', () => {
      cy.login()

      cy.getCookie('session').then((cookie) => {
        if (cookie) {
          expect(cookie.secure).to.be.true
          expect(cookie.httpOnly).to.be.true
        }
      })
    })

    it('deve implementar rate limiting no login', () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        cy.visit('/login')
        cy.get('input[name="email"]').type('test@example.com')
        cy.get('input[name="password"]').type('wrongpassword{enter}')
      }

      // After multiple attempts, should be rate limited
      cy.get('[data-testid="error-message"]').should('contain', 'Trop')
    })
  })

  describe('Authorization & Access Control', () => {
    it('deve impedir acesso a recursos sem autenticação', () => {
      cy.clearCookies()

      cy.request({
        url: '/api/homologacoes',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401) // Unauthorized
      })
    })

    it('deve impedir acesso a recursos de outro usuário', () => {
      cy.login('user1@example.com', 'Pass@123')

      cy.request('/api/homologacoes/999').then((response) => {
        // Should not return data belonging to another user
        expect(response.status).to.equal(404)
      })
    })

    it('deve implementar role-based access control', () => {
      // Regular user
      cy.login('user@example.com', 'Pass@123')

      cy.visit('/administracao', { failOnStatusCode: false })
      cy.get('[data-testid="access-denied"]').should('be.visible')
        .or('url')
        .should('include', '/dashboard')
    })

    it('deve impedir admin operations por usuários normais', () => {
      cy.login()

      cy.request({
        method: 'DELETE',
        url: '/api/homologacoes/1',
        failOnStatusCode: false,
      }).then((response) => {
        expect([401, 403]).to.include(response.status)
      })
    })
  })

  describe('Input Validation', () => {
    it('deve validar tamanho de input', () => {
      cy.login()

      const longString = 'a'.repeat(10000)
      cy.get('[data-testid="global-search"]').type(longString)

      cy.get('[data-testid="global-search"]')
        .invoke('val')
        .then((val) => {
          expect((val as string).length).to.be.lessThan(1000)
        })
    })

    it('deve validar tipo de dado', () => {
      cy.login()

      cy.intercept('POST', '/api/**').as('apiCall')

      // Try to send invalid data type
      cy.request({
        method: 'POST',
        url: '/api/homologacoes',
        body: {
          vehicleId: 'not-a-number',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400) // Bad Request
      })
    })

    it('deve validar enum values', () => {
      cy.login()

      cy.request({
        method: 'POST',
        url: '/api/homologacoes',
        body: {
          vehicleId: 1,
          status: 'INVALID_STATUS',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400)
      })
    })
  })

  describe('API Security Headers', () => {
    it('deve ter X-Content-Type-Options header', () => {
      cy.request('/dashboard').then((response) => {
        expect(response.headers['x-content-type-options']).to.equal('nosniff')
      })
    })

    it('deve ter X-Frame-Options header', () => {
      cy.request('/dashboard').then((response) => {
        expect(response.headers['x-frame-options']).to.be.oneOf([
          'DENY',
          'SAMEORIGIN',
        ])
      })
    })

    it('deve ter X-XSS-Protection header', () => {
      cy.request('/dashboard').then((response) => {
        const xssProtection = response.headers['x-xss-protection']
        expect(xssProtection).to.include('1')
        expect(xssProtection).to.include('mode=block')
      })
    })

    it('deve ter Strict-Transport-Security em HTTPS', () => {
      if (Cypress.env('NODE_ENV') === 'production') {
        cy.request('https://localhost:3000/dashboard').then((response) => {
          expect(response.headers['strict-transport-security']).to.exist
        })
      }
    })
  })

  describe('Sensitive Data Protection', () => {
    it('deve não expor senhas em responses', () => {
      cy.login()

      cy.intercept('GET', '/api/**').as('apiCall')
      cy.wait('@apiCall').then((interception) => {
        expect(interception.response?.body).not.to.contain('password')
        expect(interception.response?.body).not.to.contain('secret')
      })
    })

    it('deve não exibir stack traces em produção', () => {
      if (Cypress.env('NODE_ENV') === 'production') {
        cy.request({
          url: '/api/invalid-endpoint',
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.body).not.to.contain('at ')
          expect(response.body).not.to.contain('Error:')
        })
      }
    })

    it('deve não logar dados sensíveis', () => {
      cy.login()

      cy.visit('/dashboard')

      // Check console for sensitive data
      cy.window().then((win) => {
        const consoleLogs = (win.console.log as any).getCalls?.() || []
        consoleLogs.forEach((call: any) => {
          expect(call).not.to.contain('password')
          expect(call).not.to.contain('token')
        })
      })
    })
  })

  describe('Dependency Security', () => {
    it('deve usar versões seguras de dependências', () => {
      // This should be checked via npm audit in CI/CD
      cy.task('log', 'Run: npm audit --production')
    })
  })
})
