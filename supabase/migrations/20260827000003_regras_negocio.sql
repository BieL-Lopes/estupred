-- Regras vindas do documento "Projeto Faculdade" do cliente.

-- O cadastro do interno coleta RG, além do CPF.
alter table internos add column rg text;

-- As três datas são distintas e o cliente pediu cada uma explicitamente.
-- Elas não podem ser derivadas de created_at nem da trilha de eventos:
-- a compra pode ser hoje e a entrega do material só semanas depois.
alter table matriculas add column data_compra date;
alter table matriculas add column data_inicio date;
alter table matriculas add column data_prova date;

comment on column matriculas.data_compra is
  'Data da confirmação do pagamento.';
comment on column matriculas.data_inicio is
  'Data da entrega do material na unidade. É o marco zero do curso.';
comment on column matriculas.data_prova is
  'data_inicio + 45 dias, empurrada para o próximo dia útil. Calculada em lib/matricula/prazos.ts.';

create index matriculas_data_prova_idx on matriculas (data_prova)
  where data_prova is not null;

-- Consulta pública por CPF, conforme o documento do cliente. A contagem por
-- CPF e por origem existe para que a página não vire ferramenta de varredura:
-- sem isso, qualquer um poderia testar CPFs em sequência e descobrir quem
-- está preso.
create table consultas_publicas (
  id uuid primary key default gen_random_uuid(),
  cpf_consultado text not null,
  origem text,
  encontrou boolean not null,
  created_at timestamptz not null default now()
);

create index consultas_publicas_origem_idx
  on consultas_publicas (origem, created_at desc);

alter table consultas_publicas enable row level security;
-- Nenhuma policy: só o service role escreve e lê. A página pública passa
-- pela Server Action, nunca pelo cliente.
