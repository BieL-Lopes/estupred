'use server'

import { calcularTotal } from '@/lib/dominio/precos'
import {
  EsquemaInterno,
  EsquemaResponsavel,
  EsquemaUnidade,
  type DadosResponsavel,
  type RascunhoMatricula,
} from '@/lib/dominio/esquemas'
import { obterCurso } from '@/lib/catalogo'
import { obterFrete } from '@/lib/frete'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type ResultadoMatricula =
  | { ok: true; codigo: string; matriculaId: string }
  | { ok: false; erro: string }

export async function criarMatricula(entrada: {
  cursoSlug: string
  rascunho: RascunhoMatricula
  responsavel: DadosResponsavel
}): Promise<ResultadoMatricula> {
  const unidade = EsquemaUnidade.safeParse(entrada.rascunho.unidade)
  const interno = EsquemaInterno.safeParse(entrada.rascunho.interno)
  const responsavel = EsquemaResponsavel.safeParse(entrada.responsavel)

  if (!unidade.success) return { ok: false, erro: unidade.error.issues[0]!.message }
  if (!interno.success) return { ok: false, erro: interno.error.issues[0]!.message }
  if (!responsavel.success) {
    return { ok: false, erro: responsavel.error.issues[0]!.message }
  }

  const { curso, indisponivel } = await obterCurso(entrada.cursoSlug)
  if (indisponivel) {
    return {
      ok: false,
      erro: 'Não foi possível carregar o curso agora. Tente novamente em instantes.',
    }
  }
  if (!curso) return { ok: false, erro: 'Curso não encontrado' }

  if (curso.ufs.length > 0 && !curso.ufs.includes(unidade.data.uf)) {
    return {
      ok: false,
      erro: `Este curso não está disponível em ${unidade.data.uf}`,
    }
  }

  let frete: { valorCentavos: number; prazoDias: number }
  try {
    frete = await obterFrete(unidade.data.uf)
  } catch {
    return {
      ok: false,
      erro: `Frete ainda não configurado para ${unidade.data.uf}. Fale com o suporte.`,
    }
  }

  const servidor = criarClienteAdmin()

  // profiles.cpf é único: se o responsável já tem conta (segunda matrícula,
  // outro curso ou outro interno), reaproveita — criar de novo violaria a
  // constraint. O acesso continua sendo só por CPF (lib/auth-cpf.ts).
  const { data: existente } = await servidor
    .from('profiles')
    .select('id')
    .eq('cpf', responsavel.data.cpf)
    .eq('role', 'responsavel')
    .maybeSingle()

  let responsavelId: string

  if (existente) {
    responsavelId = existente.id
  } else {
    const { data: criado, error: erroCriacao } = await servidor.auth.admin.createUser({
      email: responsavel.data.email,
      // Senha aleatória, nunca usada: o acesso é só por CPF.
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        nome: responsavel.data.nome,
        cpf: responsavel.data.cpf,
        telefone: responsavel.data.telefone,
      },
    })

    if (erroCriacao || !criado.user) {
      if (erroCriacao?.message.toLowerCase().includes('already been registered')) {
        return { ok: false, erro: 'Este e-mail já está em uso por outra conta.' }
      }
      return { ok: false, erro: 'Não foi possível criar seu cadastro. Tente novamente.' }
    }

    responsavelId = criado.user.id
  }

  const { data: internoCriado, error: erroInterno } = await servidor
    .from('internos')
    .insert({
      nome: interno.data.nome,
      cpf: interno.data.cpf,
      rg: interno.data.rg || null,
      matricula_prisional: interno.data.matriculaPrisional,
      data_nascimento: interno.data.dataNascimento || null,
      unidade_prisional_id: unidade.data.unidadeId,
      responsavel_id: responsavelId,
      parentesco: responsavel.data.parentesco,
    })
    .select('id')
    .single()

  if (erroInterno || !internoCriado) {
    return { ok: false, erro: 'Não foi possível registrar os dados do interno.' }
  }

  // total_centavos é coluna gerada no banco; calcularTotal valida a entrada
  // e falha alto se algum valor não for centavo inteiro.
  calcularTotal(curso.precoCentavos, frete.valorCentavos)

  const { data: matricula, error: erroMatricula } = await servidor
    .from('matriculas')
    .insert({
      interno_id: internoCriado.id,
      curso_id: curso.id,
      responsavel_id: responsavelId,
      unidade_prisional_id: unidade.data.unidadeId,
      preco_centavos: curso.precoCentavos,
      frete_centavos: frete.valorCentavos,
      status: 'rascunho',
    })
    .select('id, codigo')
    .single()

  if (erroMatricula || !matricula) {
    return { ok: false, erro: 'Não foi possível criar a matrícula.' }
  }

  return { ok: true, codigo: matricula.codigo, matriculaId: matricula.id }
}
