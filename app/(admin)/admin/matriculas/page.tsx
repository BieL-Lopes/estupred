import Link from 'next/link'
import { listarMatriculasAdmin } from '@/lib/admin/consultas'
import { formatarBRL } from '@/lib/dominio/precos'
import type { StatusMatricula } from '@/lib/dominio/tipos'
import { Selo } from '@/components/ui/Selo'

export const metadata = { title: 'Matrículas — Clique Estudos' }

export default async function Matriculas({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const filtro = await searchParams
  const matriculas = await listarMatriculasAdmin(filtro)

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-texto">Matrículas</h1>
        <div className="flex items-center gap-4">
          {filtro.status && (
            <Link
              href="/admin/matriculas"
              className="text-sm text-acento hover:underline"
            >
              Limpar filtro
            </Link>
          )}
          <Link
            href="/admin/matriculas/nova"
            className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
          >
            Matricular aluno
          </Link>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-cartao border border-borda bg-cartao">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-borda text-left text-texto-suave">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Aluno</th>
              <th className="px-4 py-3 font-medium">Curso</th>
              <th className="px-4 py-3 font-medium">Unidade</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {matriculas.map((m) => {
              const linha = m as unknown as {
                id: string
                codigo: string
                status: StatusMatricula
                total_centavos: number
                cursos: { titulo: string } | null
                internos: { nome: string } | null
                unidades_prisionais: { nome: string; uf: string } | null
              }

              return (
                <tr key={linha.id} className="border-b border-borda last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/matriculas/${linha.id}`}
                      className="font-mono text-xs text-acento hover:underline"
                    >
                      {linha.codigo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-texto">{linha.internos?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-texto">{linha.cursos?.titulo ?? '—'}</td>
                  <td className="px-4 py-3 text-texto">
                    {linha.unidades_prisionais?.nome ?? '—'} ({linha.unidades_prisionais?.uf})
                  </td>
                  <td className="px-4 py-3 text-texto">{formatarBRL(linha.total_centavos)}</td>
                  <td className="px-4 py-3">
                    <Selo status={linha.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {matriculas.length === 0 && (
          <p className="p-6 text-sm text-texto-fraco">Nenhuma matrícula encontrada.</p>
        )}
      </div>
    </main>
  )
}
