'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { solicitarRedefinicao, type EstadoEsqueciSenha } from './acoes'

export function FormularioEsqueciSenha() {
  const [estado, acao, pendente] = useActionState<EstadoEsqueciSenha, FormData>(
    solicitarRedefinicao,
    {},
  )

  if (estado.enviado) {
    return (
      <div className="mt-8 rounded-cartao border border-ok/30 bg-ok-fundo p-6">
        <p className="font-medium text-ok">Verifique seu e-mail</p>
        <p className="mt-2 text-sm text-texto-suave">
          Se esse e-mail tiver uma conta da equipe, você vai receber um link
          para criar uma senha nova.
        </p>
        <Link
          href="/entrar-equipe"
          className="mt-4 inline-block text-sm font-semibold text-acento hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <form action={acao} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">E-mail</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
          className="mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2.5 text-texto"
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
        {pendente ? 'Enviando…' : 'Enviar link de redefinição'}
      </button>

      <Link
        href="/entrar-equipe"
        className="block text-center text-sm text-texto-fraco transition-colors hover:text-acento"
      >
        ← Voltar para o login
      </Link>
    </form>
  )
}
