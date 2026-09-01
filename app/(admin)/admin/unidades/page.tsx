import { FormularioUnidade } from '@/components/admin/FormularioUnidade'
import { exigirAdmin } from '@/lib/auth'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Unidades — Clique Estudos' }

export default async function UnidadesAdmin() {
  await exigirAdmin()

  const supabase = criarClienteAdmin()
  const { data: unidades } = await supabase
    .from('unidades_prisionais')
    .select('*')
    .order('uf')
    .order('nome')

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">Unidades prisionais</h1>

      <details className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <summary className="cursor-pointer font-semibold text-acento">Nova unidade</summary>
        <div className="mt-4">
          <FormularioUnidade />
        </div>
      </details>

      <ul className="mt-8 space-y-3">
        {(unidades ?? []).map((u) => (
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
    </main>
  )
}
