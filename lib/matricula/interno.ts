import 'server-only'
import type { DadosInterno } from '@/lib/dominio/esquemas'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type ResultadoInterno = { id: string; criado: boolean }

/**
 * Porta única de escrita de `internos`. Antes disso o checkout público fazia
 * insert direto e criava um aluno novo a cada compra.
 *
 * `responsavel_id` e `parentesco` só são gravados na criação: quem comprou o
 * segundo curso pode ser outra parente, e sobrescrever tiraria o cadastro de
 * quem comprou primeiro. Cada matrícula guarda o próprio comprador, e é por
 * ele que a RLS filtra o Portal do Aluno.
 */
export async function garantirInterno(entrada: {
  interno: DadosInterno
  unidadeId: string
  responsavelId: string
  parentesco?: string
}): Promise<ResultadoInterno> {
  const supabase = criarClienteAdmin()
  const cpf = entrada.interno.cpf.replace(/\D/g, '')

  const cadastrais = {
    nome: entrada.interno.nome,
    rg: entrada.interno.rg || null,
    matricula_prisional: entrada.interno.matriculaPrisional,
    data_nascimento: entrada.interno.dataNascimento || null,
    unidade_prisional_id: entrada.unidadeId,
  }

  const { data: existente } = await supabase
    .from('internos')
    .select('id')
    .eq('cpf', cpf)
    .maybeSingle()

  if (existente) {
    const { error } = await supabase
      .from('internos')
      .update(cadastrais)
      .eq('id', existente.id)

    if (error) throw error
    return { id: existente.id, criado: false }
  }

  const { data: criado, error } = await supabase
    .from('internos')
    .insert({
      ...cadastrais,
      cpf,
      responsavel_id: entrada.responsavelId,
      parentesco: entrada.parentesco ?? null,
    })
    .select('id')
    .single()

  if (error || !criado) throw error ?? new Error('Falha ao criar o interno')
  return { id: criado.id, criado: true }
}
