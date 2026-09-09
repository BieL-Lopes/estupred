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
