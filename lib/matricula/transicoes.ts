import type { StatusMatricula } from '@/lib/dominio/tipos'

export const TRANSICOES: Readonly<
  Record<StatusMatricula, readonly StatusMatricula[]>
> = {
  rascunho: ['aguardando_pagamento', 'cancelada'],
  aguardando_pagamento: ['paga', 'cancelada'],
  paga: ['material_em_producao'],
  material_em_producao: ['material_a_caminho'],
  material_a_caminho: ['material_entregue'],
  material_entregue: ['prova_aplicada'],
  prova_aplicada: ['aprovado', 'reprovado'],
  reprovado: ['prova_aplicada'],
  aprovado: ['certificado_emitido'],
  certificado_emitido: [],
  cancelada: [],
  // Etapa aposentada: ninguém entra e ninguém sai. Ver a migração
  // 20260905000001 para o porquê de o valor continuar existindo.
  material_enviado: [],
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
