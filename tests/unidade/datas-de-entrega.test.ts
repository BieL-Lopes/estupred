import { describe, expect, it } from 'vitest'
import { etapasAteAEntrega, validarDataDeEntrega } from '@/lib/matricula/datas'

describe('validarDataDeEntrega', () => {
  it('aceita a entrega feita hoje', () => {
    expect(
      validarDataDeEntrega({
        data: '2026-09-08',
        dataCompra: '2026-09-01',
        hoje: '2026-09-08',
      }),
    ).toEqual({ ok: true })
  })

  it('aceita entrega no passado, que é o caso comum', () => {
    // O colaborador costuma registrar dias depois de a unidade confirmar.
    expect(
      validarDataDeEntrega({
        data: '2026-08-28',
        dataCompra: '2026-08-20',
        hoje: '2026-09-08',
      }),
    ).toEqual({ ok: true })
  })

  it('aceita entrega no mesmo dia da compra', () => {
    expect(
      validarDataDeEntrega({
        data: '2026-09-01',
        dataCompra: '2026-09-01',
        hoje: '2026-09-08',
      }),
    ).toEqual({ ok: true })
  })

  it('recusa data no futuro', () => {
    const r = validarDataDeEntrega({
      data: '2026-09-09',
      dataCompra: '2026-09-01',
      hoje: '2026-09-08',
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erro).toContain('futuro')
  })

  it('recusa entrega anterior à compra', () => {
    const r = validarDataDeEntrega({
      data: '2026-08-30',
      dataCompra: '2026-09-01',
      hoje: '2026-09-08',
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erro).toContain('compra')
  })

  it('aceita qualquer data passada quando não há data de compra', () => {
    // Matrícula antiga, de antes de o carimbo de compra existir.
    expect(
      validarDataDeEntrega({
        data: '2026-01-15',
        dataCompra: null,
        hoje: '2026-09-08',
      }),
    ).toEqual({ ok: true })
  })

  it('recusa data mal formada', () => {
    const r = validarDataDeEntrega({
      data: '08/09/2026',
      dataCompra: null,
      hoje: '2026-09-08',
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erro).toContain('data')
  })

  it('recusa data vazia', () => {
    const r = validarDataDeEntrega({ data: '', dataCompra: null, hoje: '2026-09-08' })
    expect(r.ok).toBe(false)
  })
})

describe('etapasAteAEntrega', () => {
  it('conta as três etapas que faltam a partir de paga', () => {
    expect(etapasAteAEntrega('paga')).toBe(3)
  })

  it('conta duas a partir da produção e uma a partir do envio', () => {
    expect(etapasAteAEntrega('material_em_producao')).toBe(2)
    expect(etapasAteAEntrega('material_a_caminho')).toBe(1)
  })

  it('conta desde o começo do fluxo', () => {
    expect(etapasAteAEntrega('aguardando_pagamento')).toBe(4)
    expect(etapasAteAEntrega('rascunho')).toBe(5)
  })

  it('devolve zero quando a entrega já aconteceu', () => {
    expect(etapasAteAEntrega('material_entregue')).toBe(0)
  })

  it('devolve null quando a entrega não é mais alcançável', () => {
    // Depois da prova não se volta para a entrega, e cancelada é terminal.
    expect(etapasAteAEntrega('prova_aplicada')).toBeNull()
    expect(etapasAteAEntrega('aprovado')).toBeNull()
    expect(etapasAteAEntrega('certificado_emitido')).toBeNull()
    expect(etapasAteAEntrega('cancelada')).toBeNull()
  })

  it('não entra em laço na recuperação, que volta para a prova', () => {
    expect(etapasAteAEntrega('reprovado')).toBeNull()
  })
})
