import { FormularioLoginEquipe } from './FormularioLoginEquipe'

export const metadata = { title: 'Acesso da equipe — Clique Estudos' }

export default function EntrarEquipe() {
  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-acento">Acesso da equipe</h1>
      <p className="mt-2 text-texto-suave">
        Login com e-mail e senha, exclusivo para a administração.
      </p>

      <FormularioLoginEquipe />
    </main>
  )
}
