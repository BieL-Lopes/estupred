import { z } from 'zod'
import { cpfValido, normalizarCpf } from './cpf'
import { UFS } from './tipos'

const cpf = z
  .string()
  .transform(normalizarCpf)
  .refine(cpfValido, { message: 'CPF inválido' })

const nomeCompleto = z
  .string()
  .trim()
  .min(3, 'Informe o nome completo')
  .refine((v) => v.split(/\s+/).length >= 2, 'Informe o nome e o sobrenome')

const telefone = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length >= 10 && v.length <= 11, 'Telefone inválido')

export const EsquemaUnidade = z.object({
  uf: z.enum(UFS),
  unidadeId: z.string().uuid('Selecione a unidade prisional'),
})

export const EsquemaInterno = z.object({
  nome: nomeCompleto,
  cpf,
  matriculaPrisional: z.string().trim().min(1, 'Informe a matrícula prisional'),
  // Opcional: nem toda família tem o RG do interno em mãos na hora da
  // matrícula. O documento do cliente pede o campo, mas travar o checkout
  // por isso reduziria a conversão sem necessidade.
  rg: z.string().trim().min(1).optional(),
  dataNascimento: z.string().date().optional().or(z.literal('')),
})

export const EsquemaResponsavel = z.object({
  nome: nomeCompleto,
  cpf,
  email: z.string().email('E-mail inválido'),
  telefone,
  parentesco: z.string().trim().min(1, 'Informe o parentesco'),
})

export type DadosUnidade = z.infer<typeof EsquemaUnidade>
export type DadosInterno = z.infer<typeof EsquemaInterno>
export type DadosResponsavel = z.infer<typeof EsquemaResponsavel>

export type RascunhoMatricula = {
  unidade: DadosUnidade
  interno: DadosInterno
}
