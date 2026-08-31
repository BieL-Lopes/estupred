'use client'

import { useState } from 'react'
import { Botao } from '@/components/ui/Botao'
import { EsquemaInterno, type DadosInterno } from '@/lib/dominio/esquemas'

export function PassoInterno({
  inicial,
  onVoltar,
  onAvancar,
}: {
  inicial?: DadosInterno
  onVoltar: () => void
  onAvancar: (interno: DadosInterno) => void
}) {
  const [erro, setErro] = useState('')

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = Object.fromEntries(new FormData(evento.currentTarget))
    const analise = EsquemaInterno.safeParse(dados)
    if (!analise.success) {
      setErro(analise.error.issues[0]!.message)
      return
    }
    setErro('')
    onAvancar(analise.data)
  }

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-cartao px-3 py-2.5 text-texto'

  return (
    <form onSubmit={enviar}>
      <h2 className="text-xl font-bold text-texto">Dados do interno</h2>
      <p className="mt-1 text-sm text-texto-fraco">
        Confira com atenção: o certificado será emitido com esses dados.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Nome completo</span>
          <input name="nome" defaultValue={inicial?.nome} className={campo} required />
        </label>

        <label className="block">
          <span className="text-sm font-medium">CPF</span>
          <input
            name="cpf"
            defaultValue={inicial?.cpf}
            className={campo}
            inputMode="numeric"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">
            RG <span className="text-texto-fraco">(opcional)</span>
          </span>
          <input name="rg" defaultValue={inicial?.rg} className={campo} />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Matrícula prisional</span>
          <input
            name="matriculaPrisional"
            defaultValue={inicial?.matriculaPrisional}
            className={campo}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">
            Data de nascimento{' '}
            <span className="text-texto-fraco">(opcional)</span>
          </span>
          <input
            name="dataNascimento"
            type="date"
            defaultValue={inicial?.dataNascimento}
            className={campo}
          />
        </label>

        {erro && (
          <p role="alert" className="text-sm text-red-400">
            {erro}
          </p>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <Botao type="button" variante="secundario" onClick={onVoltar}>
          Voltar
        </Botao>
        <Botao type="submit" className="flex-1">
          Continuar
        </Botao>
      </div>
    </form>
  )
}
