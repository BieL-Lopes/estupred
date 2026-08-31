import { describe, expect, it } from 'vitest'
import {
  EsquemaInterno,
  EsquemaResponsavel,
  EsquemaUnidade,
} from '@/lib/dominio/esquemas'

describe('EsquemaUnidade', () => {
  it('aceita UF válida com unidade', () => {
    const r = EsquemaUnidade.safeParse({
      uf: 'DF',
      unidadeId: '11111111-1111-1111-1111-111111111111',
    })
    expect(r.success).toBe(true)
  })

  it('rejeita UF inexistente', () => {
    const r = EsquemaUnidade.safeParse({
      uf: 'XX',
      unidadeId: '11111111-1111-1111-1111-111111111111',
    })
    expect(r.success).toBe(false)
  })

  it('rejeita unidade que não é uuid', () => {
    const r = EsquemaUnidade.safeParse({ uf: 'DF', unidadeId: 'qualquer' })
    expect(r.success).toBe(false)
  })
})

describe('EsquemaInterno', () => {
  const base = {
    nome: 'João da Silva',
    cpf: '529.982.247-25',
    matriculaPrisional: 'MP-2024-0001',
  }

  it('aceita dados válidos e normaliza o CPF', () => {
    const r = EsquemaInterno.safeParse(base)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.cpf).toBe('52998224725')
  })

  it('aceita RG, opcional — nem todo interno tem o documento em mãos', () => {
    const r = EsquemaInterno.safeParse({ ...base, rg: '1.234.567' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.rg).toBe('1.234.567')
  })

  it('funciona sem RG', () => {
    const r = EsquemaInterno.safeParse(base)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.rg).toBeUndefined()
  })

  it('aceita RG vazio — um form sempre manda o campo, mesmo em branco', () => {
    // Achado testando o wizard de verdade no navegador: FormData sempre
    // inclui o input, então "opcional" precisa aceitar '', não só ausência.
    const r = EsquemaInterno.safeParse({ ...base, rg: '' })
    expect(r.success).toBe(true)
  })

  it('rejeita CPF com dígito verificador errado', () => {
    const r = EsquemaInterno.safeParse({ ...base, cpf: '529.982.247-24' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]!.message).toMatch(/CPF/)
  })

  it('exige nome completo, não só o primeiro', () => {
    const r = EsquemaInterno.safeParse({ ...base, nome: 'João' })
    expect(r.success).toBe(false)
  })

  it('exige matrícula prisional', () => {
    const r = EsquemaInterno.safeParse({ ...base, matriculaPrisional: '' })
    expect(r.success).toBe(false)
  })
})

describe('EsquemaResponsavel', () => {
  const base = {
    nome: 'Ana Souza',
    cpf: '39053344705',
    email: 'ana@exemplo.com',
    telefone: '(61) 98888-8888',
    parentesco: 'Cônjuge',
  }

  it('aceita dados válidos — sem senha, o acesso é por CPF', () => {
    expect(EsquemaResponsavel.safeParse(base).success).toBe(true)
  })

  it('normaliza o telefone para só dígitos', () => {
    const r = EsquemaResponsavel.safeParse(base)
    if (r.success) expect(r.data.telefone).toBe('61988888888')
  })

  it('rejeita e-mail inválido', () => {
    expect(EsquemaResponsavel.safeParse({ ...base, email: 'ana@' }).success).toBe(false)
  })

  it('rejeita telefone com menos de 10 dígitos', () => {
    expect(
      EsquemaResponsavel.safeParse({ ...base, telefone: '619888' }).success,
    ).toBe(false)
  })
})
