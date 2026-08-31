import 'server-only'
import { cpfValido, normalizarCpf } from '@/lib/dominio/cpf'
import { criarClienteAdmin } from '@/lib/supabase/admin'

const LIMITE_POR_HORA = 12

export type LoginCpfPreparado =
  | { ok: true; email: string }
  | { ok: false; erro: string }

/**
 * Valida o CPF, aplica o limite de tentativas e localiza a conta do
 * responsável correspondente — sem tocar em sessão.
 *
 * Fica deliberadamente separado da parte que grava a sessão (generateLink +
 * verifyOtp, em app/(site)/entrar/acoes.ts): gravar sessão exige cookies()
 * do Next, que só existe dentro de uma Server Action de verdade. Separar
 * também é o que torna esta função testável fora do runtime de requisição
 * do Next — os testes chamam prepararLoginPorCpf diretamente, sem precisar
 * simular uma requisição inteira.
 *
 * Só responsável entra por CPF. Sem o filtro de role, quem soubesse o CPF
 * de um administrador entraria como admin, sem senha nenhuma.
 */
export async function prepararLoginPorCpf(
  cpfBruto: string,
  origem: string,
): Promise<LoginCpfPreparado> {
  const cpf = normalizarCpf(cpfBruto)

  if (!cpfValido(cpf)) {
    return { ok: false, erro: 'CPF inválido. Confira os números digitados.' }
  }

  const admin = criarClienteAdmin()
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await admin
    .from('consultas_publicas')
    .select('id', { count: 'exact', head: true })
    .eq('origem', origem)
    .gte('created_at', umaHoraAtras)

  if ((count ?? 0) >= LIMITE_POR_HORA) {
    return {
      ok: false,
      erro: 'Muitas tentativas seguidas. Tente novamente daqui a pouco.',
    }
  }

  const { data: perfil } = await admin
    .from('profiles')
    .select('email')
    .eq('cpf', cpf)
    .eq('role', 'responsavel')
    .maybeSingle()

  // Mesma tabela do /consulta: são o mesmo risco (varredura de CPF), então
  // compartilham o mesmo contador por origem.
  await admin.from('consultas_publicas').insert({
    cpf_consultado: cpf,
    origem,
    encontrou: Boolean(perfil),
  })

  if (!perfil) {
    return {
      ok: false,
      erro: 'CPF não encontrado. Confira o número ou fale com o suporte.',
    }
  }

  return { ok: true, email: perfil.email }
}
