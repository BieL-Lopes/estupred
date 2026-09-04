import type { StatusMatricula } from '@/lib/dominio/tipos'

/**
 * Status em que o material já saiu da gráfica e está na unidade prisional.
 * É isso que ocupa o aluno — não a data da compra. Uma matrícula paga não
 * segura ninguém, porque até ali nada foi gasto.
 *
 * `reprovado` continua ocupando: o aluno vai refazer a prova do mesmo curso.
 */
export const STATUS_EM_CURSO = [
  'material_enviado',
  'prova_aplicada',
  'aprovado',
  'reprovado',
] as const satisfies readonly StatusMatricula[]

export type MatriculaDaFila = {
  id: string
  codigo: string
  status: StatusMatricula
  /** ISO. Só ordena a fila; não decide quem está em curso. */
  criadaEm: string
}

export type SituacaoDaFila = {
  emCurso: MatriculaDaFila | null
  naFila: MatriculaDaFila[]
}

export function estaEmCurso(status: StatusMatricula): boolean {
  return (STATUS_EM_CURSO as readonly StatusMatricula[]).includes(status)
}

function porDataDeCriacao(a: MatriculaDaFila, b: MatriculaDaFila): number {
  return a.criadaEm.localeCompare(b.criadaEm)
}

export function situacaoDaFila(
  matriculas: readonly MatriculaDaFila[],
): SituacaoDaFila {
  const emCurso = [...matriculas]
    .filter((m) => estaEmCurso(m.status))
    .sort(porDataDeCriacao)
  const naFila = [...matriculas]
    .filter((m) => m.status === 'paga')
    .sort(porDataDeCriacao)

  return { emCurso: emCurso[0] ?? null, naFila }
}

/**
 * Devolve a matrícula que impede `alvoId` de receber material, ou null se
 * o caminho está livre.
 */
export function bloqueioDeEnvio(
  alvoId: string,
  matriculas: readonly MatriculaDaFila[],
): MatriculaDaFila | null {
  const outras = matriculas.filter((m) => m.id !== alvoId)
  return situacaoDaFila(outras).emCurso
}
