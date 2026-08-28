import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROTAS_PROTEGIDAS = ['/aluno', '/admin']

function paraLogin(request: NextRequest, caminho: string) {
  const destino = request.nextUrl.clone()
  destino.pathname = '/entrar'
  destino.searchParams.set('proximo', caminho)
  return NextResponse.redirect(destino)
}

export async function middleware(request: NextRequest) {
  const caminho = request.nextUrl.pathname
  const protegida = ROTAS_PROTEGIDAS.some((p) => caminho.startsWith(p))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Sem configuração não dá para verificar sessão nenhuma. Rota protegida
  // vai para o login (falha fechada); o resto do site segue funcionando
  // (falha aberta). O que não pode é o middleware derrubar a landing e a
  // própria rota de diagnóstico junto.
  if (!url || !chave) {
    return protegida ? paraLogin(request, caminho) : NextResponse.next()
  }

  let resposta = NextResponse.next({ request })

  try {
    const supabase = createServerClient(url, chave, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (paraGravar) => {
          for (const { name, value } of paraGravar) {
            request.cookies.set(name, value)
          }
          resposta = NextResponse.next({ request })
          for (const { name, value, options } of paraGravar) {
            resposta.cookies.set(name, value, options)
          }
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // O middleware só verifica se há sessão. Quem é admin é decidido no
    // layout de (admin) e, em última instância, pela RLS.
    if (protegida && !user) return paraLogin(request, caminho)

    return resposta
  } catch {
    // Supabase fora do ar ou credencial inválida. Mesma regra de antes:
    // fecha o que é protegido, deixa o site público de pé.
    return protegida ? paraLogin(request, caminho) : NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)',
  ],
}
