'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/como-funciona', rotulo: 'Como funciona' },
  { href: '/cursos', rotulo: 'Cursos' },
  { href: '/institucional', rotulo: 'Instituição' },
  { href: '/consulta', rotulo: 'Consultar CPF' },
  { href: '/#duvidas', rotulo: 'Dúvidas' },
]

function ehPaginaAtual(pathname: string, href: string): boolean {
  // Âncora (#duvidas) não tem página própria pra destacar como ativa.
  if (href.startsWith('/#')) return false
  if (href === '/cursos') return pathname === '/cursos' || pathname.startsWith('/cursos/')
  return pathname === href
}

export function LinksNav() {
  const pathname = usePathname()

  return (
    <div className="hidden items-center gap-7 text-sm font-medium md:flex">
      {LINKS.map((l) => {
        const ativo = ehPaginaAtual(pathname, l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={ativo ? 'page' : undefined}
            className={`transition-colors hover:text-acento ${
              ativo ? 'text-acento' : 'text-texto-suave'
            }`}
          >
            {l.rotulo}
          </Link>
        )
      })}
    </div>
  )
}
