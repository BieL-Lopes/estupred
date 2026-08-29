import Link from 'next/link'

const COLUNAS = [
  {
    titulo: 'Cursos',
    itens: [
      { href: '/cursos', rotulo: 'Todos os cursos' },
      { href: '/cursos?categoria=Constru%C3%A7%C3%A3o%20Civil', rotulo: 'Construção Civil' },
      { href: '/cursos?categoria=Alimenta%C3%A7%C3%A3o', rotulo: 'Alimentação' },
      { href: '/cursos?categoria=Tecnologia', rotulo: 'Tecnologia' },
    ],
  },
  {
    titulo: 'Institucional',
    itens: [
      { href: '/institucional', rotulo: 'A instituição' },
      { href: '/como-funciona', rotulo: 'Como funciona' },
      { href: '/privacidade', rotulo: 'Privacidade' },
    ],
  },
  {
    titulo: 'Acesso',
    itens: [
      { href: '/entrar', rotulo: 'Área do Aluno' },
      { href: '/cursos', rotulo: 'Fazer matrícula' },
    ],
  },
]

export function Rodape() {
  return (
    <footer className="mt-24 border-t border-borda bg-fundo-2">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-acento text-sm font-extrabold text-fundo">
              C
            </span>
            <span className="text-lg font-bold text-texto">Clique Estudos</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-texto-fraco">
            Cursos profissionalizantes para o sistema prisional brasileiro, com
            certificado emitido por instituição credenciada.
          </p>
        </div>

        {COLUNAS.map((coluna) => (
          <nav key={coluna.titulo} className="text-sm">
            <p className="font-semibold text-texto">{coluna.titulo}</p>
            <ul className="mt-4 space-y-2.5 text-texto-fraco">
              {coluna.itens.map((item) => (
                <li key={item.href + item.rotulo}>
                  <Link href={item.href} className="hover:text-acento">
                    {item.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <p className="border-t border-borda py-6 text-center text-xs text-texto-fraco">
        © {new Date().getFullYear()} Clique Estudos. Todos os direitos reservados.
      </p>
    </footer>
  )
}
