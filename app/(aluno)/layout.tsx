import Link from 'next/link'
import { exigirUsuario } from '@/lib/auth'
import { sair } from '@/app/(site)/entrar/acoes'

export default async function LayoutAluno({
  children,
}: {
  children: React.ReactNode
}) {
  const perfil = await exigirUsuario()

  return (
    <div className="min-h-screen bg-fundo">
      <header className="border-b border-borda bg-fundo-2">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-acento text-sm font-extrabold text-fundo">
              C
            </span>
            <span className="text-lg font-bold text-texto">Clique Estudos</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-texto-suave">{perfil.nome}</span>
            {perfil.role === 'admin' && (
              <Link href="/admin" className="font-medium text-acento">
                Admin
              </Link>
            )}
            <form action={sair}>
              <button
                type="submit"
                className="text-texto-fraco transition-colors hover:text-acento"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
