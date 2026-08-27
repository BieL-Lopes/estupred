-- Papel do usuário --------------------------------------------------------
-- SECURITY DEFINER e search_path fixo. Uma policy de profiles que
-- consultasse profiles diretamente entraria em recursão infinita.

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated, anon;

-- Criação automática do profile ao cadastrar ------------------------------

create or replace function criar_profile_ao_cadastrar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, nome, cpf, telefone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'cpf', '00000000000'),
    coalesce(new.raw_user_meta_data ->> 'telefone', ''),
    new.email
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function criar_profile_ao_cadastrar();

-- Habilitar RLS em tudo ---------------------------------------------------

alter table profiles             enable row level security;
alter table unidades_prisionais  enable row level security;
alter table fretes               enable row level security;
alter table cursos               enable row level security;
alter table curso_ufs            enable row level security;
alter table internos             enable row level security;
alter table matriculas           enable row level security;
alter table pagamentos           enable row level security;
alter table pagamento_eventos    enable row level security;
alter table matricula_eventos    enable row level security;

-- Catálogo: leitura pública, escrita só admin -----------------------------

create policy catalogo_leitura on cursos
  for select using (true);
create policy catalogo_escrita on cursos
  for all using (is_admin()) with check (is_admin());

create policy curso_ufs_leitura on curso_ufs
  for select using (true);
create policy curso_ufs_escrita on curso_ufs
  for all using (is_admin()) with check (is_admin());

create policy unidades_leitura on unidades_prisionais
  for select using (true);
create policy unidades_escrita on unidades_prisionais
  for all using (is_admin()) with check (is_admin());

create policy fretes_leitura on fretes
  for select using (true);
create policy fretes_escrita on fretes
  for all using (is_admin()) with check (is_admin());

-- Profiles ----------------------------------------------------------------

create policy profile_proprio_leitura on profiles
  for select using (id = auth.uid() or is_admin());
create policy profile_proprio_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profile_admin_tudo on profiles
  for all using (is_admin()) with check (is_admin());

-- Internos ----------------------------------------------------------------

create policy internos_do_responsavel on internos
  for select using (responsavel_id = auth.uid() or is_admin());
create policy internos_insert on internos
  for insert with check (responsavel_id = auth.uid() or is_admin());
create policy internos_update on internos
  for update using (responsavel_id = auth.uid() or is_admin())
  with check (responsavel_id = auth.uid() or is_admin());

-- Matrículas --------------------------------------------------------------

create policy matriculas_leitura on matriculas
  for select using (responsavel_id = auth.uid() or is_admin());

-- O with check impede forjar responsavel_id de terceiro.
create policy matriculas_insert on matriculas
  for insert with check (responsavel_id = auth.uid() or is_admin());

-- Responsável só mexe na própria matrícula. O avanço de status é feito por
-- Server Action com service role, via transicoes.ts.
create policy matriculas_update_admin on matriculas
  for update using (is_admin()) with check (is_admin());

create policy matriculas_update_autorizacao on matriculas
  for update using (responsavel_id = auth.uid())
  with check (responsavel_id = auth.uid());

-- Pagamentos: responsável lê, ninguém escreve pelo cliente -----------------

create policy pagamentos_leitura on pagamentos
  for select using (
    is_admin() or exists (
      select 1 from matriculas m
      where m.id = pagamentos.matricula_id
        and m.responsavel_id = auth.uid()
    )
  );

-- Sem policy de insert/update: só o service role escreve, e o service role
-- ignora RLS por definição.

-- pagamento_eventos: nenhuma policy. Exclusivo do service role.

-- matricula_eventos: append-only ------------------------------------------

create policy eventos_leitura on matricula_eventos
  for select using (
    is_admin() or exists (
      select 1 from matriculas m
      where m.id = matricula_eventos.matricula_id
        and m.responsavel_id = auth.uid()
    )
  );

create policy eventos_insert on matricula_eventos
  for insert with check (is_admin());

-- Nenhuma policy de update nem de delete: RLS nega por omissão.
