export const metadata = { title: 'Instituição — Clique Estudos' }

export default function Institucional() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-texto">A instituição</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-acento">
          Quem emite os certificados
        </h2>
        <p className="mt-2 text-texto-suave">
          Os certificados dos cursos do Clique Estudos são emitidos pela Faculdade
          Guerra, instituição de ensino credenciada. Isso é o que dá validade ao
          documento perante a assessoria jurídica da unidade prisional.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-acento">Base legal</h2>
        <p className="mt-2 text-texto-suave">
          Os cursos seguem as portarias da Vara de Execuções Penais, entre elas
          a VEP 10/2016, que disciplina a oferta de educação a distância no
          sistema prisional. O reconhecimento do estudo para fins de execução
          penal é decisão do juízo competente, a partir da documentação
          encaminhada pela unidade.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-acento">
          Nosso compromisso
        </h2>
        <p className="mt-2 text-texto-suave">
          Educação é o caminho mais curto para a reinserção. Trabalhamos para
          que o processo seja simples para quem está do lado de fora e digno
          para quem está do lado de dentro.
        </p>
      </section>
    </main>
  )
}
