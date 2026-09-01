'use server'

import { redirect } from 'next/navigation'
import { exigirEquipe } from '@/lib/auth'
import {
  EsquemaInterno,
  EsquemaResponsavel,
  EsquemaUnidade,
} from '@/lib/dominio/esquemas'
import {
  registrarMatriculaManualNovoAluno,
  registrarMatriculaParaAlunoExistente,
  type ResultadoMatriculaManual,
} from '@/lib/admin/matricula-manual'

export async function cadastrarAlunoEMatricula(
  _anterior: ResultadoMatriculaManual | null,
  formData: FormData,
): Promise<ResultadoMatriculaManual> {
  await exigirEquipe()

  const cursoSlug = String(formData.get('cursoSlug') ?? '')
  if (!cursoSlug) return { ok: false, erro: 'Selecione um curso' }

  const unidade = EsquemaUnidade.safeParse({
    uf: formData.get('uf'),
    unidadeId: formData.get('unidadeId'),
  })
  const interno = EsquemaInterno.safeParse({
    nome: formData.get('nome'),
    cpf: formData.get('cpf'),
    matriculaPrisional: formData.get('matriculaPrisional'),
    rg: formData.get('rg') || undefined,
    dataNascimento: formData.get('dataNascimento') || undefined,
  })
  const responsavel = EsquemaResponsavel.safeParse({
    nome: formData.get('responsavelNome'),
    cpf: formData.get('responsavelCpf'),
    email: formData.get('responsavelEmail'),
    telefone: formData.get('responsavelTelefone'),
    parentesco: formData.get('parentesco'),
  })

  if (!unidade.success) return { ok: false, erro: unidade.error.issues[0]!.message }
  if (!interno.success) return { ok: false, erro: interno.error.issues[0]!.message }
  if (!responsavel.success) {
    return { ok: false, erro: responsavel.error.issues[0]!.message }
  }

  const resultado = await registrarMatriculaManualNovoAluno({
    cursoSlug,
    unidade: unidade.data,
    interno: interno.data,
    responsavel: responsavel.data,
  })

  if (!resultado.ok) return resultado
  redirect(`/admin/matriculas/${resultado.matriculaId}`)
}

export async function matricularAlunoExistente(
  _anterior: ResultadoMatriculaManual | null,
  formData: FormData,
): Promise<ResultadoMatriculaManual> {
  await exigirEquipe()

  const internoId = String(formData.get('internoId') ?? '')
  const cursoSlug = String(formData.get('cursoSlug') ?? '')
  if (!cursoSlug) return { ok: false, erro: 'Selecione um curso' }

  const resultado = await registrarMatriculaParaAlunoExistente({ internoId, cursoSlug })

  if (!resultado.ok) return resultado
  redirect(`/admin/matriculas/${resultado.matriculaId}`)
}
