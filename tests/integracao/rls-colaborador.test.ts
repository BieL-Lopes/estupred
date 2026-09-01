import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(url, service, { auth: { persistSession: false } })

async function clienteColaborador() {
  const c = createClient(url, anon, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({
    email: 'colaborador@cliqueestudos.com.br',
    password: 'senha-de-teste',
  })
  if (error) throw error
  return c
}

describe('RLS do colaborador', () => {
  it('deixa o colaborador ver todas as matrículas, como o admin', async () => {
    const c = await clienteColaborador()
    const { data, error } = await c.from('matriculas').select('codigo')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(2)
  })

  it('deixa o colaborador editar um interno', async () => {
    const c = await clienteColaborador()
    const { data: interno } = await admin
      .from('internos').select('id, nome').limit(1).single()

    const { error } = await c
      .from('internos')
      .update({ nome: interno!.nome })
      .eq('id', interno!.id)
    expect(error).toBeNull()
  })

  it('impede o colaborador de criar curso', async () => {
    const c = await clienteColaborador()
    const { error } = await c.from('cursos').insert({
      slug: 'invasor-colaborador', titulo: 'x', descricao: 'x', ementa: 'x',
      carga_horaria: 1, preco_centavos: 0, categoria: 'x',
    })
    expect(error).not.toBeNull()
  })

  // A RLS nega update pela ausência de policy sem levantar erro no
  // PostgREST: ela filtra as linhas visíveis para zero, e a operação
  // simplesmente não afeta nada (mesmo contrato do rls.test.ts original).
  it('impede o colaborador de editar unidade prisional', async () => {
    const c = await clienteColaborador()
    const { data: unidade } = await admin
      .from('unidades_prisionais').select('id, nome').limit(1).single()

    const { data: afetadas } = await c
      .from('unidades_prisionais')
      .update({ nome: 'Nome Forjado' })
      .eq('id', unidade!.id)
      .select()
    expect(afetadas ?? []).toHaveLength(0)

    const { data: depois } = await admin
      .from('unidades_prisionais').select('nome').eq('id', unidade!.id).single()
    expect(depois!.nome).toBe(unidade!.nome)
  })

  // Aqui a linha É visível (é o próprio perfil do colaborador), então o
  // update em si não é negado pela RLS — quem barra a troca de `role` é o
  // trigger impedir_auto_promocao(), que reverte a coluna silenciosamente.
  it('impede o colaborador de mudar o próprio papel', async () => {
    const c = await clienteColaborador()
    const { data: user } = await c.auth.getUser()

    const { error } = await c
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.user!.id)
    expect(error).toBeNull()

    const { data: depois } = await admin
      .from('profiles').select('role').eq('id', user.user!.id).single()
    expect(depois!.role).toBe('colaborador')
  })
})
