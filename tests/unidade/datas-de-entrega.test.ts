import { describe, expect, it } from 'vitest'
import { validarDataDeEntrega } from '@/lib/matricula/datas'

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
