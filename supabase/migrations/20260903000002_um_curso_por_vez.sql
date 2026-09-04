-- Um aluno pode comprar vários cursos, mas só recebe material de um por vez.
-- A trava fica no envio de material, não na compra: a venda nunca é recusada,
-- a entrega é que espera na fila.
--
-- O app já checa isso em lib/matricula/avancar.ts e devolve erro legível.
-- Este trigger é a rede embaixo: garante a regra para escrita que não passe
-- pelo app (script, SQL na mão, correção manual no painel do Supabase).
create or replace function checar_um_curso_por_vez()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'material_enviado'
     and old.status is distinct from 'material_enviado' then
    if exists (
      select 1
      from matriculas m
      where m.interno_id = new.interno_id
        and m.id <> new.id
        and m.status in (
          'material_enviado', 'prova_aplicada', 'aprovado', 'reprovado'
        )
    ) then
      raise exception
        'Aluno ja tem um curso em andamento; conclua antes de enviar material'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger matriculas_um_curso_por_vez
  before update on matriculas
  for each row
  execute function checar_um_curso_por_vez();
