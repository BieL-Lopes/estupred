-- ATENCAO: DADOS DE DESENVOLVIMENTO. NAO APLIQUE EM PRODUCAO.
--
-- Este arquivo cria tres usuarios com a senha 'senha-de-teste', um deles
-- ADMIN. Ele roda apenas em `supabase db reset` local. Em producao use
-- `supabase db push`, que aplica somente as migrations.
--
-- NUNCA rode `supabase db reset --linked`: isso apagaria o banco de
-- producao e criaria um admin com senha publicamente conhecida.

-- Usuários de desenvolvimento. A senha é a mesma para os três.
--
-- As quatro colunas de token vão como string vazia, não NULL: o GoTrue as lê
-- como string não-nula em Go, e um NULL faz todo login falhar com
-- "Database error querying schema".
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change, email_change_token_new,
  created_at, updated_at
)
values
  ('11111111-1111-1111-1111-111111111111',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin@estupred.com.br', crypt('senha-de-teste', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"nome":"Administração","cpf":"52998224725","telefone":"61999999999"}',
   '', '', '', '',
   now(), now()),
  ('22222222-2222-2222-2222-222222222222',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ana@exemplo.com', crypt('senha-de-teste', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"nome":"Ana Souza","cpf":"39053344705","telefone":"61988888888"}',
   '', '', '', '',
   now(), now()),
  ('33333333-3333-3333-3333-333333333333',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'bruno@exemplo.com', crypt('senha-de-teste', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"nome":"Bruno Lima","cpf":"16899535009","telefone":"61977777777"}',
   '', '', '', '',
   now(), now());

update profiles set role = 'admin'
  where id = '11111111-1111-1111-1111-111111111111';

-- Frete para as 27 UFs. Valores de partida, editáveis no admin.
insert into fretes (uf, valor_centavos, prazo_dias) values
  ('DF', 0, 3), ('GO', 2800, 7), ('SP', 3200, 8), ('RJ', 3200, 8),
  ('MG', 3200, 8), ('BA', 3800, 12), ('PR', 3500, 10), ('SC', 3500, 10),
  ('RS', 3800, 12), ('PE', 3800, 12), ('CE', 3800, 12), ('PA', 4500, 15),
  ('AM', 5200, 20), ('MA', 4200, 14), ('MT', 3800, 12), ('MS', 3500, 10),
  ('ES', 3200, 9), ('PB', 3800, 12), ('RN', 3800, 12), ('AL', 3800, 12),
  ('SE', 3800, 12), ('PI', 4200, 14), ('TO', 3800, 12), ('RO', 4800, 18),
  ('AC', 5200, 20), ('AP', 5200, 20), ('RR', 5200, 20);

insert into unidades_prisionais (id, uf, nome, endereco, cep, responsavel_nucleo, telefone) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'DF',
   'Penitenciária do Distrito Federal I',
   'Rodovia DF-465, s/n, São Sebastião', '71693000',
   'Chefe do Núcleo de Ensino', '6133060000'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'DF',
   'Centro de Detenção Provisória',
   'Rodovia DF-465, s/n, São Sebastião', '71693000',
   'Chefe do Núcleo de Ensino', '6133060001'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'GO',
   'Complexo Prisional de Aparecida de Goiânia',
   'Rodovia BR-153, km 5, Aparecida de Goiânia', '74936600',
   'Agente de Ensino', '6232010000');

insert into cursos (id, slug, titulo, descricao, ementa, carga_horaria, preco_centavos, categoria, destaque) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'eletricista-predial',
   'Eletricista Predial',
   'Instalações elétricas residenciais e prediais, da leitura de projeto à execução segura.',
   E'## Módulos\n\n1. Fundamentos de eletricidade\n2. Leitura de projeto elétrico\n3. Dimensionamento de circuitos\n4. Instalação de quadros e disjuntores\n5. Segurança em eletricidade (NR-10)',
   180, 18500, 'Construção Civil', true),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'pedreiro-alvenaria',
   'Pedreiro de Alvenaria',
   'Técnicas de alvenaria estrutural e de vedação, do assentamento ao acabamento.',
   E'## Módulos\n\n1. Materiais e ferramentas\n2. Fundações rasas\n3. Assentamento de blocos\n4. Reboco e chapisco\n5. Controle de qualidade',
   180, 18500, 'Construção Civil', true),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'panificacao',
   'Panificação e Confeitaria',
   'Produção de pães, bolos e doces em escala artesanal e comercial.',
   E'## Módulos\n\n1. Higiene e manipulação de alimentos\n2. Massas e fermentação\n3. Pães salgados e doces\n4. Confeitaria básica\n5. Custos e precificação',
   180, 18500, 'Alimentação', true),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'corte-e-costura',
   'Corte e Costura',
   'Modelagem, corte e costura de peças do vestuário em máquina reta e overloque.',
   E'## Módulos\n\n1. Máquinas e ferramentas\n2. Tecidos e aviamentos\n3. Modelagem básica\n4. Costura de peças\n5. Acabamento e conserto',
   180, 18500, 'Vestuário', false),
  ('bbbbbbbb-0000-0000-0000-000000000005', 'informatica-basica',
   'Informática Básica',
   'Fundamentos de computador, editor de texto, planilha e internet.',
   E'## Módulos\n\n1. Componentes do computador\n2. Sistema operacional\n3. Editor de texto\n4. Planilha eletrônica\n5. Internet e segurança',
   120, 17500, 'Tecnologia', false),
  ('bbbbbbbb-0000-0000-0000-000000000006', 'jardinagem-paisagismo',
   'Jardinagem e Paisagismo',
   'Cultivo, poda e manutenção de jardins residenciais e públicos.',
   E'## Módulos\n\n1. Solo e adubação\n2. Espécies ornamentais\n3. Poda e condução\n4. Irrigação\n5. Projeto de canteiro',
   90, 15500, 'Meio Ambiente', false),
  ('bbbbbbbb-0000-0000-0000-000000000007', 'auxiliar-administrativo',
   'Auxiliar Administrativo',
   'Rotinas de escritório, arquivo, atendimento e noções de departamento pessoal.',
   E'## Módulos\n\n1. Rotinas administrativas\n2. Arquivo e documentação\n3. Atendimento\n4. Noções de departamento pessoal\n5. Ética profissional',
   180, 18500, 'Administração', false),
  ('bbbbbbbb-0000-0000-0000-000000000008', 'mecanica-de-motos',
   'Mecânica de Motocicletas',
   'Manutenção preventiva e corretiva de motocicletas de baixa cilindrada.',
   E'## Módulos\n\n1. Motor dois e quatro tempos\n2. Sistema de transmissão\n3. Freios e suspensão\n4. Sistema elétrico\n5. Diagnóstico de falhas',
   240, 21000, 'Mecânica', false);

-- Curso restrito a poucas UFs, para exercitar a disponibilidade por estado.
insert into curso_ufs (curso_id, uf) values
  ('bbbbbbbb-0000-0000-0000-000000000008', 'DF'),
  ('bbbbbbbb-0000-0000-0000-000000000008', 'GO');

-- Duas matrículas, uma por responsável, para o teste de isolamento.
insert into internos (id, nome, cpf, matricula_prisional, unidade_prisional_id, responsavel_id, parentesco) values
  ('cccccccc-0000-0000-0000-000000000001', 'João da Silva', '11144477735',
   'MP-2024-0001', 'aaaaaaaa-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222', 'Cônjuge'),
  ('cccccccc-0000-0000-0000-000000000002', 'Pedro Alves', '15350946056',
   'MP-2024-0002', 'aaaaaaaa-0000-0000-0000-000000000003',
   '33333333-3333-3333-3333-333333333333', 'Irmão');

insert into matriculas (interno_id, curso_id, responsavel_id, unidade_prisional_id, preco_centavos, frete_centavos, status) values
  ('cccccccc-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-0000-0000-0000-000000000001', 18500, 0, 'paga'),
  ('cccccccc-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-000000000003',
   '33333333-3333-3333-3333-333333333333',
   'aaaaaaaa-0000-0000-0000-000000000003', 18500, 2800, 'material_enviado');

insert into matricula_eventos (matricula_id, de_status, para_status, nota)
select m.id, 'aguardando_pagamento', 'paga', 'Semente de desenvolvimento'
from matriculas m;
