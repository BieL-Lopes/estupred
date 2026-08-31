'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Botao } from '@/components/ui/Botao'
import type { MetodoPagamento } from '@/lib/dominio/tipos'
import { iniciarCobranca } from '@/lib/matricula/cobranca'

const METODOS: { valor: MetodoPagamento; rotulo: string; ajuda: string }[] = [
  { valor: 'pix', rotulo: 'PIX', ajuda: 'Confirmação imediata' },
  { valor: 'boleto', rotulo: 'Boleto', ajuda: 'Compensa em até 3 dias úteis' },
  { valor: 'cartao', rotulo: 'Cartão de crédito', ajuda: 'Confirmação imediata' },
]

export function PassoPagamento({
  matriculaId,
  codigo,
  onConcluido,
}: {
  matriculaId: string
  codigo: string
  onConcluido: () => void
}) {
  const [metodo, setMetodo] = useState<MetodoPagamento>('pix')
  const [cobranca, setCobranca] = useState<{
    url?: string
    pixCopiaECola?: string
  } | null>(null)
  const [erro, setErro] = useState('')
  const [gerando, iniciar] = useTransition()

  function gerar() {
    setErro('')
    iniciar(async () => {
      const r = await iniciarCobranca({ matriculaId, metodo })
      if (!r.ok) {
        setErro(r.erro)
        return
      }
      setCobranca({ url: r.url, pixCopiaECola: r.pixCopiaECola })
      onConcluido()
    })
  }

  if (cobranca) {
    return (
      <div>
        <h2 className="text-xl font-bold text-texto">
          Matrícula {codigo} criada
        </h2>
        <p className="mt-1 text-sm text-texto-fraco">
          Assim que o pagamento for confirmado, o andamento aparece na sua
          Área do Aluno.
        </p>

        {cobranca.pixCopiaECola && (
          <div className="mt-6 rounded-cartao border border-borda bg-cartao p-6">
            <p className="text-sm font-medium">Copie o código PIX</p>
            <code className="mt-2 block break-all rounded-lg bg-fundo-2 p-4 text-xs">
              {cobranca.pixCopiaECola}
            </code>
          </div>
        )}

        {cobranca.url && (
          <a
            href={cobranca.url}
            className="mt-6 inline-flex rounded-lg bg-acento px-5 py-3 text-sm font-semibold text-fundo"
          >
            Abrir pagamento
          </a>
        )}

        <Link
          href="/aluno"
          className="mt-6 block text-sm font-semibold text-acento hover:underline"
        >
          Ir para a Área do Aluno
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-texto">Pagamento</h2>
      <p className="mt-1 text-sm text-texto-fraco">Escolha como prefere pagar.</p>

      <fieldset className="mt-6 space-y-3">
        <legend className="sr-only">Forma de pagamento</legend>
        {METODOS.map((opcao) => (
          <label
            key={opcao.valor}
            className={`flex cursor-pointer items-center gap-3 rounded-cartao border p-4 ${
              metodo === opcao.valor
                ? 'border-acento bg-acento-fundo'
                : 'border-borda bg-cartao'
            }`}
          >
            <input
              type="radio"
              name="metodo"
              value={opcao.valor}
              checked={metodo === opcao.valor}
              onChange={() => setMetodo(opcao.valor)}
            />
            <span>
              <span className="block font-medium text-texto">
                {opcao.rotulo}
              </span>
              <span className="block text-sm text-texto-fraco">
                {opcao.ajuda}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {erro && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {erro}
        </p>
      )}

      <Botao className="mt-8 w-full" onClick={gerar} disabled={gerando}>
        {gerando ? 'Gerando cobrança…' : 'Gerar pagamento'}
      </Botao>
    </div>
  )
}
