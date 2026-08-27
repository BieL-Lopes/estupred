import { describe, expect, it } from 'vitest'
import { calcularTotal, formatarBRL } from '@/lib/dominio/precos'

describe('calcularTotal', () => {
  it('soma preço e frete', () => {
    expect(calcularTotal(18500, 3200)).toBe(21700)
  })

  it('aceita frete zero', () => {
    expect(calcularTotal(18500, 0)).toBe(18500)
  })

  it('rejeita valores negativos', () => {
    expect(() => calcularTotal(-1, 0)).toThrow('não podem ser negativos')
    expect(() => calcularTotal(100, -1)).toThrow('não podem ser negativos')
  })

  it('rejeita valores fracionários, porque centavos são inteiros', () => {
    expect(() => calcularTotal(185.5, 0)).toThrow('inteiros')
  })
})

describe('formatarBRL', () => {
  it('formata centavos como moeda brasileira', () => {
    expect(formatarBRL(21700)).toBe('R$ 217,00')
  })

  it('formata zero', () => {
    expect(formatarBRL(0)).toBe('R$ 0,00')
  })

  it('formata milhares', () => {
    expect(formatarBRL(123456)).toBe('R$ 1.234,56')
  })
})
