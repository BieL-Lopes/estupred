import 'server-only'
import { validarDataDeEntrega } from '@/lib/matricula/datas'
import { calcularDataProva } from '@/lib/matricula/prazos'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type ResultadoCorrecao = { ok: true } | { ok: false; erro: string }

function paraBr(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Corrige a data em que o material foi entregue na unidade, depois de a
 * entrega já ter sido registrada.
 *
 * Recalcula a data da prova junto: sem isso a correção deixaria o prazo
 * apontando para o cálculo antigo, e é essa data que vale para a remição de
 * pena do aluno.
 *
 * Grava um evento de auditoria com as duas datas. `matricula_eventos` é
 * append-only e tem formato de transição, então a correção entra com
 * `de_status` nulo e `para_status` igual ao status atual — o suficiente para
 * a linha aparecer no histórico sem fingir que houve mudança de etapa.
 */
export async function corrigirDataDeEntrega(entrada: {
  matriculaId: string
  data: string
  autorId?: string
  /** Só para teste: fixa o "hoje" da validação. */
  hoje?: string
}): Promise<ResultadoCorrecao> {
  const supabase = criarClienteAdmin()

  const { data: matricula } = await supabase
    .from('matriculas')
    .select('id, status, data_compra, data_inicio')
    .eq('id', entrada.matriculaId)
    .maybeSingle()

  if (!matricula) return { ok: false, erro: 'Matrícula não encontrada.' }

  if (!matricula.data_inicio) {
    return {
      ok: false,
      erro: 'Esta matrícula ainda não teve a entrega do material registrada.',
    }
  }

  const validacao = validarDataDeEntrega({
    data: entrada.data,
    dataCompra: matricula.data_compra,
    hoje: entrada.hoje ?? hojeIso(),
  })
  if (!validacao.ok) return validacao

  const anterior = matricula.data_inicio
  if (anterior === entrada.data) return { ok: true }

  const { error } = await supabase
    .from('matriculas')
    .update({
      data_inicio: entrada.data,
      data_prova: calcularDataProva(entrada.data),
    })
    .eq('id', matricula.id)

  if (error) return { ok: false, erro: 'Não foi possível salvar a data.' }

  const { error: erroEvento } = await supabase.from('matricula_eventos').insert({
    matricula_id: matricula.id,
    de_status: null,
    para_status: matricula.status,
    nota: `Data de entrega corrigida de ${paraBr(anterior)} para ${paraBr(entrada.data)}`,
    autor_id: entrada.autorId ?? null,
  })

  if (erroEvento) throw erroEvento

  return { ok: true }
}
