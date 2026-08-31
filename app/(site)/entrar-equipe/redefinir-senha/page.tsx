import { FormularioRedefinirSenha } from './FormularioRedefinirSenha'

export const metadata = { title: 'Criar nova senha — Clique Estudos' }

export default function RedefinirSenha() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold text-texto">Criar nova senha</h1>
      <p className="mt-1 text-texto-fraco">
        Escolha uma senha com pelo menos 6 caracteres.
      </p>

      <div className="mt-8">
        <FormularioRedefinirSenha />
      </div>
    </main>
  )
}
