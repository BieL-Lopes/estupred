'use server'

import { redirect } from 'next/navigation'
import {
  cadastrarAlunoNovo,
  type ResultadoCadastroAluno,
} from '@/lib/admin/cadastro-aluno'
import { exigirEquipe } from '@/lib/auth'
import { EsquemaInterno, EsquemaResponsavel } from '@/lib/dominio/esquemas'

/** Os cinco campos do responsável, ou nenhum. Meio preenchido é erro. */
const CAMPOS_RESPONSAVEL = [
  'responsavelNome',
  'responsavelCpf',
  'responsavelEmail',
  'responsavelTelefone',
  'parentesco',
] as const

export async function cadastrarAluno(
  _anterior: ResultadoCadastroAluno | null,
  formData: FormData,
): Promise<ResultadoCadastroAluno> {
  await exigirEquipe()

  const unidadeId = String(formData.get('unidadeId') ?? '')
  if (!unidadeId) return { ok: false, erro: 'Selecione a unidade prisional' }

  const interno = EsquemaInterno.safeParse({
    nome: formData.get('nome'),
    cpf: formData.get('cpf'),
    matriculaPrisional: formData.get('matriculaPrisional'),
    rg: formData.get('rg') || undefined,
    dataNascimento: formData.get('dataNascimento') || undefined,
  })
  if (!interno.success) {
    return { ok: false, erro: interno.error.issues[0]!.message }
  }

  const preenchidos = CAMPOS_RESPONSAVEL.filter((c) =>
    String(formData.get(c) ?? '').trim(),
  )

  if (preenchidos.length > 0 && preenchidos.length < CAMPOS_RESPONSAVEL.length) {
    return {
      ok: false,
      erro: 'Preencha todos os dados do responsável ou deixe todos em branco.',
    }
  }

  let responsavel
  if (preenchidos.length === CAMPOS_RESPONSAVEL.length) {
    const analisado = EsquemaResponsavel.safeParse({
      nome: formData.get('responsavelNome'),
      cpf: formData.get('responsavelCpf'),
      email: formData.get('responsavelEmail'),
      telefone: formData.get('responsavelTelefone'),
      parentesco: formData.get('parentesco'),
    })
    if (!analisado.success) {
      return { ok: false, erro: analisado.error.issues[0]!.message }
    }
    responsavel = analisado.data
  }

  const resultado = await cadastrarAlunoNovo({
    interno: interno.data,
    unidadeId,
    responsavel,
  })

  if (!resultado.ok) return resultado
  redirect(`/admin/alunos/${resultado.internoId}`)
}
