/**
 * Regra "45+" definida pelo cliente: a prova acontece 45 dias após o início do
 * curso, e o início do curso é a entrega do material na unidade prisional.
 * O "+" existe porque, se o quadragésimo quinto dia cair em fim de semana ou
 * feriado, a prova só pode ser aplicada no próximo dia útil.
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

function somarDias(data: string, dias: number): string {
  const d = paraUtc(data)
  d.setUTCDate(d.getUTCDate() + dias)
  return paraIso(d)
}

/** Páscoa pelo algoritmo de Meeus/Jones/Butcher, calendário gregoriano. */
function pascoa(ano: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(ano, mes - 1, dia))
}

const FIXOS = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Consciência Negra (Lei 14.759/2023)
  '12-25', // Natal
]

const cache = new Map<number, string[]>()

/**
 * Feriados nacionais do ano. Não inclui Carnaval nem Corpus Christi, que são
 * ponto facultativo e não feriado, nem feriados estaduais e municipais.
 */
export function feriadosNacionais(ano: number): string[] {
  const guardado = cache.get(ano)
  if (guardado) return guardado

  const sextaFeiraSanta = pascoa(ano)
  sextaFeiraSanta.setUTCDate(sextaFeiraSanta.getUTCDate() - 2)

  const lista = [
    ...FIXOS.map((md) => `${ano}-${md}`),
    paraIso(sextaFeiraSanta),
  ].sort()

  cache.set(ano, lista)
  return lista
}

export function ehDiaUtil(data: string): boolean {
  const d = paraUtc(data)
  const diaDaSemana = d.getUTCDay()
  if (diaDaSemana === 0 || diaDaSemana === 6) return false
  return !feriadosNacionais(d.getUTCFullYear()).includes(data)
}

export function proximoDiaUtil(data: string): string {
  let atual = data
  // O limite existe só para não haver laço infinito por um bug de calendário.
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    if (ehDiaUtil(atual)) return atual
    atual = somarDias(atual, 1)
  }
  throw new Error(`Nenhum dia útil encontrado a partir de ${data}`)
}

/** Data em que a prova pode ser aplicada, a partir do início do curso. */
export function calcularDataProva(dataInicio: string): string {
  return proximoDiaUtil(somarDias(dataInicio, DIAS_ATE_A_PROVA))
}
