'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { entrarComoEquipe, type EstadoLoginEquipe } from './acoes'

export function FormularioLoginEquipe() {
  const [estado, acao, pendente] = useActionState<EstadoLoginEquipe, FormData>(
    entrarComoEquipe,
    {},
  )
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2.5 text-texto'

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
          className={campo}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Senha</span>
        <div className="relative mt-1">
          <input
            name="senha"
            type={mostrarSenha ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="Digite sua senha"
            className={`${campo} mt-0 pr-11`}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-texto-fraco hover:text-texto"
          >
            {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-texto-suave">
          <input type="checkbox" name="lembrar" className="rounded border-borda" />
          Lembrar de mim
        </label>
        <Link
          href="/entrar-equipe/esqueci-senha"
          className="text-acento transition-colors hover:text-acento-claro"
        >
          Esqueceu sua senha?
        </Link>
      </div>

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
        {pendente ? 'Entrando…' : 'Entrar no Sistema'}
      </button>

      <Link
        href="/entrar"
        className="flex w-full items-center justify-center rounded-lg bg-ok px-4 py-3 font-semibold text-fundo transition hover:brightness-95"
      >
        Portal do Aluno
      </Link>
    </form>
  )
}
