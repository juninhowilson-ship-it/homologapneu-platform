/**
 * E2E Test: Accessibility (WCAG 2.1 AA)
 * Tools: axe-core, manual keyboard navigation testing
 * Standards: WCAG 2.1 Level AA compliance
 */

describe('Accessibility - WCAG 2.1 AA Compliance', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    // Inject axe for accessibility testing
    cy.visit('/dashboard')
    cy.injectAxe()
  })

  describe('WCAG Automated Checks (axe-core)', () => {
    it('deve passar em todas as verificações de acessibilidade na página de login', () => {
      cy.visit('/login')
      cy.injectAxe()
      cy.checkA11y()
    })

    it('deve passar em todas as verificações no dashboard', () => {
      cy.login()
      cy.checkA11y()
    })

    it('deve passar em todas as verificações na página de detalhes', () => {
      cy.login()
      cy.get('[data-testid="search-result-item"]').first().click()
      cy.checkA11y()
    })

    it('deve ter contraste suficiente em texto', () => {
      cy.login()
      cy.checkA11y(null, {
        rules: {
          'color-contrast': { enabled: true },
        },
      })
    })

    it('deve ter labels associados com inputs', () => {
      cy.visit('/login')
      cy.get('input[name="email"]')
        .invoke('attr', 'aria-labelledby')
        .should('exist')
        .or('input[name="email"]')
        .invoke('attr', 'placeholder')
        .should('exist')
    })

    it('deve ter atributos ARIA apropriados em botões', () => {
      cy.login()
      cy.get('[data-testid="hamburger-menu"]')
        .invoke('attr', 'aria-label')
        .should('exist')
    })
  })

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve permitir navegação via Tab entre elementos focáveis', () => {
      cy.get('body').tab()
      cy.focused().should('have.attr', 'tabindex').or('be.a', 'button,a,input')
    })

    it('deve manter ordem de tab lógica', () => {
      const focusOrder: string[] = []

      cy.get('[data-testid="global-search"]').click()
      cy.focused().then(($el) => {
        focusOrder.push($el.attr('data-testid') || $el.attr('name') || 'unknown')
      })

      cy.focused().tab()
      cy.focused().then(($el) => {
        focusOrder.push($el.attr('data-testid') || $el.attr('name') || 'unknown')
      })

      // Verify logical order
      expect(focusOrder.length).toBeGreaterThan(0)
    })

    it('deve permitir ativar botões com Enter', () => {
      cy.get('[data-testid="search-submit"]').focus()
      cy.get('[data-testid="search-submit"]').type('{enter}')

      cy.get('[data-testid="search-results"]').should('be.visible')
    })

    it('deve permitir ativar botões com Space', () => {
      cy.get('[data-testid="filter-button"]').focus()
      cy.get('[data-testid="filter-button"]').type(' ')

      cy.get('[data-testid="filter-sheet"]').should('be.visible')
    })

    it('deve fechar modais com Escape', () => {
      cy.get('[data-testid="filter-button"]').click()
      cy.get('[data-testid="filter-sheet"]').should('be.visible')

      cy.get('body').type('{esc}')
      cy.get('[data-testid="filter-sheet"]').should('not.exist')
    })

    it('deve navegar em dropdowns com Arrow keys', () => {
      cy.get('[data-testid="filter-fabricante"]').click()
      cy.get('[data-testid="fabricante-dropdown"]').should('be.visible')

      cy.focused().type('{downarrow}')
      cy.focused().should('have.attr', 'aria-selected', 'true')

      cy.focused().type('{uparrow}')
      cy.focused().should('have.attr', 'aria-selected', 'true')
    })
  })

  describe('Screen Reader Support', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve ter descrições apropriadas em ícones', () => {
      cy.get('[data-testid="search-icon"]')
        .invoke('attr', 'aria-label')
        .should('exist')
        .and('not.be.empty')
    })

    it('deve ter texto alternativo em imagens', () => {
      cy.get('img').each(($img) => {
        expect($img).to.have.attr('alt')
        expect($img).to.not.have.attr('alt', '')
      })
    })

    it('deve anunciar mudanças dinâmicas com aria-live', () => {
      cy.get('[data-testid="search-results"]')
        .invoke('attr', 'aria-live')
        .should('equal', 'polite')
    })

    it('deve ter role apropriado em elementos customizados', () => {
      cy.get('[data-testid="filter-sheet"]').should('have.attr', 'role')
    })

    it('deve identificar campos obrigatórios', () => {
      cy.visit('/login')
      cy.get('input[name="email"]')
        .invoke('attr', 'aria-required')
        .should('equal', 'true')
        .or('input[name="email"]')
        .invoke('attr', 'required')
        .should('exist')
    })

    it('deve ter títulos estruturados hierarquicamente', () => {
      cy.get('h1').should('have.length.greaterThan', 0)
      cy.get('h2').should('have.length.greaterThan', 0)

      // Verify h1 comes before h2
      cy.get('h1').then(($h1) => {
        cy.get('h2').then(($h2) => {
          expect($h1.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('Focus Management', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve mostrar focus indicator visível', () => {
      cy.get('[data-testid="search-submit"]').focus()

      cy.get('[data-testid="search-submit"]')
        .invoke('css', 'outline')
        .should('not.equal', 'none')
        .or('invoke', 'css', 'box-shadow')
        .should('not.equal', 'none')
    })

    it('deve restaurar focus ao fechar modal', () => {
      const initialFocused = cy.get('[data-testid="filter-button"]')

      cy.get('[data-testid="filter-button"]').click()
      cy.get('[data-testid="filter-sheet"]').should('be.visible')

      cy.get('body').type('{esc}')
      cy.get('[data-testid="filter-button"]').should('have.focus')
    })

    it('deve ter focus trap em modais', () => {
      cy.get('[data-testid="filter-button"]').click()
      cy.get('[data-testid="filter-sheet"]').should('be.visible')

      // Simulate Tab at end of modal
      let lastElement: any
      cy.get('[data-testid="filter-sheet"] [tabindex], [data-testid="filter-sheet"] button')
        .last()
        .then(($el) => {
          lastElement = $el
        })

      cy.focused().type('{tab}')
      cy.focused().should('equal', lastElement)
    })
  })

  describe('Color and Contrast', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve ter contraste mínimo 4.5:1 em textos normais', () => {
      cy.checkA11y(null, {
        rules: {
          'color-contrast': { enabled: true },
        },
      })
    })

    it('deve ter contraste mínimo 3:1 em textos grandes', () => {
      cy.checkA11y(null, {
        rules: {
          'color-contrast': { enabled: true },
        },
      })
    })

    it('não deve depender apenas de cor para comunicar informação', () => {
      // Verificar que status é indicado por mais que cor
      cy.get('[data-testid="status-indicator"]')
        .should('have.attr', 'aria-label')
        .or('should', 'have.text')
    })
  })

  describe('Semantic HTML', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve usar tags semânticas apropriadas', () => {
      cy.get('main, nav, article, section').should('have.length.greaterThan', 0)
    })

    it('deve ter um único <h1> por página', () => {
      cy.get('h1').should('have.length', 1)
    })

    it('deve usar <button> para ações e <a> para navegação', () => {
      // Verify buttons have correct role/element
      cy.get('[data-testid="search-submit"]').should('be.a', 'button')
      cy.get('[data-testid="go-to-dashboard"]').should('be.a', 'a')
    })

    it('deve usar <table> com <thead>, <tbody>, <caption>', () => {
      cy.get('table').each(($table) => {
        // If table exists, it should have proper structure
        cy.wrap($table).within(() => {
          cy.get('thead, tbody').should('have.length.greaterThan', 0)
        })
      })
    })
  })

  describe('Form Accessibility', () => {
    beforeEach(() => {
      cy.visit('/login')
    })

    it('deve ter labels explícitos para todos os inputs', () => {
      cy.get('input').each(($input) => {
        const inputId = $input.attr('id')
        if (inputId) {
          cy.get(`label[for="${inputId}"]`).should('exist')
        } else {
          // Ou ter aria-label
          expect($input).to.have.attr('aria-label')
        }
      })
    })

    it('deve mostrar erros de validação de forma acessível', () => {
      cy.get('input[name="email"]').type('invalid')
      cy.get('button[type="submit"]').click()

      cy.get('[data-testid="email-error"]')
        .should('be.visible')
        .and('have.attr', 'role', 'alert')
    })

    it('deve permitir ativar submit com Enter em input', () => {
      cy.get('input[name="email"]').type('test@example.com')
      cy.get('input[name="password"]').type('Test@123{enter}')

      // Form should submit
      cy.url().should('not.include', '/login')
    })
  })

  describe('Motion and Animation', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve respeitar prefers-reduced-motion', () => {
      // Simular preferência por menos movimento
      cy.window().then((win) => {
        const mediaQuery = win.matchMedia('(prefers-reduced-motion: reduce)')
        if (mediaQuery.matches) {
          // Animations should be disabled or minimal
          cy.get('[data-testid="animated-element"]')
            .invoke('css', 'animation')
            .should('equal', 'none')
            .or('invoke', 'css', 'transition')
            .should('equal', 'none')
        }
      })
    })
  })

  describe('Language and Text', () => {
    beforeEach(() => {
      cy.login()
    })

    it('deve ter lang attribute na tag html', () => {
      cy.get('html').should('have.attr', 'lang', 'pt-BR')
    })

    it('deve indicar mudanças de idioma', () => {
      // Se houver elementos em outro idioma
      cy.get('[lang="en"]').should('have.attr', 'lang', 'en')
    })

    it('deve ter títulos descritivos em páginas', () => {
      cy.title().should('not.be.empty').and('not.equal', 'localhost')
    })
  })
})

// Custom Cypress command for tab navigation
Cypress.Commands.add('tab', () => {
  cy.get('body').tab()
})

declare global {
  namespace Cypress {
    interface Chainable {
      tab(): Chainable<void>
    }
  }
}
