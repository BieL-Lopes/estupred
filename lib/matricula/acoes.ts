'use server'

import { calcularTotal } from '@/lib/dominio/precos'
import {
  EsquemaInterno,
  EsquemaResponsavel,
  EsquemaUnidade,
  type DadosResponsavel,
  type RascunhoMatricula,
} from '@/lib/dominio/esquemas'
import { obterCurso } from '@/lib/catalogo'
import { obterFrete } from '@/lib/frete'
import { garantirInterno } from '@/lib/matricula/interno'
import { garantirResponsavel } from '@/lib/matricula/responsavel'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type ResultadoMatricula =
  | { ok: true; codigo: string; matriculaId: string }
  | { ok: false; erro: string }

export async function criarMatricula(entrada: {
  cursoSlug: string
  rascunho: RascunhoMatricula
  responsavel: DadosResponsavel
}): Promise<ResultadoMatricula> {
  const unidade = EsquemaUnidade.safeParse(entrada.rascunho.unidade)
  const interno = EsquemaInterno.safeParse(entrada.rascunho.interno)
  const responsavel = EsquemaResponsavel.safeParse(entrada.responsavel)

  if (!unidade.success) return { ok: false, erro: unidade.error.issues[0]!.message }
  if (!interno.success) return { ok: false, erro: interno.error.issues[0]!.message }
  if (!responsavel.success) {
    return { ok: false, erro: responsavel.error.issues[0]!.message }
  }

  const { curso, indisponivel } = await obterCurso(entrada.cursoSlug)
  if (indisponivel) {
    return {
      ok: false,
      erro: 'Não foi possível carregar o curso agora. Tente novamente em instantes.',
    }
  }
  if (!curso) return { ok: false, erro: 'Curso não encontrado' }

  if (curso.ufs.length > 0 && !curso.ufs.includes(unidade.data.uf)) {
    return {
      ok: false,
      erro: `Este curso não está disponível em ${unidade.data.uf}`,
    }
  }

  let frete: { valorCentavos: number; prazoDias: number }
  try {
    frete = await obterFrete(unidade.data.uf)
  } catch {
    return {
      ok: false,
      erro: `Frete ainda não configurado para ${unidade.data.uf}. Fale com o suporte.`,
    }
  }

  const servidor = criarClienteAdmin()

  // O site nunca altera o cadastro de quem já tem conta: quem compra de novo
  // não deve sobrescrever nome e telefone sozinho.
  const resultadoResponsavel = await garantirResponsavel(responsavel.data, {
    atualizarCadastro: false,
  })
  if (!resultadoResponsavel.ok) {
    return { ok: false, erro: resultadoResponsavel.erro }
  }
  const responsavelId = resultadoResponsavel.id

  // Segunda compra para a mesma pessoa reaproveita o cadastro em vez de criar
  // um aluno novo — o CPF é a identidade.
  let internoId: string
  try {
    const resultado = await garantirInterno({
      interno: interno.data,
      unidadeId: unidade.data.unidadeId,
      responsavelId,
      parentesco: responsavel.data.parentesco,
    })
    internoId = resultado.id
  } catch {
    return { ok: false, erro: 'Não foi possível registrar os dados do interno.' }
  }

  // total_centavos é coluna gerada no banco; calcularTotal valida a entrada
  // e falha alto se algum valor não for centavo inteiro.
  calcularTotal(curso.precoCentavos, frete.valorCentavos)

  const { data: matricula, error: erroMatricula } = await servidor
    .from('matriculas')
    .insert({
      interno_id: internoId,
      curso_id: curso.id,
      responsavel_id: responsavelId,
      unidade_prisional_id: unidade.data.unidadeId,
      preco_centavos: curso.precoCentavos,
      frete_centavos: frete.valorCentavos,
      status: 'rascunho',
    })
    .select('id, codigo')
    .single()

  if (erroMatricula || !matricula) {
    return { ok: false, erro: 'Não foi possível criar a matrícula.' }
  }

  return { ok: true, codigo: matricula.codigo, matriculaId: matricula.id }
}
