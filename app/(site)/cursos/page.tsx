import { Suspense } from 'react'
import { CartaoCurso } from '@/components/site/CartaoCurso'
import { FiltroCatalogo } from '@/components/site/FiltroCatalogo'
import { listarCategorias, listarCursos } from '@/lib/catalogo'

export const metadata = { title: 'Cursos — Clique Estudos' }

export default async function Cursos({
  searchParams,
}: {
  searchParams: Promise<{ uf?: string; categoria?: string; busca?: string }>
}) {
  const filtro = await searchParams
  const [{ cursos, indisponivel }, categorias] = await Promise.all([
    listarCursos(filtro),
    listarCategorias(),
  ])

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl font-extrabold text-texto">Cursos</h1>
      <p className="mt-3 max-w-2xl text-texto-suave">
        A disponibilidade e o valor do frete variam conforme o estado da unidade
        prisional. Selecione o estado para ver o que se aplica.
      </p>

      <div className="mt-10">
        <Suspense fallback={<div className="h-11" />}>
          <FiltroCatalogo categorias={categorias} />
        </Suspense>
      </div>

      {!indisponivel && (
        <p className="mt-6 text-sm text-texto-fraco">
          {cursos.length === 1
            ? '1 curso encontrado'
            : `${cursos.length} cursos encontrados`}
        </p>
      )}

      {indisponivel ? (
        <div className="mt-8 rounded-cartao border border-aviso/30 bg-aviso-fundo p-10 text-center">
          <p className="font-medium text-aviso">
            Não foi possível carregar os cursos agora.
          </p>
          <p className="mt-2 text-sm text-texto-suave">
            É uma instabilidade temporária, não um problema com a sua matrícula.
            Tente novamente em alguns instantes.
          </p>
        </div>
      ) : cursos.length === 0 ? (
        <p className="mt-8 rounded-cartao border border-borda bg-cartao p-10 text-center text-texto-fraco">
          Nenhum curso encontrado com esses filtros.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.map((curso) => (
            <CartaoCurso key={curso.id} curso={curso} />
          ))}
        </div>
      )}
    </main>
  )
}
