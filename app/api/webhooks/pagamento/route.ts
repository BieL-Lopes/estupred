import { NextResponse } from 'next/server'
import { avancarStatus } from '@/lib/matricula/avancar'
import { TransicaoInvalidaError } from '@/lib/matricula/transicoes'
import { obterGateway } from '@/lib/pagamento'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const gateway = obterGateway()
  const evento = await gateway.interpretarWebhook(req)

  if (!evento) {
    return NextResponse.json({ erro: 'Corpo inválido' }, { status: 400 })
  }

  const supabase = criarClienteAdmin()

  // Idempotência: a unique constraint decide. Conflito significa reenvio.
  const { error: erroEvento } = await supabase.from('pagamento_eventos').insert({
    gateway: gateway.nome,
    gateway_ref: evento.ref,
    evento: evento.evento,
    payload: evento.payload as never,
  })

  if (erroEvento) {
    if (erroEvento.code === '23505') {
      return NextResponse.json({ ok: true, repetido: true })
    }
    throw erroEvento
  }

  const { data: pagamento } = await supabase
    .from('pagamentos')
    .select('id, matricula_id')
    .eq('gateway', gateway.nome)
    .eq('gateway_ref', evento.ref)
    .maybeSingle()

  // Pagamento órfão: o evento já ficou registrado acima e aparece como
  // pendência no admin. Dinheiro que entrou nunca é descartado.
  if (!pagamento) {
    return NextResponse.json({ ok: true, orfao: true })
  }

  await supabase
    .from('pagamentos')
    .update({
      status: evento.status,
      pago_em: evento.status === 'pago' ? new Date().toISOString() : null,
      payload: evento.payload as never,
    })
    .eq('id', pagamento.id)

  if (evento.status === 'pago' && pagamento.matricula_id) {
    try {
      await avancarStatus({
        matriculaId: pagamento.matricula_id,
        para: 'paga',
        nota: `Pagamento confirmado pelo gateway ${gateway.nome}`,
      })
    } catch (erro) {
      // Matrícula já avançada por outra via. O pagamento está registrado,
      // que é o que importa; não faz sentido devolver erro ao gateway.
      if (!(erro instanceof TransicaoInvalidaError)) throw erro
    }
  }

  return NextResponse.json({ ok: true })
}
