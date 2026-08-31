'use server'

import type { MetodoPagamento } from '@/lib/dominio/tipos'
import { obterGateway } from '@/lib/pagamento'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { avancarStatus } from './avancar'

export type ResultadoCobranca =
  | { ok: true; ref: string; url?: string; pixCopiaECola?: string }
  | { ok: false; erro: string }

export async function iniciarCobranca(entrada: {
  matriculaId: string
  metodo: MetodoPagamento
}): Promise<ResultadoCobranca> {
  const supabase = criarClienteAdmin()

  const { data: matricula } = await supabase
    .from('matriculas')
    .select(
      'id, codigo, status, total_centavos, profiles:responsavel_id (nome, cpf, email)',
    )
    .eq('id', entrada.matriculaId)
    .maybeSingle()

  if (!matricula) return { ok: false, erro: 'Matrícula não encontrada' }

  if (matricula.status !== 'rascunho' && matricula.status !== 'aguardando_pagamento') {
    return { ok: false, erro: 'Esta matrícula não está aguardando pagamento' }
  }

  const pagador = matricula.profiles as unknown as {
    nome: string
    cpf: string
    email: string
  } | null

  if (!pagador) return { ok: false, erro: 'Responsável não encontrado' }

  const gateway = obterGateway()

  // total_centavos, jamais preco_centavos: o frete precisa entrar na cobrança.
  const cobranca = await gateway.criarCobranca({
    matriculaId: matricula.id,
    codigo: matricula.codigo,
    valorCentavos: matricula.total_centavos!,
    metodo: entrada.metodo,
    pagador,
  })

  const { error } = await supabase.from('pagamentos').insert({
    matricula_id: matricula.id,
    gateway: gateway.nome,
    gateway_ref: cobranca.ref,
    metodo: entrada.metodo,
    valor_centavos: matricula.total_centavos!,
    status: 'pendente',
  })

  if (error) return { ok: false, erro: 'Não foi possível registrar a cobrança' }

  if (matricula.status === 'rascunho') {
    await avancarStatus({
      matriculaId: matricula.id,
      para: 'aguardando_pagamento',
      nota: `Cobrança criada (${entrada.metodo})`,
    })
  }

  return {
    ok: true,
    ref: cobranca.ref,
    url: cobranca.url,
    pixCopiaECola: cobranca.pixCopiaECola,
  }
}
