import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { avancarStatus } from '@/lib/matricula/avancar'
import { atualizarAluno } from '@/lib/admin/alunos'

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
      nome: 'Aluno De Teste Admin',
      cpf: novoCpf(),
      matricula_prisional: `MP-ADM-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

describe('avanço manual de status pelo admin', () => {
  it('é seguro contra corrida: o segundo avanço concorrente não duplica evento', async () => {
    const m = await matriculaNoStatus('paga')
    await Promise.allSettled([
      avancarStatus({ matriculaId: m.id, para: 'material_enviado' }),
      avancarStatus({ matriculaId: m.id, para: 'material_enviado' }),
    ])

    const { data } = await admin
      .from('matricula_eventos')
      .select('id')
      .eq('matricula_id', m.id)
      .eq('para_status', 'material_enviado')
    expect(data!.length).toBe(1)
  })
})

describe('atualizarAluno com CPF já usado', () => {
  it('devolve mensagem legível em vez de estourar', async () => {
    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .select('id')
      .limit(1)
      .single()

    const cpfOcupado = novoCpf()
    await admin.from('internos').insert({
      nome: 'Aluno Que Ja Existe',
      cpf: cpfOcupado,
      matricula_prisional: 'MP-OCUPADO',
      unidade_prisional_id: unidade!.id,
    })

    const { data: alvo } = await admin
      .from('internos')
      .insert({
        nome: 'Aluno Alvo',
        cpf: novoCpf(),
        matricula_prisional: 'MP-ALVO',
        unidade_prisional_id: unidade!.id,
      })
      .select('id')
      .single()

    const r = await atualizarAluno({
      id: alvo!.id,
      nome: 'Aluno Alvo Editado',
      cpf: cpfOcupado,
      matriculaPrisional: 'MP-ALVO',
      unidadeId: unidade!.id,
    })

    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erro).toContain('CPF')
  })

  it('salva normalmente quando o CPF é livre', async () => {
    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .select('id')
      .limit(1)
      .single()

    const { data: alvo } = await admin
      .from('internos')
      .insert({
        nome: 'Aluno Editavel',
        cpf: novoCpf(),
        matricula_prisional: 'MP-EDIT',
        unidade_prisional_id: unidade!.id,
      })
      .select('id')
      .single()

    const cpfNovo = novoCpf()
    const r = await atualizarAluno({
      id: alvo!.id,
      nome: 'Aluno Editavel Corrigido',
      cpf: cpfNovo,
      matriculaPrisional: 'MP-EDIT-2',
      unidadeId: unidade!.id,
    })

    expect(r.ok).toBe(true)

    const { data } = await admin
      .from('internos')
      .select('nome, cpf')
      .eq('id', alvo!.id)
      .single()
    expect(data!.nome).toBe('Aluno Editavel Corrigido')
    expect(data!.cpf).toBe(cpfNovo)
  })
})
