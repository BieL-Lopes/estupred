import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './tipos'

export async function criarClienteServidor() {
  const armazem = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
