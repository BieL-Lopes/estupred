import { Suspense } from 'react'
import { FormularioLogin } from './FormularioLogin'

export const metadata = { title: 'Entrar — Clique Estudos' }

const DESTAQUES = [
  {
    titulo: 'Acompanhamento da matrícula',
    texto: 'Veja em que etapa o curso está, do pagamento ao certificado.',
  },
  {
    titulo: 'Autorização de estudo',
    texto: 'Envie o documento pela própria Área do Aluno, sem precisar ir até a unidade.',
  },
  {
    titulo: 'Acesso sem senha',
    texto: 'Basta o CPF do responsável usado na matrícula. Nada para lembrar.',
  },
]

export default function Entrar() {
  return (
    <main className="flex min-h-screen">
      {/* Coluna de marca — some no celular, a família também acessa do
          computador. */}
      <div className="relative hidden w-1/2 flex-col justify-center overflow-hidden bg-fundo-2 px-16 md:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-acento/10 blur-3xl"
        />
        <div className="relative flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-acento text-base font-extrabold text-fundo">
            C
          </span>
          <span className="text-xl font-bold text-texto">Clique Estudos</span>
        </div>

        <h1 className="relative mt-10 max-w-md text-4xl font-extrabold leading-tight text-texto">
          Portal do Aluno
        </h1>
        <p className="relative mt-4 max-w-sm text-texto-suave">
          Acompanhe a matrícula do seu familiar, do pagamento ao certificado.
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
          <div className="flex items-center gap-2 md:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-acento text-sm font-extrabold text-fundo">
              C
            </span>
            <span className="text-lg font-bold text-texto">Clique Estudos</span>
          </div>

          <h2 className="mt-8 text-2xl font-bold text-texto md:mt-0">Entrar</h2>
          <p className="mt-1 text-texto-fraco">
            Informe o CPF do responsável para acompanhar o curso. Sem senha —
            se você já fez a matrícula, seu acesso já está pronto.
          </p>

          {/* useSearchParams exige fronteira de Suspense no Next 15, senão a
              página inteira é forçada a renderização dinâmica no build. */}
          <Suspense fallback={<div className="mt-8 h-40" />}>
            <FormularioLogin />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
