type Valores = {
  nome?: string
  cpf?: string
  email?: string
  telefone?: string
  parentesco?: string
}

/**
 * Os cinco campos do responsável, com os mesmos `name` em toda tela que os
 * usa — cadastro de aluno, edição de aluno e matrícula — para que as Server
 * Actions leiam sempre as mesmas chaves.
 */
export function CamposDoResponsavel({
  obrigatorio,
  legenda,
  valores,
}: {
  obrigatorio: boolean
  legenda: string
  valores?: Valores
}) {
  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <fieldset className="space-y-4">
      <legend className="font-semibold text-texto">
        {legenda}
        {!obrigatorio && (
          <span className="ml-2 text-xs font-normal text-texto-fraco">
            opcional
          </span>
        )}
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-texto">Nome completo</span>
          <input
            name="responsavelNome"
            defaultValue={valores?.nome ?? ''}
            className={campo}
            required={obrigatorio}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-texto">CPF</span>
          <input
            name="responsavelCpf"
            defaultValue={valores?.cpf ?? ''}
            className={campo}
            required={obrigatorio}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-texto">E-mail</span>
          <input
            name="responsavelEmail"
            type="email"
            defaultValue={valores?.email ?? ''}
            className={campo}
            required={obrigatorio}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-texto">Telefone</span>
          <input
            name="responsavelTelefone"
            defaultValue={valores?.telefone ?? ''}
            className={campo}
            required={obrigatorio}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-texto">Parentesco</span>
          <input
            name="parentesco"
            defaultValue={valores?.parentesco ?? ''}
            className={campo}
            required={obrigatorio}
          />
        </label>
      </div>
    </fieldset>
  )
}
