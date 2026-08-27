import { describe, expect, it } from 'vitest'
import { cpfValido, formatarCpf, normalizarCpf } from '@/lib/dominio/cpf'

describe('normalizarCpf', () => {
  it('remove pontuação', () => {
    expect(normalizarCpf('529.982.247-25')).toBe('52998224725')
  })

  it('remove espaços', () => {
    expect(normalizarCpf(' 529 982 247 25 ')).toBe('52998224725')
  })
})

describe('cpfValido', () => {
  it('aceita um CPF válido com pontuação', () => {
    expect(cpfValido('529.982.247-25')).toBe(true)
  })

  it('aceita um CPF válido sem pontuação', () => {
    expect(cpfValido('52998224725')).toBe(true)
  })

  it('rejeita dígito verificador errado', () => {
    expect(cpfValido('529.982.247-24')).toBe(false)
  })

  it('rejeita todos os dígitos iguais', () => {
    expect(cpfValido('111.111.111-11')).toBe(false)
    expect(cpfValido('00000000000')).toBe(false)
  })

  it('rejeita comprimento errado', () => {
    expect(cpfValido('5299822472')).toBe(false)
    expect(cpfValido('529982247251')).toBe(false)
  })

  it('rejeita vazio', () => {
    expect(cpfValido('')).toBe(false)
  })
})

describe('formatarCpf', () => {
  it('aplica a máscara', () => {
    expect(formatarCpf('52998224725')).toBe('529.982.247-25')
  })

  it('devolve a entrada quando não dá para formatar', () => {
    expect(formatarCpf('529')).toBe('529')
  })
})
