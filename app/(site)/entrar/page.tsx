import { Suspense } from 'react'
import { FormularioLogin } from './FormularioLogin'

export const metadata = { title: 'Entrar — Clique Estudos' }

export default function Entrar() {
  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-acento">Entrar</h1>
      <p className="mt-2 text-texto-suave">
        Informe o CPF do responsável para acompanhar o curso. Sem senha — se
        você já fez a matrícula, seu acesso já está pronto.
      </p>

      {/* useSearchParams exige fronteira de Suspense no Next 15, senão a
          página inteira é forçada a renderização dinâmica no build. */}
      <Suspense fallback={<div className="mt-8 h-40" />}>
        <FormularioLogin />
      </Suspense>
    </main>
  )
}
