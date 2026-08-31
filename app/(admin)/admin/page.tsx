import Link from 'next/link'
import { resumoDoPainel } from '@/lib/admin/consultas'
import { formatarBRL } from '@/lib/dominio/precos'
import { ROTULO_STATUS, STATUS_MATRICULA } from '@/lib/dominio/tipos'

export const metadata = { title: 'Painel — Clique Estudos' }

export default async function Painel() {
  const { porStatus, receitaMesCentavos, pagamentosOrfaos } = await resumoDoPainel()

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">Painel</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-cartao border border-borda bg-cartao p-6">
          <p className="text-sm text-texto-suave">Receita confirmada no mês</p>
          <p className="mt-1 text-3xl font-bold text-acento">
            {formatarBRL(receitaMesCentavos)}
          </p>
        </div>

        <div
          className={`rounded-cartao border p-6 ${
            pagamentosOrfaos > 0
              ? 'border-aviso/40 bg-aviso-fundo'
              : 'border-borda bg-cartao'
          }`}
        >
          <p className="text-sm text-texto-suave">Pagamentos sem matrícula</p>
          <p className="mt-1 text-3xl font-bold text-texto">{pagamentosOrfaos}</p>
          {pagamentosOrfaos > 0 && (
            <p className="mt-2 text-sm text-aviso">
              Entrou dinheiro que não achou dono. Verifique manualmente.
            </p>
          )}
        </div>
      </div>

      <h2 className="mt-12 text-lg font-bold text-texto">Matrículas por status</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {STATUS_MATRICULA.map((status) => (
          <Link
            key={status}
            href={`/admin/matriculas?status=${status}`}
            className="rounded-cartao border border-borda bg-cartao p-4 transition hover:border-acento/50"
          >
            <p className="text-sm text-texto-suave">{ROTULO_STATUS[status]}</p>
            <p className="mt-1 text-2xl font-bold text-texto">{porStatus[status] ?? 0}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
