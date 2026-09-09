'use client'

import { useActionState } from 'react'
import { BotaoSubmit } from '@/components/ui/BotaoSubmit'
import { salvarDataDeEntrega } from '@/lib/admin/acoes'
import type { ResultadoCorrecao } from '@/lib/admin/datas'

/**
 * Correção da data de entrega já registrada. Existe porque a entrega é o
 * marco zero dos 45 dias e o fluxo de status não volta atrás: sem isto, uma
 * data digitada errada ficaria errada para sempre, e com ela a data da prova.
 */
export function CorrigirDataDeEntrega({
  matriculaId,
  dataAtual,
  hoje,
}: {
  matriculaId: string
  dataAtual: string
  hoje: string
}) {
  const [estado, acao] = useActionState<ResultadoCorrecao | null, FormData>(
    salvarDataDeEntrega,
    null,
  )

  return (
    <form action={acao} className="mt-4 border-t border-borda pt-4">
      <input type="hidden" name="matriculaId" value={matriculaId} />

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-texto-suave">
          <span className="block text-xs text-texto-fraco">
            Corrigir data da entrega
          </span>
          <input
            name="data"
            type="date"
            defaultValue={dataAtual}
            max={hoje}
            required
            className="mt-1 rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto"
          />
        </label>

        <BotaoSubmit className="rounded-lg border border-borda px-4 py-2 text-sm font-semibold text-texto hover:border-acento/50">
          Salvar data
        </BotaoSubmit>
      </div>

      <p className="mt-2 text-xs text-texto-fraco">
        A data da prova é recalculada junto, e a mudança fica registrada no
        histórico.
      </p>

      {estado && !estado.ok && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {estado.erro}
        </p>
      )}
    </form>
  )
}
