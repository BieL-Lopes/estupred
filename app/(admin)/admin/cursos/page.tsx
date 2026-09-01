import { FormularioCurso } from '@/components/admin/FormularioCurso'
import { exigirAdmin } from '@/lib/auth'
import { formatarBRL } from '@/lib/dominio/precos'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Cursos — Clique Estudos' }

export default async function CursosAdmin() {
  await exigirAdmin()

  const supabase = criarClienteAdmin()
  const { data: cursos } = await supabase.from('cursos').select('*').order('titulo')

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">Cursos</h1>

      <details className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <summary className="cursor-pointer font-semibold text-acento">Novo curso</summary>
        <div className="mt-4">
          <FormularioCurso />
        </div>
      </details>

      <ul className="mt-8 space-y-3">
        {(cursos ?? []).map((c) => (
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
