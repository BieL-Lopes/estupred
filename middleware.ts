import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROTAS_PROTEGIDAS = ['/aluno', '/admin']

// /admin usa e-mail e senha (equipe interna); /aluno usa CPF (responsável).
function destinoDeLogin(caminho: string): string {
  return caminho.startsWith('/admin') ? '/entrar-equipe' : '/entrar'
}

function paraLogin(request: NextRequest, caminho: string) {
  const destino = request.nextUrl.clone()
  destino.pathname = destinoDeLogin(caminho)
  destino.searchParams.set('proximo', caminho)
  return NextResponse.redirect(destino)
}

export async function middleware(request: NextRequest) {
  const caminho = request.nextUrl.pathname
  const protegida = ROTAS_PROTEGIDAS.some((p) => caminho.startsWith(p))

  // Rota pública não precisa saber quem é o usuário — cada página resolve
  // isso sozinha (usuarioAtual, no cabeçalho). Sem essa saída antecipada, o
  // middleware fazia uma ida e volta ao servidor de auth do Supabase em
  // toda navegação do site inteiro, não só nas rotas protegidas.
  if (!protegida) return NextResponse.next()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Sem configuração não dá para verificar sessão nenhuma — falha fechada.
  if (!url || !chave) return paraLogin(request, caminho)

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
    if (!user) return paraLogin(request, caminho)

    return resposta
  } catch {
    // Supabase fora do ar ou credencial inválida numa rota protegida:
    // fecha o acesso.
    return paraLogin(request, caminho)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)',
  ],
}
