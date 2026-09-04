import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FormularioAluno } from '@/components/admin/FormularioAluno'
import { Selo } from '@/components/ui/Selo'
import { obterAlunoAdmin } from '@/lib/admin/consultas'
import { formatarCpf } from '@/lib/dominio/cpf'
import { formatarBRL } from '@/lib/dominio/precos'
import type { StatusMatricula } from '@/lib/dominio/tipos'
import { situacaoDaFila, type MatriculaDaFila } from '@/lib/matricula/fila'

export const metadata = { title: 'Aluno — Clique Estudos' }

function formatarData(data: string | null): string {
  if (!data) return '—'
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR')
}

export default async function DetalheAluno({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const resultado = await obterAlunoAdmin(id)
  if (!resultado) notFound()

  const { interno, matriculas } = resultado

  const situacao = situacaoDaFila(
    matriculas.map<MatriculaDaFila>((m) => ({
      id: m.id,
      codigo: m.codigo,
      status: m.status as StatusMatricula,
      criadaEm: m.created_at,
    })),
  )
  const posicaoNaFila = new Map(situacao.naFila.map((m, i) => [m.id, i + 1]))

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
        <h2 className="font-semibold text-texto">Matrículas</h2>

        <ul className="mt-4 space-y-2">
          {matriculas.map((m) => (
            <li key={m.id} className="rounded-lg border border-borda">
              <Link
                href={`/admin/matriculas/${m.id}`}
                className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-cartao-2"
              >
                <span className="text-sm text-texto">
                  <span className="font-mono text-xs text-texto-fraco">{m.codigo}</span>{' '}
                  {m.cursos?.titulo}
                </span>
                <span className="flex items-center gap-3">
                  {situacao.emCurso?.id === m.id && (
                    <span className="text-xs font-semibold text-ok">em curso</span>
                  )}
                  {posicaoNaFila.has(m.id) && (
                    <span className="text-xs text-texto-fraco">
                      {situacao.emCurso
                        ? `${posicaoNaFila.get(m.id)}º na fila`
                        : 'próxima'}
                    </span>
                  )}
                  <span className="text-sm text-texto-suave">
                    {formatarBRL(m.total_centavos)}
                  </span>
                  <Selo status={m.status as StatusMatricula} />
                </span>
              </Link>

              {(m.data_compra || m.data_inicio || m.data_prova) && (
                <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-borda px-3 py-2 text-xs text-texto-fraco">
                  <div>
                    <dt className="inline">Pagamento: </dt>
                    <dd className="inline text-texto-suave">
                      {formatarData(m.data_compra)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Início (entrega): </dt>
                    <dd className="inline text-texto-suave">
                      {formatarData(m.data_inicio)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Prova (45 dias): </dt>
                    <dd className="inline text-texto-suave">
                      {formatarData(m.data_prova)}
                    </dd>
                  </div>
                </dl>
              )}
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
