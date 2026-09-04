import { ROTULO_STATUS, type StatusMatricula } from '@/lib/dominio/tipos'

const CORES: Record<StatusMatricula, string> = {
  rascunho: 'bg-cartao-2 text-texto-fraco',
  aguardando_pagamento: 'bg-aviso-fundo text-aviso',
  paga: 'bg-acento-fundo text-acento-claro',
  material_em_producao: 'bg-acento-fundo text-acento-claro',
  material_a_caminho: 'bg-acento-fundo text-acento-claro',
  material_entregue: 'bg-acento-fundo text-acento-claro',
  prova_aplicada: 'bg-acento-fundo text-acento-claro',
  aprovado: 'bg-ok-fundo text-ok',
  reprovado: 'bg-aviso-fundo text-aviso',
  certificado_emitido: 'bg-ok-fundo text-ok',
  cancelada: 'bg-cartao-2 text-texto-fraco',
  // Etapa aposentada; a cor existe só para o histórico continuar legível.
  material_enviado: 'bg-acento-fundo text-acento-claro',
}

export function Selo({ status }: { status: StatusMatricula }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${CORES[status]}`}
    >
      {ROTULO_STATUS[status]}
    </span>
  )
}
