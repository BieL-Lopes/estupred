import type { StatusMatricula } from '@/lib/dominio/tipos'

/**
 * Status em que o material já saiu do papel e há dinheiro comprometido: da
 * produção em diante o aluno está ocupado e não pode começar outro curso.
 * Uma matrícula apenas paga não segura ninguém, porque até ali nada foi gasto.
 *
 * `reprovado` continua ocupando: o aluno vai refazer a prova do mesmo curso.
 * `material_enviado` está aposentado, mas significava "entregue na unidade" —
 * se alguma linha antiga escapar da migração, ela tem que continuar ocupando.
 */
export const STATUS_EM_CURSO = [
  'material_em_producao',
  'material_a_caminho',
  'material_entregue',
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
 * Devolve a matrícula que impede `alvoId` de começar a produção do material,
 * ou null se o caminho está livre.
 */
export function bloqueioDeProducao(
  alvoId: string,
  matriculas: readonly MatriculaDaFila[],
): MatriculaDaFila | null {
  const outras = matriculas.filter((m) => m.id !== alvoId)
  return situacaoDaFila(outras).emCurso
}
