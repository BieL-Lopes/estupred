import 'server-only'
import { FakeGateway } from './fake'
import type { GatewayPagamento } from './tipos'

let instancia: GatewayPagamento | null = null

export function obterGateway(): GatewayPagamento {
  if (instancia) return instancia

  const escolhido = process.env.GATEWAY_PAGAMENTO ?? 'fake'

  switch (escolhido) {
    case 'fake':
      // Sem esta guarda, a pior falha possível deste desenho seria subir a
      // plataforma aceitando matrícula sem cobrar de verdade.
      if (process.env.NODE_ENV === 'production') {
        throw new Error('GATEWAY_PAGAMENTO=fake é proibido em produção')
      }
      instancia = new FakeGateway()
      return instancia
    default:
      throw new Error(`Gateway de pagamento desconhecido: ${escolhido}`)
  }
}

export type {
  Cobranca,
  DadosCobranca,
  EventoWebhook,
  GatewayPagamento,
} from './tipos'
