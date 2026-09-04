import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { cadastrarAlunoNovo } from '@/lib/admin/cadastro-aluno'

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
 * Unidade própria: tests/integracao/schema.test.ts cria e apaga unidades, e o
 * vitest roda os arquivos em paralelo — emprestar uma do seed dá violação de
 * chave estrangeira intermitente.
 */
async function unidadePropria(): Promise<string> {
  const { data } = await admin
    .from('unidades_prisionais')
    .insert({
      uf: 'DF',
      nome: `Unidade Cadastro ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      endereco: 'Rua do Cadastro, 1',
      cep: '70000000',
    })
    .select('id')
    .single()
  return data!.id
}

describe('cadastrarAlunoNovo', () => {
  it('cadastra o aluno sem responsável e sem criar matrícula', async () => {
    const unidadeId = await unidadePropria()

    const r = await cadastrarAlunoNovo({
      interno: {
        nome: 'Aluno Pre Cadastrado',
        cpf: novoCpf(),
        matriculaPrisional: 'MP-PRE-0001',
        rg: '',
        dataNascimento: '',
      },
      unidadeId,
    })

    expect(r.ok).toBe(true)
    if (!r.ok) return

    const { data: interno } = await admin
      .from('internos')
      .select('nome, responsavel_id, parentesco, unidade_prisional_id')
      .eq('id', r.internoId)
      .single()

    expect(interno!.nome).toBe('Aluno Pre Cadastrado')
    expect(interno!.responsavel_id).toBeNull()
    expect(interno!.parentesco).toBeNull()
    expect(interno!.unidade_prisional_id).toBe(unidadeId)

    const { count } = await admin
      .from('matriculas')
      .select('id', { count: 'exact', head: true })
      .eq('interno_id', r.internoId)
    expect(count).toBe(0)
  })

  it('vincula o responsável quando informado', async () => {
    const unidadeId = await unidadePropria()
    const m = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const r = await cadastrarAlunoNovo({
      interno: {
        nome: 'Aluno Com Responsavel',
        cpf: novoCpf(),
        matriculaPrisional: 'MP-PRE-0002',
        rg: '',
        dataNascimento: '',
      },
      unidadeId,
      responsavel: {
        nome: 'Responsavel Do Cadastro',
        cpf: novoCpf(),
        email: `cadastro-${m}@exemplo.com`,
        telefone: '61999990000',
        parentesco: 'Mãe',
      },
    })

    expect(r.ok).toBe(true)
    if (!r.ok) return

    const { data: interno } = await admin
      .from('internos')
      .select('parentesco, profiles:responsavel_id (nome)')
      .eq('id', r.internoId)
      .single()

    expect(interno!.parentesco).toBe('Mãe')
    expect(
      (interno!.profiles as unknown as { nome: string } | null)?.nome,
    ).toBe('Responsavel Do Cadastro')
  })

  it('recusa CPF de aluno já cadastrado sem alterar o registro anterior', async () => {
    const unidadeId = await unidadePropria()
    const cpf = novoCpf()

    const primeiro = await cadastrarAlunoNovo({
      interno: {
        nome: 'Aluno Original',
        cpf,
        matriculaPrisional: 'MP-ORIG',
        rg: '',
        dataNascimento: '',
      },
      unidadeId,
    })
    expect(primeiro.ok).toBe(true)
    if (!primeiro.ok) return

    const segundo = await cadastrarAlunoNovo({
      interno: {
        nome: 'Aluno Tentando De Novo',
        cpf,
        matriculaPrisional: 'MP-DUP',
        rg: '',
        dataNascimento: '',
      },
      unidadeId,
    })

    expect(segundo.ok).toBe(false)
    if (segundo.ok) return
    expect(segundo.erro).toContain('CPF')

    // O registro anterior fica intacto: esta tela cadastra, não atualiza.
    const { data } = await admin
      .from('internos')
      .select('nome, matricula_prisional')
      .eq('id', primeiro.internoId)
      .single()
    expect(data!.nome).toBe('Aluno Original')
    expect(data!.matricula_prisional).toBe('MP-ORIG')
  })
})
