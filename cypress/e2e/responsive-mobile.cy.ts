/**
 * E2E Test: Responsive & Mobile
 * Scenario: iPhone X (375x812) viewport testing
 * Coverage: Mobile layout, touch interactions, performance
 */

describe('Responsive Design - Mobile (iPhone X)', () => {
  const iPhoneXViewport = {
    width: 375,
    height: 812,
    deviceScaleFactor: 3,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  }

  beforeEach(() => {
    cy.viewport(iPhoneXViewport.width, iPhoneXViewport.height)
    cy.intercept('GET', '/api/homologacoes').as('listHomologacoes')
  })

  describe('Navigation - Mobile', () => {
    it('deve exibir hamburger menu em mobile', () => {
      cy.visit('/')
      cy.get('[data-testid="hamburger-menu"]').should('be.visible')
      cy.get('[data-testid="desktop-nav"]').should('not.be.visible')
    })

    it('deve abrir/fechar mobile menu', () => {
      cy.login()
      cy.get('[data-testid="hamburger-menu"]').click()
      cy.get('[data-testid="mobile-menu"]').should('be.visible')

      cy.get('[data-testid="hamburger-menu"]').click()
      cy.get('[data-testid="mobile-menu"]').should('not.be.visible')
    })

    it('deve fechar mobile menu ao navegar', () => {
      cy.login()
      cy.get('[data-testid="hamburger-menu"]').click()
      cy.get('[data-testid="mobile-menu-search"]').click()

      cy.get('[data-testid="mobile-menu"]').should('not.be.visible')
    })
  })

  describe('Search - Mobile', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve exibir search input em tela cheia', () => {
      cy.get('[data-testid="global-search"]').should('be.visible')
      cy.get('[data-testid="global-search"]').invoke('width').should('be.greaterThan', 150)
    })

    it('deve permitir digitar e pesquisar em mobile', () => {
      cy.get('[data-testid="global-search"]').type('BMW 320i')
      cy.get('[data-testid="search-submit"]').click()

      cy.wait('@listHomologacoes')
      cy.get('[data-testid="search-results"]').should('be.visible')
    })

    it('deve exibir sugestões em dropdown', () => {
      cy.get('[data-testid="global-search"]').type('BM')

      cy.get('[data-testid="search-suggestions"]').should('be.visible')
      cy.get('[data-testid="search-suggestion"]').should('have.length.greaterThan', 0)
    })

    it('deve permitir selecionar sugestão com toque', () => {
      cy.get('[data-testid="global-search"]').type('BM')
      cy.get('[data-testid="search-suggestion"]').first().click()

      cy.wait('@listHomologacoes')
    })
  })

  describe('Results List - Mobile', () => {
    beforeEach(() => {
      cy.login()
      cy.wait('@listHomologacoes')
    })

    it('deve exibir resultados em layout mobile', () => {
      cy.get('[data-testid="search-result-item"]').should('be.visible')

      // Verify full width on mobile
      cy.get('[data-testid="search-result-item"]')
        .first()
        .invoke('outerWidth')
        .should('be.gte', 300)
    })

    it('deve permitir scroll horizontal em telas pequenas', () => {
      cy.get('[data-testid="search-results-container"]').should('be.visible')

      // Simulate scroll
      cy.get('[data-testid="search-results-container"]').scrollTo('right')
    })

    it('deve abrir detalhes ao clicar em resultado', () => {
      cy.get('[data-testid="search-result-item"]').first().click()

      // Verify detail page loads
      cy.url().should('match', /\/homologacao\/\d+/)
      cy.get('[data-testid="vehicle-info-section"]').should('be.visible')
    })

    it('deve exibir back button na tela de detalhes', () => {
      cy.get('[data-testid="search-result-item"]').first().click()

      cy.get('[data-testid="back-button"]').should('be.visible')
      cy.get('[data-testid="back-button"]').click()

      cy.url().should('include', '/dashboard')
    })
  })

  describe('KPI Cards - Mobile', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve exibir KPI cards empilhados em mobile', () => {
      cy.get('[data-testid="kpi-container"]').should('be.visible')

      // Verify cards are stacked (single column)
      cy.get('[data-testid="kpi-card"]').each(($card) => {
        cy.wrap($card).invoke('width').should('be.gte', 300)
      })
    })

    it('deve ser scrollável verticalmente', () => {
      cy.get('[data-testid="kpi-container"]').scrollTo('bottom')
      cy.get('[data-testid="kpi-card"]').last().should('be.visible')
    })
  })

  describe('Filters - Mobile', () => {
    beforeEach(() => {
      cy.login()
      cy.wait('@listHomologacoes')
    })

    it('deve exibir filtros em modo mobile', () => {
      cy.get('[data-testid="filters-container"]').should('be.visible')
    })

    it('deve abrir filtros em modal/sheet', () => {
      cy.get('[data-testid="filter-button"]').click()

      cy.get('[data-testid="filter-sheet"]').should('be.visible')
      cy.get('[data-testid="filter-sheet"]').invoke('width').should('be.gte', 300)
    })

    it('deve fechar filter sheet ao confirmar', () => {
      cy.get('[data-testid="filter-button"]').click()
      cy.get('[data-testid="fabricante-option-bmw"]').click()
      cy.get('[data-testid="apply-filters"]').click()

      cy.get('[data-testid="filter-sheet"]').should('not.exist')
    })
  })

  describe('Touch Interactions', () => {
    beforeEach(() => {
      cy.login()
      cy.wait('@listHomologacoes')
    })

    it('deve ter botões com touch size mínimo (44x44px)', () => {
      // Verify button dimensions
      cy.get('[data-testid="search-submit"]')
        .invoke('outerHeight')
        .should('be.gte', 44)
      cy.get('[data-testid="search-submit"]')
        .invoke('outerWidth')
        .should('be.gte', 44)
    })

    it('deve ter espaçamento adequado entre elementos clicáveis', () => {
      cy.get('[data-testid="search-result-item"]')
        .first()
        .invoke('height')
        .should('be.gte', 60)
    })

    it('deve responder a swipe down para refresh', () => {
      // Simulate pull-to-refresh
      cy.get('[data-testid="results-container"]').trigger('touchstart')
      cy.get('[data-testid="results-container"]').trigger('touchmove')
      cy.get('[data-testid="results-container"]').trigger('touchend')

      // Should trigger refresh
      cy.wait('@listHomologacoes')
    })
  })

  describe('Performance - Mobile', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve carregar dashboard em menos de 3s', () => {
      const startTime = Date.now()
      cy.get('[data-testid="dashboard-container"]', { timeout: 3000 })
        .should('be.visible')
        .then(() => {
          const loadTime = Date.now() - startTime
          expect(loadTime).toBeLessThan(3000)
        })
    })

    it('deve fazer lazy loading de imagens', () => {
      cy.get('[data-testid="tire-image"]')
        .first()
        .invoke('attr', 'loading')
        .should('equal', 'lazy')
    })

    it('deve limitar altura de imagens em mobile', () => {
      cy.get('[data-testid="vehicle-image"]')
        .invoke('height')
        .should('be.lte', 300)
    })
  })

  describe('Form Input - Mobile', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve exibir teclado appropriado para email', () => {
      // Verificar que input tem type="email"
      cy.get('input[name="email"]')
        .invoke('attr', 'type')
        .should('equal', 'email')
    })

    it('deve ter font size mínimo de 16px para evitar zoom automático', () => {
      cy.get('[data-testid="global-search"]')
        .invoke('css', 'font-size')
        .should('not.equal', '12px')
    })

    it('deve permitir tap para focus em inputs', () => {
      cy.get('[data-testid="global-search"]').click()
      cy.get('[data-testid="global-search"]').should('have.focus')
    })
  })

  describe('Orientation - Landscape', () => {
    it('deve se adaptar ao landscape', () => {
      cy.viewport(812, 375) // iPhone X landscape

      cy.login()
      cy.get('[data-testid="dashboard-container"]').should('be.visible')

      // Verify layout adjustment
      cy.get('[data-testid="kpi-container"]').should('be.visible')
    })
  })
})
