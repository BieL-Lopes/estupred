import { notFound } from 'next/navigation'
import { Wizard } from '@/components/matricula/Wizard'
import { obterCurso } from '@/lib/catalogo'

export default async function Matricula({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { curso, indisponivel } = await obterCurso(slug)

  if (indisponivel) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-texto">
          Não foi possível carregar este curso
        </h1>
        <p className="mt-3 text-texto-suave">
          É uma instabilidade temporária. Tente novamente em alguns instantes.
        </p>
      </main>
    )
  }

  if (!curso) notFound()

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">Matrícula</h1>
      <p className="mt-1 text-texto-suave">{curso.titulo}</p>
      <div className="mt-10">
        <Wizard curso={curso} />
      </div>
    </main>
  )
}
