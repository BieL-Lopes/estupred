/**
 * Regra definida pelo cliente: a prova acontece 45 dias corridos depois do
 * início do curso, e o início do curso é a entrega do material na unidade
 * prisional. É a data em que o aluno fica apto a fazer a prova.
 *
 * Uma versão anterior empurrava o resultado para o próximo dia útil quando
 * caía em fim de semana ou feriado. O cliente reviu isso em 04/09/2026 e
 * pediu 45 corridos exatos, então o cálculo de feriado saiu junto.
 *
 * São datas de calendário, não instantes: tudo trafega como 'AAAA-MM-DD' e as
 * contas são feitas em UTC, de modo que o fuso da máquina não muda o resultado.
 */

export const DIAS_ATE_A_PROVA = 45

const FORMATO = /^\d{4}-\d{2}-\d{2}$/

function paraUtc(data: string): Date {
  if (!FORMATO.test(data)) {
    throw new Error(`Data deve estar em AAAA-MM-DD, recebido: ${data}`)
  }
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(Date.UTC(ano!, mes! - 1, dia!))
}

function paraIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Data em que o aluno fica apto a fazer a prova, a partir do início do curso. */
export function calcularDataProva(dataInicio: string): string {
  const d = paraUtc(dataInicio)
  d.setUTCDate(d.getUTCDate() + DIAS_ATE_A_PROVA)
  return paraIso(d)
}
