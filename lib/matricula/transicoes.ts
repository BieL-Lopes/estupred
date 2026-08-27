import type { StatusMatricula } from '@/lib/dominio/tipos'

export const TRANSICOES: Readonly<
  Record<StatusMatricula, readonly StatusMatricula[]>
> = {
  rascunho: ['aguardando_pagamento', 'cancelada'],
  aguardando_pagamento: ['paga', 'cancelada'],
  paga: ['material_enviado'],
  material_enviado: ['prova_aplicada'],
  prova_aplicada: ['aprovado', 'reprovado'],
  reprovado: ['prova_aplicada'],
  aprovado: ['certificado_emitido'],
  certificado_emitido: [],
  cancelada: [],
}

export class TransicaoInvalidaError extends Error {
  constructor(
    readonly de: StatusMatricula,
    readonly para: StatusMatricula,
  ) {
    super(`Transição inválida: ${de} não pode virar ${para}`)
    this.name = 'TransicaoInvalidaError'
  }
}

export function proximosStatus(
  de: StatusMatricula,
): readonly StatusMatricula[] {
  return TRANSICOES[de]
}

export function transicaoPermitida(
  de: StatusMatricula,
  para: StatusMatricula,
): boolean {
  return TRANSICOES[de].includes(para)
}

export function assertTransicao(
  de: StatusMatricula,
  para: StatusMatricula,
): void {
  if (!transicaoPermitida(de, para)) {
    throw new TransicaoInvalidaError(de, para)
  }
}
