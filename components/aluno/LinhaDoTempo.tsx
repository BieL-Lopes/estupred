import type { EtapaLinha } from '@/lib/matricula/consultas'

const PONTO = {
  concluida: 'bg-ok text-fundo',
  atual: 'bg-acento text-fundo ring-4 ring-acento-fundo',
  futura: 'bg-cartao-2 text-texto-fraco',
} as const

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function LinhaDoTempo({ etapas }: { etapas: EtapaLinha[] }) {
  if (etapas.length === 0) {
    return (
      <p className="rounded-cartao border border-borda bg-cartao p-6 text-texto-fraco">
        Esta matrícula foi cancelada.
      </p>
    )
  }

  return (
    <ol className="relative space-y-6 border-l border-borda pl-8">
      {etapas.map((etapa, indice) => (
        <li key={etapa.status} className="relative">
          <span
            className={`absolute -left-[2.35rem] flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${PONTO[etapa.estado]}`}
          >
            {etapa.estado === 'concluida' ? '✓' : indice + 1}
          </span>

          <p
            className={
              etapa.estado === 'futura'
                ? 'text-texto-fraco'
                : 'font-semibold text-texto'
            }
          >
            {etapa.rotulo}
          </p>

          {etapa.quando && (
            <p className="text-sm text-texto-fraco">{formatarData(etapa.quando)}</p>
          )}
        </li>
      ))}
    </ol>
  )
}
