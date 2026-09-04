import 'server-only'
import type { StatusMatricula } from '@/lib/dominio/tipos'
import { bloqueioDeProducao, type MatriculaDaFila } from '@/lib/matricula/fila'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export async function resumoDoPainel() {
  const supabase = criarClienteAdmin()

  const inicioDoMes = new Date()
  inicioDoMes.setDate(1)
  inicioDoMes.setHours(0, 0, 0, 0)

  // As três consultas não dependem uma da outra — rodar em série só somava
  // latência de rede à toa.
  const [{ data: matriculas }, { data: pagos }, { count }] = await Promise.all([
    supabase.from('matriculas').select('status'),
    supabase
      .from('pagamentos')
      .select('valor_centavos')
      .eq('status', 'pago')
      .gte('pago_em', inicioDoMes.toISOString()),
    supabase
      .from('pagamentos')
      .select('id', { count: 'exact', head: true })
      .is('matricula_id', null),
  ])

  const porStatus: Record<string, number> = {}
  for (const m of matriculas ?? []) {
    porStatus[m.status] = (porStatus[m.status] ?? 0) + 1
  }

  const receitaMesCentavos = (pagos ?? []).reduce(
    (soma, p) => soma + p.valor_centavos,
    0,
  )

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
      created_at, interno_id, autorizacao_url, data_compra, data_inicio, data_prova,
      cursos:curso_id (titulo, carga_horaria),
      internos:interno_id (nome, cpf, rg, matricula_prisional),
      unidades_prisionais:unidade_prisional_id (nome, uf, endereco, cep, responsavel_nucleo),
      profiles:responsavel_id (nome, email, telefone)
    `,
    )
    .eq('id', id)
    .maybeSingle()

  if (!data) return null

  // Nenhuma das três depende da outra — só do id, que já temos.
  const [{ data: eventos }, { data: pagamentos }, { data: irmas }] =
    await Promise.all([
      supabase
        .from('matricula_eventos')
        .select('de_status, para_status, nota, created_at')
        .eq('matricula_id', id)
        .order('created_at'),
      supabase
        .from('pagamentos')
        .select('id, gateway_ref, metodo, status, valor_centavos, pago_em')
        .eq('matricula_id', id),
      supabase
        .from('matriculas')
        .select('id, codigo, status, created_at')
        .eq('interno_id', (data as { interno_id: string }).interno_id),
    ])

  // O painel precisa saber, antes de desenhar o botão, se o envio de material
  // está travado por outro curso do mesmo aluno — botão que só falha depois
  // do clique é pior do que botão que não aparece.
  const bloqueio = bloqueioDeProducao(
    id,
    (irmas ?? []).map<MatriculaDaFila>((m) => ({
      id: m.id,
      codigo: m.codigo,
      status: m.status as StatusMatricula,
      criadaEm: m.created_at,
    })),
  )

  return {
    matricula: data,
    eventos: eventos ?? [],
    pagamentos: pagamentos ?? [],
    bloqueio,
  }
}

export type AlunoResumo = {
  id: string
  nome: string
  cpf: string
  matriculaPrisional: string
  unidade: { nome: string; uf: string; regiao: string | null } | null
  totalMatriculas: number
}

export async function listarAlunosAdmin(filtro?: {
  busca?: string
}): Promise<AlunoResumo[]> {
  const supabase = criarClienteAdmin()

  let consulta = supabase
    .from('internos')
    .select(
      `
      id, nome, cpf, matricula_prisional,
      unidades_prisionais:unidade_prisional_id (nome, uf, regiao),
      matriculas:matriculas (id)
    `,
    )
    .order('nome')

  if (filtro?.busca) {
    consulta = consulta.or(`nome.ilike.%${filtro.busca}%,cpf.eq.${filtro.busca}`)
  }

  const { data } = await consulta

  return (data ?? []).map((i) => {
    const linha = i as unknown as {
      id: string
      nome: string
      cpf: string
      matricula_prisional: string
      unidades_prisionais: { nome: string; uf: string; regiao: string | null } | null
      matriculas: { id: string }[] | null
    }
    return {
      id: linha.id,
      nome: linha.nome,
      cpf: linha.cpf,
      matriculaPrisional: linha.matricula_prisional,
      unidade: linha.unidades_prisionais,
      totalMatriculas: linha.matriculas?.length ?? 0,
    }
  })
}

export type AlunoDetalhe = {
  interno: {
    id: string
    nome: string
    cpf: string
    rg: string | null
    matricula_prisional: string
    data_nascimento: string | null
    unidade_prisional_id: string
    parentesco: string | null
    unidades_prisionais: { nome: string; uf: string; regiao: string | null } | null
    profiles: { nome: string; cpf: string; email: string; telefone: string } | null
  }
  matriculas: {
    id: string
    codigo: string
    status: string
    total_centavos: number
    created_at: string
    data_compra: string | null
    data_inicio: string | null
    data_prova: string | null
    cursos: { titulo: string } | null
  }[]
}

export async function obterAlunoAdmin(id: string): Promise<AlunoDetalhe | null> {
  const supabase = criarClienteAdmin()

  // matriculas só depende do id, não do resultado de internos — dispara as
  // duas juntas em vez de esperar uma pra começar a outra.
  const [{ data: interno }, { data: matriculas }] = await Promise.all([
    supabase
      .from('internos')
      .select(
        `
        id, nome, cpf, rg, matricula_prisional, data_nascimento, unidade_prisional_id,
        parentesco,
        unidades_prisionais:unidade_prisional_id (nome, uf, regiao),
        profiles:responsavel_id (nome, cpf, email, telefone)
      `,
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('matriculas')
      .select(
        'id, codigo, status, total_centavos, created_at, data_compra, data_inicio, data_prova, cursos:curso_id (titulo)',
      )
      .eq('interno_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!interno) return null

  return {
    interno: interno as unknown as AlunoDetalhe['interno'],
    matriculas: (matriculas ?? []) as unknown as AlunoDetalhe['matriculas'],
  }
}
