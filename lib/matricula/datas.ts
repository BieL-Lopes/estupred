/**
 * Regras sobre a data em que a entrega do material realmente aconteceu.
 *
 * Ela não é a data do clique: o colaborador costuma registrar dias depois de
 * a unidade prisional confirmar o recebimento. E como a entrega é o marco
 * zero dos 45 dias, informar a data errada aponta a prova — e a remição de
 * pena que vem dela — para o dia errado.
 *
 * Pura, sem I/O: recebe o "hoje" em vez de consultar o relógio, para o
 * resultado não depender de quando o teste roda.
 */

import type { StatusMatricula } from '@/lib/dominio/tipos'
import { proximosStatus } from './transicoes'

export type ResultadoValidacao = { ok: true } | { ok: false; erro: string }

const FORMATO = /^\d{4}-\d{2}-\d{2}$/

export function validarDataDeEntrega(entrada: {
  data: string
  dataCompra: string | null
  hoje: string
}): ResultadoValidacao {
  if (!FORMATO.test(entrada.data)) {
    return { ok: false, erro: 'Informe uma data válida.' }
  }

  // Datas ISO comparam corretamente como texto, então não precisa de Date.
  if (entrada.data > entrada.hoje) {
    return { ok: false, erro: 'A entrega não pode estar no futuro.' }
  }

  if (entrada.dataCompra && entrada.data < entrada.dataCompra) {
    return {
      ok: false,
      erro: 'A entrega não pode ser anterior à data da compra.',
    }
  }

  return { ok: true }
}

/**
 * Quantas transições faltam da etapa atual até a entrega do material, ou
 * null se a entrega não é mais alcançável — depois da prova não se volta, e
 * cancelada é terminal.
 *
 * Serve para a tela explicar onde a data de início vai ser informada, em vez
 * de mostrar só um traço. O bloco "Datas do curso" fica antes de "Avançar
 * status", e sem essa explicação quem olha não descobre que a data entra no
 * botão da entrega, três cliques adiante.
 *
 * Percorre o grafo em largura, com conjunto de visitados: `reprovado` volta
 * para `prova_aplicada`, e sem isso o laço não terminaria.
 */
export function etapasAteAEntrega(status: StatusMatricula): number | null {
  if (status === 'material_entregue') return 0

  const visitados = new Set<StatusMatricula>([status])
  let fronteira: StatusMatricula[] = [status]
  let passos = 0

  while (fronteira.length > 0) {
    passos += 1
    const proxima: StatusMatricula[] = []

    for (const atual of fronteira) {
      for (const destino of proximosStatus(atual)) {
        if (destino === 'material_entregue') return passos
        if (visitados.has(destino)) continue
        visitados.add(destino)
        proxima.push(destino)
      }
    }

    fronteira = proxima
  }

  return null
}
