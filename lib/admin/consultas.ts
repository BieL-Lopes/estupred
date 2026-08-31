import 'server-only'
import type { StatusMatricula } from '@/lib/dominio/tipos'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export async function resumoDoPainel() {
  const supabase = criarClienteAdmin()

  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('status')

  const inicioDoMes = new Date()
  inicioDoMes.setDate(1)
  inicioDoMes.setHours(0, 0, 0, 0)

  const porStatus: Record<string, number> = {}
  for (const m of matriculas ?? []) {
    porStatus[m.status] = (porStatus[m.status] ?? 0) + 1
  }

  const { data: pagos } = await supabase
    .from('pagamentos')
    .select('valor_centavos')
    .eq('status', 'pago')
    .gte('pago_em', inicioDoMes.toISOString())

  const receitaMesCentavos = (pagos ?? []).reduce(
    (soma, p) => soma + p.valor_centavos,
    0,
  )

  const { count } = await supabase
    .from('pagamentos')
    .select('id', { count: 'exact', head: true })
    .is('matricula_id', null)

  return { porStatus, receitaMesCentavos, pagamentosOrfaos: count ?? 0 }
}

export async function listarMatriculasAdmin(filtro?: { status?: string }) {
  const supabase = criarClienteAdmin()

  let consulta = supabase
    .from('matriculas')
    .select(
      `
      id, codigo, status, total_centavos, created_at,
      cursos:curso_id (titulo),
      internos:interno_id (nome),
      unidades_prisionais:unidade_prisional_id (nome, uf)
    `,
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (filtro?.status) {
    consulta = consulta.eq('status', filtro.status as StatusMatricula)
  }

  const { data } = await consulta
  return data ?? []
}

export async function obterMatriculaAdmin(id: string) {
  const supabase = criarClienteAdmin()

  const { data } = await supabase
    .from('matriculas')
    .select(
      `
      id, codigo, status, preco_centavos, frete_centavos, total_centavos,
      created_at, autorizacao_url, data_compra, data_inicio, data_prova,
      cursos:curso_id (titulo, carga_horaria),
      internos:interno_id (nome, cpf, rg, matricula_prisional),
      unidades_prisionais:unidade_prisional_id (nome, uf, endereco, cep, responsavel_nucleo),
      profiles:responsavel_id (nome, email, telefone)
    `,
    )
    .eq('id', id)
    .maybeSingle()

  if (!data) return null

  const { data: eventos } = await supabase
    .from('matricula_eventos')
    .select('de_status, para_status, nota, created_at')
    .eq('matricula_id', id)
    .order('created_at')

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('id, gateway_ref, metodo, status, valor_centavos, pago_em')
    .eq('matricula_id', id)

  return { matricula: data, eventos: eventos ?? [], pagamentos: pagamentos ?? [] }
}
