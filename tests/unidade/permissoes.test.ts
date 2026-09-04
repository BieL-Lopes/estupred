import { describe, expect, it } from 'vitest'
import { STATUS_MATRICULA } from '@/lib/dominio/tipos'
import { checagemParaTransicao } from '@/lib/matricula/permissoes'

describe('checagemParaTransicao', () => {
  it('exige admin para liberar a produção do material', () => {
    // É o passo que compromete dinheiro: quem autoriza o gasto é quem libera.
    expect(checagemParaTransicao('material_em_producao')).toBe('admin')
  })

  it('deixa o colaborador registrar envio e entrega', () => {
    expect(checagemParaTransicao('material_a_caminho')).toBe('equipe')
    expect(checagemParaTransicao('material_entregue')).toBe('equipe')
  })

  it('deixa o colaborador tocar o resto do fluxo', () => {
    expect(checagemParaTransicao('paga')).toBe('equipe')
    expect(checagemParaTransicao('prova_aplicada')).toBe('equipe')
    expect(checagemParaTransicao('aprovado')).toBe('equipe')
    expect(checagemParaTransicao('reprovado')).toBe('equipe')
    expect(checagemParaTransicao('certificado_emitido')).toBe('equipe')
  })

  it('responde para todo status declarado', () => {
    for (const status of STATUS_MATRICULA) {
      expect(['admin', 'equipe']).toContain(checagemParaTransicao(status))
    }
  })
})
