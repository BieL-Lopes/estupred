import type { StatusMatricula } from '@/lib/dominio/tipos'

export type ChecagemDeTransicao = 'admin' | 'equipe'

/**
 * Qual checagem de papel cada transição exige.
 *
 * Função pura de propósito: `exigirAdmin` e `exigirEquipe` dependem de
 * `cookies()` e não podem ser chamadas de teste. Aqui fica a decisão, que é
 * a parte com regra; o wrapper em lib/admin/acoes.ts só aplica.
 *
 * Liberar a produção é exclusivo do admin porque é o passo que compromete
 * dinheiro — papel, impressão, apostila. Decisão marcada como "por enquanto"
 * na spec de 05/09: soltar para o colaborador é trocar esta linha.
 */
export function checagemParaTransicao(
  para: StatusMatricula,
): ChecagemDeTransicao {
  return para === 'material_em_producao' ? 'admin' : 'equipe'
}
