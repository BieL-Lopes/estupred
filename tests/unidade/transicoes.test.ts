import { describe, expect, it } from 'vitest'
import { STATUS_MATRICULA } from '@/lib/dominio/tipos'
import {
  TRANSICOES,
  TransicaoInvalidaError,
  assertTransicao,
  proximosStatus,
  transicaoPermitida,
} from '@/lib/matricula/transicoes'

describe('grafo de transições', () => {
  it('cobre todos os status declarados', () => {
    for (const status of STATUS_MATRICULA) {
      expect(TRANSICOES[status]).toBeDefined()
    }
  })

  it('só aponta para status que existem', () => {
    for (const destinos of Object.values(TRANSICOES)) {
      for (const destino of destinos) {
        expect(STATUS_MATRICULA).toContain(destino)
      }
    }
  })

  it('trata os estados finais como terminais', () => {
    expect(TRANSICOES.certificado_emitido).toEqual([])
    expect(TRANSICOES.cancelada).toEqual([])
  })
})

describe('transicaoPermitida', () => {
  it('permite o caminho feliz completo', () => {
    const caminho = [
      'rascunho',
      'aguardando_pagamento',
      'paga',
      'material_enviado',
      'prova_aplicada',
      'aprovado',
      'certificado_emitido',
    ] as const

    for (let i = 0; i < caminho.length - 1; i++) {
      expect(transicaoPermitida(caminho[i]!, caminho[i + 1]!)).toBe(true)
    }
  })

  it('permite a recuperação: reprovado volta para prova aplicada', () => {
    expect(transicaoPermitida('prova_aplicada', 'reprovado')).toBe(true)
    expect(transicaoPermitida('reprovado', 'prova_aplicada')).toBe(true)
  })

  it('permite cancelar antes do pagamento', () => {
    expect(transicaoPermitida('rascunho', 'cancelada')).toBe(true)
    expect(transicaoPermitida('aguardando_pagamento', 'cancelada')).toBe(true)
  })

  it('proíbe cancelar depois do pagamento', () => {
    expect(transicaoPermitida('paga', 'cancelada')).toBe(false)
    expect(transicaoPermitida('material_enviado', 'cancelada')).toBe(false)
  })

  it('proíbe pular etapas', () => {
    expect(transicaoPermitida('aguardando_pagamento', 'material_enviado')).toBe(false)
    expect(transicaoPermitida('paga', 'aprovado')).toBe(false)
    expect(transicaoPermitida('rascunho', 'paga')).toBe(false)
  })

  it('proíbe voltar no tempo', () => {
    expect(transicaoPermitida('paga', 'aguardando_pagamento')).toBe(false)
    expect(transicaoPermitida('aprovado', 'prova_aplicada')).toBe(false)
  })

  it('proíbe permanecer no mesmo status', () => {
    expect(transicaoPermitida('paga', 'paga')).toBe(false)
  })

  it('proíbe sair de um estado terminal', () => {
    expect(transicaoPermitida('certificado_emitido', 'aprovado')).toBe(false)
    expect(transicaoPermitida('cancelada', 'rascunho')).toBe(false)
  })
})

describe('assertTransicao', () => {
  it('não faz nada quando a transição é legal', () => {
    expect(() => assertTransicao('paga', 'material_enviado')).not.toThrow()
  })

  it('lança TransicaoInvalidaError quando é ilegal', () => {
    expect(() => assertTransicao('paga', 'aprovado')).toThrow(TransicaoInvalidaError)
  })

  it('nomeia os dois status na mensagem', () => {
    expect(() => assertTransicao('paga', 'aprovado')).toThrow(/paga.*aprovado/)
  })
})

describe('proximosStatus', () => {
  it('lista os destinos de um status', () => {
    expect(proximosStatus('prova_aplicada')).toEqual(['aprovado', 'reprovado'])
  })
})
