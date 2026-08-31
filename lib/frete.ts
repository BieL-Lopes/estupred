import { criarClientePublico } from '@/lib/supabase/publico'

export async function listarUnidadesPorUf(uf: string) {
  const supabase = criarClientePublico()
  const { data } = await supabase
    .from('unidades_prisionais')
    .select('id, nome')
    .eq('uf', uf)
    .eq('ativa', true)
    .order('nome')
  return data ?? []
}

export async function obterFrete(uf: string) {
  const supabase = criarClientePublico()
  const { data } = await supabase
    .from('fretes')
    .select('valor_centavos, prazo_dias')
    .eq('uf', uf)
    .maybeSingle()

  // Falhar alto é proposital: é melhor a matrícula parar com erro visível
  // do que cobrar frete zero por engano.
  if (!data) throw new Error(`Frete não configurado para a UF ${uf}`)
  return { valorCentavos: data.valor_centavos, prazoDias: data.prazo_dias }
}
