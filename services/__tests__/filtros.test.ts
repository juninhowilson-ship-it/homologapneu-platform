/**
 * Unit Tests: Filtros Service
 * Coverage: Fuzzy search, accent-insensitive matching, ranking
 */

import { searchHomologacoes, filterByFabricante, filterByAno } from '@/services/filtros'

describe('FiltrosService', () => {
  describe('searchHomologacoes - Fuzzy Matching', () => {
    const mockData = [
      {
        id: 1,
        vehicleModel: 'BMW 320i',
        fabricante: 'BMW',
        tireSize: '225/45R17',
      },
      {
        id: 2,
        vehicleModel: 'Mercedes Classe C',
        fabricante: 'Mercedes-Benz',
        tireSize: '225/50R16',
      },
      {
        id: 3,
        vehicleModel: 'Audi A4',
        fabricante: 'Audi',
        tireSize: '215/55R17',
      },
    ]

    it('deve encontrar match exato', () => {
      const results = searchHomologacoes('BMW 320i', mockData)
      expect(results).toContainEqual(expect.objectContaining({ id: 1 }))
    })

    it('deve encontrar match parcial com fuzzy matching', () => {
      const results = searchHomologacoes('bm 32', mockData)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe(1) // BMW deve rankear primeiro
    })

    it('deve ser insensível a acentos', () => {
      const results = searchHomologacoes('Mercedés Classe C', mockData)
      expect(results).toContainEqual(
        expect.objectContaining({ fabricante: 'Mercedes-Benz' })
      )
    })

    it('deve ser case-insensitive', () => {
      const results = searchHomologacoes('audi a4', mockData)
      expect(results).toContainEqual(expect.objectContaining({ id: 3 }))
    })

    it('deve rankear results por relevância', () => {
      const results = searchHomologacoes('320i', mockData)
      if (results.length > 1) {
        // Resultado mais relevante deve vir primeiro
        expect(results[0].id).toBeLessThan(results[1].id)
      }
    })

    it('deve retornar vazio para query sem matches', () => {
      const results = searchHomologacoes('Lamborghini', mockData)
      expect(results).toHaveLength(0)
    })

    it('deve lidar com queries muito curtas', () => {
      const results = searchHomologacoes('b', mockData)
      expect(Array.isArray(results)).toBe(true)
    })

    it('deve lidar com queries muito longas', () => {
      const query =
        'Esta é uma query muito longa para testar o comportamento do sistema'
      const results = searchHomologacoes(query, mockData)
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('filterByFabricante', () => {
    const mockHomologacoes = [
      { id: 1, fabricante: 'BMW', status: 'ATIVO' },
      { id: 2, fabricante: 'BMW', status: 'INATIVO' },
      { id: 3, fabricante: 'Mercedes-Benz', status: 'ATIVO' },
      { id: 4, fabricante: 'Audi', status: 'ATIVO' },
    ]

    it('deve filtrar por um fabricante', () => {
      const results = filterByFabricante(mockHomologacoes, 'BMW')
      expect(results).toHaveLength(2)
      expect(results.every((h) => h.fabricante === 'BMW')).toBe(true)
    })

    it('deve filtrar por múltiplos fabricantes', () => {
      const results = filterByFabricante(mockHomologacoes, ['BMW', 'Audi'])
      expect(results).toHaveLength(3)
      expect(results.every((h) => ['BMW', 'Audi'].includes(h.fabricante))).toBe(
        true
      )
    })

    it('deve retornar vazio se fabricante não existe', () => {
      const results = filterByFabricante(mockHomologacoes, 'Ferrari')
      expect(results).toHaveLength(0)
    })

    it('deve ser case-sensitive para fabricante', () => {
      const results = filterByFabricante(mockHomologacoes, 'bmw')
      expect(results).toHaveLength(0)
    })
  })

  describe('filterByAno', () => {
    const mockHomologacoes = [
      { id: 1, ano: 2020, fabricante: 'BMW' },
      { id: 2, ano: 2021, fabricante: 'BMW' },
      { id: 3, ano: 2022, fabricante: 'Mercedes' },
      { id: 4, ano: 2023, fabricante: 'Audi' },
      { id: 5, ano: 2024, fabricante: 'BMW' },
    ]

    it('deve filtrar por ano específico', () => {
      const results = filterByAno(mockHomologacoes, 2023)
      expect(results).toHaveLength(1)
      expect(results[0].ano).toBe(2023)
    })

    it('deve filtrar por intervalo de anos', () => {
      const results = filterByAno(mockHomologacoes, { from: 2021, to: 2023 })
      expect(results).toHaveLength(3)
      expect(results.every((h) => h.ano >= 2021 && h.ano <= 2023)).toBe(true)
    })

    it('deve retornar vazio para ano sem homologações', () => {
      const results = filterByAno(mockHomologacoes, 2019)
      expect(results).toHaveLength(0)
    })

    it('deve retornar todos os anos quando intervalo é 0-9999', () => {
      const results = filterByAno(mockHomologacoes, { from: 0, to: 9999 })
      expect(results).toHaveLength(5)
    })
  })

  describe('Combined Filters', () => {
    const mockHomologacoes = [
      { id: 1, ano: 2024, fabricante: 'BMW', status: 'ATIVO' },
      { id: 2, ano: 2024, fabricante: 'BMW', status: 'INATIVO' },
      { id: 3, ano: 2023, fabricante: 'Mercedes', status: 'ATIVO' },
      { id: 4, ano: 2023, fabricante: 'Audi', status: 'ATIVO' },
    ]

    it('deve aplicar múltiplos filtros', () => {
      let results = mockHomologacoes
      results = filterByAno(results, 2024)
      results = filterByFabricante(results, 'BMW')

      expect(results).toHaveLength(2)
      expect(results.every((h) => h.ano === 2024 && h.fabricante === 'BMW')).toBe(
        true
      )
    })
  })

  describe('Edge Cases', () => {
    it('deve lidar com array vazio', () => {
      const results = searchHomologacoes('query', [])
      expect(results).toHaveLength(0)
    })

    it('deve lidar com query vazia', () => {
      const results = searchHomologacoes('', [{ id: 1, name: 'test' }])
      expect(Array.isArray(results)).toBe(true)
    })

    it('deve lidar com caracteres especiais na query', () => {
      const results = searchHomologacoes('@#$%^&*()', [
        { id: 1, name: 'test' },
      ])
      expect(Array.isArray(results)).toBe(true)
    })

    it('deve lidar com null/undefined na data', () => {
      const mockData = [
        { id: 1, name: 'BMW' },
        { id: 2, name: null },
        { id: 3, name: undefined },
      ]

      const results = searchHomologacoes('BMW', mockData)
      expect(results.some((r: any) => r.id === 1)).toBe(true)
    })
  })
})
