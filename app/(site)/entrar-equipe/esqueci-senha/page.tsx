import { FormularioEsqueciSenha } from './FormularioEsqueciSenha'

export const metadata = { title: 'Esqueci minha senha — Clique Estudos' }

export default function EsqueciSenha() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold text-texto">Esqueceu sua senha?</h1>
      <p className="mt-1 text-texto-fraco">
        Informe o e-mail da sua conta e enviamos um link para você criar uma
        senha nova.
      </p>

      <FormularioEsqueciSenha />
    </main>
  )
}
