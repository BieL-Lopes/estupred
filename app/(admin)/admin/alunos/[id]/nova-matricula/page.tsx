import { notFound } from 'next/navigation'
import { exigirEquipe } from '@/lib/auth'
import { FormularioNovaMatricula } from '@/components/admin/FormularioNovaMatricula'
import { obterAlunoAdmin } from '@/lib/admin/consultas'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Nova matrícula — Clique Estudos' }

export default async function NovaMatricula({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await exigirEquipe()
  const { id } = await params

  const aluno = await obterAlunoAdmin(id)
  if (!aluno) notFound()

  const supabase = criarClienteAdmin()
  const { data: cursos } = await supabase
    .from('cursos')
    .select('slug, titulo')
    .eq('ativo', true)
    .order('titulo')

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">
        Nova matrícula — {aluno.interno.nome}
      </h1>
      <p className="mt-2 text-sm text-texto-suave">
        Reaproveita a unidade e o responsável já cadastrados. Já nasce como
        paga.
      </p>

      <div className="mt-8">
        <FormularioNovaMatricula internoId={aluno.interno.id} cursos={cursos ?? []} />
      </div>
    </main>
  )
}
