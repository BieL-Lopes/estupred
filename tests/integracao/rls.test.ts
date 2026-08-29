import { createClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(url, service, { auth: { persistSession: false } })

function clientePublico() {
  return createClient(url, anon, { auth: { persistSession: false } })
}

async function clienteAutenticado(email: string, senha: string) {
  const c = clientePublico()
  const { error } = await c.auth.signInWithPassword({ email, password: senha })
  if (error) throw error
  return c
}

let cursoId: string
let unidadeId: string

beforeAll(async () => {
  const { data: curso } = await admin
    .from('cursos').select('id').eq('slug', 'formacao-para-eletricista').single()
  const { data: unidade } = await admin
    .from('unidades_prisionais').select('id').limit(1).single()
  cursoId = curso!.id
  unidadeId = unidade!.id
})

describe('leitura pública', () => {
  it('deixa qualquer pessoa ler cursos', async () => {
    const { data, error } = await clientePublico().from('cursos').select('slug')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('deixa qualquer pessoa ler fretes e unidades', async () => {
    const publico = clientePublico()
    const fretes = await publico.from('fretes').select('uf')
    const unidades = await publico.from('unidades_prisionais').select('nome')
    expect(fretes.error).toBeNull()
    expect(unidades.error).toBeNull()
  })
})

describe('escrita de catálogo', () => {
  it('impede anônimo de criar curso', async () => {
    const { error } = await clientePublico().from('cursos').insert({
      slug: 'invasor', titulo: 'x', descricao: 'x', ementa: 'x',
      carga_horaria: 1, preco_centavos: 0, categoria: 'x',
    })
    expect(error).not.toBeNull()
  })

  it('impede responsável de criar curso', async () => {
    const c = await clienteAutenticado('ana@exemplo.com', 'senha-de-teste')
    const { error } = await c.from('cursos').insert({
      slug: 'invasor2', titulo: 'x', descricao: 'x', ementa: 'x',
      carga_horaria: 1, preco_centavos: 0, categoria: 'x',
    })
    expect(error).not.toBeNull()
  })

  it('deixa admin criar curso', async () => {
    const c = await clienteAutenticado('admin@cliqueestudos.com.br', 'senha-de-teste')
    const { error } = await c.from('cursos').insert({
      slug: 'curso-do-admin', titulo: 'Admin', descricao: 'x', ementa: 'x',
      carga_horaria: 60, preco_centavos: 13500, categoria: 'x',
    })
    expect(error).toBeNull()
    await admin.from('cursos').delete().eq('slug', 'curso-do-admin')
  })
})

describe('isolamento entre responsáveis', () => {
  it('mostra ao responsável apenas as próprias matrículas', async () => {
    const ana = await clienteAutenticado('ana@exemplo.com', 'senha-de-teste')
    const bruno = await clienteAutenticado('bruno@exemplo.com', 'senha-de-teste')

    const daAna = await ana.from('matriculas').select('codigo')
    const doBruno = await bruno.from('matriculas').select('codigo')

    expect(daAna.data!.length).toBeGreaterThan(0)
    expect(doBruno.data!.length).toBeGreaterThan(0)

    const codigosAna = daAna.data!.map((m) => m.codigo)
    const codigosBruno = doBruno.data!.map((m) => m.codigo)
    expect(codigosAna.some((c) => codigosBruno.includes(c))).toBe(false)
  })

  it('impede o responsável de forjar matrícula em nome de outro', async () => {
    const ana = await clienteAutenticado('ana@exemplo.com', 'senha-de-teste')
    const { data: outro } = await admin
      .from('profiles').select('id').eq('email', 'bruno@exemplo.com').single()
    const { data: interno } = await admin
      .from('internos').select('id').limit(1).single()

    const { error } = await ana.from('matriculas').insert({
      interno_id: interno!.id,
      curso_id: cursoId,
      unidade_prisional_id: unidadeId,
      responsavel_id: outro!.id,
      preco_centavos: 100,
      frete_centavos: 0,
    })
    expect(error).not.toBeNull()
  })

  it('deixa o admin ver todas as matrículas', async () => {
    const c = await clienteAutenticado('admin@cliqueestudos.com.br', 'senha-de-teste')
    const { data, error } = await c.from('matriculas').select('codigo')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(2)
  })
})

// A RLS nega update e delete pela ausência de policy. Isso não levanta erro
// no PostgREST: ele filtra as linhas visíveis para zero, e a operação
// simplesmente não afeta nada. Por isso o contrato aqui é "nenhuma linha
// afetada e o dado intacto", não "retornou erro".
describe('matricula_eventos é append-only', () => {
  it('impede update mesmo para o admin', async () => {
    const c = await clienteAutenticado('admin@cliqueestudos.com.br', 'senha-de-teste')
    const { data: antes } = await admin
      .from('matricula_eventos').select('id, nota').limit(1).single()

    const { data: afetadas } = await c
      .from('matricula_eventos')
      .update({ nota: 'adulterado' })
      .eq('id', antes!.id)
      .select()

    expect(afetadas ?? []).toHaveLength(0)

    const { data: depois } = await admin
      .from('matricula_eventos').select('nota').eq('id', antes!.id).single()
    expect(depois!.nota).toBe(antes!.nota)
  })

  it('impede delete mesmo para o admin', async () => {
    const c = await clienteAutenticado('admin@cliqueestudos.com.br', 'senha-de-teste')
    const { data: antes } = await admin
      .from('matricula_eventos').select('id').limit(1).single()

    const { data: afetadas } = await c
      .from('matricula_eventos').delete().eq('id', antes!.id).select()

    expect(afetadas ?? []).toHaveLength(0)

    const { data: aindaExiste } = await admin
      .from('matricula_eventos').select('id').eq('id', antes!.id).maybeSingle()
    expect(aindaExiste).not.toBeNull()
  })
})

describe('pagamentos', () => {
  it('impede o responsável de escrever em pagamentos', async () => {
    const ana = await clienteAutenticado('ana@exemplo.com', 'senha-de-teste')
    const { data: m } = await ana.from('matriculas').select('id').limit(1).single()

    const { error } = await ana.from('pagamentos').insert({
      matricula_id: m!.id,
      gateway: 'fake',
      gateway_ref: 'forjado',
      metodo: 'pix',
      valor_centavos: 1,
      status: 'pago',
    })
    expect(error).not.toBeNull()
  })
})
