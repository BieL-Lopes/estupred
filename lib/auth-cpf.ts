import 'server-only'
import { cpfValido, normalizarCpf } from '@/lib/dominio/cpf'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/server'

const LIMITE_POR_HORA = 12

export type ResultadoLoginCpf = { ok: true } | { ok: false; erro: string }

/**
 * Autentica o responsável pelo CPF, sem senha — pedido do cliente,
 * espelhando a referência A Clique Fácil, que não tem conta nenhuma para a
 * família.
 *
 * Por trás dos panos ainda existe uma sessão Supabase real, mintada via
 * admin.generateLink + verifyOtp (o mesmo mecanismo de um link mágico de
 * "esqueci minha senha", só que sem o e-mail de verdade sair). Isso
 * significa que toda a RLS baseada em auth.uid() continua funcionando sem
 * nenhuma mudança nas policies.
 *
 * Não chama redirect(): quem decide para onde ir é o chamador. Isso também
 * deixa esta função testável diretamente, sem depender do runtime de
 * requisição do Next (headers(), redirect()).
 */
export async function autenticarPorCpf(
  cpfBruto: string,
  origem: string,
): Promise<ResultadoLoginCpf> {
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

  // Só responsável entra por CPF. Sem este filtro, quem soubesse o CPF de
  // um administrador entraria como admin, sem senha nenhuma.
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

  const { data: link, error: erroLink } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: perfil.email,
  })

  if (erroLink || !link.properties?.hashed_token) {
    return {
      ok: false,
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
      ok: false,
      erro: 'Não foi possível entrar agora. Tente novamente em instantes.',
    }
  }

  return { ok: true }
}
