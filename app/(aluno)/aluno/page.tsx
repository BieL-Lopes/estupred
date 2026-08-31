import Link from 'next/link'
import { Selo } from '@/components/ui/Selo'
import { formatarBRL } from '@/lib/dominio/precos'
import { listarMatriculasDoAluno } from '@/lib/matricula/consultas'

export const metadata = { title: 'Área do Aluno — Clique Estudos' }

export default async function AreaDoAluno() {
  const matriculas = await listarMatriculasDoAluno()

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">Suas matrículas</h1>

      {matriculas.length === 0 ? (
        <div className="mt-8 rounded-cartao border border-borda bg-cartao p-8 text-center">
          <p className="text-texto-fraco">Você ainda não tem matrículas.</p>
          <Link
            href="/cursos"
            className="mt-4 inline-flex rounded-lg bg-acento px-5 py-3 text-sm font-semibold text-fundo"
          >
            Ver cursos
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {matriculas.map((m) => (
            <li key={m.id}>
              <Link
                href={`/aluno/matricula/${m.codigo}`}
                className="block rounded-cartao border border-borda bg-cartao p-6 transition hover:border-acento/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-texto-fraco">
                      {m.codigo}
                    </p>
                    <h2 className="mt-1 font-semibold text-texto">
                      {m.curso.titulo}
                    </h2>
                    <p className="mt-1 text-sm text-texto-fraco">
                      {m.interno.nome} · {m.unidade.nome} ({m.unidade.uf})
                    </p>
                  </div>
                  <div className="text-right">
                    <Selo status={m.status} />
                    <p className="mt-2 text-sm font-medium text-texto">
                      {formatarBRL(m.totalCentavos)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
