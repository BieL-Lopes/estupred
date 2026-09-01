-- ATENCAO: DADOS DE DESENVOLVIMENTO. NAO APLIQUE EM PRODUCAO.
--
-- Este arquivo cria quatro usuarios com a senha 'senha-de-teste', um deles
-- ADMIN e outro COLABORADOR. Ele roda apenas em `supabase db reset` local.
-- Em producao use `supabase db push`, que aplica somente as migrations.
--
-- NUNCA rode `supabase db reset --linked`: isso apagaria o banco de
-- producao e criaria um admin com senha publicamente conhecida.
--
-- O catálogo (cursos) vem da migration 20260828000001_catalogo_portaria_vep.sql,
-- que roda antes deste seed e aplica os 38 cursos do Anexo I da Portaria
-- 10/2016-VEP/DF. Este arquivo NÃO cria cursos: só referencia os que já
-- existem, por slug, para as matrículas de teste.

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
   'admin@cliqueestudos.com.br', crypt('senha-de-teste', gen_salt('bf')), now(),
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
   now(), now()),
  ('44444444-4444-4444-4444-444444444444',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'colaborador@cliqueestudos.com.br', crypt('senha-de-teste', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"nome":"Colaborador Teste","cpf":"32165498771","telefone":"61966666666"}',
   '', '', '', '',
   now(), now());

update profiles set role = 'admin'
  where id = '11111111-1111-1111-1111-111111111111';

update profiles set role = 'colaborador'
  where id = '44444444-4444-4444-4444-444444444444';

-- Frete para as 27 UFs. Valores de partida, editáveis no admin.
insert into fretes (uf, valor_centavos, prazo_dias) values
  ('DF', 0, 3), ('GO', 2800, 7), ('SP', 3200, 8), ('RJ', 3200, 8),
  ('MG', 3200, 8), ('BA', 3800, 12), ('PR', 3500, 10), ('SC', 3500, 10),
  ('RS', 3800, 12), ('PE', 3800, 12), ('CE', 3800, 12), ('PA', 4500, 15),
  ('AM', 5200, 20), ('MA', 4200, 14), ('MT', 3800, 12), ('MS', 3500, 10),
  ('ES', 3200, 9), ('PB', 3800, 12), ('RN', 3800, 12), ('AL', 3800, 12),
  ('SE', 3800, 12), ('PI', 4200, 14), ('TO', 3800, 12), ('RO', 4800, 18),
  ('AC', 5200, 20), ('AP', 5200, 20), ('RR', 5200, 20);

insert into unidades_prisionais (id, uf, nome, regiao, endereco, cep, responsavel_nucleo, telefone) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'DF',
   'Penitenciária do Distrito Federal I', 'Papuda',
   'Rodovia DF-465, s/n, São Sebastião', '71693000',
   'Chefe do Núcleo de Ensino', '6133060000'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'DF',
   'Centro de Detenção Provisória', 'Papuda',
   'Rodovia DF-465, s/n, São Sebastião', '71693000',
   'Chefe do Núcleo de Ensino', '6133060001'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'GO',
   'Complexo Prisional de Aparecida de Goiânia', null,
   'Rodovia BR-153, km 5, Aparecida de Goiânia', '74936600',
   'Agente de Ensino', '6232010000');

-- Curso restrito a poucas UFs, para exercitar a disponibilidade por estado.
-- Usa um curso real do Anexo I, não um slug inventado.
insert into curso_ufs (curso_id, uf)
select c.id, uf
from cursos c, (values ('DF'), ('GO')) as restricao(uf)
where c.slug = 'formacao-para-eletricista';

-- Duas matrículas, uma por responsável, para o teste de isolamento.
insert into internos (id, nome, cpf, matricula_prisional, unidade_prisional_id, responsavel_id, parentesco) values
  ('cccccccc-0000-0000-0000-000000000001', 'João da Silva', '11144477735',
   'MP-2024-0001', 'aaaaaaaa-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222', 'Cônjuge'),
  ('cccccccc-0000-0000-0000-000000000002', 'Pedro Alves', '15350946056',
   'MP-2024-0002', 'aaaaaaaa-0000-0000-0000-000000000003',
   '33333333-3333-3333-3333-333333333333', 'Irmão');

insert into matriculas (interno_id, curso_id, responsavel_id, unidade_prisional_id, preco_centavos, frete_centavos, status)
select
  'cccccccc-0000-0000-0000-000000000001'::uuid, c.id,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid, c.preco_centavos, 0, 'paga'::status_matricula
from cursos c where c.slug = 'formacao-para-eletricista'
union all
select
  'cccccccc-0000-0000-0000-000000000002'::uuid, c.id,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'aaaaaaaa-0000-0000-0000-000000000003'::uuid, c.preco_centavos, 2800, 'material_enviado'::status_matricula
from cursos c where c.slug = 'auxiliar-de-cozinha';

insert into matricula_eventos (matricula_id, de_status, para_status, nota)
select m.id, 'aguardando_pagamento', 'paga', 'Semente de desenvolvimento'
from matriculas m;
