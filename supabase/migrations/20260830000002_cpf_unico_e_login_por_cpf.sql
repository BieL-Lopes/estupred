-- Acesso do responsável passa a ser por CPF, sem senha (pedido explícito do
-- cliente, inspirado na referência A Clique Fácil). O admin continua com
-- e-mail e senha, por ser conta interna da equipe.
--
-- profiles.cpf precisa ser único: é a chave de busca de entrarPorCpf() em
-- lib/auth-cpf.ts. Sem isso, dois cadastros com o mesmo CPF (por exemplo,
-- um responsável matriculando dois internos em momentos diferentes, se por
-- algum motivo virasse duas contas) tornariam a busca ambígua.
alter table profiles add constraint profiles_cpf_key unique (cpf);
