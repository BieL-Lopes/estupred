import type { MetodoPagamento, StatusPagamento } from '@/lib/dominio/tipos'

export type DadosCobranca = {
  matriculaId: string
  codigo: string
  valorCentavos: number
  metodo: MetodoPagamento
  pagador: { nome: string; cpf: string; email: string }
}

export type Cobranca = {
  ref: string
  url?: string
  pixCopiaECola?: string
  expiraEm: Date
}

export type EventoWebhook = {
  ref: string
  evento: string
  status: StatusPagamento
  payload: unknown
}

export interface GatewayPagamento {
  readonly nome: string
  criarCobranca(dados: DadosCobranca): Promise<Cobranca>
  consultarStatus(ref: string): Promise<StatusPagamento>
  interpretarWebhook(req: Request): Promise<EventoWebhook | null>
}
