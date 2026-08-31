'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prepararLoginPorCpf } from '@/lib/auth-cpf'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/server'

export type EstadoLogin = { erro?: string }

async function origemDaRequisicao(): Promise<string> {
  const h = await headers()
  const encaminhado = h.get('x-forwarded-for')
  return (encaminhado?.split(',')[0] ?? h.get('x-real-ip') ?? 'desconhecida').trim()
}

// Só caminho relativo começando por uma barra: evita open-redirect via um
// valor de "proximo" forjado (ex.: "//evil.com" ou uma URL absoluta).
const ProximoValido = z
  .string()
  .regex(/^\/[a-zA-Z0-9/_-]*$/)
  .optional()

export async function entrarPorCpf(
  _anterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const origem = await origemDaRequisicao()
  const preparado = await prepararLoginPorCpf(
    String(formData.get('cpf') ?? ''),
    origem,
  )

  if (!preparado.ok) return { erro: preparado.erro }

  // O mesmo truque de um link mágico de "esqueci minha senha", só que sem
  // o e-mail sair de verdade: geramos o token e já o consumimos aqui.
  const admin = criarClienteAdmin()
  const { data: link, error: erroLink } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: preparado.email,
  })

  if (erroLink || !link.properties?.hashed_token) {
    return {
      erro: 'Não foi possível entrar agora. Tente novamente em instantes.',
    }
  }

  const supabase = await criarClienteServidor()
  const { error: erroSessao } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  })

  if (erroSessao) {
    return {
      erro: 'Não foi possível entrar agora. Tente novamente em instantes.',
    }
  }

  const proximo = ProximoValido.safeParse(formData.get('proximo') || undefined)
  redirect(proximo.success && proximo.data ? proximo.data : '/aluno')
}

export async function sair() {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut()
  redirect('/')
}
