'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { criarClienteNavegador } from '@/lib/supabase/browser'

/**
 * O link do e-mail traz o token de recuperação no hash da URL (#access_token=...),
 * que o servidor nunca vê — só o navegador. O cliente Supabase detecta isso
 * sozinho ao montar (detectSessionInUrl) e dispara PASSWORD_RECOVERY.
 */
export function FormularioRedefinirSenha() {
  const router = useRouter()
  const [pronto, setPronto] = useState(false)
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    const supabase = criarClienteNavegador()

    const { data: assinatura } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') setPronto(true)
    })

    // Corrida rara: se o hash já foi processado antes deste efeito montar,
    // getSession ainda encontra a sessão de recuperação.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true)
    })

    return () => assinatura.subscription.unsubscribe()
  }, [])

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    if (senha.length < 6) {
      setErro('A senha precisa de ao menos 6 caracteres.')
      return
    }
    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.')
      return
    }

    setErro('')
    setEnviando(true)

    const supabase = criarClienteNavegador()
    const { error } = await supabase.auth.updateUser({ password: senha })

    setEnviando(false)

    if (error) {
      setErro('Não foi possível trocar a senha. Tente pedir um novo link.')
      return
    }

    setSucesso(true)
    setTimeout(() => router.push('/admin'), 1500)
  }

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2.5 text-texto'

  if (sucesso) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold text-ok">Senha alterada!</p>
        <p className="mt-2 text-texto-fraco">Entrando no sistema…</p>
      </div>
    )
  }

  if (!pronto) {
    return (
      <div className="text-center">
        <p className="text-texto-fraco">Verificando o link…</p>
        <p className="mt-4 text-sm text-texto-fraco">
          Se esta tela não mudar em alguns segundos, o link pode ter expirado.
        </p>
        <Link
          href="/entrar-equipe/esqueci-senha"
          className="mt-4 inline-block text-sm font-semibold text-acento hover:underline"
        >
          Pedir um novo link
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Nova senha</span>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          autoComplete="new-password"
          className={campo}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Confirme a senha</span>
        <input
          type="password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          required
          autoComplete="new-password"
          className={campo}
        />
      </label>

      {erro && (
        <p role="alert" className="text-sm text-red-400">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-acento px-4 py-3 font-semibold text-fundo transition hover:bg-acento-claro disabled:opacity-60"
      >
        {enviando ? 'Salvando…' : 'Salvar nova senha'}
      </button>
    </form>
  )
}
