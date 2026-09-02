'use client'

import { Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'

/**
 * Botão de envio que se desabilita sozinho enquanto a Server Action do
 * formulário está rodando.
 *
 * useFormStatus só enxerga o <form> acima dele na árvore, então isto
 * precisa ser um componente cliente separado — o formulário em volta
 * continua sendo Server Component. Em telas com vários formulários (os
 * botões de avançar status, os 27 fretes), cada botão acompanha só o
 * próprio envio.
 *
 * O rótulo não muda: só entra um ícone girando. Trocar o texto mexeria na
 * largura do botão bem na hora do clique.
 */
export function BotaoSubmit({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
