import { redirect } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/server'

export type Perfil = {
  id: string
  nome: string
  email: string
  telefone: string
  role: 'responsavel' | 'admin' | 'colaborador'
}

/**
 * Perfil do usuário autenticado, ou null.
 *
 * "Não foi possível determinar o usuário" é tratado como "deslogado", e não
 * como erro: o cabeçalho aparece em toda página, inclusive nas institucionais
 * que não dependem do banco. Deixar isto lançar derruba o site inteiro quando
 * o Supabase está fora do ar ou mal configurado.
 *
 * Fechar o acesso continua garantido: exigirUsuario e exigirAdmin redirecionam
 * quando isto devolve null, e a RLS é a barreira final.
 */
export async function usuarioAtual(): Promise<Perfil | null> {
  try {
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
  } catch {
    return null
  }
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

/** Admin ou colaborador: o alcance comum de Alunos e Matrículas. */
export async function exigirEquipe(): Promise<Perfil> {
  const perfil = await exigirUsuario()
  if (perfil.role !== 'admin' && perfil.role !== 'colaborador') redirect('/')
  return perfil
}
