import { salvarCurso } from '@/lib/admin/acoes'

type Curso = {
  id: string
  slug: string
  titulo: string
  descricao: string
  ementa: string
  categoria: string
  carga_horaria: number
  preco_centavos: number
  ativo: boolean
  destaque: boolean
}

export function FormularioCurso({ curso }: { curso?: Curso }) {
  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <form action={salvarCurso} className="space-y-4">
      {curso && <input type="hidden" name="id" value={curso.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-texto">Título</span>
          <input name="titulo" defaultValue={curso?.titulo} className={campo} required />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Slug (URL)</span>
          <input name="slug" defaultValue={curso?.slug} className={campo} required />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Categoria</span>
          <input name="categoria" defaultValue={curso?.categoria} className={campo} required />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Carga horária (h)</span>
          <input
            name="cargaHoraria"
            type="number"
            min="1"
            defaultValue={curso?.carga_horaria}
            className={campo}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Preço (R$)</span>
          <input
            name="precoReais"
            type="number"
            step="0.01"
            min="0"
            defaultValue={curso ? (curso.preco_centavos / 100).toFixed(2) : ''}
            className={campo}
            required
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-texto">Descrição curta</span>
        <textarea name="descricao" defaultValue={curso?.descricao} rows={2} className={campo} required />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-texto">Ementa (markdown)</span>
        <textarea name="ementa" defaultValue={curso?.ementa} rows={6} className={campo} required />
      </label>

      <div className="flex gap-6 text-sm text-texto-suave">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="ativo" defaultChecked={curso?.ativo ?? true} />
          Ativo
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="destaque" defaultChecked={curso?.destaque ?? false} />
          Destaque na home
        </label>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
      >
        Salvar curso
      </button>
    </form>
  )
}
