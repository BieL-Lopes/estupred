import { describe, expect, it } from 'vitest'
import { montarLinhaDoTempo } from '@/lib/matricula/consultas'

describe('montarLinhaDoTempo', () => {
  it('mostra as seis etapas mesmo no começo', () => {
    const etapas = montarLinhaDoTempo('aguardando_pagamento', [])
    expect(etapas.map((e) => e.status)).toEqual([
      'aguardando_pagamento',
      'paga',
      'material_enviado',
      'prova_aplicada',
      'aprovado',
      'certificado_emitido',
    ])
  })

  it('marca a etapa atual e deixa as seguintes como futuras', () => {
    const etapas = montarLinhaDoTempo('material_enviado', [])
    const porStatus = Object.fromEntries(etapas.map((e) => [e.status, e.estado]))

    expect(porStatus.aguardando_pagamento).toBe('concluida')
    expect(porStatus.paga).toBe('concluida')
    expect(porStatus.material_enviado).toBe('atual')
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
})
