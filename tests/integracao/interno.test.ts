import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { garantirInterno } from '@/lib/matricula/interno'

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
 * Cria unidades próprias em vez de reaproveitar as do seed: outros arquivos
 * de teste criam e apagam unidades, e como o vitest roda os arquivos em
 * paralelo, uma unidade emprestada pode sumir no meio deste teste.
 */
async function duasUnidadesDeUfsDiferentes(): Promise<
  [{ id: string; uf: string }, { id: string; uf: string }]
> {
  const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  const { data } = await admin
    .from('unidades_prisionais')
    .insert([
      {
        uf: 'DF',
        nome: `Unidade Teste Interno DF ${marca}`,
        endereco: 'Rua de Teste, 1',
        cep: '70000000',
      },
      {
        uf: 'GO',
        nome: `Unidade Teste Interno GO ${marca}`,
        endereco: 'Rua de Teste, 2',
        cep: '74000000',
      },
    ])
    .select('id, uf')

  const df = data!.find((u) => u.uf === 'DF')!
  const go = data!.find((u) => u.uf === 'GO')!
  return [df, go]
}

async function novoResponsavel(): Promise<string> {
  const { data } = await admin.auth.admin.createUser({
    email: `resp-${Date.now()}-${Math.random().toString(36).slice(2)}@exemplo.com`,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: {
      nome: 'Responsavel Teste',
      cpf: novoCpf(),
      telefone: '61999990000',
    },
  })
  return data.user!.id
}

describe('constraint de CPF único', () => {
  it('recusa dois internos com o mesmo CPF', async () => {
    const [unidade] = await duasUnidadesDeUfsDiferentes()
    const cpf = novoCpf()
    const responsavelId = await novoResponsavel()

    const comum = {
      nome: 'Aluno Duplicado',
      cpf,
      matricula_prisional: 'MP-DUP-1',
      unidade_prisional_id: unidade.id,
      responsavel_id: responsavelId,
    }

    const primeiro = await admin.from('internos').insert(comum).select('id').single()
    expect(primeiro.error).toBeNull()

    const segundo = await admin.from('internos').insert(comum).select('id').single()
    expect(segundo.error).not.toBeNull()
    expect(segundo.error!.code).toBe('23505')
  })
})

describe('garantirInterno', () => {
  it('cria o cadastro quando o CPF é novo', async () => {
    const [unidade] = await duasUnidadesDeUfsDiferentes()
    const responsavelId = await novoResponsavel()

    const r = await garantirInterno({
      interno: {
        nome: 'Aluno Novo Garantir',
        cpf: novoCpf(),
        matriculaPrisional: 'MP-GAR-1',
        rg: '',
        dataNascimento: '',
      },
      unidadeId: unidade.id,
      responsavelId,
      parentesco: 'Mãe',
    })

    expect(r.criado).toBe(true)

    const { data } = await admin
      .from('internos')
      .select('nome, responsavel_id, unidade_prisional_id')
      .eq('id', r.id)
      .single()
    expect(data!.nome).toBe('Aluno Novo Garantir')
    expect(data!.responsavel_id).toBe(responsavelId)
    expect(data!.unidade_prisional_id).toBe(unidade.id)
  })

  it('reaproveita o cadastro e atualiza a unidade, sem trocar o responsável', async () => {
    const [primeira, segunda] = await duasUnidadesDeUfsDiferentes()
    const cpf = novoCpf()
    const responsavelOriginal = await novoResponsavel()
    const outroResponsavel = await novoResponsavel()

    const inicial = await garantirInterno({
      interno: {
        nome: 'Aluno Reaproveitado',
        cpf,
        matriculaPrisional: 'MP-REAP-1',
        rg: '',
        dataNascimento: '',
      },
      unidadeId: primeira.id,
      responsavelId: responsavelOriginal,
      parentesco: 'Mãe',
    })

    const segundaVez = await garantirInterno({
      interno: {
        nome: 'Aluno Reaproveitado Corrigido',
        cpf,
        matriculaPrisional: 'MP-REAP-2',
        rg: '',
        dataNascimento: '',
      },
      unidadeId: segunda.id,
      responsavelId: outroResponsavel,
      parentesco: 'Esposa',
    })

    expect(segundaVez.criado).toBe(false)
    expect(segundaVez.id).toBe(inicial.id)

    const { data } = await admin
      .from('internos')
      .select('nome, matricula_prisional, unidade_prisional_id, responsavel_id')
      .eq('id', inicial.id)
      .single()

    expect(data!.nome).toBe('Aluno Reaproveitado Corrigido')
    expect(data!.matricula_prisional).toBe('MP-REAP-2')
    // Transferência de unidade acompanha a nova matrícula.
    expect(data!.unidade_prisional_id).toBe(segunda.id)
    // O responsável do cadastro é o primeiro e não é sobrescrito: o acesso
    // ao portal de cada família é filtrado por matriculas.responsavel_id.
    expect(data!.responsavel_id).toBe(responsavelOriginal)

    const { count } = await admin
      .from('internos')
      .select('id', { count: 'exact', head: true })
      .eq('cpf', cpf)
    expect(count).toBe(1)
  })
})
