import Link from 'next/link'
import { FormularioCadastroAluno } from '@/components/admin/FormularioCadastroAluno'
import { exigirEquipe } from '@/lib/auth'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Cadastrar aluno — Clique Estudos' }

export default async function CadastrarAluno() {
  await exigirEquipe()

  const supabase = criarClienteAdmin()
  const { data: unidades } = await supabase
    .from('unidades_prisionais')
    .select('id, uf, nome')
    .eq('ativa', true)
    .order('uf')
    .order('nome')

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin/alunos" className="text-sm text-acento hover:underline">
        ← Alunos
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-texto">Cadastrar aluno</h1>
      <p className="mt-2 text-sm text-texto-suave">
        Só alimenta o cadastro de alunos — nenhuma matrícula é criada aqui. Para
        vincular um curso, use{' '}
        <Link href="/admin/matriculas/nova" className="text-acento hover:underline">
          Matricular aluno
        </Link>
        .
      </p>

      <div className="mt-8">
        <FormularioCadastroAluno unidades={unidades ?? []} />
      </div>
    </main>
  )
}
