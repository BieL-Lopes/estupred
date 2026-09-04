import { exigirAdmin } from '@/lib/auth'
import { FormularioUnidade } from '@/components/admin/FormularioUnidade'
import { listarUnidadesAdmin } from '@/lib/admin/consultas'

export const metadata = { title: 'Unidades — Clique Estudos' }

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

const SEM_REGIAO = 'Sem região definida'

function agruparPorRegiao(unidades: Unidade[]): [string, Unidade[]][] {
  const grupos = new Map<string, Unidade[]>()
  for (const u of unidades) {
    const chave = u.regiao?.trim() || SEM_REGIAO
    grupos.set(chave, [...(grupos.get(chave) ?? []), u])
  }
  return [...grupos.entries()].sort(([a], [b]) => {
    if (a === SEM_REGIAO) return 1
    if (b === SEM_REGIAO) return -1
    return a.localeCompare(b)
  })
}

export default async function UnidadesAdmin({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>
}) {
  await exigirAdmin()

  const { busca } = await searchParams
  const data = await listarUnidadesAdmin({ busca })
  const grupos = agruparPorRegiao(data as Unidade[])

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">Unidades prisionais</h1>

      <details className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <summary className="cursor-pointer font-semibold text-acento">Nova unidade</summary>
        <div className="mt-4">
          <FormularioUnidade />
        </div>
      </details>

      <form className="mt-8">
        <input
          name="busca"
          defaultValue={busca ?? ''}
          placeholder="Buscar por nome, UF ou região"
          className="w-full max-w-sm rounded-lg border border-borda bg-cartao px-3 py-2 text-sm text-texto placeholder:text-texto-fraco"
        />
      </form>

      {grupos.length === 0 && (
        <p className="mt-8 text-sm text-texto-fraco">
          Nenhuma unidade encontrada.
        </p>
      )}

      {grupos.map(([regiao, unidades]) => (
        <section key={regiao} className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-fraco">
            {regiao}
          </h2>
          <ul className="mt-3 space-y-3">
            {unidades.map((u) => (
              <li key={u.id} className="rounded-cartao border border-borda bg-cartao">
                <details>
                  <summary className="cursor-pointer p-4">
                    <span className="font-mono text-sm font-bold text-acento">{u.uf}</span>
                    <span className="ml-3 font-medium text-texto">{u.nome}</span>
                    {!u.ativa && <span className="ml-3 text-sm text-texto-fraco">inativa</span>}
                  </summary>
                  <div className="border-t border-borda p-4">
                    <FormularioUnidade unidade={u} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
