import { criarClienteServidor } from '@/lib/supabase/server'

export type CursoResumo = {
  id: string
  slug: string
  titulo: string
  descricao: string
  cargaHoraria: number
  precoCentavos: number
  categoria: string
  destaque: boolean
}

export type CursoDetalhe = CursoResumo & { ementa: string; ufs: string[] }

/** Curso sem UFs cadastradas é considerado disponível em todas elas. */
export function cursoDisponivelNaUf(ufsDoCurso: string[], uf: string): boolean {
  return ufsDoCurso.length === 0 || ufsDoCurso.includes(uf)
}

export async function listarCursos(filtro?: {
  uf?: string
  categoria?: string
  busca?: string
}): Promise<CursoResumo[]> {
  const supabase = await criarClienteServidor()

  let consulta = supabase
    .from('cursos')
    .select(
      'id, slug, titulo, descricao, carga_horaria, preco_centavos, categoria, destaque, curso_ufs(uf)',
    )
    .eq('ativo', true)
    .order('destaque', { ascending: false })
    .order('titulo')

  if (filtro?.categoria) consulta = consulta.eq('categoria', filtro.categoria)
  if (filtro?.busca) consulta = consulta.ilike('titulo', `%${filtro.busca}%`)

  const { data, error } = await consulta
  if (error) throw error

  return (data ?? [])
    .filter((c) => {
      if (!filtro?.uf) return true
      const ufs = (c.curso_ufs ?? []).map((u) => u.uf)
      return cursoDisponivelNaUf(ufs, filtro.uf)
    })
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      titulo: c.titulo,
      descricao: c.descricao,
      cargaHoraria: c.carga_horaria,
      precoCentavos: c.preco_centavos,
      categoria: c.categoria,
      destaque: c.destaque,
    }))
}

export async function obterCurso(slug: string): Promise<CursoDetalhe | null> {
  const supabase = await criarClienteServidor()

  const { data } = await supabase
    .from('cursos')
    .select(
      'id, slug, titulo, descricao, ementa, carga_horaria, preco_centavos, categoria, destaque, curso_ufs(uf)',
    )
    .eq('slug', slug)
    .eq('ativo', true)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    slug: data.slug,
    titulo: data.titulo,
    descricao: data.descricao,
    ementa: data.ementa,
    cargaHoraria: data.carga_horaria,
    precoCentavos: data.preco_centavos,
    categoria: data.categoria,
    destaque: data.destaque,
    ufs: (data.curso_ufs ?? []).map((u) => u.uf),
  }
}

export async function listarCategorias(): Promise<string[]> {
  const supabase = await criarClienteServidor()
  const { data } = await supabase
    .from('cursos')
    .select('categoria')
    .eq('ativo', true)
  return [...new Set((data ?? []).map((c) => c.categoria))].sort()
}
