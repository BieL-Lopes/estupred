import { createClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(url, service, { auth: { persistSession: false } })

describe('schema', () => {
  beforeAll(() => {
    expect(url, 'NEXT_PUBLIC_SUPABASE_URL ausente').toBeTruthy()
    expect(service, 'SUPABASE_SERVICE_ROLE_KEY ausente').toBeTruthy()
  })

  it('cria a tabela de cursos com preço em centavos inteiros', async () => {
    const { data, error } = await admin
      .from('cursos')
      .insert({
        slug: 'teste-schema',
        titulo: 'Curso de Teste',
        descricao: 'descrição',
        ementa: '# ementa',
        carga_horaria: 180,
        preco_centavos: 18500,
        categoria: 'Construção Civil',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data!.preco_centavos).toBe(18500)
    expect(data!.ativo).toBe(true)

    await admin.from('cursos').delete().eq('slug', 'teste-schema')
  })

  it('recusa preço negativo', async () => {
    const { error } = await admin.from('cursos').insert({
      slug: 'teste-negativo',
      titulo: 'Negativo',
      descricao: 'x',
      ementa: 'x',
      carga_horaria: 10,
      preco_centavos: -1,
      categoria: 'x',
    })
    expect(error).not.toBeNull()
  })

  it('gera código público no formato EST-AAAA-NNNNN e soma o total', async () => {
    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .insert({
        uf: 'DF',
        nome: 'Unidade de Teste',
        endereco: 'Rua Teste, 1',
        cep: '70000000',
      })
      .select()
      .single()

    const { data: curso } = await admin
      .from('cursos')
      .insert({
        slug: 'teste-codigo',
        titulo: 'Código',
        descricao: 'x',
        ementa: 'x',
        carga_horaria: 60,
        preco_centavos: 13500,
        categoria: 'x',
      })
      .select()
      .single()

    const { data: interno } = await admin
      .from('internos')
      .insert({
        nome: 'Interno Teste',
        cpf: '52998224725',
        matricula_prisional: 'MP-1',
        unidade_prisional_id: unidade!.id,
      })
      .select()
      .single()

    const { data: matricula, error } = await admin
      .from('matriculas')
      .insert({
        interno_id: interno!.id,
        curso_id: curso!.id,
        unidade_prisional_id: unidade!.id,
        preco_centavos: 13500,
        frete_centavos: 3200,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(matricula!.codigo).toMatch(/^EST-\d{4}-\d{5}$/)
    expect(matricula!.total_centavos).toBe(16700)
    expect(matricula!.status).toBe('rascunho')

    await admin.from('matriculas').delete().eq('id', matricula!.id)
    await admin.from('internos').delete().eq('id', interno!.id)
    await admin.from('cursos').delete().eq('id', curso!.id)
    await admin.from('unidades_prisionais').delete().eq('id', unidade!.id)
  })

  // A garantia append-only de matricula_eventos é da RLS, e o cliente usado
  // aqui é service role, que ignora RLS por definição. O teste correto vive
  // em rls.test.ts, com um admin autenticado.
})
