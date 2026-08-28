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

/**
 * O catálogo depende do banco, mas o site não pode cair junto com ele: o
 * resto da página é conteúdo institucional que continua válido. Por isso
 * estas funções nunca lançam por falha de infraestrutura — devolvem
 * `indisponivel: true`, e a página decide o que mostrar.
 *
 * A distinção importa: "nenhum curso encontrado" e "não consegui falar com o
 * catálogo" são coisas diferentes para quem está olhando a tela.
 */
export type ListaDeCursos = { cursos: CursoResumo[]; indisponivel: boolean }
export type BuscaDeCurso = { curso: CursoDetalhe | null; indisponivel: boolean }

/** Curso sem UFs cadastradas é considerado disponível em todas elas. */
export function cursoDisponivelNaUf(ufsDoCurso: string[], uf: string): boolean {
  return ufsDoCurso.length === 0 || ufsDoCurso.includes(uf)
}

type LinhaCurso = {
  id: string
  slug: string
  titulo: string
  descricao: string
  carga_horaria: number
  preco_centavos: number
  categoria: string
  destaque: boolean
  curso_ufs: { uf: string }[] | null
}

function mapear(c: LinhaCurso): CursoResumo {
  return {
    id: c.id,
    slug: c.slug,
    titulo: c.titulo,
    descricao: c.descricao,
    cargaHoraria: c.carga_horaria,
    precoCentavos: c.preco_centavos,
    categoria: c.categoria,
    destaque: c.destaque,
  }
}

export async function listarCursos(filtro?: {
  uf?: string
  categoria?: string
  busca?: string
}): Promise<ListaDeCursos> {
  try {
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

    const cursos = ((data ?? []) as unknown as LinhaCurso[])
      .filter((c) => {
        if (!filtro?.uf) return true
        const ufs = (c.curso_ufs ?? []).map((u) => u.uf)
        return cursoDisponivelNaUf(ufs, filtro.uf)
      })
      .map(mapear)

    return { cursos, indisponivel: false }
  } catch (erro) {
    console.error('[catalogo] falha ao listar cursos:', erro)
    return { cursos: [], indisponivel: true }
  }
}

export async function obterCurso(slug: string): Promise<BuscaDeCurso> {
  try {
    const supabase = await criarClienteServidor()

    const { data, error } = await supabase
      .from('cursos')
      .select(
        'id, slug, titulo, descricao, ementa, carga_horaria, preco_centavos, categoria, destaque, curso_ufs(uf)',
      )
      .eq('slug', slug)
      .eq('ativo', true)
      .maybeSingle()

    if (error) throw error
    if (!data) return { curso: null, indisponivel: false }

    const linha = data as unknown as LinhaCurso & { ementa: string }

    return {
      curso: {
        ...mapear(linha),
        ementa: linha.ementa,
        ufs: (linha.curso_ufs ?? []).map((u) => u.uf),
      },
      indisponivel: false,
    }
  } catch (erro) {
    console.error('[catalogo] falha ao obter curso:', erro)
    return { curso: null, indisponivel: true }
  }
}

export async function listarCategorias(): Promise<string[]> {
  try {
    const supabase = await criarClienteServidor()
    const { data, error } = await supabase
      .from('cursos')
      .select('categoria')
      .eq('ativo', true)

    if (error) throw error
    return [...new Set((data ?? []).map((c) => c.categoria))].sort()
  } catch {
    return []
  }
}
