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
  'material_em_producao',
  'material_a_caminho',
  'material_entregue',
  'prova_aplicada',
  'aprovado',
  'reprovado',
  'certificado_emitido',
  'cancelada',
  // Aposentado. Continua aqui porque matricula_eventos guarda eventos
  // passados com este valor, e o painel precisa saber rotulá-los.
  'material_enviado',
] as const

export type StatusMatricula = (typeof STATUS_MATRICULA)[number]

export type MetodoPagamento = 'pix' | 'boleto' | 'cartao' | 'manual'

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
  material_em_producao: 'Material em produção',
  material_a_caminho: 'Material a caminho',
  material_entregue: 'Curso em andamento',
  prova_aplicada: 'Prova aplicada',
  aprovado: 'Aprovado',
  reprovado: 'Em recuperação',
  certificado_emitido: 'Certificado emitido',
  cancelada: 'Cancelada',
  material_enviado: 'Material enviado (etapa antiga)',
}
