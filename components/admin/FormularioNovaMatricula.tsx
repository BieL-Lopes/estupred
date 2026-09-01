'use client'

import { useActionState } from 'react'
import { matricularAlunoExistente } from '@/app/(admin)/admin/alunos/acoes'
import type { ResultadoMatriculaManual } from '@/lib/admin/matricula-manual'

type Curso = { slug: string; titulo: string }

export function FormularioNovaMatricula({
  internoId,
  cursos,
}: {
  internoId: string
  cursos: Curso[]
}) {
  const [estado, acao, pendente] = useActionState<
    ResultadoMatriculaManual | null,
    FormData
  >(matricularAlunoExistente, null)

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="internoId" value={internoId} />

      <label className="block">
        <span className="text-sm font-medium text-texto">Curso</span>
        <select
          name="cursoSlug"
          required
          className="mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto"
        >
          <option value="">Selecione</option>
          {cursos.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.titulo}
            </option>
          ))}
        </select>
      </label>

      {estado && !estado.ok && (
        <p role="alert" className="text-sm text-red-400">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo transition hover:bg-acento-claro disabled:opacity-60"
      >
        {pendente ? 'Matriculando…' : 'Matricular'}
      </button>
    </form>
  )
}
