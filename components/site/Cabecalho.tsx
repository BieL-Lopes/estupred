import Link from 'next/link'
import { usuarioAtual } from '@/lib/auth'
import { LinksNav } from './LinksNav'

export async function Cabecalho() {
  const perfil = await usuarioAtual()

  return (
    <header className="sticky top-0 z-50 border-b border-borda bg-fundo/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-acento text-sm font-extrabold text-fundo">
            C
          </span>
          <span className="text-lg font-bold tracking-tight text-texto">
            Clique Estudos
          </span>
        </Link>

        <LinksNav />

        <Link
          href={perfil ? '/aluno' : '/entrar'}
          className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
        >
          {perfil ? 'Área do Aluno' : 'Entrar'}
        </Link>
      </nav>
    </header>
  )
}
