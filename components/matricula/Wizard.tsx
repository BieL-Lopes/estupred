'use client'

import { useEffect, useState } from 'react'
import type { CursoDetalhe } from '@/lib/catalogo'
import type { RascunhoMatricula } from '@/lib/dominio/esquemas'
import { PassoUnidade } from './PassoUnidade'
import { PassoInterno } from './PassoInterno'
import { PassoResponsavel } from './PassoResponsavel'
import { PassoPagamento } from './PassoPagamento'
import { ResumoRodape } from './ResumoRodape'

const CHAVE = 'clique-estudos:rascunho'

export type EstadoWizard = {
  passo: 1 | 2 | 3 | 4
  unidade?: RascunhoMatricula['unidade']
  interno?: RascunhoMatricula['interno']
  freteCentavos?: number
  matriculaId?: string
  codigo?: string
}

export function Wizard({ curso }: { curso: CursoDetalhe }) {
  const [estado, setEstado] = useState<EstadoWizard>({ passo: 1 })

  // Recupera o rascunho: o preenchimento nunca se perde num reload.
  useEffect(() => {
    const salvo = sessionStorage.getItem(`${CHAVE}:${curso.slug}`)
    if (salvo) {
      try {
        setEstado(JSON.parse(salvo) as EstadoWizard)
      } catch {
        sessionStorage.removeItem(`${CHAVE}:${curso.slug}`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sessionStorage.setItem(`${CHAVE}:${curso.slug}`, JSON.stringify(estado))
  }, [estado, curso.slug])

  const rotulos = ['Unidade', 'Interno', 'Seus dados', 'Pagamento']

  return (
    <div className="pb-32">
      <ol className="flex gap-2" aria-label="Etapas da matrícula">
        {rotulos.map((rotulo, indice) => {
          const numero = indice + 1
          const atingido = estado.passo >= numero
          return (
            <li key={rotulo} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${atingido ? 'bg-acento' : 'bg-borda'}`}
              />
              <p
                className={`mt-2 text-xs ${
                  atingido ? 'font-semibold text-acento' : 'text-texto-fraco'
                }`}
              >
                {numero}. {rotulo}
              </p>
            </li>
          )
        })}
      </ol>

      <div className="mt-10">
        {estado.passo === 1 && (
          <PassoUnidade
            curso={curso}
            onAvancar={(unidade, freteCentavos) =>
              setEstado((e) => ({ ...e, unidade, freteCentavos, passo: 2 }))
            }
          />
        )}

        {estado.passo === 2 && (
          <PassoInterno
            inicial={estado.interno}
            onVoltar={() => setEstado((e) => ({ ...e, passo: 1 }))}
            onAvancar={(interno) =>
              setEstado((e) => ({ ...e, interno, passo: 3 }))
            }
          />
        )}

        {estado.passo === 3 && estado.unidade && estado.interno && (
          <PassoResponsavel
            cursoSlug={curso.slug}
            rascunho={{ unidade: estado.unidade, interno: estado.interno }}
            onVoltar={() => setEstado((e) => ({ ...e, passo: 2 }))}
            onCriada={(matriculaId, codigo) =>
              setEstado((e) => ({ ...e, matriculaId, codigo, passo: 4 }))
            }
          />
        )}

        {estado.passo === 4 && estado.matriculaId && estado.codigo && (
          <PassoPagamento
            matriculaId={estado.matriculaId}
            codigo={estado.codigo}
            onConcluido={() => sessionStorage.removeItem(`${CHAVE}:${curso.slug}`)}
          />
        )}
      </div>

      <ResumoRodape
        curso={curso}
        freteCentavos={estado.freteCentavos}
        uf={estado.unidade?.uf}
      />
    </div>
  )
}
