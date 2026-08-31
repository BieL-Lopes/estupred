import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { POST } from '@/app/api/webhooks/pagamento/route'

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function matriculaAguardando() {
  const { data: base } = await admin
    .from('matriculas')
    .select('interno_id, curso_id, responsavel_id, unidade_prisional_id')
    .limit(1)
    .single()

  const { data } = await admin
    .from('matriculas')
    .insert({
      ...base!,
      preco_centavos: 18500,
      frete_centavos: 0,
      status: 'aguardando_pagamento',
    })
    .select()
    .single()

  return data!
}

// Chama o Route Handler direto, sem precisar de `npm run dev` rodando: mais
// rápido e não sofre da fragilidade de porta que já apareceu nesta sessão.
function requisicao(corpo: unknown) {
  return new Request('http://localhost/api/webhooks/pagamento', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  })
}

describe('webhook de pagamento', () => {
  it('marca a matrícula como paga', async () => {
    const m = await matriculaAguardando()
    await admin.from('pagamentos').insert({
      matricula_id: m.id,
      gateway: 'fake',
      gateway_ref: `TESTE-${m.codigo}`,
      metodo: 'pix',
      valor_centavos: m.total_centavos!,
    })

    const r = await POST(
      requisicao({ ref: `TESTE-${m.codigo}`, evento: 'cobranca.paga', status: 'pago' }),
    )
    expect(r.status).toBe(200)

    const { data } = await admin
      .from('matriculas')
      .select('status')
      .eq('id', m.id)
      .single()
    expect(data!.status).toBe('paga')
  })

  it('registra o evento de transição', async () => {
    const m = await matriculaAguardando()
    await admin.from('pagamentos').insert({
      matricula_id: m.id,
      gateway: 'fake',
      gateway_ref: `TESTE-ev-${m.codigo}`,
      metodo: 'pix',
      valor_centavos: m.total_centavos!,
    })

    await POST(
      requisicao({ ref: `TESTE-ev-${m.codigo}`, evento: 'cobranca.paga', status: 'pago' }),
    )

    const { data } = await admin
      .from('matricula_eventos')
      .select('*')
      .eq('matricula_id', m.id)
    expect(data!.some((e) => e.para_status === 'paga')).toBe(true)
  })

  it('é idempotente: o segundo envio não muda nada', async () => {
    const m = await matriculaAguardando()
    await admin.from('pagamentos').insert({
      matricula_id: m.id,
      gateway: 'fake',
      gateway_ref: `TESTE-idem-${m.codigo}`,
      metodo: 'pix',
      valor_centavos: m.total_centavos!,
    })

    const corpo = { ref: `TESTE-idem-${m.codigo}`, evento: 'cobranca.paga', status: 'pago' }
    const primeira = await POST(requisicao(corpo))
    const segunda = await POST(requisicao(corpo))

    expect(primeira.status).toBe(200)
    expect(segunda.status).toBe(200)

    const { data } = await admin
      .from('matricula_eventos')
      .select('id')
      .eq('matricula_id', m.id)
      .eq('para_status', 'paga')
    expect(data!.length).toBe(1)
  })

  it('guarda pagamento órfão em vez de descartar', async () => {
    const r = await POST(
      requisicao({ ref: 'TESTE-orfao-sem-dono', evento: 'cobranca.paga', status: 'pago' }),
    )
    expect(r.status).toBe(200)

    const { data } = await admin
      .from('pagamento_eventos')
      .select('*')
      .eq('gateway_ref', 'TESTE-orfao-sem-dono')
    expect(data!.length).toBe(1)
  })

  it('recusa corpo inválido com 400', async () => {
    const r = await POST(requisicao({ sem: 'ref' }))
    expect(r.status).toBe(400)
  })

  it('ignora status que não é pago sem quebrar', async () => {
    const m = await matriculaAguardando()
    await admin.from('pagamentos').insert({
      matricula_id: m.id,
      gateway: 'fake',
      gateway_ref: `TESTE-pend-${m.codigo}`,
      metodo: 'boleto',
      valor_centavos: m.total_centavos!,
    })

    const r = await POST(
      requisicao({ ref: `TESTE-pend-${m.codigo}`, evento: 'cobranca.criada', status: 'pendente' }),
    )
    expect(r.status).toBe(200)

    const { data } = await admin
      .from('matriculas')
      .select('status')
      .eq('id', m.id)
      .single()
    expect(data!.status).toBe('aguardando_pagamento')
  })
})
