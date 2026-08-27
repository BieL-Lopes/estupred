import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './tipos'

// Ignora RLS. Só para webhook e para transições de status validadas.
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!chave) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
