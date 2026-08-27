import { redirect } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/server'

export type Perfil = {
  id: string
  nome: string
  email: string
  telefone: string
  role: 'responsavel' | 'admin'
}

export async function usuarioAtual(): Promise<Perfil | null> {
  const supabase = await criarClienteServidor()

  // getUser valida o token contra o servidor; getSession confiaria no cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, nome, email, telefone, role')
    .eq('id', user.id)
    .single()

  return (data as Perfil | null) ?? null
}

export async function exigirUsuario(): Promise<Perfil> {
  const perfil = await usuarioAtual()
  if (!perfil) redirect('/entrar')
  return perfil
}

export async function exigirAdmin(): Promise<Perfil> {
  const perfil = await exigirUsuario()
  if (perfil.role !== 'admin') redirect('/')
  return perfil
}
