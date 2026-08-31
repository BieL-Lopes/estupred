import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { avancarStatus } from '@/lib/matricula/avancar'

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function matriculaNoStatus(
  status: Database['public']['Enums']['status_matricula'],
) {
  const { data: base } = await admin
    .from('matriculas')
    .select('interno_id, curso_id, responsavel_id, unidade_prisional_id')
    .limit(1)
    .single()

  const { data } = await admin
    .from('matriculas')
    .insert({ ...base!, preco_centavos: 18500, frete_centavos: 0, status })
    .select()
    .single()

  return data!
}

describe('avanço manual de status pelo admin', () => {
  it('é seguro contra corrida: o segundo avanço concorrente não duplica evento', async () => {
    const m = await matriculaNoStatus('paga')
    await Promise.allSettled([
      avancarStatus({ matriculaId: m.id, para: 'material_enviado' }),
      avancarStatus({ matriculaId: m.id, para: 'material_enviado' }),
    ])

    const { data } = await admin
      .from('matricula_eventos')
      .select('id')
      .eq('matricula_id', m.id)
      .eq('para_status', 'material_enviado')
    expect(data!.length).toBe(1)
  })
})
