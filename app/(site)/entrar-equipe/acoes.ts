'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { criarClienteServidor } from '@/lib/supabase/server'

const Entrada = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha precisa de ao menos 6 caracteres'),
})

export type EstadoLoginEquipe = { erro?: string }

/** Login com e-mail e senha, exclusivo da equipe interna (admin). */
export async function entrarComoEquipe(
  _anterior: EstadoLoginEquipe,
  formData: FormData,
): Promise<EstadoLoginEquipe> {
  const analise = Entrada.safeParse({
    email: formData.get('email'),
    senha: formData.get('senha'),
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
  // errada" entrega uma lista de contas a quem quiser enumerar.
  if (error) return { erro: 'E-mail ou senha incorretos' }

  redirect('/admin')
}
