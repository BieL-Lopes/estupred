import { describe, expect, it } from 'vitest'
import {
  DIAS_ATE_A_PROVA,
  calcularDataProva,
  ehDiaUtil,
  feriadosNacionais,
  proximoDiaUtil,
} from '@/lib/matricula/prazos'

describe('feriadosNacionais', () => {
  it('inclui os feriados fixos', () => {
    const f = feriadosNacionais(2026)
    for (const data of [
      '2026-01-01',
      '2026-04-21',
      '2026-05-01',
      '2026-09-07',
      '2026-10-12',
      '2026-11-02',
      '2026-11-15',
      '2026-12-25',
    ]) {
      expect(f).toContain(data)
    }
  })

  it('inclui a Consciência Negra, feriado nacional desde 2024', () => {
    expect(feriadosNacionais(2026)).toContain('2026-11-20')
  })

  it('calcula a Sexta-feira Santa, que é móvel', () => {
    // Páscoa 2026 cai em 5 de abril, então a Sexta-feira Santa é dia 3.
    expect(feriadosNacionais(2026)).toContain('2026-04-03')
    // Páscoa 2027 cai em 28 de março.
    expect(feriadosNacionais(2027)).toContain('2027-03-26')
  })
})

describe('ehDiaUtil', () => {
  it('aceita dia de semana comum', () => {
    expect(ehDiaUtil('2026-02-19')).toBe(true) // quinta
  })

  it('recusa sábado e domingo', () => {
    expect(ehDiaUtil('2026-02-21')).toBe(false) // sábado
    expect(ehDiaUtil('2026-02-22')).toBe(false) // domingo
  })

  it('recusa feriado nacional', () => {
    expect(ehDiaUtil('2026-12-25')).toBe(false)
    expect(ehDiaUtil('2026-04-03')).toBe(false) // Sexta-feira Santa
  })
})

describe('proximoDiaUtil', () => {
  it('devolve a própria data quando já é dia útil', () => {
    expect(proximoDiaUtil('2026-02-19')).toBe('2026-02-19')
  })

  it('empurra sábado para segunda', () => {
    expect(proximoDiaUtil('2026-02-21')).toBe('2026-02-23')
  })

  it('empurra feriado de sexta para segunda', () => {
    expect(proximoDiaUtil('2026-12-25')).toBe('2026-12-28')
  })

  it('atravessa a virada do ano', () => {
    // 1º de janeiro de 2027 é feriado e cai numa sexta.
    expect(proximoDiaUtil('2027-01-01')).toBe('2027-01-04')
  })
})

describe('calcularDataProva', () => {
  it('usa 45 dias, fixo para qualquer curso', () => {
    expect(DIAS_ATE_A_PROVA).toBe(45)
  })

  it('soma 45 dias quando o resultado já é dia útil', () => {
    expect(calcularDataProva('2026-01-05')).toBe('2026-02-19')
  })

  it('empurra para segunda quando os 45 dias caem no sábado', () => {
    expect(calcularDataProva('2026-01-07')).toBe('2026-02-23')
  })

  it('empurra quando os 45 dias caem no Natal', () => {
    expect(calcularDataProva('2026-11-10')).toBe('2026-12-28')
  })

  it('empurra quando os 45 dias caem na Sexta-feira Santa', () => {
    // 3 de abril é feriado, 4 e 5 são fim de semana: a prova vai para dia 6.
    expect(calcularDataProva('2026-02-17')).toBe('2026-04-06')
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
