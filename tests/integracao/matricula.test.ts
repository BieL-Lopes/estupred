import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { criarMatricula } from '@/lib/matricula/acoes'

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

/** CPF com checksum válido, gerado por teste — não pertence a pessoa real. */
function novoCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  function dv(digs: number[], pesoInicial: number) {
    let soma = 0
    digs.forEach((d, i) => {
      soma += d * (pesoInicial - i)
    })
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  const d1 = dv(base, 10)
  const d2 = dv([...base, d1], 11)
  return [...base, d1, d2].join('')
}

async function unidadeDf(): Promise<string> {
  const { data } = await admin
    .from('unidades_prisionais')
    .select('id')
    .eq('uf', 'DF')
    .limit(1)
    .single()
  return data!.id
}

describe('criarMatricula', () => {
  it('cria interno, responsável e matrícula em rascunho', async () => {
    const email = `resp-${Date.now()}@exemplo.com`

    const r = await criarMatricula({
      cursoSlug: 'auxiliar-de-cozinha',
      rascunho: {
        unidade: { uf: 'DF', unidadeId: await unidadeDf() },
        interno: {
          nome: 'Teste da Silva',
          cpf: novoCpf(),
          matriculaPrisional: 'MP-TESTE-0001',
        },
      },
      responsavel: {
        nome: 'Responsavel Teste',
        cpf: novoCpf(),
        email,
        telefone: '61999998888',
        parentesco: 'Mãe',
      },
    })

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.codigo).toMatch(/^EST-\d{4}-\d{5}$/)

    const { data: matricula } = await admin
      .from('matriculas')
      .select('status, preco_centavos, frete_centavos, total_centavos')
      .eq('id', r.matriculaId)
      .single()

    expect(matricula!.status).toBe('rascunho')
    expect(matricula!.frete_centavos).toBe(0) // DF
    expect(matricula!.total_centavos).toBe(matricula!.preco_centavos)

    const { data: perfil } = await admin
      .from('profiles')
      .select('role')
      .eq('email', email)
      .single()
    expect(perfil!.role).toBe('responsavel')
  })

  it('reaproveita o responsável existente numa segunda matrícula com o mesmo CPF', async () => {
    // profiles.cpf é único: criar de novo aqui violaria a constraint. É
    // exatamente o cenário real — a mesma mãe matriculando dois filhos, ou
    // o mesmo filho em dois cursos.
    const cpfResponsavel = novoCpf()
    const unidadeId = await unidadeDf()

    const primeira = await criarMatricula({
      cursoSlug: 'auxiliar-de-cozinha',
      rascunho: {
        unidade: { uf: 'DF', unidadeId },
        interno: {
          nome: 'Primeiro Interno',
          cpf: novoCpf(),
          matriculaPrisional: 'MP-1',
        },
      },
      responsavel: {
        nome: 'Mesma Responsavel',
        cpf: cpfResponsavel,
        email: `resp2a-${Date.now()}@exemplo.com`,
        telefone: '61999997777',
        parentesco: 'Mãe',
      },
    })
    expect(primeira.ok).toBe(true)

    const segunda = await criarMatricula({
      cursoSlug: 'formacao-para-eletricista',
      rascunho: {
        unidade: { uf: 'DF', unidadeId },
        interno: {
          nome: 'Segundo Interno',
          cpf: novoCpf(),
          matriculaPrisional: 'MP-2',
        },
      },
      responsavel: {
        nome: 'Mesma Responsavel',
        cpf: cpfResponsavel,
        email: `resp2b-${Date.now()}@exemplo.com`,
        telefone: '61999997777',
        parentesco: 'Mãe',
      },
    })
    expect(segunda.ok).toBe(true)
    if (!primeira.ok || !segunda.ok) return

    const { data: m1 } = await admin
      .from('matriculas')
      .select('responsavel_id')
      .eq('id', primeira.matriculaId)
      .single()
    const { data: m2 } = await admin
      .from('matriculas')
      .select('responsavel_id')
      .eq('id', segunda.matriculaId)
      .single()

    expect(m1!.responsavel_id).toBe(m2!.responsavel_id)
  })

  it('recusa curso indisponível na UF', async () => {
    const r = await criarMatricula({
      cursoSlug: 'formacao-para-eletricista', // restrito a DF/GO no seed
      rascunho: {
        unidade: { uf: 'SP', unidadeId: await unidadeDf() },
        interno: {
          nome: 'Teste Indisponivel',
          cpf: novoCpf(),
          matriculaPrisional: 'MP-X',
        },
      },
      responsavel: {
        nome: 'Responsavel X',
        cpf: novoCpf(),
        email: `x-${Date.now()}@exemplo.com`,
        telefone: '61999996666',
        parentesco: 'Pai',
      },
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('não está disponível em SP')
  })

  it('rejeita CPF inválido do interno', async () => {
    const r = await criarMatricula({
      cursoSlug: 'auxiliar-de-cozinha',
      rascunho: {
        unidade: { uf: 'DF', unidadeId: await unidadeDf() },
        interno: {
          nome: 'Nome Invalido',
          cpf: '11111111111',
          matriculaPrisional: 'MP-Y',
        },
      },
      responsavel: {
        nome: 'Responsavel Y',
        cpf: novoCpf(),
        email: `y-${Date.now()}@exemplo.com`,
        telefone: '61999995555',
        parentesco: 'Pai',
      },
    })
    expect(r.ok).toBe(false)
  })

  it('recusa curso que não existe', async () => {
    const r = await criarMatricula({
      cursoSlug: 'curso-que-nao-existe',
      rascunho: {
        unidade: { uf: 'DF', unidadeId: await unidadeDf() },
        interno: {
          nome: 'Nome Qualquer',
          cpf: novoCpf(),
          matriculaPrisional: 'MP-Z',
        },
      },
      responsavel: {
        nome: 'Responsavel Z',
        cpf: novoCpf(),
        email: `z-${Date.now()}@exemplo.com`,
        telefone: '61999994444',
        parentesco: 'Pai',
      },
    })
    expect(r).toEqual({ ok: false, erro: 'Curso não encontrado' })
  })
})
