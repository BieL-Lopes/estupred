/**
 * Peças de carregamento, uma por formato de tela.
 *
 * Sem um loading.tsx, o Next segura a navegação inteira até o servidor
 * terminar de renderizar: quem clica não vê nada acontecer e acha que
 * travou. E um esqueleto genérico resolve isso pela metade — quando o
 * conteúdo real entra com outro formato, a página "pula". Por isso cada
 * tela tem aqui o desenho aproximado do que está chegando.
 */

function Barra({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-cartao-2 ${className}`} />
}

function Moldura({
  largura,
  children,
}: {
  largura: string
  children: React.ReactNode
}) {
  return (
    <main className={`mx-auto ${largura} px-6 py-12`} aria-busy="true">
      {children}
      <span className="sr-only">Carregando…</span>
    </main>
  )
}

/** Fallback neutro, para rotas sem esqueleto próprio. */
export function Esqueleto({ linhas = 4 }: { linhas?: number }) {
  return (
    <Moldura largura="max-w-5xl">
      <Barra className="h-8 w-48" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: linhas }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-cartao border border-borda bg-cartao"
          />
        ))}
      </div>
    </Moldura>
  )
}

/** Painel: dois cartões grandes de resumo e a grade de status. */
export function EsqueletoCartoes({
  grandes = 2,
  pequenos = 9,
}: {
  grandes?: number
  pequenos?: number
}) {
  return (
    <Moldura largura="max-w-6xl">
      <Barra className="h-8 w-40" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: grandes }).map((_, i) => (
          <div key={i} className="rounded-cartao border border-borda bg-cartao p-6">
            <Barra className="h-4 w-44" />
            <Barra className="mt-3 h-8 w-32" />
          </div>
        ))}
      </div>

      <Barra className="mt-12 h-5 w-56" />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: pequenos }).map((_, i) => (
          <div key={i} className="rounded-cartao border border-borda bg-cartao p-4">
            <Barra className="h-3 w-28" />
            <Barra className="mt-2 h-6 w-10" />
          </div>
        ))}
      </div>
    </Moldura>
  )
}

/** Listagens: Matrículas e Alunos. */
export function EsqueletoTabela({
  largura = 'max-w-6xl',
  colunas = 5,
  linhas = 6,
  comBusca = false,
  comBotao = false,
}: {
  largura?: string
  colunas?: number
  linhas?: number
  comBusca?: boolean
  comBotao?: boolean
}) {
  return (
    <Moldura largura={largura}>
      <div className="flex items-center justify-between">
        <Barra className="h-8 w-44" />
        {comBotao && <Barra className="h-9 w-32" />}
      </div>

      {comBusca && <Barra className="mt-6 h-10 w-full max-w-sm" />}

      <div className="mt-8 overflow-hidden rounded-cartao border border-borda bg-cartao">
        <div className="flex gap-4 border-b border-borda px-4 py-3">
          {Array.from({ length: colunas }).map((_, i) => (
            <Barra key={i} className="h-4 flex-1" />
          ))}
        </div>

        {Array.from({ length: linhas }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-borda px-4 py-4 last:border-0">
            {Array.from({ length: colunas }).map((_, j) => (
              <Barra key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </Moldura>
  )
}

/** Detalhe de matrícula e de aluno: blocos de dados em cartões. */
export function EsqueletoDetalhe({
  largura = 'max-w-4xl',
  blocos = 4,
}: {
  largura?: string
  blocos?: number
}) {
  return (
    <Moldura largura={largura}>
      <Barra className="h-4 w-24" />
      <Barra className="mt-4 h-3 w-32" />
      <Barra className="mt-2 h-8 w-72" />

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {Array.from({ length: blocos }).map((_, i) => (
          <div key={i} className="rounded-cartao border border-borda bg-cartao p-6">
            <Barra className="h-5 w-32" />
            <div className="mt-4 space-y-2">
              <Barra className="h-3 w-full" />
              <Barra className="h-3 w-4/5" />
              <Barra className="h-3 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </Moldura>
  )
}

/** Cadastros em lista recolhível: Cursos, Unidades, Fretes. */
export function EsqueletoLista({
  largura = 'max-w-4xl',
  linhas = 8,
  comSubtitulo = false,
  comBusca = false,
}: {
  largura?: string
  linhas?: number
  comSubtitulo?: boolean
  comBusca?: boolean
}) {
  return (
    <Moldura largura={largura}>
      <Barra className="h-8 w-56" />
      {comSubtitulo && <Barra className="mt-3 h-3 w-full max-w-lg" />}

      <div className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <Barra className="h-4 w-32" />
      </div>

      {comBusca && <Barra className="mt-8 h-10 w-full max-w-sm" />}

      <div className="mt-6 space-y-3">
        {Array.from({ length: linhas }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-cartao border border-borda bg-cartao p-4"
          >
            <Barra className="h-4 w-10" />
            <Barra className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </Moldura>
  )
}

/** Formulários longos: novo aluno, nova matrícula. */
export function EsqueletoFormulario({
  largura = 'max-w-2xl',
  campos = 6,
}: {
  largura?: string
  campos?: number
}) {
  return (
    <Moldura largura={largura}>
      <Barra className="h-8 w-56" />
      <Barra className="mt-3 h-3 w-full max-w-md" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: campos }).map((_, i) => (
          <div key={i}>
            <Barra className="h-3 w-24" />
            <Barra className="mt-2 h-10 w-full" />
          </div>
        ))}
      </div>

      <Barra className="mt-8 h-10 w-48" />
    </Moldura>
  )
}
