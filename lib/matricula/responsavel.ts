import 'server-only'
import type { DadosResponsavel } from '@/lib/dominio/esquemas'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type ResultadoResponsavel =
  | { ok: true; id: string; criado: boolean }
  | { ok: false; erro: string }

/**
 * Porta única de criação de conta de responsável. Antes disso a lógica vivia
 * inline no checkout público; o painel precisava dela também, e duplicar
 * criaria dois lugares onde conta de acesso nasce.
 *
 * `atualizarCadastro` separa as duas intenções: no painel o colaborador está
 * com a pessoa ao telefone e é a autoridade sobre o dado; no site, uma família
 * comprando de novo não deve alterar sozinha o cadastro.
 *
 * O e-mail nunca é sobrescrito, mesmo com `atualizarCadastro`. Ele é a
 * identidade de autenticação: prepararLoginPorCpf (lib/auth-cpf.ts) resolve o
 * e-mail pelo CPF em `profiles` e gera link mágico contra `auth.users`. Mexer
 * só de um lado quebra o login por CPF, e só na próxima tentativa de entrar.
 */
export async function garantirResponsavel(
  dados: DadosResponsavel,
  opcoes: { atualizarCadastro: boolean },
): Promise<ResultadoResponsavel> {
  const servidor = criarClienteAdmin()
  const cpf = dados.cpf.replace(/\D/g, '')

  // profiles.cpf é único: se o responsável já tem conta (segunda matrícula,
  // outro curso ou outro interno), reaproveita — criar de novo violaria a
  // constraint. O acesso continua sendo só por CPF (lib/auth-cpf.ts).
  const { data: existente } = await servidor
    .from('profiles')
    .select('id')
    .eq('cpf', cpf)
    .eq('role', 'responsavel')
    .maybeSingle()

  if (existente) {
    if (opcoes.atualizarCadastro) {
      const { error } = await servidor
        .from('profiles')
        .update({ nome: dados.nome, telefone: dados.telefone })
        .eq('id', existente.id)

      if (error) {
        return { ok: false, erro: 'Não foi possível atualizar o responsável.' }
      }
    }
    return { ok: true, id: existente.id, criado: false }
  }

  const { data: criado, error } = await servidor.auth.admin.createUser({
    email: dados.email,
    // Senha aleatória, nunca usada: o acesso é só por CPF.
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: {
      nome: dados.nome,
      cpf,
      telefone: dados.telefone,
    },
  })

  if (error || !criado.user) {
    if (error?.message.toLowerCase().includes('already been registered')) {
      return { ok: false, erro: 'Este e-mail já está em uso por outra conta.' }
    }
    return { ok: false, erro: 'Não foi possível criar o cadastro do responsável.' }
  }

  return { ok: true, id: criado.user.id, criado: true }
}
