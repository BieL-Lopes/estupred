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
      .from('internos').select('id, responsavel_id, unidade_prisional_id')
      .eq('matricula_prisional', 'MP-MANUAL-0002').single()

    // Sem transferência: repete a unidade atual do aluno.
    const segunda = await registrarMatriculaParaAlunoExistente({
      internoId: interno!.id,
      cursoSlug: 'formacao-para-eletricista',
      unidadeId: interno!.unidade_prisional_id,
      responsavel: {
        nome: 'Responsavel Do Teste',
        cpf: novoCpf(),
        email: `resp-${Date.now()}-${Math.random().toString(36).slice(2)}@exemplo.com`,
        telefone: '61999997777',
        parentesco: 'Mãe',
      },
    })
    expect(segunda.ok).toBe(true)

    const { data: matriculas } = await admin
      .from('matriculas')
      .select('responsavel_id, status')
      .eq('interno_id', interno!.id)

    expect(matriculas!.length).toBe(2)
    expect(matriculas!.every((m) => m.status === 'paga')).toBe(true)
  })

  it('recusa aluno inexistente', async () => {
    const r = await registrarMatriculaParaAlunoExistente({
      internoId: '00000000-0000-0000-0000-000000000000',
      cursoSlug: 'auxiliar-de-cozinha',
      unidadeId: await unidadeDf(),
      responsavel: {
        nome: 'Responsavel Do Teste',
        cpf: novoCpf(),
        email: `resp-${Date.now()}-${Math.random().toString(36).slice(2)}@exemplo.com`,
        telefone: '61999997777',
        parentesco: 'Mãe',
      },
    })
    expect(r).toEqual({ ok: false, erro: 'Aluno não encontrado' })
  })
})

describe('registrarMatriculaParaAlunoExistente com unidade escolhida', () => {
  it('usa a unidade da matrícula para o frete e atualiza o cadastro do aluno', async () => {
    const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Unidades próprias em UFs com frete configurado: outro arquivo de teste
    // apaga as unidades que cria, e o vitest roda os arquivos em paralelo.
    const { data: criadas } = await admin
      .from('unidades_prisionais')
      .insert([
        {
          uf: 'DF',
          nome: `Unidade Origem ${marca}`,
          endereco: 'Rua Origem, 1',
          cep: '70000000',
        },
        {
          uf: 'GO',
          nome: `Unidade Destino ${marca}`,
          endereco: 'Rua Destino, 2',
          cep: '74000000',
        },
      ])
      .select('id, uf')

    const origem = criadas!.find((u) => u.uf === 'DF')!
    const destino = criadas!.find((u) => u.uf === 'GO')!

    const primeira = await registrarMatriculaManualNovoAluno({
      cursoSlug: 'auxiliar-de-cozinha',
      unidade: { uf: 'DF', unidadeId: origem.id },
      interno: {
        nome: 'Aluno Transferido',
        cpf: novoCpf(),
        matriculaPrisional: `MP-TRANSF-${marca}`,
      },
      responsavel: {
        nome: 'Responsavel Transferido',
        cpf: novoCpf(),
        email: `transf-${marca}@exemplo.com`,
        telefone: '61999990000',
        parentesco: 'Mãe',
      },
    })
    expect(primeira.ok).toBe(true)
    if (!primeira.ok) return

    const { data: criada } = await admin
      .from('matriculas')
      .select('interno_id')
      .eq('id', primeira.matriculaId)
      .single()

    const { data: freteDestino } = await admin
      .from('fretes')
      .select('valor_centavos')
      .eq('uf', destino.uf)
      .single()

    const segunda = await registrarMatriculaParaAlunoExistente({
      internoId: criada!.interno_id,
      cursoSlug: 'formacao-para-eletricista',
      unidadeId: destino.id,
      responsavel: {
        nome: 'Responsavel Do Teste',
        cpf: novoCpf(),
        email: `resp-${Date.now()}-${Math.random().toString(36).slice(2)}@exemplo.com`,
        telefone: '61999997777',
        parentesco: 'Mãe',
      },
    })
    expect(segunda.ok).toBe(true)
    if (!segunda.ok) return

    const { data: nova } = await admin
      .from('matriculas')
      .select('unidade_prisional_id, frete_centavos')
      .eq('id', segunda.matriculaId)
      .single()

    expect(nova!.unidade_prisional_id).toBe(destino.id)
    expect(nova!.frete_centavos).toBe(freteDestino!.valor_centavos)

    // A transferência acompanha o cadastro: a próxima matrícula já nasce na
    // unidade certa sem ninguém precisar corrigir à mão.
    const { data: interno } = await admin
      .from('internos')
      .select('unidade_prisional_id')
      .eq('id', criada!.interno_id)
      .single()
    expect(interno!.unidade_prisional_id).toBe(destino.id)
  })
})

describe('registrarMatriculaParaAlunoExistente com responsável próprio', () => {
  it('grava o comprador na matrícula sem trocar o do cadastro', async () => {
    const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .insert({
        uf: 'DF',
        nome: `Unidade Comprador ${marca}`,
        endereco: 'Rua do Comprador, 1',
        cep: '70000000',
      })
      .select('id')
      .single()

    const primeira = await registrarMatriculaManualNovoAluno({
      cursoSlug: 'auxiliar-de-cozinha',
      unidade: { uf: 'DF', unidadeId: unidade!.id },
      interno: {
        nome: 'Aluno Dois Compradores',
        cpf: novoCpf(),
        matriculaPrisional: `MP-2COMP-${marca}`,
      },
      responsavel: {
        nome: 'Mae Compradora',
        cpf: novoCpf(),
        email: `mae-${marca}@exemplo.com`,
        telefone: '61999990000',
        parentesco: 'Mãe',
      },
    })
    expect(primeira.ok).toBe(true)
    if (!primeira.ok) return

    const { data: criada } = await admin
      .from('matriculas')
      .select('interno_id, responsavel_id')
      .eq('id', primeira.matriculaId)
      .single()

    const segunda = await registrarMatriculaParaAlunoExistente({
      internoId: criada!.interno_id,
      cursoSlug: 'formacao-para-eletricista',
      unidadeId: unidade!.id,
      responsavel: {
        nome: 'Esposa Compradora',
        cpf: novoCpf(),
        email: `esposa-${marca}@exemplo.com`,
        telefone: '61988881111',
        parentesco: 'Esposa',
      },
    })
    expect(segunda.ok).toBe(true)
    if (!segunda.ok) return

    const { data: nova } = await admin
      .from('matriculas')
      .select('responsavel_id, profiles:responsavel_id (nome)')
      .eq('id', segunda.matriculaId)
      .single()

    // A segunda compra é da esposa.
    expect((nova!.profiles as unknown as { nome: string }).nome).toBe(
      'Esposa Compradora',
    )
    expect(nova!.responsavel_id).not.toBe(criada!.responsavel_id)

    // E o cadastro do aluno continua com quem comprou primeiro: numa compra,
    // trocar o responsável do cadastro seria efeito colateral.
    const { data: interno } = await admin
      .from('internos')
      .select('profiles:responsavel_id (nome)')
      .eq('id', criada!.interno_id)
      .single()
    expect((interno!.profiles as unknown as { nome: string }).nome).toBe(
      'Mae Compradora',
    )
  })

  it('preenche o responsável do cadastro quando o aluno ainda não tinha', async () => {
    const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .insert({
        uf: 'DF',
        nome: `Unidade Pre Cadastro ${marca}`,
        endereco: 'Rua do Pre, 1',
        cep: '70000000',
      })
      .select('id')
      .single()

    const { data: interno } = await admin
      .from('internos')
      .insert({
        nome: 'Aluno Pre Sem Responsavel',
        cpf: novoCpf(),
        matricula_prisional: `MP-PRE-${marca}`,
        unidade_prisional_id: unidade!.id,
      })
      .select('id')
      .single()

    const r = await registrarMatriculaParaAlunoExistente({
      internoId: interno!.id,
      cursoSlug: 'auxiliar-de-cozinha',
      unidadeId: unidade!.id,
      responsavel: {
        nome: 'Primeiro Comprador',
        cpf: novoCpf(),
        email: `primeiro-${marca}@exemplo.com`,
        telefone: '61999992222',
        parentesco: 'Irmão',
      },
    })
    expect(r.ok).toBe(true)

    const { data } = await admin
      .from('internos')
      .select('parentesco, profiles:responsavel_id (nome)')
      .eq('id', interno!.id)
      .single()

    expect((data!.profiles as unknown as { nome: string }).nome).toBe(
      'Primeiro Comprador',
    )
    expect(data!.parentesco).toBe('Irmão')
  })
})
