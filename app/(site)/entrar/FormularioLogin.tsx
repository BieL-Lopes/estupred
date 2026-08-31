'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { entrarPorCpf, type EstadoLogin } from './acoes'

export function FormularioLogin() {
  const parametros = useSearchParams()
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(
    entrarPorCpf,
    {},
  )

  return (
    <form action={acao} className="mt-8 space-y-4">
      <input
        type="hidden"
        name="proximo"
        value={parametros.get('proximo') ?? ''}
      />

      <label className="block">
        <span className="text-sm font-medium">CPF do responsável</span>
        <input
          name="cpf"
          inputMode="numeric"
          required
          autoComplete="off"
          autoFocus
          placeholder="000.000.000-00"
          className="mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2.5 text-texto placeholder:text-texto-fraco"
        />
      </label>

      {estado.erro && (
        <p role="alert" className="text-sm text-red-400">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-lg bg-acento px-4 py-3 font-semibold text-fundo transition hover:bg-acento-claro disabled:opacity-60"
      >
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>

      <Link
        href="/entrar-equipe"
        className="flex w-full items-center justify-center rounded-lg border border-borda-forte px-4 py-3 font-semibold text-texto transition hover:bg-cartao-2"
      >
        Acesso da equipe
      </Link>
    </form>
  )
}
