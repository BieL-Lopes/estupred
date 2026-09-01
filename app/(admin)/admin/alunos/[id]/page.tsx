import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FormularioAluno } from '@/components/admin/FormularioAluno'
import { Selo } from '@/components/ui/Selo'
import { obterAlunoAdmin } from '@/lib/admin/consultas'
import { formatarCpf } from '@/lib/dominio/cpf'
import { formatarBRL } from '@/lib/dominio/precos'
import type { StatusMatricula } from '@/lib/dominio/tipos'

export const metadata = { title: 'Aluno — Clique Estudos' }

export default async function DetalheAluno({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const resultado = await obterAlunoAdmin(id)
  if (!resultado) notFound()

  const { interno, matriculas } = resultado

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin/alunos" className="text-sm text-acento hover:underline">
        ← Alunos
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-texto">{interno.nome}</h1>
      <p className="mt-1 text-sm text-texto-fraco">
        CPF {formatarCpf(interno.cpf)}
        {interno.profiles && ` · Responsável: ${interno.profiles.nome}`}
      </p>

      <section className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <h2 className="font-semibold text-texto">Dados do aluno</h2>
        <div className="mt-4">
          <FormularioAluno aluno={interno} />
        </div>
      </section>

      <section className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-texto">Matrículas</h2>
          <Link
            href={`/admin/alunos/${interno.id}/nova-matricula`}
            className="text-sm font-semibold text-acento hover:underline"
          >
            + Nova matrícula
          </Link>
        </div>

        <ul className="mt-4 space-y-2">
          {matriculas.map((m) => (
            <li key={m.id}>
              <Link
                href={`/admin/matriculas/${m.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-borda p-3 hover:border-acento/50"
              >
                <span className="text-sm text-texto">
                  <span className="font-mono text-xs text-texto-fraco">{m.codigo}</span>{' '}
                  {m.cursos?.titulo}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-sm text-texto-suave">
                    {formatarBRL(m.total_centavos)}
                  </span>
                  <Selo status={m.status as StatusMatricula} />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {matriculas.length === 0 && (
          <p className="mt-4 text-sm text-texto-fraco">Nenhuma matrícula ainda.</p>
        )}
      </section>
    </main>
  )
}
