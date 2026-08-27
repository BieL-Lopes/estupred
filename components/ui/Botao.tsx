import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

const ESTILOS = {
  primario: 'bg-marca-700 text-white hover:bg-marca-600',
  secundario: 'bg-white text-marca-700 border border-marca-200 hover:bg-marca-50',
  destaque: 'bg-destaque-500 text-marca-900 hover:brightness-95',
} as const

type Variante = keyof typeof ESTILOS

const BASE =
  'inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition disabled:opacity-60'

export function Botao({
  variante = 'primario',
  className = '',
  ...resto
}: ComponentProps<'button'> & { variante?: Variante }) {
  return (
    <button className={`${BASE} ${ESTILOS[variante]} ${className}`} {...resto} />
  )
}

export function BotaoLink({
  href,
  variante = 'primario',
  className = '',
  children,
}: {
  href: string
  variante?: Variante
  className?: string
  children: ReactNode
}) {
  return (
    <Link href={href} className={`${BASE} ${ESTILOS[variante]} ${className}`}>
      {children}
    </Link>
  )
}
