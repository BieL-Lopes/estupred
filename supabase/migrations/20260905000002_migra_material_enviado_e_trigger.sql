-- As matrículas que estavam em `material_enviado` passam para
-- `material_entregue`, porque é o que aquele status significava quando foram
-- gravadas: era ele que carimbava data_inicio, sob o rótulo "Início (entrega
-- do material)".
--
-- Os eventos em matricula_eventos NÃO são reescritos. Eles registram o que o
-- colaborador fez naquele momento, e reescrever trilha de auditoria para
-- ficar coerente com o presente é pior do que conviver com um nome
-- aposentado.
update matriculas
   set status = 'material_entregue'
 where status = 'material_enviado';

-- O trigger antigo vigiava a entrada em um status específico. Agora vigia a
-- entrada em QUALQUER etapa que ocupe o aluno, vinda de qualquer etapa que
-- não ocupava. Isso barra dois casos que o anterior deixava passar: começar a
-- produzir um segundo kit, e pular direto para entregue por SQL na mão.
create or replace function checar_um_curso_por_vez()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ocupa constant status_matricula[] := array[
    'material_em_producao', 'material_a_caminho', 'material_entregue',
    'material_enviado', 'prova_aplicada', 'aprovado', 'reprovado'
  ]::status_matricula[];
begin
  if new.status = any(ocupa) and not (old.status = any(ocupa)) then
    if exists (
      select 1
      from matriculas m
      where m.interno_id = new.interno_id
        and m.id <> new.id
        and m.status = any(ocupa)
    ) then
      raise exception
        'Aluno ja tem um curso em andamento; conclua antes de comecar o proximo'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;
