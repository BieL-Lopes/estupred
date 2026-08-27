import Link from 'next/link'
import { formatarBRL } from '@/lib/dominio/precos'
import type { CursoResumo } from '@/lib/catalogo'

export function CartaoCurso({ curso }: { curso: CursoResumo }) {
  return (
    <article className="relative flex flex-col rounded-cartao border border-borda bg-cartao p-6 transition hover:border-acento/60">
      {curso.destaque && (
        <span className="absolute -top-3 right-5 rounded-full bg-acento px-3 py-1 text-xs font-bold text-fundo">
          Mais procurado
        </span>
      )}

      <p className="text-xs font-semibold uppercase tracking-wider text-acento">
        {curso.categoria}
      </p>

      <h3 className="mt-2 text-lg font-semibold text-texto">{curso.titulo}</h3>

      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-texto-fraco">
        {curso.descricao}
      </p>

      <dl className="mt-5 flex items-end justify-between">
        <div>
          <dt className="text-xs text-texto-fraco">Carga horária</dt>
          <dd className="text-sm font-semibold text-texto-suave">
            {curso.cargaHoraria}h
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-texto-fraco">A partir de</dt>
          <dd className="text-xl font-bold text-texto">
            {formatarBRL(curso.precoCentavos)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex gap-2">
        <Link
          href={`/cursos/${curso.slug}`}
          className="flex-1 rounded-lg border border-borda-forte px-4 py-2.5 text-center text-sm font-semibold text-texto-suave transition hover:bg-cartao-2"
        >
          Detalhes
        </Link>
        <Link
          href={`/matricula/${curso.slug}`}
          className="flex-1 rounded-lg bg-acento px-4 py-2.5 text-center text-sm font-semibold text-fundo transition hover:bg-acento-claro"
        >
          Matricular
        </Link>
      </div>
    </article>
  )
}
