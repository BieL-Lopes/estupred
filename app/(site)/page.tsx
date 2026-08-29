import Link from 'next/link'
import { BotaoLink } from '@/components/ui/Botao'
import { CartaoCurso } from '@/components/site/CartaoCurso'
import { listarCursos } from '@/lib/catalogo'

const DESTAQUES_HERO = [
  'Certificado por instituição credenciada',
  'Matrícula 100% online',
  'Acompanhamento em tempo real',
]

const PASSOS = [
  {
    titulo: 'Autorização de estudo',
    texto:
      'A família solicita a autorização junto à unidade prisional. Pode ser enviada depois, pela Área do Aluno.',
  },
  {
    titulo: 'Escolha do curso',
    texto:
      'Mais de 50 cursos profissionalizantes. A disponibilidade varia conforme o estado da unidade.',
  },
  {
    titulo: 'Dados e matrícula',
    texto:
      'Quatro passos simples: unidade prisional, dados do interno, seus dados e pagamento.',
  },
  {
    titulo: 'Pagamento',
    texto:
      'PIX, boleto ou cartão de crédito. O total com frete aparece na tela antes de confirmar.',
  },
  {
    titulo: 'Material didático',
    texto:
      'A apostila é etiquetada e enviada ao Chefe do Núcleo de Ensino, que a entrega ao interno.',
  },
  {
    titulo: 'Prova e certificado',
    texto:
      'Prova escrita na própria unidade. Aprovado, o certificado vai ao Núcleo de Ensino.',
  },
]

const PILARES = [
  {
    titulo: 'Certificação com validade',
    texto:
      'Os certificados são emitidos pela Faculdade Guerra, instituição credenciada. É isso que dá validade ao documento perante a assessoria jurídica da unidade prisional.',
    itens: ['Instituição credenciada', 'Certificado impresso', 'Entrega ao Núcleo de Ensino'],
  },
  {
    titulo: 'Dentro da lei',
    texto:
      'Os cursos seguem as portarias da Vara de Execuções Penais, entre elas a VEP 10/2016, que disciplina a educação a distância no sistema prisional.',
    itens: ['Portarias da VEP', 'Material em linguagem acessível', 'Prova presencial na unidade'],
  },
  {
    titulo: 'A família acompanha',
    texto:
      'No ato da matrícula é criada a sua Área do Aluno. Do pagamento ao certificado, cada etapa aparece com data, sem precisar telefonar para ninguém.',
    itens: ['Status em tempo real', 'Comprovante sempre à mão', 'Histórico completo'],
  },
]

const NUMEROS = [
  { valor: '50+', rotulo: 'Cursos profissionalizantes' },
  { valor: '12h', rotulo: 'De estudo remitem 1 dia' },
  { valor: '60%', rotulo: 'Nota mínima para aprovação' },
  { valor: '100%', rotulo: 'Matrícula online' },
]

const DUVIDAS = [
  {
    p: 'Quem faz a matrícula, o interno ou a família?',
    r: 'A família ou o responsável. O interno não tem acesso à internet, então quem se cadastra, paga e acompanha é quem está do lado de fora.',
  },
  {
    p: 'Como o interno recebe o material?',
    r: 'Confirmado o pagamento, a apostila é etiquetada com o nome completo e o endereço prisional e enviada aos cuidados do Chefe do Núcleo de Ensino, que a repassa ao interno.',
  },
  {
    p: 'Preciso da autorização da unidade antes de matricular?',
    r: 'Não para concluir a matrícula e o pagamento. Mas o material só é despachado depois que a autorização de estudo é enviada pela Área do Aluno.',
  },
  {
    p: 'E se o interno não passar na prova?',
    r: 'Ele faz uma segunda prova, sem custo, com o mesmo conteúdo e questões diferentes. A nota mínima é 60%.',
  },
  {
    p: 'Por que o preço muda de estado para estado?',
    r: 'O curso tem preço único. O que varia é o frete do material didático até a unidade prisional, que depende do estado. O total aparece antes de você confirmar.',
  },
  {
    p: 'Como funciona a remição de pena?',
    r: 'Pela Lei de Execução Penal, horas de estudo podem ser convertidas em dias de remição. O reconhecimento é decisão do juízo competente, a partir do certificado e da documentação encaminhada pela unidade.',
  },
]

export default async function Home() {
  // Se o catálogo não responder, a landing continua inteira: hero, como
  // funciona, pilares, números e dúvidas não dependem do banco.
  const { cursos, indisponivel } = await listarCursos()
  const destaques = cursos.filter((c) => c.destaque).slice(0, 3)

  return (
    <main>
      {/* Hero ---------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-borda">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-acento/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="text-sm font-semibold uppercase tracking-widest text-acento">
            Educação no sistema prisional
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.1] text-texto md:text-6xl">
            A reinserção começa com{' '}
            <span className="text-acento">uma boa educação</span>.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-texto-suave">
            Cursos profissionalizantes com certificado emitido por instituição
            credenciada. A família matricula online em minutos e acompanha cada
            etapa, do pagamento ao certificado.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <BotaoLink href="/cursos">Ver cursos</BotaoLink>
            <BotaoLink href="#como-funciona" variante="secundario">
              Como funciona
            </BotaoLink>
          </div>

          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
            {DESTAQUES_HERO.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-texto-suave"
              >
                <span className="text-ok" aria-hidden>
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Como funciona ------------------------------------------------- */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold text-texto">Como funciona</h2>
        <p className="mt-3 max-w-2xl text-texto-fraco">
          Da autorização ao certificado, em seis etapas.
        </p>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {PASSOS.map((passo, indice) => (
            <li
              key={passo.titulo}
              className="rounded-cartao border border-borda bg-cartao p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-acento-fundo text-sm font-bold text-acento">
                {String(indice + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 font-semibold text-texto">{passo.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-texto-fraco">
                {passo.texto}
              </p>
            </li>
          ))}
        </ol>

        <Link
          href="/como-funciona"
          className="mt-8 inline-block text-sm font-semibold text-acento hover:underline"
        >
          Ver o passo a passo completo →
        </Link>
      </section>

      {/* Cursos -------------------------------------------------------- */}
      <section id="cursos" className="border-y border-borda bg-fundo-2">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-texto">
                Cursos em destaque
              </h2>
              <p className="mt-3 max-w-2xl text-texto-fraco">
                Formação profissional voltada ao mercado de trabalho, para quem
                vai recomeçar.
              </p>
            </div>
            <BotaoLink href="/cursos" variante="secundario">
              Ver todos os cursos
            </BotaoLink>
          </div>

          {destaques.length === 0 ? (
            <p className="mt-12 rounded-cartao border border-borda bg-cartao p-8 text-center text-texto-fraco">
              {indisponivel
                ? 'Não foi possível carregar os cursos agora. Tente novamente em instantes.'
                : 'Nenhum curso em destaque no momento.'}
            </p>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {destaques.map((curso) => (
                <CartaoCurso key={curso.id} curso={curso} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Instituição --------------------------------------------------- */}
      <section id="instituicao" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold text-texto">
          Por que o Clique Estudos
        </h2>
        <p className="mt-3 max-w-2xl text-texto-fraco">
          Três coisas que a família precisa ter certeza antes de pagar.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PILARES.map((pilar) => (
            <div
              key={pilar.titulo}
              className="rounded-cartao border border-borda bg-cartao p-7"
            >
              <h3 className="text-lg font-semibold text-texto">
                {pilar.titulo}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-texto-fraco">
                {pilar.texto}
              </p>
              <ul className="mt-5 space-y-2">
                {pilar.itens.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-texto-suave"
                  >
                    <span className="mt-0.5 text-ok" aria-hidden>
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Números ------------------------------------------------------- */}
      <section className="border-y border-borda bg-fundo-2">
        <dl className="mx-auto grid max-w-6xl gap-8 px-6 py-14 sm:grid-cols-2 md:grid-cols-4">
          {NUMEROS.map((n) => (
            <div key={n.rotulo}>
              <dt className="sr-only">{n.rotulo}</dt>
              <dd>
                <span className="block text-4xl font-extrabold text-acento">
                  {n.valor}
                </span>
                <span className="mt-2 block text-sm text-texto-fraco">
                  {n.rotulo}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Dúvidas ------------------------------------------------------- */}
      <section id="duvidas" className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-3xl font-bold text-texto">Dúvidas frequentes</h2>

        <div className="mt-10 space-y-3">
          {DUVIDAS.map((duvida) => (
            <details
              key={duvida.p}
              className="group rounded-cartao border border-borda bg-cartao px-6 py-5"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium text-texto">
                {duvida.p}
                <span
                  className="text-acento transition group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-texto-fraco">
                {duvida.r}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Chamada final ------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="rounded-cartao border border-acento/30 bg-acento-fundo px-8 py-14 text-center">
          <h2 className="text-3xl font-bold text-texto">
            Comece a matrícula hoje
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-texto-suave">
            Leva poucos minutos e funciona pelo celular. Você acompanha tudo
            pela Área do Aluno, do pagamento ao certificado.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <BotaoLink href="/cursos">Escolher um curso</BotaoLink>
            <BotaoLink href="/entrar" variante="secundario">
              Já sou cadastrado
            </BotaoLink>
          </div>
        </div>
      </section>
    </main>
  )
}
