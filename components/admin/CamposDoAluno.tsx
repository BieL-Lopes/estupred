'use client'

import { useActionState } from 'react'
import { BotaoSubmit } from '@/components/ui/BotaoSubmit'
import { salvarAluno } from '@/lib/admin/acoes'
import type { ResultadoSalvarAluno } from '@/lib/admin/alunos'

type Aluno = {
  id: string
  nome: string
  cpf: string
  rg: string | null
  matricula_prisional: string
  data_nascimento: string | null
  unidade_prisional_id: string
}

export function CamposDoAluno({
  aluno,
  unidades,
}: {
  aluno: Aluno
  unidades: { id: string; uf: string; nome: string }[]
}) {
  const [estado, acao] = useActionState<ResultadoSalvarAluno | null, FormData>(
    salvarAluno,
    null,
  )

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={aluno.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-texto">Nome</span>
          <input name="nome" defaultValue={aluno.nome} className={campo} required />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">CPF</span>
          <input name="cpf" defaultValue={aluno.cpf} className={campo} required />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">RG</span>
          <input name="rg" defaultValue={aluno.rg ?? ''} className={campo} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Matrícula prisional</span>
          <input
            name="matriculaPrisional"
            defaultValue={aluno.matricula_prisional}
            className={campo}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Data de nascimento</span>
          <input
            name="dataNascimento"
            type="date"
            defaultValue={aluno.data_nascimento ?? ''}
            className={campo}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Unidade prisional</span>
          <select
            name="unidadeId"
            defaultValue={aluno.unidade_prisional_id}
            className={campo}
            required
          >
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.uf} · {u.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {estado && !estado.ok && (
        <p role="alert" className="text-sm text-red-400">
          {estado.erro}
        </p>
      )}

      <BotaoSubmit className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo hover:bg-acento-claro">
        Salvar aluno
      </BotaoSubmit>
    </form>
  )
}
