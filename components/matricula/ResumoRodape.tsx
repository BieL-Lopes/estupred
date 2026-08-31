import { formatarBRL } from '@/lib/dominio/precos'
import type { CursoDetalhe } from '@/lib/catalogo'

export function ResumoRodape({
  curso,
  freteCentavos,
  uf,
}: {
  curso: CursoDetalhe
  freteCentavos?: number
  uf?: string
}) {
  const total = curso.precoCentavos + (freteCentavos ?? 0)

  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-borda bg-fundo/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
        <div className="text-sm text-texto-fraco">
          <p className="font-medium text-texto">{curso.titulo}</p>
          <p>
            {formatarBRL(curso.precoCentavos)}
            {freteCentavos !== undefined
              ? ` + ${formatarBRL(freteCentavos)} de frete${uf ? ` (${uf})` : ''}`
              : ' + frete conforme o estado'}
          </p>
        </div>
        <p className="text-xl font-bold text-acento">{formatarBRL(total)}</p>
      </div>
    </div>
  )
}
