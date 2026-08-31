import { createClient } from '@supabase/supabase-js'
import { chaveAnonSupabase, urlSupabase } from '@/lib/env'
import type { Database } from './tipos'

/**
 * Cliente anônimo para leituras que a RLS já deixa públicas (catálogo,
 * fretes, unidades prisionais) — não dependem de sessão nenhuma.
 *
 * Ao contrário de criarClienteServidor(), não chama cookies() do Next, então
 * funciona em qualquer contexto: Server Component, Server Action, e também
 * em teste de integração chamando a função direto (sem requisição HTTP por
 * trás, onde cookies() derruba com "called outside a request scope").
 */
export function criarClientePublico() {
  return createClient<Database>(urlSupabase(), chaveAnonSupabase(), {
    auth: { persistSession: false },
  })
}
