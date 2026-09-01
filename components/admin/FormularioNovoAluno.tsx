'use client'

import { useActionState } from 'react'
import { cadastrarAlunoEMatricula } from '@/app/(admin)/admin/alunos/acoes'
import type { ResultadoMatriculaManual } from '@/lib/admin/matricula-manual'

type Unidade = { id: string; uf: string; nome: string }
type Curso = { slug: string; titulo: string }

export function FormularioNovoAluno({
  unidades,
  cursos,
}: {
  unidades: Unidade[]
  cursos: Curso[]
}) {
  const [estado, acao, pendente] = useActionState<
    ResultadoMatriculaManual | null,
    FormData
  >(cadastrarAlunoEMatricula, null)

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <form action={acao} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="font-semibold text-texto">Unidade e curso</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-texto">Unidade prisional</span>
            <select
              name="unidadeId"
              className={campo}
              required
              onChange={(e) => {
                const uf = e.currentTarget.selectedOptions[0]?.dataset.uf ?? ''
                const campoUf = e.currentTarget.form?.elements.namedItem(
                  'uf',
                ) as HTMLInputElement | null
                if (campoUf) campoUf.value = uf
              }}
            >
              <option value="">Selecione</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id} data-uf={u.uf}>
                  {u.uf} · {u.nome}
                </option>
              ))}
            </select>
            <input type="hidden" name="uf" />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-texto">Curso</span>
            <select name="cursoSlug" className={campo} required>
              <option value="">Selecione</option>
              {cursos.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.titulo}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

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
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-semibold text-texto">Dados do responsável</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-texto">Nome completo</span>
            <input name="responsavelNome" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">CPF</span>
            <input name="responsavelCpf" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">E-mail</span>
            <input name="responsavelEmail" type="email" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">Telefone</span>
            <input name="responsavelTelefone" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">Parentesco</span>
            <input name="parentesco" className={campo} required />
          </label>
        </div>
      </fieldset>

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
        {pendente ? 'Cadastrando…' : 'Cadastrar aluno e matrícula'}
      </button>
    </form>
  )
}
