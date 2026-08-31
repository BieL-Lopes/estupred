insert into storage.buckets (id, name, public)
values ('autorizacoes', 'autorizacoes', false)
on conflict (id) do nothing;

-- O caminho do arquivo começa com o id do responsável (auth.uid()), então
-- cada um só enxerga a própria pasta. is_admin() já existe desde a rls.sql.
create policy autorizacao_leitura on storage.objects
  for select using (
    bucket_id = 'autorizacoes'
    and (is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy autorizacao_envio on storage.objects
  for insert with check (
    bucket_id = 'autorizacoes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
