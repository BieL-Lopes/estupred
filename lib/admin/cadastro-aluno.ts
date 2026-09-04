import 'server-only'
import type { DadosInterno, DadosResponsavel } from '@/lib/dominio/esquemas'
import { garantirResponsavel } from '@/lib/matricula/responsavel'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type ResultadoCadastroAluno =
  | { ok: true; internoId: string }
  | { ok: false; erro: string }

/**
 * Cadastro de aluno que não cria matrícula: serve para alimentar o banco de
 * alunos com uma lista da unidade penal, antes de existir comprador.
 *
 * Não usa garantirInterno de propósito. Aquela função atualiza o cadastro
 * quando encontra o CPF, que é o certo numa compra e o errado aqui: o
 * colaborador declarou intenção de criar um cadastro novo, e alterar em
 * silêncio um registro que ele não sabia existir é pior do que recusar.
 */
export async function cadastrarAlunoNovo(entrada: {
  interno: DadosInterno
  unidadeId: string
  responsavel?: DadosResponsavel
}): Promise<ResultadoCadastroAluno> {
  const supabase = criarClienteAdmin()

  let responsavelId: string | null = null
  let parentesco: string | null = null

  if (entrada.responsavel) {
    // No painel o colaborador está com a pessoa ao telefone: é ele a
    // autoridade sobre o dado.
    const resultado = await garantirResponsavel(entrada.responsavel, {
      atualizarCadastro: true,
    })
    if (!resultado.ok) return { ok: false, erro: resultado.erro }

    responsavelId = resultado.id
    parentesco = entrada.responsavel.parentesco
  }

  const { data, error } = await supabase
    .from('internos')
    .insert({
      nome: entrada.interno.nome,
      cpf: entrada.interno.cpf.replace(/\D/g, ''),
      rg: entrada.interno.rg || null,
      matricula_prisional: entrada.interno.matriculaPrisional,
      data_nascimento: entrada.interno.dataNascimento || null,
      unidade_prisional_id: entrada.unidadeId,
      responsavel_id: responsavelId,
      parentesco,
    })
    .select('id')
    .single()

  if (error?.code === '23505') {
    return { ok: false, erro: 'Já existe um aluno com este CPF.' }
  }
  if (error || !data) {
    return { ok: false, erro: 'Não foi possível cadastrar o aluno.' }
  }

  return { ok: true, internoId: data.id }
}
