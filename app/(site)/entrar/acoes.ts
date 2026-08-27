'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { criarClienteServidor } from '@/lib/supabase/server'

const Entrada = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha precisa de ao menos 6 caracteres'),
  proximo: z.string().optional(),
})

export type EstadoLogin = { erro?: string }

export async function entrar(
  _anterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const analise = Entrada.safeParse({
    email: formData.get('email'),
    senha: formData.get('senha'),
    proximo: formData.get('proximo') ?? undefined,
  })

  if (!analise.success) {
    return { erro: analise.error.issues[0]!.message }
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({
    email: analise.data.email,
    password: analise.data.senha,
  })

  // Mensagem genérica de propósito: distinguir "e-mail não existe" de "senha
  // errada" entrega uma lista de clientes a quem quiser enumerar.
  if (error) return { erro: 'E-mail ou senha incorretos' }

  redirect(analise.data.proximo || '/aluno')
}

export async function sair() {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut()
  redirect('/')
}
