'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { entrar, type EstadoLogin } from './acoes'

export function FormularioLogin() {
  const parametros = useSearchParams()
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(
    entrar,
    {},
  )

  const campo = 'mt-1 w-full rounded-lg border border-borda px-3 py-2.5'

  return (
    <form action={acao} className="mt-8 space-y-4">
      <input
        type="hidden"
        name="proximo"
        value={parametros.get('proximo') ?? ''}
      />

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
        className="w-full rounded-lg bg-marca-700 px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
