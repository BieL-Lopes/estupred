import { FormularioConsulta } from './FormularioConsulta'

export const metadata = { title: 'Consultar andamento — estupred' }

export default function Consulta() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-4xl font-extrabold text-texto">
        Consultar andamento
      </h1>
      <p className="mt-3 text-texto-suave">
        Digite o CPF do aluno para ver em que etapa está o curso. Não precisa
        de cadastro.
      </p>

      <div className="mt-10">
        <FormularioConsulta />
      </div>
    </main>
  )
}
