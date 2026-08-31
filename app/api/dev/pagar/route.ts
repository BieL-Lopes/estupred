import { NextResponse } from 'next/server'
import { urlDoSite } from '@/lib/env'
import { obterGateway } from '@/lib/pagamento'
import { FakeGateway } from '@/lib/pagamento/fake'

/** Simula a confirmação de um pagamento em desenvolvimento. Não existe em produção. */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ erro: 'Indisponível' }, { status: 404 })
  }

  const ref = new URL(req.url).searchParams.get('ref')
  if (!ref) {
    return NextResponse.json({ erro: 'ref ausente' }, { status: 400 })
  }

  const gateway = obterGateway()
  if (gateway instanceof FakeGateway) gateway.simularPagamento(ref)

  const base = urlDoSite()
  await fetch(`${base}/api/webhooks/pagamento`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ref, evento: 'cobranca.paga', status: 'pago' }),
  })

  return NextResponse.redirect(`${base}/aluno?pagamento=confirmado`)
}
