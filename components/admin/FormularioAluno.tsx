import { CamposDoAluno } from '@/components/admin/CamposDoAluno'
import { criarClienteAdmin } from '@/lib/supabase/admin'

type Aluno = {
  id: string
  nome: string
  cpf: string
  rg: string | null
  matricula_prisional: string
  data_nascimento: string | null
  unidade_prisional_id: string
}

export async function FormularioAluno({ aluno }: { aluno: Aluno }) {
  const supabase = criarClienteAdmin()
  const { data: unidades } = await supabase
    .from('unidades_prisionais')
    .select('id, uf, nome')
    .order('uf')
    .order('nome')

  return <CamposDoAluno aluno={aluno} unidades={unidades ?? []} />
}
