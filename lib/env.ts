/**
 * Acesso validado às variáveis de ambiente.
 *
 * A validação é feita em função, e não no topo do módulo, de propósito: no
 * topo, um valor ausente quebraria o build inteiro em vez de a página que
 * realmente depende dele, e a mensagem de erro sairia sem contexto.
 *
 * Só variáveis públicas moram aqui. A SUPABASE_SERVICE_ROLE_KEY é lida
 * exclusivamente em lib/supabase/admin.ts, que é marcado como server-only.
 */

function exigir(nome: string, valor: string | undefined): string {
  if (!valor || valor.trim() === '') {
    throw new Error(
      `Variável de ambiente ausente: ${nome}. ` +
        'Confira o .env.example e as Environment Variables do projeto na Vercel.',
    )
  }
  return valor
}

export function urlSupabase(): string {
  return exigir(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  )
}

export function chaveAnonSupabase(): string {
  return exigir(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

/**
 * URL pública do site, usada para montar links absolutos e para o webhook.
 *
 * Na Vercel, VERCEL_PROJECT_PRODUCTION_URL aponta sempre para o domínio de
 * produção, enquanto VERCEL_URL muda a cada deploy de preview. A ordem abaixo
 * respeita isso: quem define NEXT_PUBLIC_SITE_URL manda, depois produção,
 * depois o preview atual.
 */
export function urlDoSite(): string {
  const explicita = process.env.NEXT_PUBLIC_SITE_URL
  if (explicita) return explicita.replace(/\/$/, '')

  const producao = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (producao) return `https://${producao}`

  const preview = process.env.VERCEL_URL
  if (preview) return `https://${preview}`

  return 'http://localhost:3000'
}

export function emProducao(): boolean {
  return process.env.NODE_ENV === 'production'
}
