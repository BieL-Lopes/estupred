-- Agrupamento visual das unidades por região (Papuda, Gama, SIA, Federal
-- no DF). Não é uma entidade própria: nasce junto com a unidade, sem tela
-- de gestão separada — decisão explícita da spec.
alter table unidades_prisionais add column regiao text;

-- As 5 unidades do DF que ainda não existem em nenhum ambiente. As outras
-- 2 (PDF I e CDP, região Papuda) já existem no seed local com endereço de
-- desenvolvimento — este INSERT não duplica, só completa. Endereço e CEP
-- não foram fornecidos pelo cliente e não serão inventados: nascem como
-- "A CONFIRMAR", editável depois em /admin/unidades.
insert into unidades_prisionais (uf, nome, regiao, endereco, cep, responsavel_nucleo)
values
  ('DF', 'Penitenciária do Distrito Federal II', 'Papuda', 'A CONFIRMAR', '00000000', 'Chefe do Núcleo de Ensino'),
  ('DF', 'Centro de Internamento e Reeducação', 'Papuda', 'A CONFIRMAR', '00000000', 'Chefe do Núcleo de Ensino'),
  ('DF', 'Penitenciária Feminina do Distrito Federal', 'Gama', 'A CONFIRMAR', '00000000', 'Chefe do Núcleo de Ensino'),
  ('DF', 'Centro de Progressão Penitenciária', 'SIA', 'A CONFIRMAR', '00000000', 'Chefe do Núcleo de Ensino'),
  ('DF', 'Penitenciária Federal de Brasília', 'Federal', 'A CONFIRMAR', '00000000', 'Chefe do Núcleo de Ensino');
