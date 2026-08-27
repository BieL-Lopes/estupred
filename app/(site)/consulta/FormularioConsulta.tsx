'use client'

import { useState, useTransition } from 'react'
import { Botao } from '@/components/ui/Botao'
import { Selo } from '@/components/ui/Selo'
import {
  consultarPorCpf,
  type ResultadoConsulta,
} from '@/lib/matricula/consulta-publica'

function formatarData(iso: string | null) {
  if (!iso) return null
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function FormularioConsulta() {
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null)
  const [consultando, iniciar] = useTransition()

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    const cpf = String(dados.get('cpf') ?? '')

    iniciar(async () => {
      setResultado(await consultarPorCpf(cpf))
    })
  }

  return (
    <div>
      <form onSubmit={enviar} className="flex flex-wrap gap-3">
        <label className="flex-1">
          <span className="sr-only">CPF do aluno</span>
          <input
            name="cpf"
            inputMode="numeric"
            required
            placeholder="CPF do aluno"
            className="w-full rounded-lg border border-borda bg-cartao px-4 py-3 text-texto placeholder:text-texto-fraco"
          />
        </label>
        <Botao type="submit" disabled={consultando}>
          {consultando ? 'Consultando…' : 'Consultar'}
        </Botao>
      </form>

      {resultado && !resultado.ok && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-aviso/30 bg-aviso-fundo px-4 py-3 text-sm text-aviso"
        >
          {resultado.erro}
        </p>
      )}

      {resultado?.ok && (
        <div className="mt-8">
          <p className="text-texto-suave">
            Matrículas de <strong className="text-texto">{resultado.primeiroNome}</strong>
          </p>

          <ul className="mt-4 space-y-4">
            {resultado.matriculas.map((m) => (
              <li
                key={m.codigo}
                className="rounded-cartao border border-borda bg-cartao p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-texto-fraco">
                      {m.codigo}
                    </p>
                    <h2 className="mt-1 font-semibold text-texto">{m.curso}</h2>
                    <p className="mt-1 text-sm text-texto-fraco">
                      {m.cargaHoraria}h
                    </p>
                  </div>
                  <Selo status={m.status} />
                </div>

                {(m.dataInicio || m.dataProva) && (
                  <dl className="mt-5 flex flex-wrap gap-8 border-t border-borda pt-4 text-sm">
                    {m.dataInicio && (
                      <div>
                        <dt className="text-texto-fraco">Início do curso</dt>
                        <dd className="font-medium text-texto">
                          {formatarData(m.dataInicio)}
                        </dd>
                      </div>
                    )}
                    {m.dataProva && (
                      <div>
                        <dt className="text-texto-fraco">Data da prova</dt>
                        <dd className="font-medium text-acento">
                          {formatarData(m.dataProva)}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-texto-fraco">
            Para ver comprovante, dados completos e enviar a autorização de
            estudo, entre na Área do Aluno.
          </p>
        </div>
      )}
    </div>
  )
}
