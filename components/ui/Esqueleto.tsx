/**
 * Placeholder mostrado enquanto a página carrega no servidor.
 *
 * Sem um loading.tsx, o Next segura a navegação inteira até o servidor
 * terminar de renderizar: quem clica não vê nada acontecer e acha que
 * travou. Com ele, o clique responde na hora e o conteúdo entra depois.
 */
export function Esqueleto({ linhas = 4 }: { linhas?: number }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-cartao-2" />

      <div className="mt-8 space-y-3">
        {Array.from({ length: linhas }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-cartao border border-borda bg-cartao"
          />
        ))}
      </div>

      <span className="sr-only">Carregando…</span>
    </main>
  )
}
