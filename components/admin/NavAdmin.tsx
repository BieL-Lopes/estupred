'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type LinkAdmin = { href: string; rotulo: string }

export function NavAdmin({ links }: { links: LinkAdmin[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-4 text-sm">
      {links.map((l) => {
        // /admin sozinho (Painel) não pode ficar "ativo" em toda página do
        // admin só porque todo caminho começa com /admin.
        const ativo =
          l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href)

        return (
          <Link
            key={l.href}
            href={l.href}
            className={`transition-colors hover:text-acento ${
              ativo ? 'font-semibold text-acento' : 'text-texto-suave'
            }`}
          >
            {l.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
