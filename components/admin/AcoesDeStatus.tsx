import { BotaoSubmit } from '@/components/ui/BotaoSubmit'
import { ROTULO_STATUS, type StatusMatricula } from '@/lib/dominio/tipos'
import { mudarStatus } from '@/lib/admin/acoes'
import { proximosStatus } from '@/lib/matricula/transicoes'

export function AcoesDeStatus({
  matriculaId,
  status,
}: {
  matriculaId: string
  status: StatusMatricula
}) {
  const destinos = proximosStatus(status)

  if (destinos.length === 0) {
    return (
      <p className="text-sm text-texto-fraco">
        Esta matrícula chegou ao fim do fluxo.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {destinos.map((destino) => (
        <form key={destino} action={mudarStatus} className="flex flex-wrap gap-2">
          <input type="hidden" name="matriculaId" value={matriculaId} />
          <input type="hidden" name="para" value={destino} />
          <input
            name="nota"
            placeholder="Observação (opcional)"
            className="flex-1 rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto"
          />
          <BotaoSubmit className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo hover:bg-acento-claro">
            Marcar como {ROTULO_STATUS[destino]}
          </BotaoSubmit>
        </form>
      ))}
    </div>
  )
}
