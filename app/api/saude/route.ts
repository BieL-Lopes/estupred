import { NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase/server'
import { urlDoSite } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * Verificação de saúde para usar logo depois de um deploy: confirma que a
 * aplicação subiu, que as variáveis de ambiente chegaram e que o banco
 * responde. Não expõe chave nenhuma.
 */
export async function GET() {
  const inicio = Date.now()

  let banco: 'ok' | 'falha' = 'falha'
  let cursosAtivos: number | null = null
  let detalhe: string | null = null

  try {
    const supabase = await criarClienteServidor()
    const { count, error } = await supabase
      .from('cursos')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', true)

    if (error) {
      detalhe = error.message
    } else {
      banco = 'ok'
      cursosAtivos = count ?? 0
    }
  } catch (erro) {
    detalhe = erro instanceof Error ? erro.message : 'erro desconhecido'
  }

  const gateway = process.env.GATEWAY_PAGAMENTO ?? 'fake'
  const gatewayPronto = gateway !== 'fake'

  const corpo = {
    aplicacao: 'ok' as const,
    banco,
    cursosAtivos,
    gateway,
    gatewayPronto,
    site: urlDoSite(),
    ambiente: process.env.NODE_ENV,
    duracaoMs: Date.now() - inicio,
    ...(detalhe ? { detalhe } : {}),
  }

  return NextResponse.json(corpo, { status: banco === 'ok' ? 200 : 503 })
}
