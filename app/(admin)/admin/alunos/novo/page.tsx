import { exigirEquipe } from '@/lib/auth'
import { FormularioNovoAluno } from '@/components/admin/FormularioNovoAluno'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Novo aluno — Clique Estudos' }

export default async function NovoAluno() {
  await exigirEquipe()

  const supabase = criarClienteAdmin()
  const [{ data: unidades }, { data: cursos }] = await Promise.all([
    supabase.from('unidades_prisionais').select('id, uf, nome').eq('ativa', true).order('uf').order('nome'),
    supabase.from('cursos').select('slug, titulo').eq('ativo', true).order('titulo'),
  ])

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">Novo aluno</h1>
      <p className="mt-2 text-sm text-texto-suave">
        Matrícula cadastrada aqui já nasce como paga — preço e frete são
        calculados automaticamente pelo curso e pela unidade escolhidos.
      </p>

      <div className="mt-8">
        <FormularioNovoAluno unidades={unidades ?? []} cursos={cursos ?? []} />
      </div>
    </main>
  )
}
