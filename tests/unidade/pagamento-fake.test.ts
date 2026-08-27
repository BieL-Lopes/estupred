import { beforeEach, describe, expect, it } from 'vitest'
import { FakeGateway } from '@/lib/pagamento/fake'
import type { DadosCobranca } from '@/lib/pagamento/tipos'

const dados: DadosCobranca = {
  matriculaId: '11111111-1111-1111-1111-111111111111',
  codigo: 'EST-2026-00001',
  valorCentavos: 21700,
  metodo: 'pix',
  pagador: { nome: 'Ana Souza', cpf: '39053344705', email: 'ana@exemplo.com' },
}

let gateway: FakeGateway

beforeEach(() => {
  gateway = new FakeGateway()
})

describe('criarCobranca', () => {
  it('devolve uma referência derivada do código da matrícula', async () => {
    const cobranca = await gateway.criarCobranca(dados)
    expect(cobranca.ref).toContain('EST-2026-00001')
  })

  it('devolve copia-e-cola para PIX', async () => {
    const cobranca = await gateway.criarCobranca(dados)
    expect(cobranca.pixCopiaECola).toBeTruthy()
    expect(cobranca.url).toBeUndefined()
  })

  it('devolve url para boleto', async () => {
    const cobranca = await gateway.criarCobranca({ ...dados, metodo: 'boleto' })
    expect(cobranca.url).toBeTruthy()
    expect(cobranca.pixCopiaECola).toBeUndefined()
  })

  it('devolve url para cartão', async () => {
    const cobranca = await gateway.criarCobranca({ ...dados, metodo: 'cartao' })
    expect(cobranca.url).toBeTruthy()
  })

  it('define validade no futuro', async () => {
    const cobranca = await gateway.criarCobranca(dados)
    expect(cobranca.expiraEm.getTime()).toBeGreaterThan(Date.now())
  })

  it('gera referências distintas para chamadas distintas', async () => {
    const a = await gateway.criarCobranca(dados)
    const b = await gateway.criarCobranca(dados)
    expect(a.ref).not.toBe(b.ref)
  })
})

describe('consultarStatus', () => {
  it('começa pendente', async () => {
    const cobranca = await gateway.criarCobranca(dados)
    expect(await gateway.consultarStatus(cobranca.ref)).toBe('pendente')
  })

  it('vira pago depois de simular o pagamento', async () => {
    const cobranca = await gateway.criarCobranca(dados)
    gateway.simularPagamento(cobranca.ref)
    expect(await gateway.consultarStatus(cobranca.ref)).toBe('pago')
  })

  it('ignora simulação de referência desconhecida', async () => {
    gateway.simularPagamento('inexistente')
    expect(await gateway.consultarStatus('inexistente')).toBe('falhou')
  })

  it('devolve falhou para referência desconhecida', async () => {
    expect(await gateway.consultarStatus('inexistente')).toBe('falhou')
  })
})

describe('interpretarWebhook', () => {
  it('lê um corpo válido', async () => {
    const req = new Request('http://localhost/api/webhooks/pagamento', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ref: 'EST-2026-00001-abc',
        evento: 'cobranca.paga',
        status: 'pago',
      }),
    })

    const evento = await gateway.interpretarWebhook(req)
    expect(evento).toEqual({
      ref: 'EST-2026-00001-abc',
      evento: 'cobranca.paga',
      status: 'pago',
      payload: {
        ref: 'EST-2026-00001-abc',
        evento: 'cobranca.paga',
        status: 'pago',
      },
    })
  })

  it('devolve null para corpo sem ref', async () => {
    const req = new Request('http://localhost/api/webhooks/pagamento', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ evento: 'cobranca.paga', status: 'pago' }),
    })
    expect(await gateway.interpretarWebhook(req)).toBeNull()
  })

  it('devolve null para status desconhecido', async () => {
    const req = new Request('http://localhost/api/webhooks/pagamento', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ref: 'x', evento: 'y', status: 'inventado' }),
    })
    expect(await gateway.interpretarWebhook(req)).toBeNull()
  })

  it('devolve null para JSON malformado', async () => {
    const req = new Request('http://localhost/api/webhooks/pagamento', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'isto não é json',
    })
    expect(await gateway.interpretarWebhook(req)).toBeNull()
  })
})
