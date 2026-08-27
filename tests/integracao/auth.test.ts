import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

describe('cadastro', () => {
  it('cria o profile automaticamente com os metadados', async () => {
    const c = createClient<Database>(url, anon, {
      auth: { persistSession: false },
    })
    const email = `novo-${Date.now()}@exemplo.com`

    const { data, error } = await c.auth.signUp({
      email,
      password: 'senha-de-teste',
      options: {
        data: {
          nome: 'Carla Dias',
          cpf: '52998224725',
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
    expect(perfil!.cpf).toBe('52998224725')
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
          cpf: '52998224725',
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
