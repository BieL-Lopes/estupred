import Link from 'next/link'
import { BotaoSubmit } from '@/components/ui/BotaoSubmit'
import { ROTULO_STATUS, type StatusMatricula } from '@/lib/dominio/tipos'
import { mudarStatus } from '@/lib/admin/acoes'
import { checagemParaTransicao } from '@/lib/matricula/permissoes'
import { proximosStatus } from '@/lib/matricula/transicoes'

export function AcoesDeStatus({
  matriculaId,
  status,
  bloqueio,
  papel,
}: {
  matriculaId: string
  status: StatusMatricula
  bloqueio: { id: string; codigo: string } | null
  papel: 'admin' | 'colaborador'
}) {
  const destinos = proximosStatus(status)

  if (destinos.length === 0) {
    return (
      <p className="text-sm text-texto-fraco">
        Esta matrícula chegou ao fim do fluxo.
      </p>
    )
  }

  // Botão que só falha depois do clique é pior do que botão que não aparece:
  // o colaborador precisa saber por que não pode produzir, e qual matrícula
  // está segurando esta.
  if (bloqueio && destinos.includes('material_em_producao')) {
    return (
      <div className="rounded-lg border border-aviso/40 bg-aviso-fundo p-4">
        <p className="text-sm text-aviso">
          Este aluno já tem um curso em andamento. A produção do material desta
          matrícula só pode começar depois que o certificado do curso atual for
          emitido.
        </p>
        <Link
          href={`/admin/matriculas/${bloqueio.id}`}
          className="mt-2 inline-block text-sm font-semibold text-acento hover:underline"
        >
          Ver a matrícula {bloqueio.codigo}
        </Link>
      </div>
    )
  }

  const permitidos = destinos.filter(
    (d) => checagemParaTransicao(d) !== 'admin' || papel === 'admin',
  )

  if (permitidos.length === 0) {
    return (
      <div className="rounded-lg border border-borda bg-cartao-2 p-4">
        <p className="text-sm text-texto-suave">
          A produção do material precisa ser liberada por um administrador.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {permitidos.map((destino) => (
        <form key={destino} action={mudarStatus} className="flex flex-wrap gap-2">
          <input type="hidden" name="matriculaId" value={matriculaId} />
          <input type="hidden" name="para" value={destino} />
          <input
            name="nota"
            placeholder="Observação (opcional)"
            className="flex-1 rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto"
          />
          <BotaoSubmit className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo hover:bg-acento-claro">
            Marcar como {ROTULO_STATUS[destino]}
          </BotaoSubmit>
        </form>
      ))}
    </div>
  )
}
