import { FormularioCurso } from '@/components/admin/FormularioCurso'
import { listarCursosAdmin } from '@/lib/admin/consultas'
import { exigirAdmin } from '@/lib/auth'
import { formatarBRL } from '@/lib/dominio/precos'

export const metadata = { title: 'Cursos — Clique Estudos' }

export default async function CursosAdmin({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>
}) {
  await exigirAdmin()

  const { busca } = await searchParams
  const cursos = await listarCursosAdmin({ busca })

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">Cursos</h1>

      <details className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <summary className="cursor-pointer font-semibold text-acento">Novo curso</summary>
        <div className="mt-4">
          <FormularioCurso />
        </div>
      </details>

      <form className="mt-8">
        <input
          name="busca"
          defaultValue={busca ?? ''}
          placeholder="Buscar por título, slug ou categoria"
          className="w-full max-w-sm rounded-lg border border-borda bg-cartao px-3 py-2 text-sm text-texto placeholder:text-texto-fraco"
        />
      </form>

      <ul className="mt-6 space-y-3">
        {cursos.map((c) => (
          <li key={c.id} className="rounded-cartao border border-borda bg-cartao">
            <details>
              <summary className="cursor-pointer p-4">
                <span className="font-medium text-texto">{c.titulo}</span>
                <span className="ml-3 text-sm text-texto-fraco">
                  {c.carga_horaria}h · {formatarBRL(c.preco_centavos)}
                  {!c.ativo && ' · inativo'}
                </span>
              </summary>
              <div className="border-t border-borda p-4">
                <FormularioCurso curso={c} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </main>
  )
}
