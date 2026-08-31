import { salvarFrete } from '@/lib/admin/acoes'
import { formatarBRL } from '@/lib/dominio/precos'
import { UFS } from '@/lib/dominio/tipos'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Fretes — Clique Estudos' }

export default async function Fretes() {
  const supabase = criarClienteAdmin()
  const { data } = await supabase.from('fretes').select('*').order('uf')
  const porUf = new Map((data ?? []).map((f) => [f.uf, f]))

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">Frete por estado</h1>
      <p className="mt-2 text-sm text-texto-suave">
        Estado sem frete configurado bloqueia a matrícula, de propósito. Melhor
        recusar do que cobrar errado.
      </p>

      <div className="mt-8 space-y-2">
        {UFS.map((uf) => {
          const atual = porUf.get(uf)
          return (
            <form
              key={uf}
              action={salvarFrete}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-borda bg-cartao p-3"
            >
              <input type="hidden" name="uf" value={uf} />
              <span className="w-10 font-mono font-bold text-acento">{uf}</span>

              <label className="text-sm text-texto-suave">
                <span>R$ </span>
                <input
                  name="valorReais"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={atual ? (atual.valor_centavos / 100).toFixed(2) : ''}
                  required
                  className="w-28 rounded border border-borda bg-fundo px-2 py-1 text-texto"
                />
              </label>

              <label className="text-sm text-texto-suave">
                <input
                  name="prazoDias"
                  type="number"
                  min="1"
                  defaultValue={atual?.prazo_dias ?? ''}
                  required
                  className="w-20 rounded border border-borda bg-fundo px-2 py-1 text-texto"
                />
                <span> dias</span>
              </label>

              <span className="text-sm text-texto-fraco">
                {atual ? formatarBRL(atual.valor_centavos) : 'não configurado'}
              </span>

              <button
                type="submit"
                className="ml-auto rounded-lg bg-acento px-3 py-1.5 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
              >
                Salvar
              </button>
            </form>
          )
        })}
      </div>
    </main>
  )
}
