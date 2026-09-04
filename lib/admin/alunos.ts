import 'server-only'
import type { DadosResponsavel } from '@/lib/dominio/esquemas'
import { garantirResponsavel } from '@/lib/matricula/responsavel'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type DadosAlunoAdmin = {
  id: string
  nome: string
  cpf: string
  rg?: string
  matriculaPrisional: string
  dataNascimento?: string
  unidadeId: string
  /** Ausente significa "não mexer no que já está lá". */
  responsavel?: DadosResponsavel
}

export type ResultadoSalvarAluno = { ok: true } | { ok: false; erro: string }

/**
 * Escrita do cadastro do aluno pelo painel, sem checagem de papel nem
 * revalidação: quem cuida disso é o wrapper `salvarAluno` em lib/admin/acoes.
 * Separado assim para poder ser testado sem `cookies()`.
 */
export async function atualizarAluno(
  d: DadosAlunoAdmin,
): Promise<ResultadoSalvarAluno> {
  const supabase = criarClienteAdmin()

  const cadastrais: {
    nome: string
    cpf: string
    rg: string | null
    matricula_prisional: string
    data_nascimento: string | null
    unidade_prisional_id: string
    responsavel_id?: string
    parentesco?: string
  } = {
    nome: d.nome,
    cpf: d.cpf.replace(/\D/g, ''),
    rg: d.rg ?? null,
    matricula_prisional: d.matriculaPrisional,
    data_nascimento: d.dataNascimento ?? null,
    unidade_prisional_id: d.unidadeId,
  }

  // Nesta tela a troca de responsável é o objetivo, não efeito colateral de
  // uma compra — por isso aqui ela substitui o que existia, ao contrário do
  // que acontece no checkout e na matrícula.
  if (d.responsavel) {
    const resultado = await garantirResponsavel(d.responsavel, {
      atualizarCadastro: true,
    })
    if (!resultado.ok) return { ok: false, erro: resultado.erro }

    cadastrais.responsavel_id = resultado.id
    cadastrais.parentesco = d.responsavel.parentesco
  }

  const { error } = await supabase.from('internos').update(cadastrais).eq('id', d.id)

  // 23505 é violação de unicidade. Desde que o CPF virou a identidade do
  // aluno, digitar um CPF que já é de outro cadastro é erro de usuário e
  // precisa voltar como texto, não como exceção na tela.
  if (error?.code === '23505') {
    return { ok: false, erro: 'Já existe um aluno com este CPF.' }
  }
  if (error) return { ok: false, erro: 'Não foi possível salvar o aluno.' }

  return { ok: true }
}
