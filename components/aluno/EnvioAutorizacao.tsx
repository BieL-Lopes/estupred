'use client'

import { useState } from 'react'
import { criarClienteNavegador } from '@/lib/supabase/browser'

const TAMANHO_MAXIMO = 5 * 1024 * 1024
const TIPOS = ['application/pdf', 'image/jpeg', 'image/png']

export function EnvioAutorizacao({
  matriculaId,
  jaEnviada,
}: {
  matriculaId: string
  jaEnviada: boolean
}) {
  const [estado, setEstado] = useState<'ocioso' | 'enviando' | 'pronto'>(
    jaEnviada ? 'pronto' : 'ocioso',
  )
  const [erro, setErro] = useState('')

  async function enviar(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return

    if (!TIPOS.includes(arquivo.type)) {
      setErro('Envie um PDF, JPG ou PNG.')
      return
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro('O arquivo precisa ter no máximo 5 MB.')
      return
    }

    setErro('')
    setEstado('enviando')

    const supabase = criarClienteNavegador()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setErro('Sessão expirada. Entre novamente.')
      setEstado('ocioso')
      return
    }

    const extensao = arquivo.name.split('.').pop() ?? 'pdf'
    const caminho = `${user.id}/${matriculaId}.${extensao}`

    const { error: erroEnvio } = await supabase.storage
      .from('autorizacoes')
      .upload(caminho, arquivo, { upsert: true })

    if (erroEnvio) {
      setErro('Não foi possível enviar. Tente novamente.')
      setEstado('ocioso')
      return
    }

    const { error: erroBanco } = await supabase
      .from('matriculas')
      .update({ autorizacao_url: caminho })
      .eq('id', matriculaId)

    if (erroBanco) {
      setErro('Arquivo enviado, mas não foi possível registrar. Fale com o suporte.')
      setEstado('ocioso')
      return
    }

    setEstado('pronto')
  }

  if (estado === 'pronto') {
    return (
      <p className="rounded-lg bg-ok-fundo px-4 py-3 text-sm text-ok">
        Autorização recebida.
      </p>
    )
  }

  return (
    <div>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={enviar}
        disabled={estado === 'enviando'}
        className="block w-full text-sm text-texto-suave file:mr-4 file:rounded-lg file:border-0 file:bg-acento file:px-4 file:py-2 file:text-sm file:font-semibold file:text-fundo"
      />
      {estado === 'enviando' && (
        <p className="mt-2 text-sm text-texto-fraco">Enviando…</p>
      )}
      {erro && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {erro}
        </p>
      )}
    </div>
  )
}
