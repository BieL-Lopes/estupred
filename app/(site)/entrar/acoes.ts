'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { autenticarPorCpf } from '@/lib/auth-cpf'
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
  const resultado = await autenticarPorCpf(
    String(formData.get('cpf') ?? ''),
    origem,
  )

  if (!resultado.ok) return { erro: resultado.erro }

  const proximo = ProximoValido.safeParse(formData.get('proximo') || undefined)
  redirect(proximo.success && proximo.data ? proximo.data : '/aluno')
}

export async function sair() {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut()
  redirect('/')
}
