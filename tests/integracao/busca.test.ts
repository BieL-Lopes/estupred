import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import {
  listarCursosAdmin,
  listarMatriculasAdmin,
  listarUnidadesAdmin,
  termoDeBusca,
} from '@/lib/admin/consultas'

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

describe('termoDeBusca', () => {
  it('devolve vazio para entrada em branco', () => {
    expect(termoDeBusca(undefined)).toBe('')
    expect(termoDeBusca('   ')).toBe('')
  })

  it('remove os caracteres que quebram o filtro do PostgREST', () => {
    // Vírgula separa condições num `.or()`, e parênteses delimitam a lista.
    // Sem tirar, uma busca por "Silva, João" viraria filtro inválido e a
    // consulta falharia calada, devolvendo tudo ou nada.
    expect(termoDeBusca('Silva, João')).toBe('Silva João')
    expect(termoDeBusca('Curso (novo)')).toBe('Curso novo')
  })

  it('preserva acento e espaço interno', () => {
    expect(termoDeBusca('  Informática Básica  ')).toBe('Informática Básica')
  })
})

describe('listarCursosAdmin', () => {
  it('devolve tudo quando não há busca', async () => {
    const todos = await listarCursosAdmin()
    expect(todos.length).toBeGreaterThan(30)
  })

  it('acha pelo título', async () => {
    const achados = await listarCursosAdmin({ busca: 'Portaria' })
    expect(achados.length).toBeGreaterThan(0)
    expect(achados.every((c) => /portaria/i.test(c.titulo + c.slug + c.categoria))).toBe(
      true,
    )
  })

  it('acha pela categoria', async () => {
    const achados = await listarCursosAdmin({ busca: 'Administração' })
    expect(achados.length).toBeGreaterThan(0)
  })

  it('devolve lista vazia quando nada casa', async () => {
    expect(await listarCursosAdmin({ busca: 'zzzznaoexiste' })).toEqual([])
  })
})

describe('listarUnidadesAdmin', () => {
  it('acha pela UF', async () => {
    const achados = await listarUnidadesAdmin({ busca: 'GO' })
    expect(achados.length).toBeGreaterThan(0)
    expect(achados.some((u) => u.uf === 'GO')).toBe(true)
  })

  it('acha pelo nome', async () => {
    const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    await admin.from('unidades_prisionais').insert({
      uf: 'DF',
      nome: `Unidade Buscavel ${marca}`,
      endereco: 'Rua da Busca, 1',
      cep: '70000000',
    })

    const achados = await listarUnidadesAdmin({ busca: `Buscavel ${marca}` })
    expect(achados.length).toBe(1)
    expect(achados[0]!.nome).toContain('Buscavel')
  })
})

describe('listarMatriculasAdmin com busca', () => {
  it('acha pelo código da matrícula', async () => {
    const { data: alguma } = await admin
      .from('matriculas')
      .select('codigo')
      .limit(1)
      .single()

    const achados = await listarMatriculasAdmin({ busca: alguma!.codigo })
    expect(achados.length).toBe(1)
    expect((achados[0] as unknown as { codigo: string }).codigo).toBe(alguma!.codigo)
  })

  it('acha pelo nome do aluno, que vem de outra tabela', async () => {
    const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .insert({
        uf: 'DF',
        nome: `Unidade Busca Matricula ${marca}`,
        endereco: 'Rua da Busca, 2',
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
        nome: `Aluno Procurado ${marca}`,
        cpf: novoCpf(),
        matricula_prisional: `MP-BUSCA-${marca}`,
        unidade_prisional_id: unidade!.id,
      })
      .select('id')
      .single()

    await admin.from('matriculas').insert({
      interno_id: interno!.id,
      curso_id: curso!.id,
      unidade_prisional_id: unidade!.id,
      preco_centavos: curso!.preco_centavos,
      frete_centavos: 0,
      status: 'paga',
    })

    const achados = await listarMatriculasAdmin({ busca: `Procurado ${marca}` })
    expect(achados.length).toBe(1)
    expect(
      (achados[0] as unknown as { internos: { nome: string } }).internos.nome,
    ).toContain('Procurado')
  })

  it('devolve vazio quando o termo não casa com código nem com aluno', async () => {
    expect(await listarMatriculasAdmin({ busca: 'zzzznaoexiste' })).toEqual([])
  })

  it('combina busca e filtro de status', async () => {
    const { data: alguma } = await admin
      .from('matriculas')
      .select('codigo, status')
      .limit(1)
      .single()

    const casa = await listarMatriculasAdmin({
      busca: alguma!.codigo,
      status: alguma!.status,
    })
    expect(casa.length).toBe(1)

    const naoCasa = await listarMatriculasAdmin({
      busca: alguma!.codigo,
      status: alguma!.status === 'paga' ? 'cancelada' : 'paga',
    })
    expect(naoCasa.length).toBe(0)
  })
})
