'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { atualizarAluno, type ResultadoSalvarAluno } from '@/lib/admin/alunos'
import { exigirAdmin, exigirEquipe } from '@/lib/auth'
import { STATUS_MATRICULA, UFS } from '@/lib/dominio/tipos'
import { avancarStatus } from '@/lib/matricula/avancar'
import { obterGateway } from '@/lib/pagamento'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export async function mudarStatus(formData: FormData) {
  const perfil = await exigirEquipe()

  const entrada = z
    .object({
      matriculaId: z.string().uuid(),
      para: z.enum(STATUS_MATRICULA),
      nota: z.string().trim().max(500).optional(),
    })
    .parse({
      matriculaId: formData.get('matriculaId'),
      para: formData.get('para'),
      nota: formData.get('nota') || undefined,
    })

  await avancarStatus({ ...entrada, autorId: perfil.id })
  revalidatePath(`/admin/matriculas/${entrada.matriculaId}`)
  revalidatePath('/admin/matriculas')
}

const EsquemaCurso = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  titulo: z.string().trim().min(3),
  descricao: z.string().trim().min(10),
  ementa: z.string().trim().min(10),
  categoria: z.string().trim().min(2),
  cargaHoraria: z.coerce.number().int().positive(),
  precoReais: z.coerce.number().nonnegative(),
  ativo: z.coerce.boolean(),
  destaque: z.coerce.boolean(),
})

export async function salvarCurso(formData: FormData) {
  await exigirAdmin()

  const d = EsquemaCurso.parse({
    id: formData.get('id') || undefined,
    slug: formData.get('slug'),
    titulo: formData.get('titulo'),
    descricao: formData.get('descricao'),
    ementa: formData.get('ementa'),
    categoria: formData.get('categoria'),
    cargaHoraria: formData.get('cargaHoraria'),
    precoReais: formData.get('precoReais'),
    ativo: formData.get('ativo') === 'on',
    destaque: formData.get('destaque') === 'on',
  })

  // O admin digita reais; o banco guarda centavos. Math.round evita o
  // clássico 18499 vindo de 184.99 * 100.
  const linha = {
    slug: d.slug,
    titulo: d.titulo,
    descricao: d.descricao,
    ementa: d.ementa,
    categoria: d.categoria,
    carga_horaria: d.cargaHoraria,
    preco_centavos: Math.round(d.precoReais * 100),
    ativo: d.ativo,
    destaque: d.destaque,
  }

  const supabase = criarClienteAdmin()
  if (d.id) await supabase.from('cursos').update(linha).eq('id', d.id)
  else await supabase.from('cursos').insert(linha)

  revalidatePath('/admin/cursos')
  revalidatePath('/cursos')
  // A home é estática e mostra os cursos em destaque — sem isto, a edição
  // só apareceria lá quando o cache expirasse.
  revalidatePath('/')
}

const EsquemaUnidadeAdmin = z.object({
  id: z.string().uuid().optional(),
  uf: z.enum(UFS),
  nome: z.string().trim().min(3),
  regiao: z.string().trim().optional(),
  endereco: z.string().trim().min(5),
  cep: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 8, 'CEP inválido'),
  responsavelNucleo: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
  ativa: z.coerce.boolean(),
})

export async function salvarUnidade(formData: FormData) {
  await exigirAdmin()

  const d = EsquemaUnidadeAdmin.parse({
    id: formData.get('id') || undefined,
    uf: formData.get('uf'),
    nome: formData.get('nome'),
    regiao: formData.get('regiao') || undefined,
    endereco: formData.get('endereco'),
    cep: formData.get('cep'),
    responsavelNucleo: formData.get('responsavelNucleo') || undefined,
    telefone: formData.get('telefone') || undefined,
    ativa: formData.get('ativa') === 'on',
  })

  const linha = {
    uf: d.uf,
    nome: d.nome,
    regiao: d.regiao ?? null,
    endereco: d.endereco,
    cep: d.cep,
    responsavel_nucleo: d.responsavelNucleo ?? null,
    telefone: d.telefone ?? null,
    ativa: d.ativa,
  }

  const supabase = criarClienteAdmin()
  if (d.id) await supabase.from('unidades_prisionais').update(linha).eq('id', d.id)
  else await supabase.from('unidades_prisionais').insert(linha)

  revalidatePath('/admin/unidades')
}

export async function salvarFrete(formData: FormData) {
  await exigirAdmin()

  const d = z
    .object({
      uf: z.enum(UFS),
      valorReais: z.coerce.number().nonnegative(),
      prazoDias: z.coerce.number().int().positive(),
    })
    .parse({
      uf: formData.get('uf'),
      valorReais: formData.get('valorReais'),
      prazoDias: formData.get('prazoDias'),
    })

  const supabase = criarClienteAdmin()
  await supabase.from('fretes').upsert(
    {
      uf: d.uf,
      valor_centavos: Math.round(d.valorReais * 100),
      prazo_dias: d.prazoDias,
    },
    { onConflict: 'uf' },
  )

  revalidatePath('/admin/fretes')
}

export async function reconciliarPagamento(formData: FormData) {
  await exigirEquipe()

  const ref = z.string().min(1).parse(formData.get('gatewayRef'))
  const gateway = obterGateway()
  const status = await gateway.consultarStatus(ref)

  const supabase = criarClienteAdmin()
  const { data: pagamento } = await supabase
    .from('pagamentos')
    .select('id, matricula_id, status')
    .eq('gateway', gateway.nome)
    .eq('gateway_ref', ref)
    .maybeSingle()

  if (!pagamento) return

  await supabase
    .from('pagamentos')
    .update({ status, pago_em: status === 'pago' ? new Date().toISOString() : null })
    .eq('id', pagamento.id)

  if (status === 'pago' && pagamento.matricula_id) {
    try {
      await avancarStatus({
        matriculaId: pagamento.matricula_id,
        para: 'paga',
        nota: 'Reconciliação manual pelo admin',
      })
    } catch {
      // Já avançada. Nada a fazer.
    }
  }

  revalidatePath('/admin')
}

const EsquemaAlunoAdmin = z.object({
  id: z.string().uuid(),
  nome: z.string().trim().min(3),
  cpf: z.string().trim().min(11),
  rg: z.string().trim().optional(),
  matriculaPrisional: z.string().trim().min(1),
  dataNascimento: z.string().trim().optional(),
  unidadeId: z.string().uuid(),
})

export async function salvarAluno(
  _anterior: ResultadoSalvarAluno | null,
  formData: FormData,
): Promise<ResultadoSalvarAluno> {
  await exigirEquipe()

  const d = EsquemaAlunoAdmin.parse({
    id: formData.get('id'),
    nome: formData.get('nome'),
    cpf: formData.get('cpf'),
    rg: formData.get('rg') || undefined,
    matriculaPrisional: formData.get('matriculaPrisional'),
    dataNascimento: formData.get('dataNascimento') || undefined,
    unidadeId: formData.get('unidadeId'),
  })

  const resultado = await atualizarAluno(d)
  if (!resultado.ok) return resultado

  revalidatePath(`/admin/alunos/${d.id}`)
  revalidatePath('/admin/alunos')
  return resultado
}
