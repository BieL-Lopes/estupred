import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AcoesDeStatus } from '@/components/admin/AcoesDeStatus'
import { Selo } from '@/components/ui/Selo'
import { obterMatriculaAdmin } from '@/lib/admin/consultas'
import { reconciliarPagamento } from '@/lib/admin/acoes'
import { formatarCpf } from '@/lib/dominio/cpf'
import { formatarBRL } from '@/lib/dominio/precos'
import { ROTULO_STATUS, type StatusMatricula } from '@/lib/dominio/tipos'

export const metadata = { title: 'Matrícula — Clique Estudos' }

function formatarData(data: string | null): string {
  if (!data) return '—'
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR')
}

export default async function DetalheAdmin({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const resultado = await obterMatriculaAdmin(id)
  if (!resultado) notFound()

  const m = resultado.matricula as unknown as {
    id: string
    codigo: string
    status: StatusMatricula
    preco_centavos: number
    frete_centavos: number
    total_centavos: number
    autorizacao_url: string | null
    data_compra: string | null
    data_inicio: string | null
    data_prova: string | null
    cursos: { titulo: string; carga_horaria: number } | null
    internos: {
      nome: string
      cpf: string
      rg: string | null
      matricula_prisional: string
    } | null
    unidades_prisionais: {
      nome: string
      uf: string
      endereco: string
      cep: string
      responsavel_nucleo: string | null
    } | null
    profiles: { nome: string; email: string; telefone: string } | null
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/admin/matriculas" className="text-sm text-acento hover:underline">
        ← Matrículas
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-texto-fraco">{m.codigo}</p>
          <h1 className="mt-1 text-2xl font-bold text-texto">{m.cursos?.titulo}</h1>
        </div>
        <Selo status={m.status} />
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-cartao border border-borda bg-cartao p-6">
          <h2 className="font-semibold text-texto">Interno</h2>
          <dl className="mt-3 space-y-1 text-sm text-texto-suave">
            <div>
              <dt className="inline text-texto-fraco">Nome: </dt>
              <dd className="inline">{m.internos?.nome}</dd>
            </div>
            <div>
              <dt className="inline text-texto-fraco">CPF: </dt>
              <dd className="inline">{formatarCpf(m.internos?.cpf ?? '')}</dd>
            </div>
            {m.internos?.rg && (
              <div>
                <dt className="inline text-texto-fraco">RG: </dt>
                <dd className="inline">{m.internos.rg}</dd>
              </div>
            )}
            <div>
              <dt className="inline text-texto-fraco">Matrícula prisional: </dt>
              <dd className="inline">{m.internos?.matricula_prisional}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-cartao border border-borda bg-cartao p-6">
          <h2 className="font-semibold text-texto">Responsável</h2>
          <dl className="mt-3 space-y-1 text-sm text-texto-suave">
            <div>
              <dt className="inline text-texto-fraco">Nome: </dt>
              <dd className="inline">{m.profiles?.nome}</dd>
            </div>
            <div>
              <dt className="inline text-texto-fraco">E-mail: </dt>
              <dd className="inline">{m.profiles?.email}</dd>
            </div>
            <div>
              <dt className="inline text-texto-fraco">WhatsApp: </dt>
              <dd className="inline">{m.profiles?.telefone}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-cartao border border-borda bg-cartao p-6 md:col-span-2">
          <h2 className="font-semibold text-texto">Envio do material</h2>
          <p className="mt-3 text-sm text-texto-suave">
            {m.unidades_prisionais?.nome} ({m.unidades_prisionais?.uf})
            <br />
            {m.unidades_prisionais?.endereco} — CEP {m.unidades_prisionais?.cep}
            <br />
            Aos cuidados de: {m.unidades_prisionais?.responsavel_nucleo ?? 'Chefe do Núcleo de Ensino'}
          </p>
          <p className="mt-3 text-sm">
            Autorização de estudo:{' '}
            {m.autorizacao_url ? (
              <span className="font-medium text-ok">recebida</span>
            ) : (
              <span className="font-medium text-aviso">pendente</span>
            )}
          </p>
        </div>

        <div className="rounded-cartao border border-borda bg-cartao p-6 md:col-span-2">
          <h2 className="font-semibold text-texto">Datas do curso</h2>
          <dl className="mt-3 grid gap-1 text-sm text-texto-suave sm:grid-cols-3">
            <div>
              <dt className="text-texto-fraco">Compra</dt>
              <dd>{formatarData(m.data_compra)}</dd>
            </div>
            <div>
              <dt className="text-texto-fraco">Início (entrega do material)</dt>
              <dd>{formatarData(m.data_inicio)}</dd>
            </div>
            <div>
              <dt className="text-texto-fraco">Prova (regra 45+)</dt>
              <dd>{formatarData(m.data_prova)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <h2 className="font-semibold text-texto">Valores</h2>
        <dl className="mt-3 space-y-1 text-sm text-texto-suave">
          <div>
            <dt className="inline text-texto-fraco">Curso: </dt>
            <dd className="inline">{formatarBRL(m.preco_centavos)}</dd>
          </div>
          <div>
            <dt className="inline text-texto-fraco">Frete: </dt>
            <dd className="inline">{formatarBRL(m.frete_centavos)}</dd>
          </div>
          <div className="pt-1 font-semibold text-texto">
            <dt className="inline">Total: </dt>
            <dd className="inline">{formatarBRL(m.total_centavos)}</dd>
          </div>
        </dl>

        {resultado.pagamentos.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {resultado.pagamentos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-texto-fraco">{p.gateway_ref}</span>
                <span className="text-texto-suave">
                  {p.metodo} · {p.status}
                </span>
                <form action={reconciliarPagamento}>
                  <input type="hidden" name="gatewayRef" value={p.gateway_ref} />
                  <button type="submit" className="text-acento hover:underline">
                    Verificar no gateway
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <h2 className="font-semibold text-texto">Avançar status</h2>
        <div className="mt-4">
          <AcoesDeStatus
            matriculaId={m.id}
            status={m.status}
            bloqueio={resultado.bloqueio}
          />
        </div>
      </section>

      <section className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <h2 className="font-semibold text-texto">Histórico</h2>
        <ol className="mt-4 space-y-2 text-sm">
          {resultado.eventos.map((e, indice) => (
            <li key={indice} className="flex flex-wrap gap-2">
              <span className="text-texto-fraco">
                {new Date(e.created_at).toLocaleString('pt-BR')}
              </span>
              <span className="font-medium text-texto">
                {ROTULO_STATUS[e.para_status as StatusMatricula]}
              </span>
              {e.nota && <span className="text-texto-suave">— {e.nota}</span>}
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
