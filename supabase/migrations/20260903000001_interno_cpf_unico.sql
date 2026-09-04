-- Um CPF, um aluno. Sem isso, cada compra do site criava um cadastro novo
-- para a mesma pessoa (lib/matricula/acoes.ts sempre fazia insert), e a
-- regra de "um curso por vez" não teria sujeito sobre o qual valer: o aluno
-- duplicado nasce sem matrícula nenhuma.
--
-- A produção foi conferida antes: zero CPFs duplicados, então a constraint
-- entra sem precisar juntar cadastro.
alter table internos add constraint internos_cpf_key unique (cpf);
