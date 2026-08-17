import { ANO_MINIMO_PADRAO, medidaChave } from '@/lib/medida'

describe('medidaChave', () => {
  describe('formatos que o usuário digita', () => {
    it.each([
      ['205/55R16', '205/55R16'],
      ['205 55 16', '205/55R16'],
      ['205/55 R16', '205/55R16'],
      ['2055516', '205/55R16'],
      ['205-55-16', '205/55R16'],
      ['205x55 16', '205/55R16'],
      ['205/55ZR16', '205/55R16'],
      ['  205/55r16  ', '205/55R16'],
    ])('normaliza %s para %s', (entrada, esperado) => {
      expect(medidaChave(entrada)).toBe(esperado)
    })
  })

  describe('precisão — o bug que motivou a correção', () => {
    // A busca por trigramas dava ~0,7 de similaridade entre 205/55R16 e
    // 205/55R17, o que trazia 72 homologações onde só 8 calçavam a medida.
    it('não confunde aros vizinhos', () => {
      expect(medidaChave('205 55 16')).not.toBe(medidaChave('205 55 17'))
    })

    it('não confunde perfis vizinhos', () => {
      expect(medidaChave('205/55R16')).not.toBe(medidaChave('205/50R16'))
    })

    it('não confunde larguras vizinhas', () => {
      expect(medidaChave('205/55R16')).not.toBe(medidaChave('215/55R16'))
    })
  })

  describe('aros fracionados', () => {
    it('preserva o meio aro', () => {
      expect(medidaChave('245/70R17.5')).toBe('245/70R17.5')
    })
  })

  describe('texto que não é medida', () => {
    it.each([
      'BMW X1 sDrive',
      'Corolla 2024',
      'Toyota',
      'Pirelli P7',
      '',
      '   ',
      '16',
      'abc',
    ])('devolve null para %p', (entrada) => {
      expect(medidaChave(entrada)).toBeNull()
    })

    it('tolera entrada nula sem quebrar', () => {
      expect(medidaChave(null as unknown as string)).toBeNull()
      expect(medidaChave(undefined as unknown as string)).toBeNull()
    })
  })
})

describe('ANO_MINIMO_PADRAO', () => {
  it('recorta o produto em 2020', () => {
    expect(ANO_MINIMO_PADRAO).toBe(2020)
  })
})
