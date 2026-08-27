import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

const ESTILOS = {
  primario: 'bg-acento text-fundo hover:bg-acento-claro',
  secundario: 'border border-borda-forte text-texto hover:bg-cartao-2',
  fantasma: 'text-texto-suave hover:text-texto',
} as const

type Variante = keyof typeof ESTILOS

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition disabled:opacity-60'

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
