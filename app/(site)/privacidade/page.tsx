export const metadata = { title: 'Política de Privacidade — Clique Estudos' }

export default function Privacidade() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-texto">Política de Privacidade</h1>
      <p className="mt-3 text-texto-suave">
        Esta política descreve como o Clique Estudos trata dados pessoais, conforme a
        Lei Geral de Proteção de Dados (Lei 13.709/2018).
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-acento">
          Dados que coletamos
        </h2>
        <p className="mt-2 text-texto-suave">
          Do responsável: nome, CPF, e-mail e telefone. Do interno: nome, CPF,
          matrícula prisional, data de nascimento e unidade prisional.
          Coletamos apenas o necessário para efetivar a matrícula, despachar o
          material e emitir o certificado.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-acento">Como usamos</h2>
        <p className="mt-2 text-texto-suave">
          Os dados são usados exclusivamente para executar a matrícula
          contratada: identificação do aluno, endereçamento do material
          didático à unidade prisional, registro de aproveitamento e emissão do
          certificado pela instituição credenciada.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-acento">
          Com quem compartilhamos
        </h2>
        <p className="mt-2 text-texto-suave">
          Compartilhamos com a unidade prisional de destino e com a instituição
          que emite o certificado, no que é estritamente necessário. Não
          vendemos dados nem os cedemos para finalidade publicitária.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-acento">Seus direitos</h2>
        <p className="mt-2 text-texto-suave">
          Você pode solicitar acesso, correção, portabilidade ou eliminação dos
          seus dados, salvo quando a guarda for exigida por obrigação legal ou
          para comprovação do estudo realizado.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-acento">Segurança</h2>
        <p className="mt-2 text-texto-suave">
          O acesso aos dados é restrito por autenticação e por regras aplicadas
          no próprio banco de dados: cada responsável enxerga apenas as suas
          matrículas. Documentos enviados ficam em armazenamento privado.
        </p>
      </section>
    </main>
  )
}
