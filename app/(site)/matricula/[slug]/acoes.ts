'use server'

import { criarMatricula, type ResultadoMatricula } from '@/lib/matricula/acoes'
import type { DadosResponsavel, RascunhoMatricula } from '@/lib/dominio/esquemas'
import { prepararLoginPorCpf } from '@/lib/auth-cpf'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/server'

/**
 * Fica fora de lib/matricula/acoes.ts de propósito: criarMatricula é
 * testável direto em Vitest (sem sessão nenhuma). Autenticar precisa de
 * cookies() do Next, que só existe numa Server Action de verdade — por
 * isso esse passo extra vive aqui, como um wrapper fino em cima da lógica
 * pura, e não dentro dela. Mesmo padrão de app/(site)/entrar/acoes.ts.
 */
export async function criarMatriculaELogar(entrada: {
  cursoSlug: string
  rascunho: RascunhoMatricula
  responsavel: DadosResponsavel
}): Promise<ResultadoMatricula> {
  const resultado = await criarMatricula(entrada)
  if (!resultado.ok) return resultado

  // Já identificamos quem é o responsável nesta mesma submissão — aproveita
  // e autentica na hora, para ele chegar ao pagamento e à Área do Aluno já
  // logado, sem digitar o CPF de novo. É conveniência, não requisito: se
  // falhar, a matrícula já foi criada com sucesso e ele entra depois em
  // /entrar normalmente.
  //
  // Resolve o e-mail pelo CPF (prepararLoginPorCpf), não pelo que veio do
  // formulário: quando o CPF já tinha conta, criarMatricula reaproveitou o
  // profile existente, cujo e-mail pode ser diferente do que a pessoa
  // digitou agora. Usar o e-mail do formulário faria generateLink mirar
  // uma conta que não existe — foi exatamente o bug encontrado testando
  // no navegador: falhava calado, sem log nenhum.
  try {
    const preparado = await prepararLoginPorCpf(
      entrada.responsavel.cpf,
      'wizard-auto-login',
    )
    if (!preparado.ok) {
      console.error('[wizard] login automático: CPF não resolveu conta', preparado.erro)
      return resultado
    }

    const admin = criarClienteAdmin()
    const { data: link, error: erroLink } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: preparado.email,
    })

    if (erroLink || !link?.properties?.hashed_token) {
      console.error('[wizard] login automático: generateLink falhou', erroLink)
      return resultado
    }

    const supabase = await criarClienteServidor()
    const { error: erroSessao } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: link.properties.hashed_token,
    })

    if (erroSessao) {
      console.error('[wizard] login automático: verifyOtp falhou', erroSessao)
    }
  } catch (erro) {
    console.error('[wizard] login automático: erro inesperado', erro)
  }

  return resultado
}
