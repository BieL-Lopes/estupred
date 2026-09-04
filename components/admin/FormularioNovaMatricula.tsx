'use client'

import { useActionState } from 'react'
import { BotaoSubmit } from '@/components/ui/BotaoSubmit'
import { matricularAlunoExistente } from '@/app/(admin)/admin/matriculas/acoes'
import type { ResultadoMatriculaManual } from '@/lib/admin/matricula-manual'

type Curso = { slug: string; titulo: string }
type Unidade = { id: string; uf: string; nome: string }

export function FormularioNovaMatricula({
  internoId,
  cursos,
  unidades,
  unidadeAtualId,
}: {
  internoId: string
  cursos: Curso[]
  unidades: Unidade[]
  unidadeAtualId: string
}) {
  const [estado, acao] = useActionState<ResultadoMatriculaManual | null, FormData>(
    matricularAlunoExistente,
    null,
  )

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="internoId" value={internoId} />

      <label className="block">
        <span className="text-sm font-medium text-texto">Curso</span>
        <select name="cursoSlug" required className={campo}>
          <option value="">Selecione</option>
          {cursos.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.titulo}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-texto">Unidade prisional</span>
        <select
          name="unidadeId"
          required
          defaultValue={unidadeAtualId}
          className={campo}
        >
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.uf} · {u.nome}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-texto-fraco">
          Já vem com a unidade atual do aluno. Troque se ele foi transferido —
          o frete e a entrega do material seguem esta escolha.
        </span>
      </label>

      {estado && !estado.ok && (
        <p role="alert" className="text-sm text-red-400">
          {estado.erro}
        </p>
      )}

      <BotaoSubmit className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo hover:bg-acento-claro">
        Matricular
      </BotaoSubmit>
    </form>
  )
}
