import { describe, expect, it } from 'vitest'
import { montarLinhaDoTempo } from '@/lib/matricula/consultas'

describe('montarLinhaDoTempo', () => {
  it('mostra as oito etapas mesmo no começo', () => {
    const etapas = montarLinhaDoTempo('aguardando_pagamento', [])
    expect(etapas.map((e) => e.status)).toEqual([
      'aguardando_pagamento',
      'paga',
      'material_em_producao',
      'material_a_caminho',
      'material_entregue',
      'prova_aplicada',
      'aprovado',
      'certificado_emitido',
    ])
  })

  it('marca a etapa atual e deixa as seguintes como futuras', () => {
    const etapas = montarLinhaDoTempo('material_a_caminho', [])
    const porStatus = Object.fromEntries(etapas.map((e) => [e.status, e.estado]))

    expect(porStatus.aguardando_pagamento).toBe('concluida')
    expect(porStatus.paga).toBe('concluida')
    expect(porStatus.material_em_producao).toBe('concluida')
    expect(porStatus.material_a_caminho).toBe('atual')
    expect(porStatus.material_entregue).toBe('futura')
    expect(porStatus.prova_aplicada).toBe('futura')
    expect(porStatus.certificado_emitido).toBe('futura')
  })

  it('marca tudo como concluído ou atual no fim', () => {
    const etapas = montarLinhaDoTempo('certificado_emitido', [])
    expect(
      etapas.every((e) => e.estado === 'concluida' || e.estado === 'atual'),
    ).toBe(true)
    expect(etapas.at(-1)!.estado).toBe('atual')
  })

  it('anexa a data do evento à etapa correspondente', () => {
    const etapas = montarLinhaDoTempo('paga', [
      { paraStatus: 'paga', nota: null, criadoEm: '2026-08-27T12:00:00Z' },
    ])
    expect(etapas.find((e) => e.status === 'paga')!.quando).toBe(
      '2026-08-27T12:00:00Z',
    )
    expect(etapas.find((e) => e.status === 'prova_aplicada')!.quando).toBeNull()
  })

  it('trata reprovado como recuperação dentro da etapa de prova', () => {
    const etapas = montarLinhaDoTempo('reprovado', [])
    const prova = etapas.find((e) => e.status === 'prova_aplicada')!
    expect(prova.estado).toBe('atual')
    expect(prova.rotulo).toContain('recuperação')
  })

  it('devolve lista vazia para matrícula cancelada', () => {
    expect(montarLinhaDoTempo('cancelada', [])).toEqual([])
  })

  it('posiciona uma matrícula antiga em material_enviado na etapa de entrega', () => {
    // material_enviado saiu da lista de etapas. Sem tratamento, indexOf
    // devolveria -1 e a família veria tudo como futuro — uma matrícula já
    // entregue apareceria como se nada tivesse começado.
    const etapas = montarLinhaDoTempo('material_enviado', [])
    const porStatus = Object.fromEntries(etapas.map((e) => [e.status, e.estado]))

    expect(porStatus.material_entregue).toBe('atual')
    expect(porStatus.paga).toBe('concluida')
    expect(porStatus.prova_aplicada).toBe('futura')
  })
})
