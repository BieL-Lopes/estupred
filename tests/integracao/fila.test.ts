import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { AlunoOcupadoError, avancarStatus } from '@/lib/matricula/avancar'

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

/**
 * Cursos fixados pelo slug, vindos da migração do catálogo. Pegar "os N
 * primeiros ativos" pescaria cursos que outros arquivos de teste criam e
 * apagam em paralelo.
 */
const SLUGS = [
  'agente-de-portaria',
  'assistente-contabil',
  'atendente-de-farmacia',
]

function novoCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  function dv(digs: number[], pesoInicial: number) {
    let soma = 0
    digs.forEach((d, i) => {
      soma += d * (pesoInicial - i)
    })
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  const d1 = dv(base, 10)
  const d2 = dv([...base, d1], 11)
  return [...base, d1, d2].join('')
}

/** Cria um aluno com N matrículas em `paga`, e devolve os ids. */
async function alunoComMatriculasPagas(quantas: number): Promise<string[]> {
  const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  // Unidade própria: outro arquivo de teste apaga as que cria, e o vitest
  // roda os arquivos em paralelo.
  const { data: unidade } = await admin
    .from('unidades_prisionais')
    .insert({
      uf: 'DF',
      nome: `Unidade Teste Fila ${marca}`,
      endereco: 'Rua da Fila, 1',
      cep: '70000000',
    })
    .select('id')
    .single()

  const { data: cursos } = await admin
    .from('cursos')
    .select('id, preco_centavos')
    .in('slug', SLUGS.slice(0, quantas))

  const { data: interno } = await admin
    .from('internos')
    .insert({
      nome: 'Aluno Da Fila',
      cpf: novoCpf(),
      matricula_prisional: `MP-FILA-${marca}`,
      unidade_prisional_id: unidade!.id,
    })
    .select('id')
    .single()

  const ids: string[] = []
  for (let i = 0; i < quantas; i++) {
    const { data } = await admin
      .from('matriculas')
      .insert({
        interno_id: interno!.id,
        curso_id: cursos![i]!.id,
        unidade_prisional_id: unidade!.id,
        preco_centavos: cursos![i]!.preco_centavos,
        frete_centavos: 0,
        status: 'paga',
      })
      .select('id')
      .single()
    ids.push(data!.id)
  }
  return ids
}

describe('um curso por vez', () => {
  it('deixa a primeira matrícula receber material', async () => {
    const [primeira] = await alunoComMatriculasPagas(1)
    await avancarStatus({ matriculaId: primeira!, para: 'material_em_producao' })

    const { data } = await admin
      .from('matriculas')
      .select('status')
      .eq('id', primeira!)
      .single()
    expect(data!.status).toBe('material_em_producao')
  })

  it('recusa a segunda com erro que aponta quem está segurando', async () => {
    const [primeira, segunda] = await alunoComMatriculasPagas(2)
    await avancarStatus({ matriculaId: primeira!, para: 'material_em_producao' })

    await expect(
      avancarStatus({ matriculaId: segunda!, para: 'material_em_producao' }),
    ).rejects.toBeInstanceOf(AlunoOcupadoError)

    const { data } = await admin
      .from('matriculas')
      .select('status')
      .eq('id', segunda!)
      .single()
    expect(data!.status).toBe('paga')
  })

  it('libera a fila quando a primeira chega ao certificado', async () => {
    const [primeira, segunda] = await alunoComMatriculasPagas(2)

    for (const para of [
      'material_em_producao',
      'material_a_caminho',
      'material_entregue',
      'prova_aplicada',
      'aprovado',
      'certificado_emitido',
    ] as const) {
      await avancarStatus({ matriculaId: primeira!, para })
    }

    await avancarStatus({ matriculaId: segunda!, para: 'material_em_producao' })

    const { data } = await admin
      .from('matriculas')
      .select('status')
      .eq('id', segunda!)
      .single()
    expect(data!.status).toBe('material_em_producao')
  })

  it('continua segurando enquanto a primeira está só aprovada', async () => {
    const [primeira, segunda] = await alunoComMatriculasPagas(2)

    for (const para of [
      'material_em_producao',
      'material_a_caminho',
      'material_entregue',
      'prova_aplicada',
      'aprovado',
    ] as const) {
      await avancarStatus({ matriculaId: primeira!, para })
    }

    await expect(
      avancarStatus({ matriculaId: segunda!, para: 'material_em_producao' }),
    ).rejects.toBeInstanceOf(AlunoOcupadoError)
  })

  it('o trigger recusa mesmo quando a escrita não passa pelo app', async () => {
    const [primeira, segunda] = await alunoComMatriculasPagas(2)
    await avancarStatus({ matriculaId: primeira!, para: 'material_em_producao' })

    const { error } = await admin
      .from('matriculas')
      .update({ status: 'material_em_producao' })
      .eq('id', segunda!)

    expect(error).not.toBeNull()
    expect(error!.message).toContain('curso em andamento')
  })

  it('o trigger recusa também o salto direto para entregue', async () => {
    const [primeira, segunda] = await alunoComMatriculasPagas(2)
    await avancarStatus({ matriculaId: primeira!, para: 'material_em_producao' })

    // Pular etapas por SQL na mão é justamente o que o app não consegue
    // barrar sozinho — por isso o trigger vigia a entrada em qualquer etapa
    // que ocupe o aluno, não só a primeira.
    const { error } = await admin
      .from('matriculas')
      .update({ status: 'material_entregue' })
      .eq('id', segunda!)

    expect(error).not.toBeNull()
    expect(error!.message).toContain('curso em andamento')
  })

  it('deixa a matrícula andar entre etapas do próprio material', async () => {
    const [unica] = await alunoComMatriculasPagas(1)

    for (const para of [
      'material_em_producao',
      'material_a_caminho',
      'material_entregue',
    ] as const) {
      await avancarStatus({ matriculaId: unica!, para })
    }

    const { data } = await admin
      .from('matriculas')
      .select('status')
      .eq('id', unica!)
      .single()
    expect(data!.status).toBe('material_entregue')
  })
})
