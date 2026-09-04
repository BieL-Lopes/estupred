import Link from 'next/link'
import { listarAlunosAdmin } from '@/lib/admin/consultas'
import { formatarCpf } from '@/lib/dominio/cpf'

export const metadata = { title: 'Alunos — Clique Estudos' }

export default async function Alunos({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>
}) {
  const { busca } = await searchParams
  const alunos = await listarAlunosAdmin({ busca })

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-texto">Alunos</h1>
        <Link
          href="/admin/alunos/novo"
          className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
        >
          Cadastrar aluno
        </Link>
      </div>
      <p className="mt-2 text-sm text-texto-suave">
        Cadastrar aqui só alimenta a lista de alunos. Para vincular um curso, use{' '}
        <Link href="/admin/matriculas/nova" className="text-acento hover:underline">
          Matricular aluno
        </Link>
        .
      </p>

      <form className="mt-6">
        <input
          name="busca"
          defaultValue={busca ?? ''}
          placeholder="Buscar por nome ou CPF"
          className="w-full max-w-sm rounded-lg border border-borda bg-cartao px-3 py-2 text-sm text-texto placeholder:text-texto-fraco"
        />
      </form>

      <div className="mt-8 overflow-x-auto rounded-cartao border border-borda bg-cartao">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-borda text-left text-texto-suave">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">CPF</th>
              <th className="px-4 py-3 font-medium">Matrícula prisional</th>
              <th className="px-4 py-3 font-medium">Unidade</th>
              <th className="px-4 py-3 font-medium">Cursos</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((a) => (
              <tr key={a.id} className="border-b border-borda last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/alunos/${a.id}`}
                    className="font-medium text-acento hover:underline"
                  >
                    {a.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-texto">{formatarCpf(a.cpf)}</td>
                <td className="px-4 py-3 text-texto">{a.matriculaPrisional}</td>
                <td className="px-4 py-3 text-texto">
                  {a.unidade ? `${a.unidade.nome} (${a.unidade.uf})` : '—'}
                </td>
                <td className="px-4 py-3 text-texto">{a.totalMatriculas}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {alunos.length === 0 && (
          <p className="p-6 text-sm text-texto-fraco">Nenhum aluno encontrado.</p>
        )}
      </div>
    </main>
  )
}
