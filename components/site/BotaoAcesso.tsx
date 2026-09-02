'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { criarClienteNavegador } from '@/lib/supabase/browser'

/**
 * Decide no navegador se mostra "Entrar" ou "Área do Aluno".
 *
 * Isto existe para tirar o cookie da sessão do caminho de renderização do
 * servidor: ler cookie no cabeçalho obrigava TODA página do site a ser
 * gerada a cada acesso, inclusive as institucionais, que são texto puro e
 * agora saem prontas do CDN.
 *
 * O preço é um piscar: o HTML estático sempre chega com "Entrar", e quem
 * está logado vê virar "Área do Aluno" logo depois. É decisão de exibição —
 * o acesso em si continua fechado por exigirUsuario/exigirAdmin e pela RLS.
 */
export function BotaoAcesso() {
  const [logado, setLogado] = useState(false)

  useEffect(() => {
    const supabase = criarClienteNavegador()

    supabase.auth
      .getSession()
      .then(({ data }) => setLogado(data.session !== null))
      .catch(() => setLogado(false))

    const { data: assinatura } = supabase.auth.onAuthStateChange(
      (_evento, sessao) => setLogado(sessao !== null),
    )

    return () => assinatura.subscription.unsubscribe()
  }, [])

  return (
    <Link
      href={logado ? '/aluno' : '/entrar'}
      // min-w segura a largura do botão para o texto trocar sem empurrar o
      // menu de lado.
      className="inline-flex min-w-[8.5rem] items-center justify-center rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
    >
      {logado ? 'Área do Aluno' : 'Entrar'}
    </Link>
  )
}
