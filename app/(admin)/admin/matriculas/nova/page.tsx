import Link from 'next/link'
import { FormularioNovoAluno } from '@/components/admin/FormularioNovoAluno'
import { FormularioNovaMatricula } from '@/components/admin/FormularioNovaMatricula'
import { exigirEquipe } from '@/lib/auth'
import { formatarCpf, normalizarCpf } from '@/lib/dominio/cpf'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Matricular aluno — Clique Estudos' }

export default async function NovaMatricula({
  searchParams,
}: {
  searchParams: Promise<{ cpf?: string }>
}) {
  await exigirEquipe()
  const { cpf: cpfBruto } = await searchParams
  const cpf = cpfBruto ? normalizarCpf(cpfBruto) : ''
  const buscou = cpf.length > 0
  // Busca por 11 dígitos, não por CPF com dígito verificador correto: o banco
  // só valida o formato, então cadastro antigo com dígito errado existe e
  // precisa continuar alcançável. A validação forte fica no cadastro de aluno
  // novo (EsquemaInterno), que é onde ela impede dado ruim de entrar.
  const podeBuscar = cpf.length === 11

  const supabase = criarClienteAdmin()
  const [{ data: unidades }, { data: cursos }] = await Promise.all([
    supabase
      .from('unidades_prisionais')
      .select('id, uf, nome')
      .eq('ativa', true)
      .order('uf')
      .order('nome'),
    supabase.from('cursos').select('slug, titulo').eq('ativo', true).order('titulo'),
  ])

  const { data: aluno } =
    podeBuscar
      ? await supabase
          .from('internos')
          .select(
            'id, nome, cpf, matricula_prisional, unidade_prisional_id, parentesco, profiles:responsavel_id (nome, cpf, email, telefone)',
          )
          .eq('cpf', cpf)
          .maybeSingle()
      : { data: null }

  const campo =
    'w-full rounded-lg border border-borda bg-cartao px-3 py-2 text-sm text-texto placeholder:text-texto-fraco'

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin/matriculas" className="text-sm text-acento hover:underline">
        ← Matrículas
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-texto">Matricular aluno</h1>
      <p className="mt-2 text-sm text-texto-suave">
        Comece pelo CPF do aluno. Se ele já estiver no sistema, a matrícula é
        pendurada no cadastro que já existe — nada de aluno repetido.
      </p>

      <form className="mt-8 flex flex-wrap gap-2">
        <input
          name="cpf"
          defaultValue={cpfBruto ?? ''}
          placeholder="CPF do aluno"
          required
          className={`${campo} max-w-xs flex-1`}
        />
        <button
          type="submit"
          className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
        >
          Buscar
        </button>
      </form>

      {buscou && !podeBuscar && (
        <p role="alert" className="mt-6 text-sm text-red-400">
          Informe os 11 números do CPF.
        </p>
      )}

      {podeBuscar && aluno && (
        <section className="mt-8 space-y-6">
          <div className="rounded-cartao border border-borda bg-cartao p-6">
            <h2 className="font-semibold text-texto">Aluno encontrado</h2>
            <p className="mt-2 text-sm text-texto">
              {aluno.nome}
              <span className="text-texto-fraco">
                {' '}
                · CPF {formatarCpf(aluno.cpf)} · matrícula prisional{' '}
                {aluno.matricula_prisional}
              </span>
            </p>
            <Link
              href={`/admin/alunos/${aluno.id}`}
              className="mt-3 inline-block text-sm text-acento hover:underline"
            >
              Ver cadastro completo
            </Link>
          </div>

          <FormularioNovaMatricula
            internoId={aluno.id}
            cursos={cursos ?? []}
            unidades={unidades ?? []}
            unidadeAtualId={aluno.unidade_prisional_id}
            responsavelAtual={
              aluno.profiles
                ? {
                    ...(aluno.profiles as unknown as {
                      nome: string
                      cpf: string
                      email: string
                      telefone: string
                    }),
                    parentesco: aluno.parentesco ?? undefined,
                  }
                : undefined
            }
          />
        </section>
      )}

      {podeBuscar && !aluno && (
        <section className="mt-8">
          <p className="text-sm text-texto-suave">
            Nenhum aluno com este CPF. Preencha o cadastro abaixo — ele nasce
            junto com a matrícula, já paga.
          </p>
          <div className="mt-6">
            <FormularioNovoAluno
              unidades={unidades ?? []}
              cursos={cursos ?? []}
              cpfInicial={cpf}
            />
          </div>
        </section>
      )}
    </main>
  )
}
