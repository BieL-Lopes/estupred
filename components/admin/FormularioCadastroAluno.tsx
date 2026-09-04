'use client'

import { useActionState } from 'react'
import { cadastrarAluno } from '@/app/(admin)/admin/alunos/acoes'
import { CamposDoResponsavel } from '@/components/admin/CamposDoResponsavel'
import { BotaoSubmit } from '@/components/ui/BotaoSubmit'
import type { ResultadoCadastroAluno } from '@/lib/admin/cadastro-aluno'

type Unidade = { id: string; uf: string; nome: string }

export function FormularioCadastroAluno({ unidades }: { unidades: Unidade[] }) {
  const [estado, acao] = useActionState<ResultadoCadastroAluno | null, FormData>(
    cadastrarAluno,
    null,
  )

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <form action={acao} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="font-semibold text-texto">Dados do aluno</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-texto">Nome completo</span>
            <input name="nome" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">CPF</span>
            <input name="cpf" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">RG</span>
            <input name="rg" className={campo} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">Matrícula prisional</span>
            <input name="matriculaPrisional" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">Data de nascimento</span>
            <input name="dataNascimento" type="date" className={campo} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-texto">Unidade prisional</span>
            <select name="unidadeId" className={campo} required>
              <option value="">Selecione</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.uf} · {u.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <CamposDoResponsavel obrigatorio={false} legenda="Responsável pela compra" />

      {estado && !estado.ok && (
        <p role="alert" className="text-sm text-red-400">
          {estado.erro}
        </p>
      )}

      <BotaoSubmit className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo hover:bg-acento-claro">
        Cadastrar aluno
      </BotaoSubmit>
    </form>
  )
}
