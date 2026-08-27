'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { UFS } from '@/lib/dominio/tipos'

export function FiltroCatalogo({ categorias }: { categorias: string[] }) {
  const router = useRouter()
  const parametros = useSearchParams()

  function aplicar(chave: string, valor: string) {
    const novos = new URLSearchParams(parametros.toString())
    if (valor) novos.set(chave, valor)
    else novos.delete(chave)
    router.push(`/cursos?${novos.toString()}`)
  }

  const campo =
    'rounded-lg border border-borda bg-cartao px-3 py-2.5 text-sm text-texto'

  return (
    <div className="flex flex-wrap gap-3">
      <input
        className={`${campo} min-w-56 flex-1`}
        placeholder="Buscar curso"
        defaultValue={parametros.get('busca') ?? ''}
        onChange={(e) => aplicar('busca', e.target.value)}
        aria-label="Buscar curso"
      />

      <select
        className={campo}
        defaultValue={parametros.get('uf') ?? ''}
        onChange={(e) => aplicar('uf', e.target.value)}
        aria-label="Estado da unidade prisional"
      >
        <option value="">Todos os estados</option>
        {UFS.map((uf) => (
          <option key={uf} value={uf}>
            {uf}
          </option>
        ))}
      </select>

      <select
        className={campo}
        defaultValue={parametros.get('categoria') ?? ''}
        onChange={(e) => aplicar('categoria', e.target.value)}
        aria-label="Categoria"
      >
        <option value="">Todas as categorias</option>
        {categorias.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  )
}
