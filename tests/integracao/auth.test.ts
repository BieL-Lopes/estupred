import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// profiles.cpf é único (migration 20260830000002), então cada teste que faz
// signUp precisa de um CPF que não colida com nenhum outro — nem com o do
// seed, nem entre si. A checagem de dígito verificador é só no app (Zod);
// a coluna só exige 11 dígitos, então gerar algo único aqui é suficiente.
function cpfUnicoParaTeste(): string {
  return `${Date.now()}${Math.floor(Math.random() * 90 + 10)}`.slice(-11)
}

describe('cadastro', () => {
  it('cria o profile automaticamente com os metadados', async () => {
    const c = createClient<Database>(url, anon, {
      auth: { persistSession: false },
    })
    const email = `novo-${Date.now()}@exemplo.com`
    const cpf = cpfUnicoParaTeste()

    const { data, error } = await c.auth.signUp({
      email,
      password: 'senha-de-teste',
      options: {
        data: {
          nome: 'Carla Dias',
          cpf,
          telefone: '61966666666',
        },
      },
    })
    expect(error).toBeNull()

    const { data: perfil } = await c
      .from('profiles')
      .select('*')
      .eq('id', data.user!.id)
      .single()

    expect(perfil!.nome).toBe('Carla Dias')
    expect(perfil!.cpf).toBe(cpf)
    expect(perfil!.role).toBe('responsavel')
  })

  it('nasce sempre como responsável, nunca como admin', async () => {
    const c = createClient<Database>(url, anon, {
      auth: { persistSession: false },
    })
    const email = `escalada-${Date.now()}@exemplo.com`

    // raw_user_meta_data é controlado pelo cliente. A trigger deliberadamente
    // não lê role de lá, senão qualquer um viraria admin no cadastro.
    const { data } = await c.auth.signUp({
      email,
      password: 'senha-de-teste',
      options: {
        data: {
          nome: 'Tentativa',
          cpf: cpfUnicoParaTeste(),
          telefone: '61955555555',
          role: 'admin',
        },
      },
    })

    const { data: perfil } = await c
      .from('profiles')
      .select('role')
      .eq('id', data.user!.id)
      .single()

    expect(perfil!.role).toBe('responsavel')
  })
})
