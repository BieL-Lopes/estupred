'use client'

import { useActionState } from 'react'
import { entrarComoEquipe, type EstadoLoginEquipe } from './acoes'

export function FormularioLoginEquipe() {
  const [estado, acao, pendente] = useActionState<EstadoLoginEquipe, FormData>(
    entrarComoEquipe,
    {},
  )

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-cartao px-3 py-2.5 text-texto'

  return (
    <form action={acao} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">E-mail</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={campo}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Senha</span>
        <input
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          className={campo}
        />
      </label>

      {estado.erro && (
        <p role="alert" className="text-sm text-red-600">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-lg bg-acento px-4 py-3 font-semibold text-fundo disabled:opacity-60"
      >
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
