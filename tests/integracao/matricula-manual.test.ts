import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import {
  registrarMatriculaManualNovoAluno,
  registrarMatriculaParaAlunoExistente,
} from '@/lib/admin/matricula-manual'

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

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

describe('registrarMatriculaManualNovoAluno', () => {
  it('cria a matricula ja como paga, com pagamento manual', async () => {
    const r = await registrarMatriculaManualNovoAluno({
      cursoSlug: 'auxiliar-de-cozinha',
      unidade: { uf: 'DF', unidadeId: await unidadeDf() },
      interno: {
        nome: 'Aluno Manual Teste',
        cpf: novoCpf(),
        matriculaPrisional: 'MP-MANUAL-0001',
      },
      responsavel: {
        nome: 'Responsavel Manual',
        cpf: novoCpf(),
        email: `manual-${Date.now()}@exemplo.com`,
        telefone: '61999990000',
        parentesco: 'Mãe',
      },
    })

    expect(r.ok).toBe(true)
    if (!r.ok) return

    const { data: matricula } = await admin
      .from('matriculas')
      .select('status, total_centavos')
      .eq('id', r.matriculaId)
      .single()

    expect(matricula!.status).toBe('paga')

    const { data: pagamento } = await admin
      .from('pagamentos')
      .select('metodo, status, valor_centavos')
      .eq('gateway', 'manual')
      .eq('gateway_ref', `manual-${r.codigo}`)
      .single()

    expect(pagamento!.metodo).toBe('manual')
    expect(pagamento!.status).toBe('pago')
    expect(pagamento!.valor_centavos).toBe(matricula!.total_centavos)

    const { data: eventos } = await admin
      .from('matricula_eventos')
      .select('para_status, nota')
      .eq('matricula_id', r.matriculaId)
      .order('created_at')

    expect(eventos!.map((e) => e.para_status)).toEqual([
      'aguardando_pagamento',
      'paga',
    ])
  })
})

describe('registrarMatriculaParaAlunoExistente', () => {
  it('reaproveita interno e responsavel, so pede o curso', async () => {
    const primeira = await registrarMatriculaManualNovoAluno({
      cursoSlug: 'auxiliar-de-cozinha',
      unidade: { uf: 'DF', unidadeId: await unidadeDf() },
      interno: {
        nome: 'Aluno Segunda Matricula',
        cpf: novoCpf(),
        matriculaPrisional: 'MP-MANUAL-0002',
      },
      responsavel: {
        nome: 'Responsavel Segunda',
        cpf: novoCpf(),
        email: `manual2-${Date.now()}@exemplo.com`,
        telefone: '61999991111',
        parentesco: 'Pai',
      },
    })
    expect(primeira.ok).toBe(true)
    if (!primeira.ok) return

    const { data: interno } = await admin
      .from('internos').select('id, responsavel_id')
      .eq('matricula_prisional', 'MP-MANUAL-0002').single()

    const segunda = await registrarMatriculaParaAlunoExistente({
      internoId: interno!.id,
      cursoSlug: 'formacao-para-eletricista',
    })
    expect(segunda.ok).toBe(true)

    const { data: matriculas } = await admin
      .from('matriculas')
      .select('responsavel_id, status')
      .eq('interno_id', interno!.id)

    expect(matriculas!.length).toBe(2)
    expect(matriculas!.every((m) => m.responsavel_id === interno!.responsavel_id)).toBe(true)
    expect(matriculas!.every((m) => m.status === 'paga')).toBe(true)
  })

  it('recusa aluno inexistente', async () => {
    const r = await registrarMatriculaParaAlunoExistente({
      internoId: '00000000-0000-0000-0000-000000000000',
      cursoSlug: 'auxiliar-de-cozinha',
    })
    expect(r).toEqual({ ok: false, erro: 'Aluno não encontrado' })
  })
})
