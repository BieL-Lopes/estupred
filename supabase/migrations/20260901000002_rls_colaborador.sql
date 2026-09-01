-- Colaborador tem o mesmo alcance de admin em Alunos e Matrículas, mas não
-- em Cursos/Unidades/Fretes (essas policies continuam com is_admin() puro).
-- Mesmo padrão de is_admin(): SECURITY DEFINER com search_path fixo, senão
-- uma policy de profiles que consultasse profiles diretamente entraria em
-- recursão infinita.
create or replace function is_equipe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'colaborador')
  );
$$;

revoke all on function is_equipe() from public;
grant execute on function is_equipe() to authenticated, anon;

-- Internos ----------------------------------------------------------------

drop policy internos_do_responsavel on internos;
create policy internos_do_responsavel on internos
  for select using (responsavel_id = auth.uid() or is_equipe());

drop policy internos_insert on internos;
create policy internos_insert on internos
  for insert with check (responsavel_id = auth.uid() or is_equipe());

drop policy internos_update on internos;
create policy internos_update on internos
  for update using (responsavel_id = auth.uid() or is_equipe())
  with check (responsavel_id = auth.uid() or is_equipe());

-- Matrículas ----------------------------------------------------------------

drop policy matriculas_leitura on matriculas;
create policy matriculas_leitura on matriculas
  for select using (responsavel_id = auth.uid() or is_equipe());

drop policy matriculas_insert on matriculas;
create policy matriculas_insert on matriculas
  for insert with check (responsavel_id = auth.uid() or is_equipe());

drop policy matriculas_update_admin on matriculas;
create policy matriculas_update_admin on matriculas
  for update using (is_equipe()) with check (is_equipe());

-- Pagamentos e eventos --------------------------------------------------------

drop policy pagamentos_leitura on pagamentos;
create policy pagamentos_leitura on pagamentos
  for select using (
    is_equipe() or exists (
      select 1 from matriculas m
      where m.id = pagamentos.matricula_id
        and m.responsavel_id = auth.uid()
    )
  );

drop policy eventos_leitura on matricula_eventos;
create policy eventos_leitura on matricula_eventos
  for select using (
    is_equipe() or exists (
      select 1 from matriculas m
      where m.id = matricula_eventos.matricula_id
        and m.responsavel_id = auth.uid()
    )
  );

drop policy eventos_insert on matricula_eventos;
create policy eventos_insert on matricula_eventos
  for insert with check (is_equipe());

-- Fecha uma falha pré-existente (não introduzida por este arquivo, mas
-- exposta pelo teste da Task 2): profile_proprio_update deixa qualquer
-- usuário autenticado atualizar a própria linha em profiles sem restringir
-- colunas — inclusive `role`. Sem esta trava, qualquer responsável logado
-- consegue se auto-promover a admin com um único update.
--
-- A trava só vale pra sessão comum (auth.role() = 'authenticated', o papel
-- que o PostgREST usa pra requisições de usuário final via JWT). Service
-- role (o painel admin, via criarClienteAdmin()) e conexão direta sem JWT
-- (seed.sql, migrations) não passam por auth.role() = 'authenticated', e
-- auth.role() = 'authenticated' avalia pra NULL nesses casos — um IF com
-- condição NULL não executa, então a trava simplesmente não se aplica ali.
-- Sem essa distinção, a trava reverteria até a promoção inicial do próprio
-- seed.sql (que roda como o dono da conexão, não como um usuário logado).
--
-- SECURITY DEFINER + search_path fixo, mesmo motivo de is_admin(): uma
-- policy (ou aqui, um trigger) que consultasse profiles diretamente correria
-- risco da mesma recursão. is_admin() já é seguro chamar aqui porque só lê,
-- nunca escreve, e sua própria consulta roda com privilégio do dono da
-- função, não do papel do request.
create or replace function impedir_auto_promocao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and new.role <> old.role and not is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists travar_role_do_proprio_perfil on profiles;
create trigger travar_role_do_proprio_perfil
  before update on profiles
  for each row execute function impedir_auto_promocao();
