'use server'

import { headers } from 'next/headers'
import { cpfValido, normalizarCpf } from '@/lib/dominio/cpf'
import { ROTULO_STATUS, type StatusMatricula } from '@/lib/dominio/tipos'
import { criarClienteAdmin } from '@/lib/supabase/admin'

/** Tentativas permitidas por origem numa janela de uma hora. */
const LIMITE_POR_HORA = 12

export type ItemConsulta = {
  codigo: string
  curso: string
  cargaHoraria: number
  status: StatusMatricula
  rotuloStatus: string
  dataInicio: string | null
  dataProva: string | null
}

export type ResultadoConsulta =
  | { ok: true; primeiroNome: string; matriculas: ItemConsulta[] }
  | { ok: false; erro: string }

async function origemDaRequisicao(): Promise<string> {
  const h = await headers()
  const encaminhado = h.get('x-forwarded-for')
  return (encaminhado?.split(',')[0] ?? h.get('x-real-ip') ?? 'desconhecida').trim()
}

/**
 * Consulta pública de andamento por CPF, conforme o documento do cliente.
 *
 * Devolve o mínimo necessário para a família saber em que pé está o curso:
 * curso, status e datas. Não devolve unidade prisional, endereço, matrícula
 * prisional nem dados do responsável — quem precisa disso entra na conta.
 */
export async function consultarPorCpf(
  cpfBruto: string,
): Promise<ResultadoConsulta> {
  const cpf = normalizarCpf(cpfBruto)

  if (!cpfValido(cpf)) {
    return { ok: false, erro: 'CPF inválido. Confira os números digitados.' }
  }

  try {
    return await consultar(cpf)
  } catch (erro) {
    console.error('[consulta] falha ao consultar por CPF:', erro)
    return {
      ok: false,
      erro: 'Não foi possível consultar agora. Tente novamente em instantes.',
    }
  }
}

async function consultar(cpf: string): Promise<ResultadoConsulta> {
  const supabase = criarClienteAdmin()
  const origem = await origemDaRequisicao()
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('consultas_publicas')
    .select('id', { count: 'exact', head: true })
    .eq('origem', origem)
    .gte('created_at', umaHoraAtras)

  if ((count ?? 0) >= LIMITE_POR_HORA) {
    return {
      ok: false,
      erro: 'Muitas consultas seguidas. Tente novamente daqui a pouco.',
    }
  }

  const { data: interno } = await supabase
    .from('internos')
    .select('id, nome')
    .eq('cpf', cpf)
    .maybeSingle()

  await supabase.from('consultas_publicas').insert({
    cpf_consultado: cpf,
    origem,
    encontrou: Boolean(interno),
  })

  if (!interno) {
    return {
      ok: false,
      erro: 'Nenhuma matrícula encontrada para este CPF.',
    }
  }

  const { data: matriculas } = await supabase
    .from('matriculas')
    .select(
      'codigo, status, data_inicio, data_prova, cursos:curso_id (titulo, carga_horaria)',
    )
    .eq('interno_id', interno.id)
    .neq('status', 'rascunho')
    .order('created_at', { ascending: false })

  const linhas = (matriculas ?? []) as unknown as {
    codigo: string
    status: StatusMatricula
    data_inicio: string | null
    data_prova: string | null
    cursos: { titulo: string; carga_horaria: number } | null
  }[]

  if (linhas.length === 0) {
    return { ok: false, erro: 'Nenhuma matrícula encontrada para este CPF.' }
  }

  return {
    ok: true,
    // Só o primeiro nome: confirma para a família que é a pessoa certa sem
    // devolver o nome completo a quem apenas digitou um CPF.
    primeiroNome: interno.nome.split(/\s+/)[0] ?? '',
    matriculas: linhas.map((m) => ({
      codigo: m.codigo,
      curso: m.cursos?.titulo ?? 'Curso',
      cargaHoraria: m.cursos?.carga_horaria ?? 0,
      status: m.status,
      rotuloStatus: ROTULO_STATUS[m.status],
      dataInicio: m.data_inicio,
      dataProva: m.data_prova,
    })),
  }
}
