create extension if not exists "pgcrypto";

-- Tipos -------------------------------------------------------------------

create type status_matricula as enum (
  'rascunho',
  'aguardando_pagamento',
  'paga',
  'material_enviado',
  'prova_aplicada',
  'aprovado',
  'reprovado',
  'certificado_emitido',
  'cancelada'
);

create type metodo_pagamento as enum ('pix', 'boleto', 'cartao');

create type status_pagamento as enum (
  'pendente', 'pago', 'falhou', 'expirado', 'estornado'
);

create type papel_usuario as enum ('responsavel', 'admin');

-- Perfis ------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text not null,
  cpf text not null check (cpf ~ '^\d{11}$'),
  telefone text not null,
  email text not null,
  role papel_usuario not null default 'responsavel',
  created_at timestamptz not null default now()
);

create index profiles_role_idx on profiles (role);

-- Unidades prisionais e frete ---------------------------------------------

create table unidades_prisionais (
  id uuid primary key default gen_random_uuid(),
  uf char(2) not null,
  nome text not null,
  endereco text not null,
  cep text not null,
  responsavel_nucleo text,
  telefone text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  unique (uf, nome)
);

create index unidades_uf_idx on unidades_prisionais (uf) where ativa;

create table fretes (
  id uuid primary key default gen_random_uuid(),
  uf char(2) not null unique,
  valor_centavos integer not null check (valor_centavos >= 0),
  prazo_dias integer not null check (prazo_dias > 0)
);

-- Cursos ------------------------------------------------------------------

create table cursos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  descricao text not null,
  ementa text not null,
  carga_horaria integer not null check (carga_horaria > 0),
  preco_centavos integer not null check (preco_centavos >= 0),
  capa_url text,
  categoria text not null,
  ativo boolean not null default true,
  destaque boolean not null default false,
  created_at timestamptz not null default now()
);

create index cursos_ativo_idx on cursos (ativo, destaque);

-- Sem linhas aqui significa disponível em todas as UFs.
create table curso_ufs (
  curso_id uuid not null references cursos on delete cascade,
  uf char(2) not null,
  primary key (curso_id, uf)
);

-- Internos ----------------------------------------------------------------

create table internos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text not null check (cpf ~ '^\d{11}$'),
  matricula_prisional text not null,
  data_nascimento date,
  unidade_prisional_id uuid not null references unidades_prisionais,
  responsavel_id uuid references profiles on delete set null,
  parentesco text,
  created_at timestamptz not null default now()
);

create index internos_responsavel_idx on internos (responsavel_id);

-- Matrículas --------------------------------------------------------------

create sequence matricula_codigo_seq;

create table matriculas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default
    'EST-' || to_char(now(), 'YYYY') || '-' ||
    lpad(nextval('matricula_codigo_seq')::text, 5, '0'),
  interno_id uuid not null references internos on delete restrict,
  curso_id uuid not null references cursos on delete restrict,
  responsavel_id uuid references profiles on delete set null,
  unidade_prisional_id uuid not null references unidades_prisionais,
  preco_centavos integer not null check (preco_centavos >= 0),
  frete_centavos integer not null check (frete_centavos >= 0),
  total_centavos integer generated always as
    (preco_centavos + frete_centavos) stored,
  status status_matricula not null default 'rascunho',
  autorizacao_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matriculas_responsavel_idx on matriculas (responsavel_id);
create index matriculas_status_idx on matriculas (status, created_at desc);

-- Pagamentos --------------------------------------------------------------

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid references matriculas on delete set null,
  gateway text not null,
  gateway_ref text not null,
  metodo metodo_pagamento not null,
  valor_centavos integer not null check (valor_centavos >= 0),
  status status_pagamento not null default 'pendente',
  payload jsonb,
  pago_em timestamptz,
  created_at timestamptz not null default now(),
  unique (gateway, gateway_ref)
);

create index pagamentos_orfaos_idx on pagamentos (created_at desc)
  where matricula_id is null;

-- Idempotência de webhook. Um gateway_ref gera vários eventos ao longo da
-- vida da cobrança, então a chave é a tripla.
create table pagamento_eventos (
  id uuid primary key default gen_random_uuid(),
  gateway text not null,
  gateway_ref text not null,
  evento text not null,
  payload jsonb,
  processado_em timestamptz not null default now(),
  unique (gateway, gateway_ref, evento)
);

-- Trilha de auditoria da matrícula ----------------------------------------

create table matricula_eventos (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references matriculas on delete cascade,
  de_status status_matricula,
  para_status status_matricula not null,
  nota text,
  autor_id uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);

create index matricula_eventos_matricula_idx
  on matricula_eventos (matricula_id, created_at);

-- updated_at automático ---------------------------------------------------

create or replace function tocar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matriculas_updated_at
  before update on matriculas
  for each row execute function tocar_updated_at();
