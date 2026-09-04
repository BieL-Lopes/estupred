import type { StatusMatricula } from '@/lib/dominio/tipos'
import { ROTULO_STATUS } from '@/lib/dominio/tipos'
import { criarClienteServidor } from '@/lib/supabase/server'

export type MatriculaDoAluno = {
  id: string
  codigo: string
  status: StatusMatricula
  totalCentavos: number
  criadaEm: string
  curso: { titulo: string; slug: string; cargaHoraria: number }
  interno: { nome: string }
  unidade: { nome: string; uf: string }
}

export type EventoLinha = {
  paraStatus: StatusMatricula
  nota: string | null
  criadoEm: string
}

export type EtapaLinha = {
  status: StatusMatricula
  rotulo: string
  estado: 'concluida' | 'atual' | 'futura'
  quando: string | null
}

const ETAPAS: readonly StatusMatricula[] = [
  'aguardando_pagamento',
  'paga',
  'material_em_producao',
  'material_a_caminho',
  'material_entregue',
  'prova_aplicada',
  'aprovado',
  'certificado_emitido',
]

/**
 * Status que não aparecem como etapa própria e precisam ser desenhados na
 * etapa de outro. Sem isso, `indexOf` devolveria -1 e a linha do tempo
 * inteira apareceria como futura.
 */
const EQUIVALENTE: Partial<Record<StatusMatricula, StatusMatricula>> = {
  // Recuperação: visualmente continua na etapa da prova, com o rótulo avisando.
  reprovado: 'prova_aplicada',
  // Etapa aposentada, que significava entrega na unidade.
  material_enviado: 'material_entregue',
}

/**
 * Monta as oito etapas visíveis na Área do Aluno a partir do status atual e
 * da trilha de eventos. Pura, sem I/O — testável direto.
 */
export function montarLinhaDoTempo(
  status: StatusMatricula,
  eventos: EventoLinha[],
): EtapaLinha[] {
  if (status === 'cancelada') return []

  const efetivo: StatusMatricula = EQUIVALENTE[status] ?? status
  const atual = ETAPAS.indexOf(efetivo)

  return ETAPAS.map((etapa, indice) => {
    const evento = eventos.find((e) => e.paraStatus === etapa)

    return {
      status: etapa,
      rotulo:
        etapa === 'prova_aplicada' && status === 'reprovado'
          ? 'Prova aplicada — em recuperação'
          : ROTULO_STATUS[etapa],
      estado:
        indice < atual ? 'concluida' : indice === atual ? 'atual' : 'futura',
      quando: evento?.criadoEm ?? null,
    }
  })
}

const SELECAO = `
  id, codigo, status, total_centavos, created_at, autorizacao_url,
  cursos:curso_id (titulo, slug, carga_horaria),
  internos:interno_id (nome),
  unidades_prisionais:unidade_prisional_id (nome, uf)
`

type LinhaBruta = {
  id: string
  codigo: string
  status: string
  total_centavos: number | null
  created_at: string
  autorizacao_url: string | null
  cursos: { titulo: string; slug: string; carga_horaria: number } | null
  internos: { nome: string } | null
  unidades_prisionais: { nome: string; uf: string } | null
}

function mapear(linha: LinhaBruta): MatriculaDoAluno {
  return {
    id: linha.id,
    codigo: linha.codigo,
    status: linha.status as StatusMatricula,
    totalCentavos: linha.total_centavos ?? 0,
    criadaEm: linha.created_at,
    curso: {
      titulo: linha.cursos?.titulo ?? 'Curso removido',
      slug: linha.cursos?.slug ?? '',
      cargaHoraria: linha.cursos?.carga_horaria ?? 0,
    },
    interno: { nome: linha.internos?.nome ?? '—' },
    unidade: {
      nome: linha.unidades_prisionais?.nome ?? '—',
      uf: linha.unidades_prisionais?.uf ?? '',
    },
  }
}

/** RLS já restringe ao responsável autenticado; nenhum filtro extra é preciso. */
export async function listarMatriculasDoAluno(): Promise<MatriculaDoAluno[]> {
  const supabase = await criarClienteServidor()

  const { data } = await supabase
    .from('matriculas')
    .select(SELECAO)
    .neq('status', 'rascunho')
    .order('created_at', { ascending: false })

  return ((data ?? []) as unknown as LinhaBruta[]).map(mapear)
}

export async function obterMatriculaPorCodigo(codigo: string) {
  const supabase = await criarClienteServidor()

  const { data } = await supabase
    .from('matriculas')
    .select(SELECAO)
    .eq('codigo', codigo)
    .maybeSingle()

  if (!data) return null
  const linha = data as unknown as LinhaBruta

  const { data: eventos } = await supabase
    .from('matricula_eventos')
    .select('para_status, nota, created_at')
    .eq('matricula_id', linha.id)
    .order('created_at')

  return {
    matricula: mapear(linha),
    autorizacaoUrl: linha.autorizacao_url,
    eventos: (eventos ?? []).map((e) => ({
      paraStatus: e.para_status as StatusMatricula,
      nota: e.nota,
      criadoEm: e.created_at,
    })),
  }
}
