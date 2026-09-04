import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { garantirResponsavel } from '@/lib/matricula/responsavel'

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

function marca(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

describe('garantirResponsavel', () => {
  it('cria a conta quando o CPF é novo', async () => {
    const m = marca()
    const r = await garantirResponsavel(
      {
        nome: 'Maria Responsavel',
        cpf: novoCpf(),
        email: `maria-${m}@exemplo.com`,
        telefone: '61999990000',
        parentesco: 'Mãe',
      },
      { atualizarCadastro: true },
    )

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.criado).toBe(true)

    const { data } = await admin
      .from('profiles')
      .select('nome, role, telefone')
      .eq('id', r.id)
      .single()
    expect(data!.nome).toBe('Maria Responsavel')
    expect(data!.role).toBe('responsavel')
  })

  it('reaproveita pelo CPF em vez de criar de novo', async () => {
    const m = marca()
    const cpf = novoCpf()

    const primeira = await garantirResponsavel(
      {
        nome: 'Ana Original',
        cpf,
        email: `ana-${m}@exemplo.com`,
        telefone: '61999991111',
        parentesco: 'Mãe',
      },
      { atualizarCadastro: false },
    )
    expect(primeira.ok).toBe(true)
    if (!primeira.ok) return

    const segunda = await garantirResponsavel(
      {
        nome: 'Ana Outra Grafia',
        cpf,
        email: `outro-${m}@exemplo.com`,
        telefone: '61988882222',
        parentesco: 'Esposa',
      },
      { atualizarCadastro: false },
    )
    expect(segunda.ok).toBe(true)
    if (!segunda.ok) return

    expect(segunda.criado).toBe(false)
    expect(segunda.id).toBe(primeira.id)

    // Sem atualizarCadastro, nada muda.
    const { data } = await admin
      .from('profiles')
      .select('nome, telefone')
      .eq('id', primeira.id)
      .single()
    expect(data!.nome).toBe('Ana Original')
    expect(data!.telefone).toBe('61999991111')
  })

  it('atualiza nome e telefone quando pedido, mas nunca o e-mail', async () => {
    const m = marca()
    const cpf = novoCpf()
    const emailOriginal = `bia-${m}@exemplo.com`

    const primeira = await garantirResponsavel(
      {
        nome: 'Bia Antiga',
        cpf,
        email: emailOriginal,
        telefone: '61999993333',
        parentesco: 'Irmã',
      },
      { atualizarCadastro: true },
    )
    expect(primeira.ok).toBe(true)
    if (!primeira.ok) return

    await garantirResponsavel(
      {
        nome: 'Bia Corrigida',
        cpf,
        email: `novo-${m}@exemplo.com`,
        telefone: '61977774444',
        parentesco: 'Irmã',
      },
      { atualizarCadastro: true },
    )

    const { data } = await admin
      .from('profiles')
      .select('nome, telefone, email')
      .eq('id', primeira.id)
      .single()

    expect(data!.nome).toBe('Bia Corrigida')
    expect(data!.telefone).toBe('61977774444')
    // O e-mail é a identidade de autenticação: prepararLoginPorCpf resolve o
    // e-mail por aqui e gera link mágico contra auth.users. Divergir quebra
    // o login por CPF do responsável.
    expect(data!.email).toBe(emailOriginal)
  })

  it('devolve erro legível quando o e-mail já é de outra conta', async () => {
    const m = marca()
    const email = `repetido-${m}@exemplo.com`

    const primeira = await garantirResponsavel(
      {
        nome: 'Carla Primeira',
        cpf: novoCpf(),
        email,
        telefone: '61999995555',
        parentesco: 'Mãe',
      },
      { atualizarCadastro: false },
    )
    expect(primeira.ok).toBe(true)

    // CPF diferente, mesmo e-mail: não dá pra reaproveitar pelo CPF e o
    // createUser vai barrar.
    const segunda = await garantirResponsavel(
      {
        nome: 'Carla Segunda',
        cpf: novoCpf(),
        email,
        telefone: '61999996666',
        parentesco: 'Mãe',
      },
      { atualizarCadastro: false },
    )

    expect(segunda.ok).toBe(false)
    if (segunda.ok) return
    expect(segunda.erro).toContain('e-mail')
  })
})
