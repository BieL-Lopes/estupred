'use client'

import { useEffect, useState, useTransition } from 'react'
import { Botao } from '@/components/ui/Botao'
import { UFS } from '@/lib/dominio/tipos'
import type { CursoDetalhe } from '@/lib/catalogo'
import type { DadosUnidade } from '@/lib/dominio/esquemas'
import { buscarUnidadesEFrete } from './dados'

export function PassoUnidade({
  curso,
  onAvancar,
}: {
  curso: CursoDetalhe
  onAvancar: (unidade: DadosUnidade, freteCentavos: number) => void
}) {
  const [uf, setUf] = useState('')
  const [unidadeId, setUnidadeId] = useState('')
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([])
  const [frete, setFrete] = useState<{
    valorCentavos: number
    prazoDias: number
  } | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, iniciar] = useTransition()

  const ufsPermitidas = curso.ufs.length > 0 ? curso.ufs : [...UFS]

  useEffect(() => {
    if (!uf) return
    setUnidadeId('')
    iniciar(async () => {
      const resultado = await buscarUnidadesEFrete(uf)
      setUnidades(resultado.unidades)
      setFrete(resultado.frete)
      setErro(
        resultado.unidades.length === 0
          ? 'Ainda não atendemos unidades neste estado.'
          : !resultado.frete
            ? 'Frete ainda não configurado para este estado. Fale com o suporte.'
            : '',
      )
    })
  }, [uf])

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-cartao px-3 py-2.5 text-texto'

  return (
    <div>
      <h2 className="text-xl font-bold text-texto">Onde ele está?</h2>
      <p className="mt-1 text-sm text-texto-fraco">
        O estado define o valor do frete e a disponibilidade do curso.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Estado</span>
          <select
            className={campo}
            value={uf}
            onChange={(e) => setUf(e.target.value)}
          >
            <option value="">Selecione</option>
            {ufsPermitidas.map((sigla) => (
              <option key={sigla} value={sigla}>
                {sigla}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Unidade prisional</span>
          <select
            className={campo}
            value={unidadeId}
            onChange={(e) => setUnidadeId(e.target.value)}
            disabled={!uf || carregando || unidades.length === 0}
          >
            <option value="">{carregando ? 'Carregando…' : 'Selecione'}</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </label>

        {frete && unidades.length > 0 && (
          <p className="rounded-lg bg-acento-fundo px-4 py-3 text-sm text-acento-claro">
            Prazo estimado de envio do material: {frete.prazoDias} dias.
          </p>
        )}

        {erro && (
          <p role="alert" className="text-sm text-red-400">
            {erro}
          </p>
        )}
      </div>

      <Botao
        className="mt-8 w-full"
        disabled={!uf || !unidadeId || !frete}
        onClick={() =>
          onAvancar(
            { uf: uf as DadosUnidade['uf'], unidadeId },
            frete!.valorCentavos,
          )
        }
      >
        Continuar
      </Botao>
    </div>
  )
}
