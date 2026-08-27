import 'server-only'
import type { StatusMatricula } from '@/lib/dominio/tipos'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { calcularDataProva } from './prazos'
import { assertTransicao } from './transicoes'

export type EntradaAvanco = {
  matriculaId: string
  para: StatusMatricula
  nota?: string
  autorId?: string
  /** Só para testes: fixa o "hoje" usado ao carimbar as datas. */
  hoje?: string
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Carimba as datas que o cliente pediu no documento "Projeto Faculdade".
 * Elas são consequência da transição, não campos digitados à mão:
 *   - paga            → data da compra
 *   - material_enviado → entrega do material, que é o início do curso, e a
 *                        partir dela a data da prova pela regra dos 45+
 */
function datasDaTransicao(
  para: StatusMatricula,
  hoje: string,
): Record<string, string> {
  if (para === 'paga') return { data_compra: hoje }
  if (para === 'material_enviado') {
    return { data_inicio: hoje, data_prova: calcularDataProva(hoje) }
  }
  return {}
}

/**
 * Única porta de escrita de matriculas.status em todo o sistema.
 * Valida a transição contra o grafo e grava a trilha de auditoria.
 */
export async function avancarStatus(entrada: EntradaAvanco): Promise<void> {
  const supabase = criarClienteAdmin()

  const { data: matricula, error: erroLeitura } = await supabase
    .from('matriculas')
    .select('id, status')
    .eq('id', entrada.matriculaId)
    .single()

  if (erroLeitura || !matricula) {
    throw new Error(`Matrícula não encontrada: ${entrada.matriculaId}`)
  }

  const de = matricula.status as StatusMatricula
  assertTransicao(de, entrada.para)

  const hoje = entrada.hoje ?? hojeIso()

  // A condição sobre status torna a escrita segura contra corrida: se outro
  // processo já avançou, o update não afeta linha nenhuma.
  const { data: atualizadas, error: erroUpdate } = await supabase
    .from('matriculas')
    .update({ status: entrada.para, ...datasDaTransicao(entrada.para, hoje) })
    .eq('id', entrada.matriculaId)
    .eq('status', de)
    .select('id')

  if (erroUpdate) throw erroUpdate
  if (!atualizadas || atualizadas.length === 0) return

  const { error: erroEvento } = await supabase
    .from('matricula_eventos')
    .insert({
      matricula_id: entrada.matriculaId,
      de_status: de,
      para_status: entrada.para,
      nota: entrada.nota ?? null,
      autor_id: entrada.autorId ?? null,
    })

  if (erroEvento) throw erroEvento
}
