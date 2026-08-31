import { FormularioLoginEquipe } from './FormularioLoginEquipe'

export const metadata = { title: 'Acesso da equipe — Clique Estudos' }

const DESTAQUES = [
  {
    titulo: 'Gestão de Matrículas',
    texto: 'Acompanhe cada matrícula do pagamento ao certificado, em um só lugar.',
  },
  {
    titulo: 'Pagamentos e Cobranças',
    texto: 'Confira PIX, boleto e cartão, e reconcilie o que ficou pendente.',
  },
  {
    titulo: 'Cursos e Unidades',
    texto: 'Cadastre cursos, unidades prisionais e o frete de cada estado.',
  },
]

export default function EntrarEquipe() {
  return (
    <main className="flex min-h-screen">
      {/* Coluna de marca — some no celular, a equipe também acessa do
          computador. */}
      <div className="relative hidden w-1/2 flex-col justify-center overflow-hidden bg-fundo-2 px-16 md:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-acento/10 blur-3xl"
        />
        <h1 className="relative max-w-md text-4xl font-extrabold leading-tight text-texto">
          Sistema de Gestão Educacional
        </h1>
        <p className="relative mt-4 max-w-sm text-texto-suave">
          Acesso restrito à equipe do Clique Estudos.
        </p>

        <ul className="relative mt-12 space-y-5">
          {DESTAQUES.map((d) => (
            <li key={d.titulo} className="rounded-cartao border border-borda bg-cartao p-5">
              <p className="font-semibold text-texto">{d.titulo}</p>
              <p className="mt-1 text-sm text-texto-fraco">{d.texto}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Coluna do formulário */}
      <div className="flex w-full flex-col justify-center px-6 py-16 md:w-1/2 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-2xl font-bold text-texto">Bem-vindo de volta</h2>
          <p className="mt-1 text-texto-fraco">
            Faça login para acessar o sistema.
          </p>

          <FormularioLoginEquipe />
        </div>
      </div>
    </main>
  )
}
