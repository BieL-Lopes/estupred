'use server'

import { z } from 'zod'
import { urlDoSite } from '@/lib/env'
import { criarClienteServidor } from '@/lib/supabase/server'

export type EstadoEsqueciSenha = { enviado?: boolean; erro?: string }

const Entrada = z.object({ email: z.string().email('E-mail inválido') })

export async function solicitarRedefinicao(
  _anterior: EstadoEsqueciSenha,
  formData: FormData,
): Promise<EstadoEsqueciSenha> {
  const analise = Entrada.safeParse({ email: formData.get('email') })
  if (!analise.success) return { erro: analise.error.issues[0]!.message }

  const supabase = await criarClienteServidor()

  // O Supabase não avisa se o e-mail existe ou não — a mesma mensagem sai
  // pros dois casos, então a resposta em si já não vaza nada.
  await supabase.auth.resetPasswordForEmail(analise.data.email, {
    redirectTo: `${urlDoSite()}/entrar-equipe/redefinir-senha`,
  })

  return { enviado: true }
}
