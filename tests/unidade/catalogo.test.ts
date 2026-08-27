import { describe, expect, it } from 'vitest'
import { cursoDisponivelNaUf } from '@/lib/catalogo'

describe('cursoDisponivelNaUf', () => {
  it('trata lista vazia como disponível em todo lugar', () => {
    expect(cursoDisponivelNaUf([], 'AC')).toBe(true)
    expect(cursoDisponivelNaUf([], 'SP')).toBe(true)
  })

  it('respeita a lista quando ela existe', () => {
    expect(cursoDisponivelNaUf(['DF', 'GO'], 'DF')).toBe(true)
    expect(cursoDisponivelNaUf(['DF', 'GO'], 'SP')).toBe(false)
  })
})
