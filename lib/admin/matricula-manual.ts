import 'server-only'
import { obterCurso } from '@/lib/catalogo'
import { calcularTotal } from '@/lib/dominio/precos'
import type {
  DadosInterno,
  DadosResponsavel,
  DadosUnidade,
} from '@/lib/dominio/esquemas'
import { obterFrete } from '@/lib/frete'
import { garantirResponsavel } from '@/lib/matricula/responsavel'
import { criarMatricula } from '@/lib/matricula/acoes'
import { avancarStatus } from '@/lib/matricula/avancar'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type ResultadoMatriculaManual =
  | { ok: true; matriculaId: string; codigo: string }
  | { ok: false; erro: string }

/**
 * Cadastro manual acontece depois que o pagamento já foi confirmado fora
 * do site (telefone, presencial) — a matrícula entra direto em `paga`,
 * mas passa pelos mesmos dois avanços de status que uma compra online,
 * pra manter a mesma trilha de auditoria.
 */
async function confirmarPagamentoManual(matriculaId: string): Promise<void> {
  const supabase = criarClienteAdmin()

  const { data: matricula } = await supabase
    .from('matriculas')
    .select('codigo, total_centavos')
    .eq('id', matriculaId)
    .single()

  await supabase.from('pagamentos').insert({
    matricula_id: matriculaId,
    gateway: 'manual',
    gateway_ref: `manual-${matricula!.codigo}`,
    metodo: 'manual',
    // total_centavos é coluna gerada a partir de preco_centavos + frete_centavos,
    // ambas not null: nunca é null na prática, só no tipo gerado.
    valor_centavos: matricula!.total_centavos!,
    status: 'pago',
    pago_em: new Date().toISOString(),
  })

  await avancarStatus({
    matriculaId,
    para: 'aguardando_pagamento',
    nota: 'Matrícula cadastrada manualmente pelo colaborador',
  })
  await avancarStatus({
    matriculaId,
    para: 'paga',
    nota: 'Pagamento confirmado manualmente',
  })
}

export async function registrarMatriculaManualNovoAluno(entrada: {
  cursoSlug: string
  unidade: DadosUnidade
  interno: DadosInterno
  responsavel: DadosResponsavel
}): Promise<ResultadoMatriculaManual> {
  // criarMatricula já valida unidade/interno/responsável com os mesmos
  // esquemas do site — revalidar aqui seria duplicar a checagem.
  const resultado = await criarMatricula({
    cursoSlug: entrada.cursoSlug,
    rascunho: { unidade: entrada.unidade, interno: entrada.interno },
    responsavel: entrada.responsavel,
  })

  if (!resultado.ok) return resultado

  await confirmarPagamentoManual(resultado.matriculaId)
  return resultado
}

export async function registrarMatriculaParaAlunoExistente(entrada: {
  internoId: string
  cursoSlug: string
  unidadeId: string
  responsavel: DadosResponsavel
}): Promise<ResultadoMatriculaManual> {
  const supabase = criarClienteAdmin()

  const { data: interno } = await supabase
    .from('internos')
    .select('id, responsavel_id')
    .eq('id', entrada.internoId)
    .maybeSingle()

  if (!interno) return { ok: false, erro: 'Aluno não encontrado' }

  // Quem paga esta compra pode não ser quem pagou a anterior: a mãe comprou o
  // primeiro curso, a esposa compra o segundo.
  const comprador = await garantirResponsavel(entrada.responsavel, {
    atualizarCadastro: true,
  })
  if (!comprador.ok) return { ok: false, erro: comprador.erro }

  const { data: unidade } = await supabase
    .from('unidades_prisionais')
    .select('id, uf')
    .eq('id', entrada.unidadeId)
    .maybeSingle()

  if (!unidade) return { ok: false, erro: 'Unidade prisional não encontrada' }

  const { curso, indisponivel } = await obterCurso(entrada.cursoSlug)
  if (indisponivel || !curso) return { ok: false, erro: 'Curso não encontrado' }

  // O frete sai pela unidade escolhida nesta matrícula, não pela do cadastro:
  // aluno transferido de estado teria frete da unidade antiga.
  let frete: { valorCentavos: number }
  try {
    frete = await obterFrete(unidade.uf)
  } catch {
    return { ok: false, erro: `Frete ainda não configurado para ${unidade.uf}.` }
  }

  calcularTotal(curso.precoCentavos, frete.valorCentavos)

  const { data: matricula, error } = await supabase
    .from('matriculas')
    .insert({
      interno_id: interno.id,
      curso_id: curso.id,
      responsavel_id: comprador.id,
      unidade_prisional_id: unidade.id,
      preco_centavos: curso.precoCentavos,
      frete_centavos: frete.valorCentavos,
      status: 'rascunho',
    })
    .select('id, codigo')
    .single()

  if (error || !matricula) return { ok: false, erro: 'Não foi possível criar a matrícula.' }

  // Transferência de unidade acompanha o cadastro do aluno. O responsável só
  // é preenchido quando está nulo: numa compra, trocar o responsável do
  // cadastro seria efeito colateral, e tiraria de quem comprou primeiro.
  await supabase
    .from('internos')
    .update({
      unidade_prisional_id: unidade.id,
      ...(interno.responsavel_id
        ? {}
        : {
            responsavel_id: comprador.id,
            parentesco: entrada.responsavel.parentesco,
          }),
    })
    .eq('id', interno.id)

  await confirmarPagamentoManual(matricula.id)
  return { ok: true, matriculaId: matricula.id, codigo: matricula.codigo }
}
