const ETAPAS = [
  {
    titulo: '1. Autorização de estudo',
    texto:
      'A família solicita, junto à unidade prisional, a autorização para que o interno estude. O documento pode ser enviado depois, pela Área do Aluno — ele não é necessário para concluir a matrícula, mas o material só é despachado com ele em mãos.',
  },
  {
    titulo: '2. Escolha do curso e matrícula',
    texto:
      'A matrícula é feita online, pelo familiar ou responsável, em quatro passos: unidade prisional, dados do interno, dados do responsável e pagamento. Leva poucos minutos e funciona bem no celular.',
  },
  {
    titulo: '3. Pagamento',
    texto:
      'PIX, boleto ou cartão de crédito. O valor do curso é somado ao frete, que varia conforme o estado da unidade prisional. O total aparece na tela antes de confirmar.',
  },
  {
    titulo: '4. Envio do material didático',
    texto:
      'Confirmado o pagamento, a apostila é etiquetada com o nome completo e o endereço prisional do interno e encaminhada aos cuidados do Chefe do Núcleo de Ensino da unidade, que a repassa ao interno.',
  },
  {
    titulo: '5. Estudo',
    texto:
      'O interno estuda a apostila na própria cela, no seu ritmo, módulo a módulo. A linguagem do material é direta e pensada para autoaprendizagem.',
  },
  {
    titulo: '6. Prova presencial',
    texto:
      'Ao final do curso, o interno faz uma prova escrita na unidade prisional, aplicada pelo Núcleo de Ensino. A aprovação exige 60% de acerto. Quem não atinge a nota faz uma segunda prova, sem custo.',
  },
  {
    titulo: '7. Certificado',
    texto:
      'Aprovado, o certificado é emitido e entregue ao Núcleo de Ensino, que o encaminha à assessoria jurídica da unidade para as providências relativas à certidão de estudo.',
  },
  {
    titulo: '8. Acompanhamento pela família',
    texto:
      'Cada uma dessas etapas aparece, com data, na Área do Aluno criada no ato da matrícula. A família acompanha do pagamento ao certificado sem precisar telefonar para ninguém.',
  },
]

export const metadata = { title: 'Como funciona — estupred' }

export default function ComoFunciona() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-texto">Como funciona</h1>
      <p className="mt-3 text-lg text-texto-suave">
        Da matrícula ao certificado, passo a passo.
      </p>

      <div className="mt-12 space-y-8">
        {ETAPAS.map((etapa) => (
          <section key={etapa.titulo}>
            <h2 className="text-lg font-semibold text-marca-700">
              {etapa.titulo}
            </h2>
            <p className="mt-2 text-texto-suave">{etapa.texto}</p>
          </section>
        ))}
      </div>
    </main>
  )
}
