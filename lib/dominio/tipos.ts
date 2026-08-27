export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
] as const

export type UF = (typeof UFS)[number]

export const STATUS_MATRICULA = [
  'rascunho',
  'aguardando_pagamento',
  'paga',
  'material_enviado',
  'prova_aplicada',
  'aprovado',
  'reprovado',
  'certificado_emitido',
  'cancelada',
] as const

export type StatusMatricula = (typeof STATUS_MATRICULA)[number]

export type MetodoPagamento = 'pix' | 'boleto' | 'cartao'

export type StatusPagamento =
  | 'pendente'
  | 'pago'
  | 'falhou'
  | 'expirado'
  | 'estornado'

export const ROTULO_STATUS: Record<StatusMatricula, string> = {
  rascunho: 'Rascunho',
  aguardando_pagamento: 'Aguardando pagamento',
  paga: 'Matrícula paga',
  material_enviado: 'Material enviado',
  prova_aplicada: 'Prova aplicada',
  aprovado: 'Aprovado',
  reprovado: 'Em recuperação',
  certificado_emitido: 'Certificado emitido',
  cancelada: 'Cancelada',
}
