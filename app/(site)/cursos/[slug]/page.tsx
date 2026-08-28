import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BotaoLink } from '@/components/ui/Botao'
import { formatarBRL } from '@/lib/dominio/precos'
import { obterCurso } from '@/lib/catalogo'

export default async function DetalheCurso({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { curso, indisponivel } = await obterCurso(slug)

  // Sem catálogo não dá para saber se o curso existe. Devolver 404 seria
  // mentir: diria que o curso não existe quando o problema é nosso.
  if (indisponivel) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-texto">
          Não foi possível carregar este curso
        </h1>
        <p className="mt-3 text-texto-suave">
          É uma instabilidade temporária. Tente novamente em alguns instantes.
        </p>
        <Link
          href="/cursos"
          className="mt-8 inline-block text-sm font-semibold text-acento hover:underline"
        >
          ← Voltar para os cursos
        </Link>
      </main>
    )
  }

  if (!curso) notFound()

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/cursos"
        className="text-sm text-texto-fraco hover:text-acento"
      >
        ← Todos os cursos
      </Link>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-acento">
        {curso.categoria}
      </p>
      <h1 className="mt-2 text-4xl font-extrabold text-texto">
        {curso.titulo}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-texto-suave">
        {curso.descricao}
      </p>

      <div className="mt-10 flex flex-wrap items-end gap-8 rounded-cartao border border-borda bg-cartao p-7">
        <div>
          <p className="text-sm text-texto-fraco">Carga horária</p>
          <p className="text-3xl font-bold text-texto">{curso.cargaHoraria}h</p>
        </div>
        <div>
          <p className="text-sm text-texto-fraco">Investimento</p>
          <p className="text-3xl font-bold text-acento">
            {formatarBRL(curso.precoCentavos)}
          </p>
          <p className="mt-1 text-xs text-texto-fraco">
            mais frete conforme o estado
          </p>
        </div>
        <div className="ml-auto">
          <BotaoLink href={`/matricula/${curso.slug}`}>
            Matricular agora
          </BotaoLink>
        </div>
      </div>

      {curso.ufs.length > 0 && (
        <p className="mt-4 rounded-lg border border-aviso/30 bg-aviso-fundo px-4 py-3 text-sm text-aviso">
          Este curso está disponível apenas para unidades em:{' '}
          {curso.ufs.join(', ')}.
        </p>
      )}

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-texto">
          Conteúdo programático
        </h2>
        <div className="mt-5 whitespace-pre-wrap rounded-cartao border border-borda bg-cartao p-7 leading-relaxed text-texto-suave">
          {curso.ementa}
        </div>
      </section>

      <section className="mt-10 rounded-cartao border border-borda bg-cartao p-7">
        <h2 className="text-lg font-semibold text-texto">
          O que está incluído
        </h2>
        <ul className="mt-4 space-y-2.5 text-sm text-texto-suave">
          {[
            'Apostila impressa entregue ao Núcleo de Ensino da unidade',
            'Prova escrita aplicada na própria unidade prisional',
            'Uma recuperação sem custo, caso não atinja os 60%',
            'Certificado emitido por instituição credenciada',
            'Acompanhamento de cada etapa pela Área do Aluno',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-ok" aria-hidden>
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
