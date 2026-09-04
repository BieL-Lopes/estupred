import { describe, expect, it } from 'vitest'
import {
  STATUS_EM_CURSO,
  bloqueioDeProducao,
  estaEmCurso,
  situacaoDaFila,
  type MatriculaDaFila,
} from '@/lib/matricula/fila'

function m(
  id: string,
  status: MatriculaDaFila['status'],
  criadaEm: string,
): MatriculaDaFila {
  return { id, codigo: `EST-2026-${id}`, status, criadaEm }
}

describe('estaEmCurso', () => {
  it('considera em curso desde a produção do material', () => {
    expect(estaEmCurso('material_em_producao')).toBe(true)
    expect(estaEmCurso('material_a_caminho')).toBe(true)
    expect(estaEmCurso('material_entregue')).toBe(true)
    expect(estaEmCurso('prova_aplicada')).toBe(true)
    expect(estaEmCurso('aprovado')).toBe(true)
    // Reprovado ainda ocupa: o aluno vai refazer a prova do mesmo curso.
    expect(estaEmCurso('reprovado')).toBe(true)
    // Aposentado, mas significava "entregue": se sobrar linha antiga, ocupa.
    expect(estaEmCurso('material_enviado')).toBe(true)
  })

  it('não considera em curso quem ainda não recebeu material', () => {
    expect(estaEmCurso('rascunho')).toBe(false)
    expect(estaEmCurso('aguardando_pagamento')).toBe(false)
    expect(estaEmCurso('paga')).toBe(false)
  })

  it('libera a vaga só no certificado ou no cancelamento', () => {
    expect(estaEmCurso('certificado_emitido')).toBe(false)
    expect(estaEmCurso('cancelada')).toBe(false)
  })

  it('declara todos os status em curso na constante exportada', () => {
    expect([...STATUS_EM_CURSO].sort()).toEqual(
      [
        'aprovado',
        'material_a_caminho',
        'material_em_producao',
        'material_entregue',
        'material_enviado',
        'prova_aplicada',
        'reprovado',
      ].sort(),
    )
  })
})

describe('situacaoDaFila', () => {
  it('devolve vazio quando o aluno não tem matrícula nenhuma', () => {
    expect(situacaoDaFila([])).toEqual({ emCurso: null, naFila: [] })
  })

  it('não coloca ninguém em curso quando só existe matrícula paga', () => {
    const s = situacaoDaFila([m('a', 'paga', '2026-01-10')])
    expect(s.emCurso).toBeNull()
    expect(s.naFila.map((x) => x.id)).toEqual(['a'])
  })

  it('elege a que já teve material enviado, ignorando a data de compra', () => {
    // O caso real da produção: a mais antiga está em paga, mas quem está em
    // curso é a segunda, que já recebeu material.
    const s = situacaoDaFila([
      m('velha', 'paga', '2026-01-01'),
      m('ativa', 'material_em_producao', '2026-01-05'),
      m('nova', 'paga', '2026-01-09'),
    ])
    expect(s.emCurso?.id).toBe('ativa')
    expect(s.naFila.map((x) => x.id)).toEqual(['velha', 'nova'])
  })

  it('ordena a fila da mais antiga para a mais nova', () => {
    const s = situacaoDaFila([
      m('c', 'paga', '2026-03-01'),
      m('a', 'paga', '2026-01-01'),
      m('b', 'paga', '2026-02-01'),
    ])
    expect(s.naFila.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('mantém fora da fila quem ainda não pagou e quem já encerrou', () => {
    const s = situacaoDaFila([
      m('rascunho', 'rascunho', '2026-01-01'),
      m('aguardando', 'aguardando_pagamento', '2026-01-02'),
      m('encerrada', 'certificado_emitido', '2026-01-03'),
      m('cancelada', 'cancelada', '2026-01-04'),
      m('paga', 'paga', '2026-01-05'),
    ])
    expect(s.emCurso).toBeNull()
    expect(s.naFila.map((x) => x.id)).toEqual(['paga'])
  })

  it('desempata pela mais antiga quando duas estão em curso', () => {
    // Dado legado: não deveria acontecer depois do trigger, mas a função
    // precisa ser determinística se acontecer.
    const s = situacaoDaFila([
      m('nova', 'aprovado', '2026-02-01'),
      m('velha', 'material_a_caminho', '2026-01-01'),
    ])
    expect(s.emCurso?.id).toBe('velha')
  })
})

describe('bloqueioDeProducao', () => {
  it('não bloqueia quando nenhuma outra está em curso', () => {
    const lista = [m('alvo', 'paga', '2026-01-02'), m('outra', 'paga', '2026-01-01')]
    expect(bloqueioDeProducao('alvo', lista)).toBeNull()
  })

  it('bloqueia apontando qual matrícula está segurando', () => {
    const lista = [
      m('alvo', 'paga', '2026-01-02'),
      m('ativa', 'material_em_producao', '2026-01-01'),
    ]
    expect(bloqueioDeProducao('alvo', lista)?.id).toBe('ativa')
  })

  it('não considera a própria matrícula um bloqueio', () => {
    const lista = [m('alvo', 'material_em_producao', '2026-01-02')]
    expect(bloqueioDeProducao('alvo', lista)).toBeNull()
  })
})
