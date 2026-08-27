import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { chaveAnonSupabase, urlSupabase } from '@/lib/env'
import type { Database } from './tipos'

export async function criarClienteServidor() {
  const armazem = await cookies()

  return createServerClient<Database>(
    urlSupabase(),
    chaveAnonSupabase(),
    {
      cookies: {
        getAll: () => armazem.getAll(),
        setAll: (paraGravar) => {
          try {
            for (const { name, value, options } of paraGravar) {
              armazem.set(name, value, options)
            }
          } catch {
            // Server Component não pode gravar cookie. O middleware renova
            // a sessão, então ignorar aqui é seguro.
          }
        },
      },
    },
  )
}
