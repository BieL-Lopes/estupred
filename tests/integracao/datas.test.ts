import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { avancarStatus } from '@/lib/matricula/avancar'
import { calcularDataProva } from '@/lib/matricula/prazos'

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

/**
 * Cada chamada cria um aluno próprio. Herdar o interno de uma matrícula
 * semeada faria a nova nascer para um aluno que já tem curso em andamento, e
 * a regra de um curso por vez barraria o envio de material — que não é o que
 * estes testes querem exercitar.
 */
async function matriculaNoStatus(
  status: Database['public']['Enums']['status_matricula'],
) {
  const { data: base } = await admin
    .from('matriculas')
    .select('curso_id, responsavel_id, unidade_prisional_id')
    .limit(1)
    .single()

  const { data: interno } = await admin
    .from('internos')
    .insert({
      nome: 'Aluno De Teste Datas',
      cpf: novoCpf(),
      matricula_prisional: `MP-DAT-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      unidade_prisional_id: base!.unidade_prisional_id,
    })
    .select('id')
    .single()

  const { data } = await admin
    .from('matriculas')
    .insert({
      ...base!,
      interno_id: interno!.id,
      preco_centavos: 18500,
      frete_centavos: 0,
      status,
    })
    .select()
    .single()

  return data!
}

describe('datas carimbadas pela transição', () => {
  it('grava a data da compra ao confirmar o pagamento', async () => {
    const m = await matriculaNoStatus('aguardando_pagamento')
    await avancarStatus({ matriculaId: m.id, para: 'paga', hoje: '2026-03-10' })

    const { data } = await admin
      .from('matriculas')
      .select('data_compra, data_inicio, data_prova')
      .eq('id', m.id)
      .single()

    expect(data!.data_compra).toBe('2026-03-10')
    // Início e prova só existem quando o material é entregue.
    expect(data!.data_inicio).toBeNull()
    expect(data!.data_prova).toBeNull()
  })

  it('grava início e prova só na entrega, não na produção nem no envio', async () => {
    const m = await matriculaNoStatus('paga')

    await avancarStatus({
      matriculaId: m.id,
      para: 'material_em_producao',
      hoje: '2026-01-05',
    })
    await avancarStatus({
      matriculaId: m.id,
      para: 'material_a_caminho',
      hoje: '2026-01-06',
    })

    const { data: antes } = await admin
      .from('matriculas')
      .select('data_inicio, data_prova')
      .eq('id', m.id)
      .single()

    // Produção e envio não carimbam nada: o relógio dos 45 dias só começa
    // quando o material chega na unidade.
    expect(antes!.data_inicio).toBeNull()
    expect(antes!.data_prova).toBeNull()

    await avancarStatus({
      matriculaId: m.id,
      para: 'material_entregue',
      hoje: '2026-01-07',
    })

    const { data } = await admin
      .from('matriculas')
      .select('data_inicio, data_prova')
      .eq('id', m.id)
      .single()

    expect(data!.data_inicio).toBe('2026-01-07')
    // 45 dias corridos, mesmo caindo num sábado.
    expect(data!.data_prova).toBe('2026-02-21')
    expect(data!.data_prova).toBe(calcularDataProva('2026-01-07'))
  })

  it('a data da compra é diferente da data de início, como o cliente pediu', async () => {
    const m = await matriculaNoStatus('aguardando_pagamento')
    await avancarStatus({ matriculaId: m.id, para: 'paga', hoje: '2026-01-05' })
    for (const para of [
      'material_em_producao',
      'material_a_caminho',
      'material_entregue',
    ] as const) {
      await avancarStatus({ matriculaId: m.id, para, hoje: '2026-02-02' })
    }

    const { data } = await admin
      .from('matriculas')
      .select('data_compra, data_inicio, data_prova')
      .eq('id', m.id)
      .single()

    expect(data!.data_compra).toBe('2026-01-05')
    expect(data!.data_inicio).toBe('2026-02-02')
    expect(data!.data_compra).not.toBe(data!.data_inicio)
    expect(data!.data_prova).toBe(calcularDataProva('2026-02-02'))
  })

  it('não sobrescreve a data de compra em transições posteriores', async () => {
    const m = await matriculaNoStatus('aguardando_pagamento')
    await avancarStatus({ matriculaId: m.id, para: 'paga', hoje: '2026-01-05' })
    for (const para of [
      'material_em_producao',
      'material_a_caminho',
      'material_entregue',
    ] as const) {
      await avancarStatus({ matriculaId: m.id, para, hoje: '2026-02-02' })
    }
    await avancarStatus({
      matriculaId: m.id,
      para: 'prova_aplicada',
      hoje: '2026-03-19',
    })

    const { data } = await admin
      .from('matriculas')
      .select('data_compra, data_inicio')
      .eq('id', m.id)
      .single()

    expect(data!.data_compra).toBe('2026-01-05')
    expect(data!.data_inicio).toBe('2026-02-02')
  })

  it('aceita RG no cadastro do interno', async () => {
    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .select('id')
      .limit(1)
      .single()

    const { data, error } = await admin
      .from('internos')
      .insert({
        nome: 'Interno Com RG',
        cpf: '52998224725',
        rg: 'MG-12.345.678',
        matricula_prisional: 'MP-RG-1',
        unidade_prisional_id: unidade!.id,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data!.rg).toBe('MG-12.345.678')

    await admin.from('internos').delete().eq('id', data!.id)
  })
})
