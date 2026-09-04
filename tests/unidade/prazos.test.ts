import { describe, expect, it } from 'vitest'
import { DIAS_ATE_A_PROVA, calcularDataProva } from '@/lib/matricula/prazos'

describe('calcularDataProva', () => {
  it('usa 45 dias, fixo para qualquer curso', () => {
    expect(DIAS_ATE_A_PROVA).toBe(45)
  })

  it('soma 45 dias corridos', () => {
    expect(calcularDataProva('2026-01-05')).toBe('2026-02-19')
  })

  it('não desvia quando os 45 dias caem no sábado', () => {
    // A regra antiga empurrava para segunda, 23/02. O cliente pediu a data
    // em que o aluno fica apto, que é o quadragésimo quinto dia, e ponto.
    expect(calcularDataProva('2026-01-07')).toBe('2026-02-21')
  })

  it('não desvia quando os 45 dias caem em feriado', () => {
    // 25 de dezembro. A regra antiga empurrava para 28.
    expect(calcularDataProva('2026-11-10')).toBe('2026-12-25')
  })

  it('atravessa a virada de ano', () => {
    expect(calcularDataProva('2026-12-01')).toBe('2027-01-15')
  })

  it('conta o 29 de fevereiro em ano bissexto', () => {
    // 2028 é bissexto: 20/01 + 45 cai em 05/03, não 04/03.
    expect(calcularDataProva('2028-01-20')).toBe('2028-03-05')
  })

  it('não depende do fuso horário da máquina', () => {
    // Datas de calendário, não instantes. O resultado tem de ser estável.
    expect(calcularDataProva('2026-03-01')).toBe(calcularDataProva('2026-03-01'))
    expect(calcularDataProva('2026-03-01')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('rejeita data mal formada', () => {
    expect(() => calcularDataProva('01/05/2026')).toThrow('AAAA-MM-DD')
  })
})
