import Link from 'next/link'
import { sair } from '@/app/(site)/entrar/acoes'
import { exigirEquipe } from '@/lib/auth'

const LINKS_EQUIPE = [
  { href: '/admin', rotulo: 'Painel' },
  { href: '/admin/alunos', rotulo: 'Alunos' },
  { href: '/admin/matriculas', rotulo: 'Matrículas' },
]

const LINKS_ADMIN = [
  { href: '/admin/cursos', rotulo: 'Cursos' },
  { href: '/admin/unidades', rotulo: 'Unidades' },
  { href: '/admin/fretes', rotulo: 'Fretes' },
]

export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode
}) {
  const perfil = await exigirEquipe()
  const links =
    perfil.role === 'admin' ? [...LINKS_EQUIPE, ...LINKS_ADMIN] : LINKS_EQUIPE

  return (
    <div className="min-h-screen bg-fundo">
      <header className="border-b border-borda bg-fundo-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-6 py-4">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-acento text-sm font-extrabold text-fundo">
              C
            </span>
            <span className="text-lg font-bold tracking-tight text-texto">
              Clique Estudos
            </span>
          </Link>

          <nav className="flex flex-wrap gap-4 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-texto-suave transition-colors hover:text-acento"
              >
                {l.rotulo}
              </Link>
            ))}
          </nav>

          <form action={sair} className="ml-auto">
            <button
              type="submit"
              className="text-sm text-texto-suave transition-colors hover:text-acento"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  )
}
