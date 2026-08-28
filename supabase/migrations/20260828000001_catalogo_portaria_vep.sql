-- Catálogo oficial: Anexo I da Portaria n. 010/2016-VEP/DF, "Relação dos
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
  ('agente-de-portaria', 'Agente de Portaria', 'Controle de acesso, recepção e rotinas de portaria em condomínios e empresas.',
   E'## Módulos\n\n1. Atribuições do agente de portaria\n2. Controle de acesso e identificação\n3. Uso do livro de ocorrências\n4. Relacionamento com moradores e visitantes\n5. Procedimentos de emergência',
   120, 17500, 'Administração', false),
  ('as-regras-do-novo-acordo-ortografico-da-lingua-portuguesa', 'As Regras do Novo Acordo Ortográfico da Língua Portuguesa', 'As mudanças ortográficas do acordo e sua aplicação na escrita do dia a dia.',
   E'## Módulos\n\n1. Panorama do acordo ortográfico\n2. Alfabeto e uso de K, W e Y\n3. Acentuação gráfica\n4. Emprego do hífen\n5. Trema e casos especiais',
   90, 15500, 'Comunicação', false),
  ('assistente-contabil', 'Assistente Contábil', 'Rotinas de apoio à contabilidade: lançamentos, conciliação e organização de documentos.',
   E'## Módulos\n\n1. Noções de contabilidade\n2. Plano de contas\n3. Lançamentos contábeis\n4. Conciliação bancária\n5. Documentos fiscais',
   120, 17500, 'Administração', false),
  ('atendente-de-farmacia', 'Atendente de Farmácia', 'Atendimento, armazenamento de medicamentos e orientação ao cliente em farmácias.',
   E'## Módulos\n\n1. Noções de farmacologia\n2. Classificação de medicamentos\n3. Armazenamento e validade\n4. Atendimento e orientação\n5. Legislação sanitária',
   120, 17500, 'Saúde', false),
  ('atendimento-ao-publico', 'Atendimento ao Público', 'Técnicas de atendimento presencial e por telefone, com foco em resolução e postura.',
   E'## Módulos\n\n1. Comunicação e postura profissional\n2. Atendimento presencial\n3. Atendimento telefônico\n4. Gestão de reclamações\n5. Qualidade no atendimento',
   180, 18500, 'Administração', false),
  ('auxiliar-de-cozinha', 'Auxiliar de Cozinha', 'Pré-preparo, higiene e organização da cozinha profissional.',
   E'## Módulos\n\n1. Higiene e manipulação de alimentos\n2. Equipamentos e utensílios\n3. Cortes e pré-preparo\n4. Métodos de cocção\n5. Organização e mise en place',
   180, 18500, 'Alimentação', true),
  ('auxiliar-de-oficina-mecanica', 'Auxiliar de Oficina Mecânica', 'Apoio à manutenção automotiva: ferramentas, sistemas e rotinas de oficina.',
   E'## Módulos\n\n1. Ferramentas e instrumentos\n2. Motor e sistema de arrefecimento\n3. Freios e suspensão\n4. Sistema elétrico\n5. Segurança na oficina',
   180, 18500, 'Automotivo', false),
  ('auxiliar-de-pedreiro', 'Auxiliar de Pedreiro', 'Apoio à obra: materiais, preparo de massas, alvenaria e acabamento.',
   E'## Módulos\n\n1. Materiais de construção\n2. Ferramentas e equipamentos\n3. Preparo de argamassa e concreto\n4. Assentamento de blocos\n5. Reboco e acabamento',
   180, 18500, 'Construção Civil', false),
  ('biosseguranca-hospitalar', 'Biossegurança Hospitalar', 'Prevenção e controle de riscos biológicos no ambiente hospitalar.',
   E'## Módulos\n\n1. Conceitos de biossegurança\n2. Riscos biológicos, químicos e físicos\n3. Equipamentos de proteção\n4. Descarte de resíduos\n5. Controle de infecção',
   180, 18500, 'Saúde', false),
  ('direito-administrativo', 'Direito Administrativo', 'Princípios da administração pública, atos administrativos e responsabilidade do Estado.',
   E'## Módulos\n\n1. Princípios da administração pública\n2. Atos administrativos\n3. Poderes administrativos\n4. Servidores públicos\n5. Responsabilidade civil do Estado',
   180, 18500, 'Direito', false),
  ('direito-constitucional', 'Direito Constitucional', 'Estrutura da Constituição, direitos fundamentais e organização do Estado.',
   E'## Módulos\n\n1. Teoria da Constituição\n2. Direitos e garantias fundamentais\n3. Organização do Estado\n4. Poderes da República\n5. Controle de constitucionalidade',
   180, 18500, 'Direito', false),
  ('direito-de-familia', 'Direito de Família', 'Casamento, união estável, filiação, guarda e alimentos.',
   E'## Módulos\n\n1. Casamento e união estável\n2. Regimes de bens\n3. Filiação e reconhecimento\n4. Guarda e convivência\n5. Alimentos',
   180, 18500, 'Direito', false),
  ('direito-do-consumidor', 'Direito do Consumidor', 'Relações de consumo, direitos básicos e responsabilidade do fornecedor.',
   E'## Módulos\n\n1. Relação de consumo\n2. Direitos básicos do consumidor\n3. Vícios e defeitos do produto\n4. Publicidade e práticas abusivas\n5. Defesa do consumidor em juízo',
   180, 18500, 'Direito', false),
  ('direito-penal', 'Direito Penal', 'Teoria do crime, penas e principais institutos da parte geral.',
   E'## Módulos\n\n1. Princípios do direito penal\n2. Teoria do crime\n3. Excludentes de ilicitude\n4. Espécies de pena\n5. Extinção da punibilidade',
   100, 15500, 'Direito', false),
  ('direito-processual-civil-processo-de-conhecimento', 'Direito Processual Civil – Processo de Conhecimento', 'Do ajuizamento à sentença: partes, provas e procedimento comum.',
   E'## Módulos\n\n1. Jurisdição e competência\n2. Partes e procuradores\n3. Petição inicial e resposta\n4. Provas\n5. Sentença e coisa julgada',
   180, 18500, 'Direito', false),
  ('direito-processual-civil-processo-de-execucao', 'Direito Processual Civil – Processo de Execução', 'Títulos executivos, penhora e cumprimento de sentença.',
   E'## Módulos\n\n1. Títulos executivos\n2. Cumprimento de sentença\n3. Penhora e avaliação\n4. Expropriação de bens\n5. Defesas do executado',
   180, 18500, 'Direito', false),
  ('educacao-nutricional-seguranca-alimentar-e-preparo-de', 'Educação Nutricional, Segurança Alimentar e Preparo de Alimentos', 'Alimentação saudável, segurança alimentar e boas práticas no preparo.',
   E'## Módulos\n\n1. Nutrientes e alimentação equilibrada\n2. Segurança alimentar\n3. Contaminação de alimentos\n4. Boas práticas de manipulação\n5. Preparo e conservação',
   90, 15500, 'Alimentação', false),
  ('fiscal-de-loja-e-operador-de-caixa', 'Fiscal de Loja e Operador de Caixa', 'Prevenção de perdas, operação de caixa e atendimento no varejo.',
   E'## Módulos\n\n1. Rotinas do varejo\n2. Operação de caixa\n3. Meios de pagamento\n4. Prevenção de perdas\n5. Atendimento e ética',
   180, 18500, 'Administração', false),
  ('formacao-para-eletricista', 'Formação para Eletricista', 'Instalações elétricas residenciais e prediais, do projeto à execução segura.',
   E'## Módulos\n\n1. Fundamentos de eletricidade\n2. Leitura de projeto elétrico\n3. Dimensionamento de circuitos\n4. Quadros e dispositivos de proteção\n5. Segurança em eletricidade (NR-10)',
   180, 18500, 'Construção Civil', true),
  ('formacao-para-vendedor', 'Formação para Vendedor', 'Abordagem, negociação e fechamento de vendas no varejo e no atacado.',
   E'## Módulos\n\n1. Perfil do vendedor\n2. Conhecimento do produto\n3. Abordagem e sondagem\n4. Negociação e objeções\n5. Fechamento e pós-venda',
   180, 18500, 'Vendas', false),
  ('frentista-de-posto-de-gasolina', 'Frentista de Posto de Gasolina', 'Abastecimento, atendimento e segurança na operação de postos de combustível.',
   E'## Módulos\n\n1. Combustíveis e lubrificantes\n2. Operação de bombas\n3. Atendimento ao cliente\n4. Meios de pagamento\n5. Segurança e meio ambiente',
   120, 17500, 'Automotivo', false),
  ('gestao-do-risco-sanitario-hospitalar', 'Gestão do Risco Sanitário Hospitalar', 'Identificação e controle de riscos sanitários em serviços de saúde.',
   E'## Módulos\n\n1. Conceitos de risco sanitário\n2. Legislação aplicável\n3. Identificação de riscos\n4. Planos de controle\n5. Notificação e monitoramento',
   90, 15500, 'Saúde', false),
  ('informatica-avancada', 'Informática Avançada', 'Recursos avançados de planilhas, apresentações e organização de dados.',
   E'## Módulos\n\n1. Planilhas avançadas\n2. Fórmulas e funções\n3. Tabelas dinâmicas e gráficos\n4. Apresentações profissionais\n5. Organização e backup de arquivos',
   180, 18500, 'Tecnologia', false),
  ('informatica-basica-windows-7-e-office-2010', 'Informática Básica: Windows 7 e Office 2010', 'Fundamentos do computador, sistema operacional e pacote de escritório.',
   E'## Módulos\n\n1. Componentes do computador\n2. Windows: arquivos e pastas\n3. Editor de texto\n4. Planilha eletrônica\n5. Apresentações',
   180, 18500, 'Tecnologia', true),
  ('ingles-em-nivel-basico', 'Inglês em Nível Básico', 'Vocabulário, estruturas e compreensão para comunicação básica em inglês.',
   E'## Módulos\n\n1. Alfabeto e pronúncia\n2. Verbo to be e presente simples\n3. Vocabulário do cotidiano\n4. Passado simples\n5. Diálogos e situações práticas',
   180, 18500, 'Idiomas', false),
  ('ingles-para-iniciantes', 'Inglês para Iniciantes', 'Primeiro contato com a língua inglesa, com foco em expressões do dia a dia.',
   E'## Módulos\n\n1. Saudações e apresentações\n2. Números, horas e datas\n3. Substantivos e artigos\n4. Presente simples\n5. Frases úteis do cotidiano',
   100, 15500, 'Idiomas', false),
  ('introducao-a-informatica-e-internet', 'Introdução à Informática e Internet', 'Noções essenciais de computador, navegação e segurança na internet.',
   E'## Módulos\n\n1. O computador e seus componentes\n2. Sistema operacional\n3. Navegadores e busca\n4. E-mail\n5. Segurança na internet',
   60, 13500, 'Tecnologia', false),
  ('lavanderia-hospitalar', 'Lavanderia Hospitalar', 'Processamento de roupas hospitalares, do recolhimento à distribuição.',
   E'## Módulos\n\n1. Fluxo da lavanderia hospitalar\n2. Classificação de roupas\n3. Processos de lavagem\n4. Secagem e calandragem\n5. Controle de infecção',
   180, 18500, 'Saúde', false),
  ('leitura-e-producao-de-textos', 'Leitura e Produção de Textos', 'Compreensão de leitura e produção de textos claros e bem estruturados.',
   E'## Módulos\n\n1. Estratégias de leitura\n2. Coesão e coerência\n3. Tipos e gêneros textuais\n4. Parágrafo e estrutura\n5. Revisão e reescrita',
   180, 18500, 'Comunicação', false),
  ('licitacoes-e-contratos', 'Licitações e Contratos', 'Modalidades de licitação, fases do processo e execução contratual.',
   E'## Módulos\n\n1. Princípios da licitação\n2. Modalidades e critérios\n3. Fases do processo licitatório\n4. Contratos administrativos\n5. Fiscalização e sanções',
   110, 16500, 'Administração', false),
  ('lingua-espanhola-em-nivel-basico', 'Língua Espanhola em Nível Básico', 'Vocabulário e estruturas para comunicação básica em espanhol.',
   E'## Módulos\n\n1. Alfabeto e pronúncia\n2. Saudações e apresentações\n3. Verbos regulares no presente\n4. Vocabulário do cotidiano\n5. Diálogos e situações práticas',
   120, 17500, 'Idiomas', false),
  ('matematica-financeira', 'Matemática Financeira', 'Juros, descontos e análise de operações financeiras do dia a dia.',
   E'## Módulos\n\n1. Porcentagem e proporção\n2. Juros simples\n3. Juros compostos\n4. Descontos e acréscimos\n5. Séries de pagamentos',
   180, 18500, 'Administração', false),
  ('primeiros-socorros', 'Primeiros Socorros', 'Atendimento inicial em emergências até a chegada do socorro especializado.',
   E'## Módulos\n\n1. Avaliação da vítima\n2. Parada cardiorrespiratória e RCP\n3. Hemorragias e ferimentos\n4. Fraturas e imobilização\n5. Queimaduras e intoxicações',
   90, 15500, 'Saúde', false),
  ('recursos-humanos-e-departamento-de-pessoal', 'Recursos Humanos e Departamento de Pessoal', 'Rotinas de admissão, folha de pagamento e desligamento.',
   E'## Módulos\n\n1. Recrutamento e seleção\n2. Admissão e documentação\n3. Jornada e controle de ponto\n4. Folha de pagamento\n5. Rescisão contratual',
   180, 18500, 'Administração', false),
  ('saude-bucal', 'Saúde Bucal', 'Higiene bucal, prevenção e noções de atendimento odontológico.',
   E'## Módulos\n\n1. Anatomia da cavidade bucal\n2. Cárie e doença periodontal\n3. Técnicas de higiene bucal\n4. Prevenção e flúor\n5. Educação em saúde bucal',
   100, 15500, 'Saúde', false),
  ('tecnicas-basicas-em-arquivo-e-informacao', 'Técnicas Básicas em Arquivo e Informação', 'Organização, classificação e guarda de documentos.',
   E'## Módulos\n\n1. Documento e arquivo\n2. Métodos de classificação\n3. Protocolo e tramitação\n4. Conservação de documentos\n5. Tabela de temporalidade',
   90, 15500, 'Administração', false),
  ('tecnicas-de-vendas', 'Técnicas de Vendas', 'Processo de venda, argumentação e relacionamento com o cliente.',
   E'## Módulos\n\n1. Etapas da venda\n2. Perfil do cliente\n3. Argumentação e persuasão\n4. Contorno de objeções\n5. Fidelização',
   120, 17500, 'Vendas', false),
  ('vigilancia-sanitaria', 'Vigilância Sanitária', 'Ações de vigilância sanitária, fiscalização e legislação aplicável.',
   E'## Módulos\n\n1. Conceitos e competências\n2. Legislação sanitária\n3. Inspeção e fiscalização\n4. Autos e penalidades\n5. Educação sanitária',
   90, 15500, 'Saúde', false)
on conflict (slug) do update set
  titulo = excluded.titulo,
  carga_horaria = excluded.carga_horaria,
  categoria = excluded.categoria;
