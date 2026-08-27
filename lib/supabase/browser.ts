import { createBrowserClient } from '@supabase/ssr'
import { chaveAnonSupabase, urlSupabase } from '@/lib/env'
import type { Database } from './tipos'

export function criarClienteNavegador() {
  return createBrowserClient<Database>(
    urlSupabase(),
    chaveAnonSupabase(),
  )
}
