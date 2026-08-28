// Gera a migration do catálogo a partir do Anexo I da Portaria 10/2016-VEP/DF.
// Nome e carga horária são transcritos do documento; categoria, descrição e
// ementa são editoriais. Preço segue a faixa por carga horária.

const CURSOS = [
  ['Agente de Portaria', 120, 'Administração',
    'Controle de acesso, recepção e rotinas de portaria em condomínios e empresas.',
    ['Atribuições do agente de portaria', 'Controle de acesso e identificação', 'Uso do livro de ocorrências', 'Relacionamento com moradores e visitantes', 'Procedimentos de emergência']],
  ['As Regras do Novo Acordo Ortográfico da Língua Portuguesa', 90, 'Comunicação',
    'As mudanças ortográficas do acordo e sua aplicação na escrita do dia a dia.',
    ['Panorama do acordo ortográfico', 'Alfabeto e uso de K, W e Y', 'Acentuação gráfica', 'Emprego do hífen', 'Trema e casos especiais']],
  ['Assistente Contábil', 120, 'Administração',
    'Rotinas de apoio à contabilidade: lançamentos, conciliação e organização de documentos.',
    ['Noções de contabilidade', 'Plano de contas', 'Lançamentos contábeis', 'Conciliação bancária', 'Documentos fiscais']],
  ['Atendente de Farmácia', 120, 'Saúde',
    'Atendimento, armazenamento de medicamentos e orientação ao cliente em farmácias.',
    ['Noções de farmacologia', 'Classificação de medicamentos', 'Armazenamento e validade', 'Atendimento e orientação', 'Legislação sanitária']],
  ['Atendimento ao Público', 180, 'Administração',
    'Técnicas de atendimento presencial e por telefone, com foco em resolução e postura.',
    ['Comunicação e postura profissional', 'Atendimento presencial', 'Atendimento telefônico', 'Gestão de reclamações', 'Qualidade no atendimento']],
  ['Auxiliar de Cozinha', 180, 'Alimentação',
    'Pré-preparo, higiene e organização da cozinha profissional.',
    ['Higiene e manipulação de alimentos', 'Equipamentos e utensílios', 'Cortes e pré-preparo', 'Métodos de cocção', 'Organização e mise en place']],
  ['Auxiliar de Oficina Mecânica', 180, 'Automotivo',
    'Apoio à manutenção automotiva: ferramentas, sistemas e rotinas de oficina.',
    ['Ferramentas e instrumentos', 'Motor e sistema de arrefecimento', 'Freios e suspensão', 'Sistema elétrico', 'Segurança na oficina']],
  ['Auxiliar de Pedreiro', 180, 'Construção Civil',
    'Apoio à obra: materiais, preparo de massas, alvenaria e acabamento.',
    ['Materiais de construção', 'Ferramentas e equipamentos', 'Preparo de argamassa e concreto', 'Assentamento de blocos', 'Reboco e acabamento']],
  ['Biossegurança Hospitalar', 180, 'Saúde',
    'Prevenção e controle de riscos biológicos no ambiente hospitalar.',
    ['Conceitos de biossegurança', 'Riscos biológicos, químicos e físicos', 'Equipamentos de proteção', 'Descarte de resíduos', 'Controle de infecção']],
  ['Direito Administrativo', 180, 'Direito',
    'Princípios da administração pública, atos administrativos e responsabilidade do Estado.',
    ['Princípios da administração pública', 'Atos administrativos', 'Poderes administrativos', 'Servidores públicos', 'Responsabilidade civil do Estado']],
  ['Direito Constitucional', 180, 'Direito',
    'Estrutura da Constituição, direitos fundamentais e organização do Estado.',
    ['Teoria da Constituição', 'Direitos e garantias fundamentais', 'Organização do Estado', 'Poderes da República', 'Controle de constitucionalidade']],
  ['Direito de Família', 180, 'Direito',
    'Casamento, união estável, filiação, guarda e alimentos.',
    ['Casamento e união estável', 'Regimes de bens', 'Filiação e reconhecimento', 'Guarda e convivência', 'Alimentos']],
  ['Direito do Consumidor', 180, 'Direito',
    'Relações de consumo, direitos básicos e responsabilidade do fornecedor.',
    ['Relação de consumo', 'Direitos básicos do consumidor', 'Vícios e defeitos do produto', 'Publicidade e práticas abusivas', 'Defesa do consumidor em juízo']],
  ['Direito Penal', 100, 'Direito',
    'Teoria do crime, penas e principais institutos da parte geral.',
    ['Princípios do direito penal', 'Teoria do crime', 'Excludentes de ilicitude', 'Espécies de pena', 'Extinção da punibilidade']],
  ['Direito Processual Civil – Processo de Conhecimento', 180, 'Direito',
    'Do ajuizamento à sentença: partes, provas e procedimento comum.',
    ['Jurisdição e competência', 'Partes e procuradores', 'Petição inicial e resposta', 'Provas', 'Sentença e coisa julgada']],
  ['Direito Processual Civil – Processo de Execução', 180, 'Direito',
    'Títulos executivos, penhora e cumprimento de sentença.',
    ['Títulos executivos', 'Cumprimento de sentença', 'Penhora e avaliação', 'Expropriação de bens', 'Defesas do executado']],
  ['Educação Nutricional, Segurança Alimentar e Preparo de Alimentos', 90, 'Alimentação',
    'Alimentação saudável, segurança alimentar e boas práticas no preparo.',
    ['Nutrientes e alimentação equilibrada', 'Segurança alimentar', 'Contaminação de alimentos', 'Boas práticas de manipulação', 'Preparo e conservação']],
  ['Fiscal de Loja e Operador de Caixa', 180, 'Administração',
    'Prevenção de perdas, operação de caixa e atendimento no varejo.',
    ['Rotinas do varejo', 'Operação de caixa', 'Meios de pagamento', 'Prevenção de perdas', 'Atendimento e ética']],
  ['Formação para Eletricista', 180, 'Construção Civil',
    'Instalações elétricas residenciais e prediais, do projeto à execução segura.',
    ['Fundamentos de eletricidade', 'Leitura de projeto elétrico', 'Dimensionamento de circuitos', 'Quadros e dispositivos de proteção', 'Segurança em eletricidade (NR-10)']],
  ['Formação para Vendedor', 180, 'Vendas',
    'Abordagem, negociação e fechamento de vendas no varejo e no atacado.',
    ['Perfil do vendedor', 'Conhecimento do produto', 'Abordagem e sondagem', 'Negociação e objeções', 'Fechamento e pós-venda']],
  ['Frentista de Posto de Gasolina', 120, 'Automotivo',
    'Abastecimento, atendimento e segurança na operação de postos de combustível.',
    ['Combustíveis e lubrificantes', 'Operação de bombas', 'Atendimento ao cliente', 'Meios de pagamento', 'Segurança e meio ambiente']],
  ['Gestão do Risco Sanitário Hospitalar', 90, 'Saúde',
    'Identificação e controle de riscos sanitários em serviços de saúde.',
    ['Conceitos de risco sanitário', 'Legislação aplicável', 'Identificação de riscos', 'Planos de controle', 'Notificação e monitoramento']],
  ['Informática Avançada', 180, 'Tecnologia',
    'Recursos avançados de planilhas, apresentações e organização de dados.',
    ['Planilhas avançadas', 'Fórmulas e funções', 'Tabelas dinâmicas e gráficos', 'Apresentações profissionais', 'Organização e backup de arquivos']],
  ['Informática Básica: Windows 7 e Office 2010', 180, 'Tecnologia',
    'Fundamentos do computador, sistema operacional e pacote de escritório.',
    ['Componentes do computador', 'Windows: arquivos e pastas', 'Editor de texto', 'Planilha eletrônica', 'Apresentações']],
  ['Inglês em Nível Básico', 180, 'Idiomas',
    'Vocabulário, estruturas e compreensão para comunicação básica em inglês.',
    ['Alfabeto e pronúncia', 'Verbo to be e presente simples', 'Vocabulário do cotidiano', 'Passado simples', 'Diálogos e situações práticas']],
  ['Inglês para Iniciantes', 100, 'Idiomas',
    'Primeiro contato com a língua inglesa, com foco em expressões do dia a dia.',
    ['Saudações e apresentações', 'Números, horas e datas', 'Substantivos e artigos', 'Presente simples', 'Frases úteis do cotidiano']],
  ['Introdução à Informática e Internet', 60, 'Tecnologia',
    'Noções essenciais de computador, navegação e segurança na internet.',
    ['O computador e seus componentes', 'Sistema operacional', 'Navegadores e busca', 'E-mail', 'Segurança na internet']],
  ['Lavanderia Hospitalar', 180, 'Saúde',
    'Processamento de roupas hospitalares, do recolhimento à distribuição.',
    ['Fluxo da lavanderia hospitalar', 'Classificação de roupas', 'Processos de lavagem', 'Secagem e calandragem', 'Controle de infecção']],
  ['Leitura e Produção de Textos', 180, 'Comunicação',
    'Compreensão de leitura e produção de textos claros e bem estruturados.',
    ['Estratégias de leitura', 'Coesão e coerência', 'Tipos e gêneros textuais', 'Parágrafo e estrutura', 'Revisão e reescrita']],
  ['Licitações e Contratos', 110, 'Administração',
    'Modalidades de licitação, fases do processo e execução contratual.',
    ['Princípios da licitação', 'Modalidades e critérios', 'Fases do processo licitatório', 'Contratos administrativos', 'Fiscalização e sanções']],
  ['Língua Espanhola em Nível Básico', 120, 'Idiomas',
    'Vocabulário e estruturas para comunicação básica em espanhol.',
    ['Alfabeto e pronúncia', 'Saudações e apresentações', 'Verbos regulares no presente', 'Vocabulário do cotidiano', 'Diálogos e situações práticas']],
  ['Matemática Financeira', 180, 'Administração',
    'Juros, descontos e análise de operações financeiras do dia a dia.',
    ['Porcentagem e proporção', 'Juros simples', 'Juros compostos', 'Descontos e acréscimos', 'Séries de pagamentos']],
  ['Primeiros Socorros', 90, 'Saúde',
    'Atendimento inicial em emergências até a chegada do socorro especializado.',
    ['Avaliação da vítima', 'Parada cardiorrespiratória e RCP', 'Hemorragias e ferimentos', 'Fraturas e imobilização', 'Queimaduras e intoxicações']],
  ['Recursos Humanos e Departamento de Pessoal', 180, 'Administração',
    'Rotinas de admissão, folha de pagamento e desligamento.',
    ['Recrutamento e seleção', 'Admissão e documentação', 'Jornada e controle de ponto', 'Folha de pagamento', 'Rescisão contratual']],
  ['Saúde Bucal', 100, 'Saúde',
    'Higiene bucal, prevenção e noções de atendimento odontológico.',
    ['Anatomia da cavidade bucal', 'Cárie e doença periodontal', 'Técnicas de higiene bucal', 'Prevenção e flúor', 'Educação em saúde bucal']],
  ['Técnicas Básicas em Arquivo e Informação', 90, 'Administração',
    'Organização, classificação e guarda de documentos.',
    ['Documento e arquivo', 'Métodos de classificação', 'Protocolo e tramitação', 'Conservação de documentos', 'Tabela de temporalidade']],
  ['Técnicas de Vendas', 120, 'Vendas',
    'Processo de venda, argumentação e relacionamento com o cliente.',
    ['Etapas da venda', 'Perfil do cliente', 'Argumentação e persuasão', 'Contorno de objeções', 'Fidelização']],
  ['Vigilância Sanitária', 90, 'Saúde',
    'Ações de vigilância sanitária, fiscalização e legislação aplicável.',
    ['Conceitos e competências', 'Legislação sanitária', 'Inspeção e fiscalização', 'Autos e penalidades', 'Educação sanitária']],
]

// Faixa de preço por carga horária, seguindo a prática do mercado.
// PROVISÓRIO: o cliente confirma antes de vender.
const PRECOS = { 60: 13500, 90: 15500, 100: 15500, 110: 16500, 120: 17500, 180: 18500 }

const DESTAQUES = new Set([
  'Formação para Eletricista',
  'Auxiliar de Cozinha',
  'Informática Básica: Windows 7 e Office 2010',
])

function slugificar(nome) {
  const base = nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (base.length <= 60) return base
  // Corta em fronteira de palavra, para não terminar no meio de um termo.
  return base.slice(0, 60).replace(/-[^-]*$/, '')
}

function esc(s) {
  return s.replace(/'/g, "''")
}

const vistos = new Set()
const linhas = CURSOS.map(([nome, ch, categoria, descricao, modulos]) => {
  const slug = slugificar(nome)
  if (vistos.has(slug)) throw new Error(`slug duplicado: ${slug}`)
  vistos.add(slug)

  const preco = PRECOS[ch]
  if (!preco) throw new Error(`sem preco para carga horaria ${ch} (${nome})`)

  const ementa = '## Módulos\\n\\n' + modulos.map((m, i) => `${i + 1}. ${m}`).join('\\n')

  return `  ('${slug}', '${esc(nome)}', '${esc(descricao)}',\n   E'${esc(ementa)}',\n   ${ch}, ${preco}, '${categoria}', ${DESTAQUES.has(nome)})`
})

if (linhas.length !== 38) throw new Error(`esperado 38 cursos, gerado ${linhas.length}`)

const sql = `-- Catálogo oficial: Anexo I da Portaria n. 010/2016-VEP/DF, "Relação dos
-- Cursos à Distância que poderão ser aproveitados para fins de remição".
--
-- Nome e carga horária são transcritos do documento e NÃO devem ser alterados
-- sem uma nova portaria: certificado com nome fora do Anexo I corre o risco de
-- não ser homologado pela Vara de Execuções Penais.
--
-- Categoria, descrição e ementa são editoriais.
-- Os preços são PROVISÓRIOS, por faixa de carga horária, e devem ser
-- confirmados pelo cliente antes de qualquer venda.
--
-- A portaria é do Distrito Federal. Outros estados têm as suas.

-- Remove o catálogo provisório anterior, que não seguia o Anexo I.
delete from curso_ufs where curso_id in (
  select id from cursos where slug in (
    'eletricista-predial', 'pedreiro-alvenaria', 'panificacao',
    'corte-e-costura', 'informatica-basica', 'jardinagem-paisagismo',
    'auxiliar-administrativo', 'mecanica-de-motos'
  )
);

delete from cursos where slug in (
  'eletricista-predial', 'pedreiro-alvenaria', 'panificacao',
  'corte-e-costura', 'informatica-basica', 'jardinagem-paisagismo',
  'auxiliar-administrativo', 'mecanica-de-motos'
)
and not exists (
  select 1 from matriculas m where m.curso_id = cursos.id
);

insert into cursos
  (slug, titulo, descricao, ementa, carga_horaria, preco_centavos, categoria, destaque)
values
${linhas.join(',\n')}
on conflict (slug) do update set
  titulo = excluded.titulo,
  carga_horaria = excluded.carga_horaria,
  categoria = excluded.categoria;
`

process.stdout.write(sql)
