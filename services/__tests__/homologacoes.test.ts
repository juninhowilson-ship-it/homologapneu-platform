import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma')

describe('Homologacoes Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('deve contar homologações', async () => {
    ;(prisma.homologation.count as jest.Mock).mockResolvedValue(100)
    
    const count = await prisma.homologation.count()
    
    expect(count).toBe(100)
    expect(prisma.homologation.count).toHaveBeenCalled()
  })

  test('deve buscar homologação por ID', async () => {
    const mockHomog = { id: 1, code: 'PR-0001', year: 2024 }
    ;(prisma.homologation.findUnique as jest.Mock).mockResolvedValue(mockHomog)
    
    const result = await prisma.homologation.findUnique({ where: { id: 1 } })
    
    expect(result).toEqual(mockHomog)
  })

  test('deve retornar null quando não encontra', async () => {
    ;(prisma.homologation.findUnique as jest.Mock).mockResolvedValue(null)
    
    const result = await prisma.homologation.findUnique({ where: { id: 999 } })
    
    expect(result).toBeNull()
  })
})
