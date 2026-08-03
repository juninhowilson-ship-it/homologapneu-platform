/**
 * E2E Test: Happy Path
 * Scenario: Login → Dashboard → Search → View Details → Apply Filters
 * Coverage: User journey, UI interactions, API calls
 */

describe('Happy Path - Complete User Journey', () => {
  beforeEach(() => {
    // Intercept API calls
    cy.intercept('GET', '/api/homologacoes').as('listHomologacoes')
    cy.intercept('GET', '/api/homologacoes/*').as('getHomologacao')
    cy.intercept('GET', '/api/fabricantes').as('listFabricantes')
  })

  describe('Authentication Flow', () => {
    it('deve fazer login com credenciais válidas', () => {
      cy.visit('/login')

      // Verify login page is loaded
      cy.get('h1').should('contain', 'Login')
      cy.get('form').should('be.visible')

      // Enter credentials
      cy.get('input[name="email"]').type('test@example.com')
      cy.get('input[name="password"]').type('Test@123')

      // Submit form
      cy.get('button[type="submit"]').click()

      // Verify redirect to dashboard
      cy.url().should('include', '/dashboard')
      cy.get('[data-testid="dashboard-container"]').should('be.visible')
    })

    it('deve exibir erro com credenciais inválidas', () => {
      cy.visit('/login')
      cy.get('input[name="email"]').type('invalid@example.com')
      cy.get('input[name="password"]').type('wrongpassword')
      cy.get('button[type="submit"]').click()

      cy.get('[data-testid="error-message"]').should('be.visible')
      cy.url().should('include', '/login')
    })

    it('deve validar email obrigatório', () => {
      cy.visit('/login')
      cy.get('input[name="password"]').type('Test@123')
      cy.get('button[type="submit"]').click()

      cy.get('[data-testid="email-error"]').should('contain', 'Email é obrigatório')
    })
  })

  describe('Dashboard Navigation', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve carregar dashboard com KPIs', () => {
      cy.url().should('include', '/dashboard')

      // Verify KPI cards
      cy.get('[data-testid="kpi-total-homologacoes"]')
        .should('be.visible')
        .and('contain', 'Total Homologações')

      cy.get('[data-testid="kpi-fabricantes"]')
        .should('be.visible')
        .and('contain', 'Fabricantes')

      cy.get('[data-testid="kpi-cobertura"]').should('be.visible')

      // Verify charts are rendered
      cy.get('[data-testid="chart-homologacoes-timeline"]').should('be.visible')
      cy.get('[data-testid="chart-fabricantes-top"]').should('be.visible')
    })

    it('deve exibir tabela de cobertura nacional', () => {
      cy.get('[data-testid="cobertura-nacional-table"]').should('be.visible')

      // Verify table has data
      cy.get('[data-testid="cobertura-nacional-table"] tbody tr').should(
        'have.length.greaterThan',
        0
      )
    })
  })

  describe('Search Functionality', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve executar busca simples por modelo de veículo', () => {
      cy.wait('@listHomologacoes')

      // Find and use search input
      cy.get('[data-testid="global-search"]').type('BMW 320i')
      cy.get('[data-testid="search-submit"]').click()

      cy.wait('@listHomologacoes')

      // Verify results are displayed
      cy.get('[data-testid="search-results"]').should('be.visible')
      cy.get('[data-testid="search-result-item"]').should('have.length.greaterThan', 0)
    })

    it('deve executar busca com fuzzy matching', () => {
      cy.get('[data-testid="global-search"]').type('bm 32')

      // Fuzzy matching should find "BMW 320i"
      cy.get('[data-testid="search-suggestion"]').first().should('contain', 'BMW')
    })

    it('deve ignorar acentos na busca', () => {
      cy.get('[data-testid="global-search"]').type('Mercedés')

      cy.wait('@listHomologacoes')
      cy.get('[data-testid="search-results"]').should('be.visible')
    })

    it('deve exibir mensagem quando nenhum resultado encontrado', () => {
      cy.get('[data-testid="global-search"]').type('Ferrari 488')
      cy.get('[data-testid="search-submit"]').click()

      cy.wait('@listHomologacoes')
      cy.get('[data-testid="no-results-message"]').should(
        'contain',
        'Nenhuma homologação encontrada'
      )
    })

    it('deve limpar busca ao clicar no botão de limpar', () => {
      cy.get('[data-testid="global-search"]').type('BMW')
      cy.get('[data-testid="search-clear"]').click()

      cy.get('[data-testid="global-search"]').should('have.value', '')
    })
  })

  describe('Homologação Details', () => {
    beforeEach(() => {
      cy.login()
      cy.wait('@listHomologacoes')
    })

    it('deve exibir detalhes completos de uma homologação', () => {
      // Click on first result
      cy.get('[data-testid="search-result-item"]').first().click()

      cy.wait('@getHomologacao')

      // Verify detail page is loaded
      cy.url().should('match', /\/homologacao\/\d+/)

      // Verify content sections
      cy.get('[data-testid="vehicle-info-section"]').should('be.visible')
      cy.get('[data-testid="tire-options-section"]').should('be.visible')
      cy.get('[data-testid="wheel-options-section"]').should('be.visible')
      cy.get('[data-testid="pressure-specs-section"]').should('be.visible')
    })

    it('deve exibir informações do veículo', () => {
      cy.get('[data-testid="search-result-item"]').first().click()
      cy.wait('@getHomologacao')

      cy.get('[data-testid="vehicle-manufacturer"]').should('contain', 'BMW')
      cy.get('[data-testid="vehicle-model"]').should('contain', '320i')
      cy.get('[data-testid="vehicle-year"]').should('contain', '2024')
    })

    it('deve exibir opções de pneus', () => {
      cy.get('[data-testid="search-result-item"]').first().click()
      cy.wait('@getHomologacao')

      cy.get('[data-testid="tire-options-section"] [data-testid="tire-item"]').should(
        'have.length.greaterThan',
        0
      )

      // Verify tire details
      cy.get('[data-testid="tire-manufacturer"]').should('be.visible')
      cy.get('[data-testid="tire-model"]').should('be.visible')
      cy.get('[data-testid="tire-size"]').should('be.visible')
    })

    it('deve exibir opções de rodas', () => {
      cy.get('[data-testid="search-result-item"]').first().click()
      cy.wait('@getHomologacao')

      cy.get('[data-testid="wheel-options-section"] [data-testid="wheel-item"]').should(
        'have.length.greaterThan',
        0
      )

      // Verify wheel details
      cy.get('[data-testid="wheel-diameter"]').should('be.visible')
      cy.get('[data-testid="wheel-width"]').should('be.visible')
    })
  })

  describe('Filters', () => {
    beforeEach(() => {
      cy.login()
      cy.wait('@listHomologacoes')
    })

    it('deve filtrar por fabricante', () => {
      cy.get('[data-testid="filter-fabricante"]').click()
      cy.get('[data-testid="fabricante-option-bmw"]').click()

      cy.wait('@listHomologacoes')

      // Verify results are filtered
      cy.get('[data-testid="search-result-item"]').each(($el) => {
        cy.wrap($el).should('contain', 'BMW')
      })
    })

    it('deve filtrar por ano', () => {
      cy.get('[data-testid="filter-ano"]').click()
      cy.get('[data-testid="ano-option-2024"]').click()

      cy.wait('@listHomologacoes')

      // Verify results
      cy.get('[data-testid="search-result-item"]').first().should('be.visible')
    })

    it('deve filtrar por status', () => {
      cy.get('[data-testid="filter-status"]').click()
      cy.get('[data-testid="status-option-ativo"]').click()

      cy.wait('@listHomologacoes')

      // Verify results
      cy.get('[data-testid="search-result-item"]').first().should('be.visible')
    })

    it('deve combinar múltiplos filtros', () => {
      cy.get('[data-testid="filter-fabricante"]').click()
      cy.get('[data-testid="fabricante-option-bmw"]').click()

      cy.get('[data-testid="filter-ano"]').click()
      cy.get('[data-testid="ano-option-2024"]').click()

      cy.wait('@listHomologacoes')

      // Verify combined filter results
      cy.get('[data-testid="applied-filters"]').should('be.visible')
      cy.get('[data-testid="applied-filters"]').should('contain', 'BMW')
      cy.get('[data-testid="applied-filters"]').should('contain', '2024')
    })

    it('deve permitir limpar todos os filtros', () => {
      // Apply filters
      cy.get('[data-testid="filter-fabricante"]').click()
      cy.get('[data-testid="fabricante-option-bmw"]').click()

      cy.wait('@listHomologacoes')

      // Clear filters
      cy.get('[data-testid="clear-all-filters"]').click()

      cy.wait('@listHomologacoes')

      // Verify all filters are cleared
      cy.get('[data-testid="applied-filters"]').should('not.exist')
    })
  })

  describe('Logout', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve fazer logout com sucesso', () => {
      cy.get('[data-testid="user-menu"]').click()
      cy.get('[data-testid="logout-button"]').click()

      cy.url().should('include', '/login')
      cy.get('h1').should('contain', 'Login')
    })

    it('deve limpar sessão ao fazer logout', () => {
      cy.logout()

      // Tentando acessar dashboard deve redirecionar para login
      cy.visit('/dashboard')
      cy.url().should('include', '/login')
    })
  })
})
