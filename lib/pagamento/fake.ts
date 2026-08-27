import { randomUUID } from 'node:crypto'
import type { StatusPagamento } from '@/lib/dominio/tipos'
import type {
  Cobranca,
  DadosCobranca,
  EventoWebhook,
  GatewayPagamento,
} from './tipos'

const STATUS_VALIDOS: readonly StatusPagamento[] = [
  'pendente',
  'pago',
  'falhou',
  'expirado',
  'estornado',
]

/**
 * Gateway de desenvolvimento. Mantém as cobranças em memória, o que basta
 * para o processo único do `next dev` e para os testes. Em produção o
 * GATEWAY_PAGAMENTO aponta para uma implementação real.
 */
export class FakeGateway implements GatewayPagamento {
  readonly nome = 'fake'
  private readonly cobrancas = new Map<string, StatusPagamento>()

  async criarCobranca(dados: DadosCobranca): Promise<Cobranca> {
    const ref = `${dados.codigo}-${randomUUID().slice(0, 8)}`
    this.cobrancas.set(ref, 'pendente')

    const expiraEm = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

    if (dados.metodo === 'pix') {
      return {
        ref,
        pixCopiaECola: `00020126FAKE${ref}5204000053039865802BR`,
        expiraEm,
      }
    }

    return {
      ref,
      url: `/api/dev/pagar?ref=${encodeURIComponent(ref)}`,
      expiraEm,
    }
  }

  async consultarStatus(ref: string): Promise<StatusPagamento> {
    return this.cobrancas.get(ref) ?? 'falhou'
  }

  /**
   * Só existe no fake: usado pela rota /api/dev/pagar. Marca a cobrança como
   * paga para que consultarStatus concorde com o webhook — sem isso o botão
   * de reconciliação do admin nunca confirmaria nada em desenvolvimento.
   */
  simularPagamento(ref: string): void {
    if (this.cobrancas.has(ref)) this.cobrancas.set(ref, 'pago')
  }

  async interpretarWebhook(req: Request): Promise<EventoWebhook | null> {
    let corpo: unknown
    try {
      corpo = await req.json()
    } catch {
      return null
    }

    if (typeof corpo !== 'object' || corpo === null) return null
    const c = corpo as Record<string, unknown>

    if (typeof c.ref !== 'string' || c.ref.length === 0) return null
    if (typeof c.evento !== 'string' || c.evento.length === 0) return null
    if (typeof c.status !== 'string') return null
    if (!STATUS_VALIDOS.includes(c.status as StatusPagamento)) return null

    return {
      ref: c.ref,
      evento: c.evento,
      status: c.status as StatusPagamento,
      payload: corpo,
    }
  }
}
