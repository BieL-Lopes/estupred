import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LinhaDoTempo } from '@/components/aluno/LinhaDoTempo'
import { EnvioAutorizacao } from '@/components/aluno/EnvioAutorizacao'
import { Selo } from '@/components/ui/Selo'
import { formatarBRL } from '@/lib/dominio/precos'
import { montarLinhaDoTempo, obterMatriculaPorCodigo } from '@/lib/matricula/consultas'

export default async function DetalheMatricula({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  const resultado = await obterMatriculaPorCodigo(codigo)
  if (!resultado) notFound()

  const { matricula, eventos, autorizacaoUrl } = resultado
  const etapas = montarLinhaDoTempo(matricula.status, eventos)

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/aluno" className="text-sm text-acento hover:underline">
        ← Voltar
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-texto-fraco">{matricula.codigo}</p>
          <h1 className="mt-1 text-2xl font-bold text-texto">
            {matricula.curso.titulo}
          </h1>
          <p className="mt-1 text-texto-fraco">
            {matricula.curso.cargaHoraria}h · {formatarBRL(matricula.totalCentavos)}
          </p>
        </div>
        <Selo status={matricula.status} />
      </div>

      <dl className="mt-8 grid gap-4 rounded-cartao border border-borda bg-cartao p-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-texto-fraco">Aluno</dt>
          <dd className="font-medium text-texto">{matricula.interno.nome}</dd>
        </div>
        <div>
          <dt className="text-sm text-texto-fraco">Unidade prisional</dt>
          <dd className="font-medium text-texto">
            {matricula.unidade.nome} ({matricula.unidade.uf})
          </dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-texto">Andamento</h2>
        <div className="mt-6">
          <LinhaDoTempo etapas={etapas} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-texto">Autorização de estudo</h2>
        <p className="mt-1 text-sm text-texto-fraco">
          Envie aqui a autorização emitida pela unidade prisional. Ela não é
          necessária para pagar, mas o material só é despachado depois dela.
        </p>
        <div className="mt-4">
          <EnvioAutorizacao
            matriculaId={matricula.id}
            jaEnviada={Boolean(autorizacaoUrl)}
          />
        </div>
      </section>
    </main>
  )
}
