import { BotaoSubmit } from '@/components/ui/BotaoSubmit'
import { UFS } from '@/lib/dominio/tipos'
import { salvarUnidade } from '@/lib/admin/acoes'

type Unidade = {
  id: string
  uf: string
  nome: string
  regiao: string | null
  endereco: string
  cep: string
  responsavel_nucleo: string | null
  telefone: string | null
  ativa: boolean
}

export function FormularioUnidade({ unidade }: { unidade?: Unidade }) {
  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <form action={salvarUnidade} className="space-y-4">
      {unidade && <input type="hidden" name="id" value={unidade.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-texto">Estado</span>
          <select name="uf" defaultValue={unidade?.uf ?? ''} className={campo} required>
            <option value="">Selecione</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Nome da unidade</span>
          <input name="nome" defaultValue={unidade?.nome} className={campo} required />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Região</span>
          <input
            name="regiao"
            defaultValue={unidade?.regiao ?? ''}
            placeholder="Ex.: Papuda, Gama, SIA"
            className={campo}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-texto">Endereço de entrega do material</span>
          <input name="endereco" defaultValue={unidade?.endereco} className={campo} required />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">CEP</span>
          <input name="cep" defaultValue={unidade?.cep} className={campo} required />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Responsável pelo Núcleo de Ensino</span>
          <input
            name="responsavelNucleo"
            defaultValue={unidade?.responsavel_nucleo ?? ''}
            className={campo}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Telefone</span>
          <input name="telefone" defaultValue={unidade?.telefone ?? ''} className={campo} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-texto-suave">
        <input type="checkbox" name="ativa" defaultChecked={unidade?.ativa ?? true} />
        Ativa (aparece na matrícula)
      </label>

      <BotaoSubmit className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo hover:bg-acento-claro">
        Salvar unidade
      </BotaoSubmit>
    </form>
  )
}
