'use client'

import { useTransition, useState } from 'react'
import { Botao } from '@/components/ui/Botao'
import { EsquemaResponsavel } from '@/lib/dominio/esquemas'
import type { RascunhoMatricula } from '@/lib/dominio/esquemas'
import { criarMatriculaELogar } from '@/app/(site)/matricula/[slug]/acoes'

export function PassoResponsavel({
  cursoSlug,
  rascunho,
  onVoltar,
  onCriada,
}: {
  cursoSlug: string
  rascunho: RascunhoMatricula
  onVoltar: () => void
  onCriada: (matriculaId: string, codigo: string) => void
}) {
  const [erro, setErro] = useState('')
  const [enviando, iniciar] = useTransition()

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = Object.fromEntries(new FormData(evento.currentTarget))
    const analise = EsquemaResponsavel.safeParse(dados)
    if (!analise.success) {
      setErro(analise.error.issues[0]!.message)
      return
    }

    setErro('')
    iniciar(async () => {
      const resultado = await criarMatriculaELogar({
        cursoSlug,
        rascunho,
        responsavel: analise.data,
      })
      if (resultado.ok) onCriada(resultado.matriculaId, resultado.codigo)
      else setErro(resultado.erro)
    })
  }

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-cartao px-3 py-2.5 text-texto'

  return (
    <form onSubmit={enviar}>
      <h2 className="text-xl font-bold text-texto">Seus dados</h2>
      <p className="mt-1 text-sm text-texto-fraco">
        Sem senha: depois é só voltar e informar este CPF para acompanhar o
        andamento do curso.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Seu nome completo</span>
          <input name="nome" className={campo} required />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Seu CPF</span>
          <input name="cpf" className={campo} inputMode="numeric" required />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Parentesco com o interno</span>
          <input
            name="parentesco"
            className={campo}
            placeholder="Cônjuge, mãe, irmão…"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">WhatsApp</span>
          <input name="telefone" className={campo} inputMode="tel" required />
        </label>

        <label className="block">
          <span className="text-sm font-medium">E-mail</span>
          <input
            name="email"
            type="email"
            className={campo}
            autoComplete="email"
            required
          />
        </label>

        {erro && (
          <p role="alert" className="text-sm text-red-400">
            {erro}
          </p>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <Botao
          type="button"
          variante="secundario"
          onClick={onVoltar}
          disabled={enviando}
        >
          Voltar
        </Botao>
        <Botao type="submit" className="flex-1" disabled={enviando}>
          {enviando ? 'Criando matrícula…' : 'Continuar para o pagamento'}
        </Botao>
      </div>
    </form>
  )
}
