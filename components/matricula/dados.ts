'use server'

import { listarUnidadesPorUf, obterFrete } from '@/lib/frete'

export async function buscarUnidadesEFrete(uf: string) {
  const unidades = await listarUnidadesPorUf(uf)
  if (unidades.length === 0) {
    return { unidades, frete: null }
  }
  try {
    return { unidades, frete: await obterFrete(uf) }
  } catch {
    return { unidades, frete: null }
  }
}
