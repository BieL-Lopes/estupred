import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { iniciarCobranca } from '@/lib/matricula/cobranca'

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function matriculaRascunho() {
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
      frete_centavos: 2800,
      status: 'rascunho',
    })
    .select()
    .single()

  return data!
}

describe('iniciarCobranca', () => {
  it('cria o pagamento e move a matrícula para aguardando_pagamento', async () => {
    const m = await matriculaRascunho()
    const r = await iniciarCobranca({ matriculaId: m.id, metodo: 'pix' })

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.pixCopiaECola).toBeTruthy()

    const { data: atualizada } = await admin
      .from('matriculas')
      .select('status')
      .eq('id', m.id)
      .single()
    expect(atualizada!.status).toBe('aguardando_pagamento')

    const { data: pagamento } = await admin
      .from('pagamentos')
      .select('valor_centavos, metodo, status')
      .eq('gateway_ref', r.ref)
      .single()

    expect(pagamento!.valor_centavos).toBe(21300)
    expect(pagamento!.metodo).toBe('pix')
    expect(pagamento!.status).toBe('pendente')
  })

  it('cobra o total, preço mais frete, nunca só o preço', async () => {
    const m = await matriculaRascunho()
    const r = await iniciarCobranca({ matriculaId: m.id, metodo: 'boleto' })
    if (!r.ok) throw new Error(r.erro)

    const { data } = await admin
      .from('pagamentos')
      .select('valor_centavos')
      .eq('gateway_ref', r.ref)
      .single()
    expect(data!.valor_centavos).toBe(m.total_centavos)
  })

  it('recusa matrícula já paga', async () => {
    const m = await matriculaRascunho()
    await admin.from('matriculas').update({ status: 'paga' }).eq('id', m.id)

    const r = await iniciarCobranca({ matriculaId: m.id, metodo: 'pix' })
    expect(r.ok).toBe(false)
  })

  it('recusa matrícula inexistente', async () => {
    const r = await iniciarCobranca({
      matriculaId: '00000000-0000-0000-0000-000000000000',
      metodo: 'pix',
    })
    expect(r.ok).toBe(false)
  })
})
