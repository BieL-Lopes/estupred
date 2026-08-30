-- O advisor de segurança do Supabase (function_search_path_mutable) apontou
-- que tocar_updated_at ficou sem search_path fixo, ao contrário de is_admin
-- e criar_profile_ao_cadastrar, que já tinham. Descuido na migration
-- original — corrigido aqui, e já aplicado direto em produção via MCP antes
-- deste arquivo existir, então o nome bate com o que está lá.
create or replace function tocar_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
