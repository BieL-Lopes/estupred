import { ROTULO_STATUS, type StatusMatricula } from '@/lib/dominio/tipos'

const CORES: Record<StatusMatricula, string> = {
  rascunho: 'bg-slate-100 text-slate-700',
  aguardando_pagamento: 'bg-destaque-100 text-destaque-700',
  paga: 'bg-marca-100 text-marca-700',
  material_enviado: 'bg-marca-100 text-marca-700',
  prova_aplicada: 'bg-marca-100 text-marca-700',
  aprovado: 'bg-progresso-100 text-progresso-700',
  reprovado: 'bg-destaque-100 text-destaque-700',
  certificado_emitido: 'bg-progresso-100 text-progresso-700',
  cancelada: 'bg-slate-100 text-slate-500',
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
