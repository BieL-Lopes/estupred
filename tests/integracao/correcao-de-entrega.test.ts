import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { corrigirDataDeEntrega } from '@/lib/admin/datas'
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

/** Matrícula entregue em `dataDeEntrega`, com compra em `dataDaCompra`. */
async function matriculaEntregue(
  dataDaCompra: string,
  dataDeEntrega: string,
): Promise<string> {
  const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  const { data: unidade } = await admin
    .from('unidades_prisionais')
    .insert({
      uf: 'DF',
      nome: `Unidade Correcao ${marca}`,
      endereco: 'Rua da Correcao, 1',
      cep: '70000000',
    })
    .select('id')
    .single()

  const { data: curso } = await admin
    .from('cursos')
    .select('id, preco_centavos')
    .eq('slug', 'agente-de-portaria')
    .single()

  const { data: interno } = await admin
    .from('internos')
    .insert({
      nome: 'Aluno Correcao Entrega',
      cpf: novoCpf(),
      matricula_prisional: `MP-CORR-${marca}`,
      unidade_prisional_id: unidade!.id,
    })
    .select('id')
    .single()

  const { data: matricula } = await admin
    .from('matriculas')
    .insert({
      interno_id: interno!.id,
      curso_id: curso!.id,
      unidade_prisional_id: unidade!.id,
      preco_centavos: curso!.preco_centavos,
      frete_centavos: 0,
      status: 'aguardando_pagamento',
    })
    .select('id')
    .single()

  await avancarStatus({
    matriculaId: matricula!.id,
    para: 'paga',
    dataDoFato: dataDaCompra,
  })
  for (const para of ['material_em_producao', 'material_a_caminho'] as const) {
    await avancarStatus({ matriculaId: matricula!.id, para })
  }
  await avancarStatus({
    matriculaId: matricula!.id,
    para: 'material_entregue',
    dataDoFato: dataDeEntrega,
  })

  return matricula!.id
}

describe('corrigirDataDeEntrega', () => {
  it('regrava a entrega e recalcula a data da prova', async () => {
    const id = await matriculaEntregue('2026-08-20', '2026-09-08')

    const r = await corrigirDataDeEntrega({
      matriculaId: id,
      data: '2026-08-28',
      hoje: '2026-09-08',
    })
    expect(r.ok).toBe(true)

    const { data } = await admin
      .from('matriculas')
      .select('data_inicio, data_prova')
      .eq('id', id)
      .single()

    expect(data!.data_inicio).toBe('2026-08-28')
    // A prova acompanha: senão a correção deixaria o prazo apontando para o
    // cálculo antigo, e é essa data que vale para a remição de pena.
    expect(data!.data_prova).toBe(calcularDataProva('2026-08-28'))
  })

  it('registra a correção no histórico, com as duas datas', async () => {
    const id = await matriculaEntregue('2026-08-20', '2026-09-08')

    await corrigirDataDeEntrega({
      matriculaId: id,
      data: '2026-08-28',
      hoje: '2026-09-08',
    })

    const { data: eventos } = await admin
      .from('matricula_eventos')
      .select('de_status, para_status, nota')
      .eq('matricula_id', id)
      .order('created_at')

    const correcao = eventos!.at(-1)!
    expect(correcao.de_status).toBeNull()
    expect(correcao.para_status).toBe('material_entregue')
    expect(correcao.nota).toContain('08/09/2026')
    expect(correcao.nota).toContain('28/08/2026')
  })

  it('recusa data no futuro sem tocar no que está gravado', async () => {
    const id = await matriculaEntregue('2026-08-20', '2026-09-08')

    const r = await corrigirDataDeEntrega({
      matriculaId: id,
      data: '2026-12-31',
      hoje: '2026-09-08',
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erro).toContain('futuro')

    const { data } = await admin
      .from('matriculas')
      .select('data_inicio')
      .eq('id', id)
      .single()
    expect(data!.data_inicio).toBe('2026-09-08')
  })

  it('recusa entrega anterior à compra', async () => {
    const id = await matriculaEntregue('2026-08-20', '2026-09-08')

    const r = await corrigirDataDeEntrega({
      matriculaId: id,
      data: '2026-08-10',
      hoje: '2026-09-08',
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erro).toContain('compra')
  })

  it('recusa matrícula que ainda não teve entrega registrada', async () => {
    const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .insert({
        uf: 'DF',
        nome: `Unidade Sem Entrega ${marca}`,
        endereco: 'Rua Sem Entrega, 1',
        cep: '70000000',
      })
      .select('id')
      .single()

    const { data: curso } = await admin
      .from('cursos')
      .select('id, preco_centavos')
      .eq('slug', 'agente-de-portaria')
      .single()

    const { data: interno } = await admin
      .from('internos')
      .insert({
        nome: 'Aluno Sem Entrega',
        cpf: novoCpf(),
        matricula_prisional: `MP-SEMENT-${marca}`,
        unidade_prisional_id: unidade!.id,
      })
      .select('id')
      .single()

    const { data: matricula } = await admin
      .from('matriculas')
      .insert({
        interno_id: interno!.id,
        curso_id: curso!.id,
        unidade_prisional_id: unidade!.id,
        preco_centavos: curso!.preco_centavos,
        frete_centavos: 0,
        status: 'paga',
      })
      .select('id')
      .single()

    const r = await corrigirDataDeEntrega({
      matriculaId: matricula!.id,
      data: '2026-09-01',
      hoje: '2026-09-08',
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erro).toContain('entrega')
  })
})
