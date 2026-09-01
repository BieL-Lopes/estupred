# Colaborador, Alunos, matrícula manual e regiões — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o papel `colaborador` (Alunos + Matrículas, sem acesso a Cursos/Unidades/Fretes), uma página "Alunos" agregando matrículas por pessoa, cadastro manual de matrícula (pagamento já confirmado fora do site) e agrupamento de unidades prisionais por região, com as 7 unidades reais do DF.

**Architecture:** Extensão do painel administrativo já existente (`app/(admin)/**`, `lib/admin/**`). Novo papel via enum Postgres + RLS; nova página reaproveita os padrões já estabelecidos em Matrículas/Cursos/Unidades; cadastro manual reaproveita `criarMatricula()` sem duplicar lógica de negócio.

**Tech Stack:** Next.js 15 (App Router, Server Actions), Supabase (Postgres + Auth + RLS), Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-01-colaborador-alunos-regioes-design.md`

## Global Constraints

- Colaborador tem acesso só a Alunos e Matrículas — Cursos, Unidades e Fretes continuam exclusivos de `admin`, checado no servidor em cada ação, não só no menu.
- Preço e frete da matrícula manual são sempre calculados automaticamente (curso + UF da unidade) — nunca digitados à mão.
- Matrícula manual nasce direto como `paga`, com `metodo_pagamento = 'manual'`, passando pela mesma trilha de auditoria (`avancarStatus` dos outros estados) que uma compra normal.
- Endereço/CEP das 7 unidades reais do DF não foram fornecidos: nascem como `"A CONFIRMAR"` / CEP placeholder, nunca inventados.
- Toda migration nova roda em local (`supabase db reset`) e em produção (Supabase MCP `apply_migration`) antes de considerar a task concluída.
- Sem tela de cadastro de conta de colaborador nesta rodada — contas continuam criadas manualmente via SQL, sob pedido.

---

### Task 1: Enums — papel `colaborador` e método de pagamento `manual`

**Files:**
- Create: `supabase/migrations/20260901000001_papel_colaborador_e_metodo_manual.sql`
- Modify: `lib/dominio/tipos.ts`

**Interfaces:**
- Produces: valor `'colaborador'` no enum `papel_usuario`; valor `'manual'` no enum `metodo_pagamento`; `MetodoPagamento` (tipo TS) passa a incluir `'manual'`.

- [ ] **Step 1: Criar a migration**

Criar `supabase/migrations/20260901000001_papel_colaborador_e_metodo_manual.sql`:

```sql
-- Colaborador: gerencia Alunos e Matrículas, sem acesso a Cursos/Unidades/
-- Fretes (isso continua exclusivo de admin). Ver spec
-- docs/superpowers/specs/2026-09-01-colaborador-alunos-regioes-design.md.
alter type papel_usuario add value 'colaborador';

-- Matrícula cadastrada manualmente (pagamento confirmado fora do site) não
-- passa pelo gateway online — precisa de um método próprio pra não forjar
-- um pix/boleto/cartão que nunca existiu.
alter type metodo_pagamento add value 'manual';
```

Só adiciona valores a enums existentes — nenhuma linha usa esses valores
nesta migration, então não há risco do problema clássico de Postgres de
"unsafe use of new value of enum type" dentro da mesma transação.

- [ ] **Step 2: Aplicar localmente**

Run: `npx supabase db reset`
Expected: todas as migrations aplicam sem erro, incluindo esta nova.

- [ ] **Step 3: Atualizar o tipo `MetodoPagamento`**

Em `lib/dominio/tipos.ts`, localizar:

```ts
export type MetodoPagamento = 'pix' | 'boleto' | 'cartao'
```

Substituir por:

```ts
export type MetodoPagamento = 'pix' | 'boleto' | 'cartao' | 'manual'
```

- [ ] **Step 4: Regenerar os tipos do Supabase**

Run: `npm run db:tipos`
Expected: `lib/supabase/tipos.ts` é reescrito, agora incluindo `'colaborador'`
no enum `papel_usuario` e `'manual'` no enum `metodo_pagamento`.

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit && npm test`
Expected: tsc limpo, 87 testes de unidade passando (nenhum teste novo
ainda — esta task só muda schema e tipos).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260901000001_papel_colaborador_e_metodo_manual.sql lib/dominio/tipos.ts lib/supabase/tipos.ts
git commit -m "feat: adiciona papel colaborador e metodo de pagamento manual"
```

---

### Task 2: `is_equipe()` e atualização da RLS

**Files:**
- Create: `supabase/migrations/20260901000002_rls_colaborador.sql`
- Modify: `supabase/seed.sql`
- Test: `tests/integracao/rls-colaborador.test.ts`

**Interfaces:**
- Consumes: enum `papel_usuario` com `'colaborador'` (Task 1).
- Produces: função SQL `is_equipe()` (retorna `true` para `admin` ou
  `colaborador`), usada pelas policies de `internos`, `matriculas`,
  `matricula_eventos` e `pagamentos`.

- [ ] **Step 1: Criar a migration de RLS**

Criar `supabase/migrations/20260901000002_rls_colaborador.sql`:

```sql
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
```

Nenhuma policy de `cursos`, `curso_ufs`, `unidades_prisionais`, `fretes` ou
`profile_admin_tudo` é tocada — continuam exigindo `is_admin()` puro.

- [ ] **Step 2: Adicionar um colaborador de teste ao seed local**

Em `supabase/seed.sql`, localizar o bloco `insert into auth.users` (três
usuários: admin, ana, bruno) e adicionar um quarto, colaborador:

```sql
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change, email_change_token_new,
  created_at, updated_at
)
values
  ('11111111-1111-1111-1111-111111111111', ...), -- admin, já existe
  ('22222222-2222-2222-2222-222222222222', ...), -- ana, já existe
  ('33333333-3333-3333-3333-333333333333', ...), -- bruno, já existe
  ('44444444-4444-4444-4444-444444444444',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'colaborador@cliqueestudos.com.br', crypt('senha-de-teste', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"nome":"Colaborador Teste","cpf":"32165498771","telefone":"61966666666"}',
   '', '', '', '',
   now(), now());
```

(mantém as três linhas existentes exatamente como estão — só acrescenta a
quarta, com vírgula depois da linha do Bruno). Logo abaixo do
`update profiles set role = 'admin' where id = '111...'`, adicionar:

```sql
update profiles set role = 'colaborador'
  where id = '44444444-4444-4444-4444-444444444444';
```

- [ ] **Step 3: Escrever o teste de RLS**

Criar `tests/integracao/rls-colaborador.test.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(url, service, { auth: { persistSession: false } })

async function clienteColaborador() {
  const c = createClient(url, anon, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({
    email: 'colaborador@cliqueestudos.com.br',
    password: 'senha-de-teste',
  })
  if (error) throw error
  return c
}

describe('RLS do colaborador', () => {
  it('deixa o colaborador ver todas as matrículas, como o admin', async () => {
    const c = await clienteColaborador()
    const { data, error } = await c.from('matriculas').select('codigo')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(2)
  })

  it('deixa o colaborador editar um interno', async () => {
    const c = await clienteColaborador()
    const { data: interno } = await admin
      .from('internos').select('id, nome').limit(1).single()

    const { error } = await c
      .from('internos')
      .update({ nome: interno!.nome })
      .eq('id', interno!.id)
    expect(error).toBeNull()
  })

  it('impede o colaborador de criar curso', async () => {
    const c = await clienteColaborador()
    const { error } = await c.from('cursos').insert({
      slug: 'invasor-colaborador', titulo: 'x', descricao: 'x', ementa: 'x',
      carga_horaria: 1, preco_centavos: 0, categoria: 'x',
    })
    expect(error).not.toBeNull()
  })

  it('impede o colaborador de editar unidade prisional', async () => {
    const c = await clienteColaborador()
    const { data: unidade } = await admin
      .from('unidades_prisionais').select('id, nome').limit(1).single()

    const { error } = await c
      .from('unidades_prisionais')
      .update({ nome: unidade!.nome })
      .eq('id', unidade!.id)
    expect(error).not.toBeNull()
  })

  it('impede o colaborador de mudar o próprio papel', async () => {
    const c = await clienteColaborador()
    const { data: user } = await c.auth.getUser()

    const { error } = await c
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.user!.id)
    expect(error).not.toBeNull()

    const { data: depois } = await admin
      .from('profiles').select('role').eq('id', user.user!.id).single()
    expect(depois!.role).toBe('colaborador')
  })
})
```

- [ ] **Step 4: Rodar tudo**

Run: `npx supabase db reset && npm run test:integracao -- rls-colaborador`
Expected: as 5 novas asserções passam.

- [ ] **Step 5: Rodar a suíte de RLS antiga também, pra confirmar que nada quebrou**

Run: `npm run test:integracao -- rls`
Expected: os 11 testes antigos de `rls.test.ts` continuam passando —
`is_admin()` sozinho não foi tocado, só as policies que passaram a aceitar
`is_equipe()` também.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260901000002_rls_colaborador.sql supabase/seed.sql tests/integracao/rls-colaborador.test.ts
git commit -m "feat: is_equipe() e RLS do colaborador em internos/matriculas/pagamentos"
```

---

### Task 3: Região nas unidades prisionais + as 7 unidades reais do DF

**Files:**
- Create: `supabase/migrations/20260901000003_regiao_unidades.sql`
- Modify: `supabase/seed.sql`

**Interfaces:**
- Produces: coluna `unidades_prisionais.regiao` (`text`, nullable).

- [ ] **Step 1: Criar a migration do campo e das unidades novas**

Criar `supabase/migrations/20260901000003_regiao_unidades.sql`:

```sql
-- Agrupamento visual das unidades por região (Papuda, Gama, SIA, Federal
-- no DF). Não é uma entidade própria: nasce junto com a unidade, sem tela
-- de gestão separada — decisão explícita da spec.
alter table unidades_prisionais add column regiao text;

-- As 5 unidades do DF que ainda não existem em nenhum ambiente. As outras
-- 2 (PDF I e CDP, região Papuda) já existem no seed local com endereço de
-- desenvolvimento — este INSERT não duplica, só completa. Endereço e CEP
-- não foram fornecidos pelo cliente e não serão inventados: nascem como
-- "A CONFIRMAR", editável depois em /admin/unidades.
insert into unidades_prisionais (uf, nome, regiao, endereco, cep, responsavel_nucleo)
values
  ('DF', 'Penitenciária do Distrito Federal II', 'Papuda', 'A CONFIRMAR', '00000000', 'Chefe do Núcleo de Ensino'),
  ('DF', 'Centro de Internamento e Reeducação', 'Papuda', 'A CONFIRMAR', '00000000', 'Chefe do Núcleo de Ensino'),
  ('DF', 'Penitenciária Feminina do Distrito Federal', 'Gama', 'A CONFIRMAR', '00000000', 'Chefe do Núcleo de Ensino'),
  ('DF', 'Centro de Progressão Penitenciária', 'SIA', 'A CONFIRMAR', '00000000', 'Chefe do Núcleo de Ensino'),
  ('DF', 'Penitenciária Federal de Brasília', 'Federal', 'A CONFIRMAR', '00000000', 'Chefe do Núcleo de Ensino');
```

- [ ] **Step 2: Alinhar as 2 unidades do DF que já existem no seed local**

Em `supabase/seed.sql`, no bloco `insert into unidades_prisionais`,
localizar as duas linhas de DF (ids `aaaaaaaa-...0001` e `...0002`) e
ajustar nome e adicionar `regiao`:

```sql
insert into unidades_prisionais (id, uf, nome, regiao, endereco, cep, responsavel_nucleo, telefone) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'DF',
   'Penitenciária do Distrito Federal I', 'Papuda',
   'Rodovia DF-465, s/n, São Sebastião', '71693000',
   'Chefe do Núcleo de Ensino', '6133060000'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'DF',
   'Centro de Detenção Provisória', 'Papuda',
   'Rodovia DF-465, s/n, São Sebastião', '71693000',
   'Chefe do Núcleo de Ensino', '6133060001'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'GO',
   'Complexo Prisional de Aparecida de Goiânia', null,
   'Rodovia BR-153, km 5, Aparecida de Goiânia', '74936600',
   'Agente de Ensino', '6232010000');
```

(só adiciona a coluna `regiao` na lista de colunas e o valor `'Papuda'` /
`null` em cada linha — nome, endereço e demais campos ficam como estavam).

- [ ] **Step 3: Aplicar e verificar localmente**

Run: `npx supabase db reset && npm run db:tipos`
Expected: reset limpo; `lib/supabase/tipos.ts` passa a incluir a coluna
`regiao` em `unidades_prisionais`.

Run: `npx tsc --noEmit && npm test && npm run test:integracao`
Expected: tudo verde — nenhum teste depende do texto exato dos nomes de
unidade do DF.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260901000003_regiao_unidades.sql supabase/seed.sql lib/supabase/tipos.ts
git commit -m "feat: campo regiao em unidades prisionais + 5 unidades reais do DF"
```

---

### Task 4: `exigirEquipe()`, layout do admin e ações compartilhadas

**Files:**
- Modify: `lib/auth.ts`
- Modify: `app/(admin)/layout.tsx`
- Modify: `app/(admin)/admin/cursos/page.tsx`
- Modify: `app/(admin)/admin/unidades/page.tsx`
- Modify: `app/(admin)/admin/fretes/page.tsx`
- Modify: `lib/admin/acoes.ts`

**Interfaces:**
- Consumes: `Perfil` (já existe em `lib/auth.ts`).
- Produces: `exigirEquipe(): Promise<Perfil>` — redireciona pra `/` se o
  papel não for `admin` nem `colaborador`. Páginas e Server Actions
  passam a escolher entre `exigirAdmin()` (só admin) e `exigirEquipe()`
  (admin ou colaborador).

- [ ] **Step 1: Adicionar `exigirEquipe()` a `lib/auth.ts`**

Em `lib/auth.ts`, localizar:

```ts
export type Perfil = {
  id: string
  nome: string
  email: string
  telefone: string
  role: 'responsavel' | 'admin'
}
```

Substituir por:

```ts
export type Perfil = {
  id: string
  nome: string
  email: string
  telefone: string
  role: 'responsavel' | 'admin' | 'colaborador'
}
```

Logo depois de `exigirAdmin()`, no final do arquivo, adicionar:

```ts
/** Admin ou colaborador: o alcance comum de Alunos e Matrículas. */
export async function exigirEquipe(): Promise<Perfil> {
  const perfil = await exigirUsuario()
  if (perfil.role !== 'admin' && perfil.role !== 'colaborador') redirect('/')
  return perfil
}
```

- [ ] **Step 2: Atualizar o layout do admin**

Em `app/(admin)/layout.tsx`, trocar `exigirAdmin` por `exigirEquipe` no
import e na chamada, e filtrar o menu pelo papel. Substituir o arquivo
inteiro por:

```tsx
import Link from 'next/link'
import { sair } from '@/app/(site)/entrar/acoes'
import { exigirEquipe } from '@/lib/auth'

const LINKS_EQUIPE = [
  { href: '/admin', rotulo: 'Painel' },
  { href: '/admin/alunos', rotulo: 'Alunos' },
  { href: '/admin/matriculas', rotulo: 'Matrículas' },
]

const LINKS_ADMIN = [
  { href: '/admin/cursos', rotulo: 'Cursos' },
  { href: '/admin/unidades', rotulo: 'Unidades' },
  { href: '/admin/fretes', rotulo: 'Fretes' },
]

export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode
}) {
  const perfil = await exigirEquipe()
  const links =
    perfil.role === 'admin' ? [...LINKS_EQUIPE, ...LINKS_ADMIN] : LINKS_EQUIPE

  return (
    <div className="min-h-screen bg-fundo">
      <header className="border-b border-borda bg-fundo-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-6 py-4">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-acento text-sm font-extrabold text-fundo">
              C
            </span>
            <span className="text-lg font-bold tracking-tight text-texto">
              Clique Estudos
            </span>
          </Link>

          <nav className="flex flex-wrap gap-4 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-texto-suave transition-colors hover:text-acento"
              >
                {l.rotulo}
              </Link>
            ))}
          </nav>

          <form action={sair} className="ml-auto">
            <button
              type="submit"
              className="text-sm text-texto-suave transition-colors hover:text-acento"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Fechar Cursos/Unidades/Fretes atrás de `exigirAdmin()` na própria página**

O layout agora só garante "é equipe" — cada uma dessas três páginas
precisa checar "é admin" de novo, senão um colaborador que descobre a URL
entra. Em `app/(admin)/admin/cursos/page.tsx`, adicionar o import e a
chamada logo no início da função:

```tsx
import { exigirAdmin } from '@/lib/auth'
```

```tsx
export default async function CursosAdmin() {
  await exigirAdmin()
  const supabase = criarClienteAdmin()
  // ... resto do arquivo sem mudança
```

Repetir exatamente o mesmo padrão (import de `exigirAdmin` de
`@/lib/auth` + `await exigirAdmin()` como primeira linha da função) em
`app/(admin)/admin/unidades/page.tsx` (função `UnidadesAdmin`) e
`app/(admin)/admin/fretes/page.tsx` (função `Fretes`).

- [ ] **Step 4: Colaborador também gerencia status e reconciliação de pagamento**

Em `lib/admin/acoes.ts`, trocar o import `exigirAdmin` por `exigirEquipe`
e usar `exigirEquipe()` nas duas funções que fazem parte do trabalho do
colaborador — `mudarStatus` e `reconciliarPagamento`. `salvarCurso`,
`salvarUnidade` e `salvarFrete` continuam com `exigirAdmin()`, sem
mudança.

Localizar:

```ts
import { exigirAdmin } from '@/lib/auth'
```

Substituir por:

```ts
import { exigirAdmin, exigirEquipe } from '@/lib/auth'
```

Em `mudarStatus`, trocar a primeira linha do corpo:

```ts
export async function mudarStatus(formData: FormData) {
  const perfil = await exigirEquipe()
```

Em `reconciliarPagamento`, trocar:

```ts
export async function reconciliarPagamento(formData: FormData) {
  await exigirEquipe()
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit`
Expected: limpo.

- [ ] **Step 6: Testar ao vivo no navegador**

Suba o dev server (`npm run dev`), logue como
`colaborador@cliqueestudos.com.br` / `senha-de-teste` em
`/entrar-equipe`, e confirme:
- Menu mostra só Painel, Alunos (ainda não existe — 404 esperado nesta
  task), Matrículas.
- Acessar `/admin/cursos` direto pela URL redireciona pra `/` (não pra
  `/entrar-equipe` — já está autenticado, só não tem o papel certo).
- Logado como `admin@cliqueestudos.com.br`, o menu mostra todos os links,
  incluindo Cursos/Unidades/Fretes.

- [ ] **Step 7: Commit**

```bash
git add lib/auth.ts app/\(admin\)/layout.tsx app/\(admin\)/admin/cursos/page.tsx app/\(admin\)/admin/unidades/page.tsx app/\(admin\)/admin/fretes/page.tsx lib/admin/acoes.ts
git commit -m "feat: exigirEquipe() e admin fecha Cursos/Unidades/Fretes pra admin puro"
```

---

### Task 5: Unidades agrupadas por região

**Files:**
- Modify: `app/(admin)/admin/unidades/page.tsx`
- Modify: `components/admin/FormularioUnidade.tsx`
- Modify: `lib/admin/acoes.ts`

**Interfaces:**
- Consumes: coluna `unidades_prisionais.regiao` (Task 3).

- [ ] **Step 1: Campo região no schema e na Server Action**

Em `lib/admin/acoes.ts`, localizar `EsquemaUnidadeAdmin` e adicionar o
campo `regiao`:

```ts
const EsquemaUnidadeAdmin = z.object({
  id: z.string().uuid().optional(),
  uf: z.enum(UFS),
  nome: z.string().trim().min(3),
  regiao: z.string().trim().optional(),
  endereco: z.string().trim().min(5),
  cep: z.string().transform((v) => v.replace(/\D/g, '')).refine((v) => v.length === 8, 'CEP inválido'),
  responsavelNucleo: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
  ativa: z.coerce.boolean(),
})
```

Em `salvarUnidade`, no `.parse`, adicionar a linha de `regiao` (mesmo
padrão de `responsavelNucleo`, que já converte string vazia em
`undefined`):

```ts
  const d = EsquemaUnidadeAdmin.parse({
    id: formData.get('id') || undefined,
    uf: formData.get('uf'),
    nome: formData.get('nome'),
    regiao: formData.get('regiao') || undefined,
    endereco: formData.get('endereco'),
    cep: formData.get('cep'),
    responsavelNucleo: formData.get('responsavelNucleo') || undefined,
    telefone: formData.get('telefone') || undefined,
    ativa: formData.get('ativa') === 'on',
  })
```

E na `linha` montada logo depois, adicionar `regiao: d.regiao ?? null,`
junto dos outros campos.

- [ ] **Step 2: Campo região no formulário**

Em `components/admin/FormularioUnidade.tsx`, adicionar `regiao` ao tipo
`Unidade`:

```ts
type Unidade = {
  id: string
  uf: string
  nome: string
  regiao: string | null
  endereco: string
  cep: string
  responsavel_nucleo: string | null
  telefone: string | null
  ativa: boolean
}
```

E um campo de texto logo depois do campo "Nome da unidade":

```tsx
        <label className="block">
          <span className="text-sm font-medium text-texto">Região</span>
          <input
            name="regiao"
            defaultValue={unidade?.regiao ?? ''}
            placeholder="Ex.: Papuda, Gama, SIA"
            className={campo}
          />
        </label>
```

- [ ] **Step 3: Agrupar a lista por região**

Reescrever `app/(admin)/admin/unidades/page.tsx` inteiro:

```tsx
import { exigirAdmin } from '@/lib/auth'
import { FormularioUnidade } from '@/components/admin/FormularioUnidade'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Unidades — Clique Estudos' }

type Unidade = {
  id: string
  uf: string
  nome: string
  regiao: string | null
  endereco: string
  cep: string
  responsavel_nucleo: string | null
  telefone: string | null
  ativa: boolean
}

const SEM_REGIAO = 'Sem região definida'

function agruparPorRegiao(unidades: Unidade[]): [string, Unidade[]][] {
  const grupos = new Map<string, Unidade[]>()
  for (const u of unidades) {
    const chave = u.regiao?.trim() || SEM_REGIAO
    grupos.set(chave, [...(grupos.get(chave) ?? []), u])
  }
  return [...grupos.entries()].sort(([a], [b]) => {
    if (a === SEM_REGIAO) return 1
    if (b === SEM_REGIAO) return -1
    return a.localeCompare(b)
  })
}

export default async function UnidadesAdmin() {
  await exigirAdmin()

  const supabase = criarClienteAdmin()
  const { data } = await supabase
    .from('unidades_prisionais')
    .select('*')
    .order('uf')
    .order('nome')

  const grupos = agruparPorRegiao((data ?? []) as Unidade[])

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">Unidades prisionais</h1>

      <details className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <summary className="cursor-pointer font-semibold text-acento">Nova unidade</summary>
        <div className="mt-4">
          <FormularioUnidade />
        </div>
      </details>

      {grupos.map(([regiao, unidades]) => (
        <section key={regiao} className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-fraco">
            {regiao}
          </h2>
          <ul className="mt-3 space-y-3">
            {unidades.map((u) => (
              <li key={u.id} className="rounded-cartao border border-borda bg-cartao">
                <details>
                  <summary className="cursor-pointer p-4">
                    <span className="font-mono text-sm font-bold text-acento">{u.uf}</span>
                    <span className="ml-3 font-medium text-texto">{u.nome}</span>
                    {!u.ativa && <span className="ml-3 text-sm text-texto-fraco">inativa</span>}
                  </summary>
                  <div className="border-t border-borda p-4">
                    <FormularioUnidade unidade={u} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
```

(o `await exigirAdmin()` desta reescrita substitui o import que a Task 4
já tinha adicionado — não fazer duas vezes).

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit && npm test && npm run test:integracao`
Expected: tudo verde.

- [ ] **Step 5: Testar ao vivo**

`npm run dev`, logue como admin, abra `/admin/unidades` e confirme que as
unidades aparecem agrupadas (Papuda com PDF I/PDF II/CDP/CIR, Gama com
PFDF, SIA com CPP, Federal com Penitenciária Federal de Brasília, e GO
sem região). Edite a região de uma unidade e confirme que ela migra de
grupo ao recarregar.

- [ ] **Step 6: Commit**

```bash
git add app/\(admin\)/admin/unidades/page.tsx components/admin/FormularioUnidade.tsx lib/admin/acoes.ts
git commit -m "feat: agrupa unidades prisionais por regiao no admin"
```

---

### Task 6: Consultas e ação de edição de Alunos

**Files:**
- Modify: `lib/admin/consultas.ts`
- Modify: `lib/admin/acoes.ts`

**Interfaces:**
- Produces:
  - `listarAlunosAdmin(filtro?: { busca?: string }): Promise<AlunoResumo[]>`
  - `obterAlunoAdmin(id: string): Promise<AlunoDetalhe | null>`
  - `salvarAluno(formData: FormData): Promise<void>` — Server Action

- [ ] **Step 1: Consultas**

Em `lib/admin/consultas.ts`, adicionar ao final do arquivo:

```ts
export type AlunoResumo = {
  id: string
  nome: string
  cpf: string
  matriculaPrisional: string
  unidade: { nome: string; uf: string; regiao: string | null } | null
  totalMatriculas: number
}

export async function listarAlunosAdmin(filtro?: {
  busca?: string
}): Promise<AlunoResumo[]> {
  const supabase = criarClienteAdmin()

  let consulta = supabase
    .from('internos')
    .select(
      `
      id, nome, cpf, matricula_prisional,
      unidades_prisionais:unidade_prisional_id (nome, uf, regiao),
      matriculas:matriculas (id)
    `,
    )
    .order('nome')

  if (filtro?.busca) {
    consulta = consulta.or(`nome.ilike.%${filtro.busca}%,cpf.eq.${filtro.busca}`)
  }

  const { data } = await consulta

  return (data ?? []).map((i) => {
    const linha = i as unknown as {
      id: string
      nome: string
      cpf: string
      matricula_prisional: string
      unidades_prisionais: { nome: string; uf: string; regiao: string | null } | null
      matriculas: { id: string }[] | null
    }
    return {
      id: linha.id,
      nome: linha.nome,
      cpf: linha.cpf,
      matriculaPrisional: linha.matricula_prisional,
      unidade: linha.unidades_prisionais,
      totalMatriculas: linha.matriculas?.length ?? 0,
    }
  })
}

export type AlunoDetalhe = {
  interno: {
    id: string
    nome: string
    cpf: string
    rg: string | null
    matricula_prisional: string
    data_nascimento: string | null
    unidade_prisional_id: string
    unidades_prisionais: { nome: string; uf: string; regiao: string | null } | null
    profiles: { nome: string; email: string; telefone: string } | null
  }
  matriculas: {
    id: string
    codigo: string
    status: string
    total_centavos: number
    created_at: string
    cursos: { titulo: string } | null
  }[]
}

export async function obterAlunoAdmin(id: string): Promise<AlunoDetalhe | null> {
  const supabase = criarClienteAdmin()

  const { data: interno } = await supabase
    .from('internos')
    .select(
      `
      id, nome, cpf, rg, matricula_prisional, data_nascimento, unidade_prisional_id,
      unidades_prisionais:unidade_prisional_id (nome, uf, regiao),
      profiles:responsavel_id (nome, email, telefone)
    `,
    )
    .eq('id', id)
    .maybeSingle()

  if (!interno) return null

  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('id, codigo, status, total_centavos, created_at, cursos:curso_id (titulo)')
    .eq('interno_id', id)
    .order('created_at', { ascending: false })

  return {
    interno: interno as unknown as AlunoDetalhe['interno'],
    matriculas: (matriculas ?? []) as unknown as AlunoDetalhe['matriculas'],
  }
}
```

- [ ] **Step 2: Server Action de edição**

Em `lib/admin/acoes.ts`, adicionar ao final:

```ts
const EsquemaAlunoAdmin = z.object({
  id: z.string().uuid(),
  nome: z.string().trim().min(3),
  cpf: z.string().trim().min(11),
  rg: z.string().trim().optional(),
  matriculaPrisional: z.string().trim().min(1),
  dataNascimento: z.string().trim().optional(),
  unidadeId: z.string().uuid(),
})

export async function salvarAluno(formData: FormData) {
  await exigirEquipe()

  const d = EsquemaAlunoAdmin.parse({
    id: formData.get('id'),
    nome: formData.get('nome'),
    cpf: formData.get('cpf'),
    rg: formData.get('rg') || undefined,
    matriculaPrisional: formData.get('matriculaPrisional'),
    dataNascimento: formData.get('dataNascimento') || undefined,
    unidadeId: formData.get('unidadeId'),
  })

  const supabase = criarClienteAdmin()
  await supabase
    .from('internos')
    .update({
      nome: d.nome,
      cpf: d.cpf.replace(/\D/g, ''),
      rg: d.rg ?? null,
      matricula_prisional: d.matriculaPrisional,
      data_nascimento: d.dataNascimento ?? null,
      unidade_prisional_id: d.unidadeId,
    })
    .eq('id', d.id)

  revalidatePath(`/admin/alunos/${d.id}`)
  revalidatePath('/admin/alunos')
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`
Expected: limpo (nenhuma página consome essas funções ainda — só checagem
de tipos).

- [ ] **Step 4: Commit**

```bash
git add lib/admin/consultas.ts lib/admin/acoes.ts
git commit -m "feat: consultas e edicao de alunos no admin"
```

---

### Task 7: Páginas de Alunos (lista e detalhe)

**Files:**
- Create: `components/admin/FormularioAluno.tsx`
- Create: `app/(admin)/admin/alunos/page.tsx`
- Create: `app/(admin)/admin/alunos/[id]/page.tsx`

**Interfaces:**
- Consumes: `listarAlunosAdmin`, `obterAlunoAdmin`, `salvarAluno` (Task 6).

- [ ] **Step 1: Formulário de edição do aluno**

Criar `components/admin/FormularioAluno.tsx`:

```tsx
import { salvarAluno } from '@/lib/admin/acoes'
import { criarClienteAdmin } from '@/lib/supabase/admin'

type Aluno = {
  id: string
  nome: string
  cpf: string
  rg: string | null
  matricula_prisional: string
  data_nascimento: string | null
  unidade_prisional_id: string
}

export async function FormularioAluno({ aluno }: { aluno: Aluno }) {
  const supabase = criarClienteAdmin()
  const { data: unidades } = await supabase
    .from('unidades_prisionais')
    .select('id, uf, nome')
    .order('uf')
    .order('nome')

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <form action={salvarAluno} className="space-y-4">
      <input type="hidden" name="id" value={aluno.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-texto">Nome</span>
          <input name="nome" defaultValue={aluno.nome} className={campo} required />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">CPF</span>
          <input name="cpf" defaultValue={aluno.cpf} className={campo} required />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">RG</span>
          <input name="rg" defaultValue={aluno.rg ?? ''} className={campo} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Matrícula prisional</span>
          <input
            name="matriculaPrisional"
            defaultValue={aluno.matricula_prisional}
            className={campo}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Data de nascimento</span>
          <input
            name="dataNascimento"
            type="date"
            defaultValue={aluno.data_nascimento ?? ''}
            className={campo}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-texto">Unidade prisional</span>
          <select
            name="unidadeId"
            defaultValue={aluno.unidade_prisional_id}
            className={campo}
            required
          >
            {(unidades ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.uf} · {u.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
      >
        Salvar aluno
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Lista de alunos**

Criar `app/(admin)/admin/alunos/page.tsx`:

```tsx
import Link from 'next/link'
import { listarAlunosAdmin } from '@/lib/admin/consultas'
import { formatarCpf } from '@/lib/dominio/cpf'

export const metadata = { title: 'Alunos — Clique Estudos' }

export default async function Alunos({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>
}) {
  const { busca } = await searchParams
  const alunos = await listarAlunosAdmin({ busca })

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-texto">Alunos</h1>
        <Link
          href="/admin/alunos/novo"
          className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
        >
          Novo aluno
        </Link>
      </div>

      <form className="mt-6">
        <input
          name="busca"
          defaultValue={busca ?? ''}
          placeholder="Buscar por nome ou CPF"
          className="w-full max-w-sm rounded-lg border border-borda bg-cartao px-3 py-2 text-sm text-texto placeholder:text-texto-fraco"
        />
      </form>

      <div className="mt-8 overflow-x-auto rounded-cartao border border-borda bg-cartao">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-borda text-left text-texto-suave">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">CPF</th>
              <th className="px-4 py-3 font-medium">Matrícula prisional</th>
              <th className="px-4 py-3 font-medium">Unidade</th>
              <th className="px-4 py-3 font-medium">Cursos</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((a) => (
              <tr key={a.id} className="border-b border-borda last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/alunos/${a.id}`}
                    className="font-medium text-acento hover:underline"
                  >
                    {a.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-texto">{formatarCpf(a.cpf)}</td>
                <td className="px-4 py-3 text-texto">{a.matriculaPrisional}</td>
                <td className="px-4 py-3 text-texto">
                  {a.unidade ? `${a.unidade.nome} (${a.unidade.uf})` : '—'}
                </td>
                <td className="px-4 py-3 text-texto">{a.totalMatriculas}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {alunos.length === 0 && (
          <p className="p-6 text-sm text-texto-fraco">Nenhum aluno encontrado.</p>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Detalhe do aluno**

Criar `app/(admin)/admin/alunos/[id]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FormularioAluno } from '@/components/admin/FormularioAluno'
import { Selo } from '@/components/ui/Selo'
import { obterAlunoAdmin } from '@/lib/admin/consultas'
import { formatarCpf } from '@/lib/dominio/cpf'
import { formatarBRL } from '@/lib/dominio/precos'
import type { StatusMatricula } from '@/lib/dominio/tipos'

export const metadata = { title: 'Aluno — Clique Estudos' }

export default async function DetalheAluno({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const resultado = await obterAlunoAdmin(id)
  if (!resultado) notFound()

  const { interno, matriculas } = resultado

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin/alunos" className="text-sm text-acento hover:underline">
        ← Alunos
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-texto">{interno.nome}</h1>
      <p className="mt-1 text-sm text-texto-fraco">
        CPF {formatarCpf(interno.cpf)}
        {interno.profiles && ` · Responsável: ${interno.profiles.nome}`}
      </p>

      <section className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <h2 className="font-semibold text-texto">Dados do aluno</h2>
        <div className="mt-4">
          <FormularioAluno aluno={interno} />
        </div>
      </section>

      <section className="mt-8 rounded-cartao border border-borda bg-cartao p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-texto">Matrículas</h2>
          <Link
            href={`/admin/alunos/${interno.id}/nova-matricula`}
            className="text-sm font-semibold text-acento hover:underline"
          >
            + Nova matrícula
          </Link>
        </div>

        <ul className="mt-4 space-y-2">
          {matriculas.map((m) => (
            <li key={m.id}>
              <Link
                href={`/admin/matriculas/${m.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-borda p-3 hover:border-acento/50"
              >
                <span className="text-sm text-texto">
                  <span className="font-mono text-xs text-texto-fraco">{m.codigo}</span>{' '}
                  {m.cursos?.titulo}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-sm text-texto-suave">
                    {formatarBRL(m.total_centavos)}
                  </span>
                  <Selo status={m.status as StatusMatricula} />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {matriculas.length === 0 && (
          <p className="mt-4 text-sm text-texto-fraco">Nenhuma matrícula ainda.</p>
        )}
      </section>
    </main>
  )
}
```

(o link "Nova matrícula" aponta para uma rota que a Task 9 vai criar —
até lá, dá 404 se clicado, o que é esperado nesta task).

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: limpo.

- [ ] **Step 5: Testar ao vivo**

`npm run dev`, logue como admin ou colaborador, abra `/admin/alunos`,
busque por nome e CPF, abra o detalhe de um aluno, edite o nome e
confirme que salva e aparece atualizado na lista.

- [ ] **Step 6: Commit**

```bash
git add components/admin/FormularioAluno.tsx app/\(admin\)/admin/alunos
git commit -m "feat: paginas de alunos (lista e detalhe) no admin"
```

---

### Task 8: Matrícula manual — lógica de negócio

Mesma separação que `lib/auth-cpf.ts` (lógica pura, testável, sem
`cookies()`) tem de `app/(site)/entrar/acoes.ts` (Server Action fina que
chama `redirect()`): `redirect()` do `next/navigation` só funciona dentro
de uma requisição real do Next — chamado direto por um teste Vitest, o
comportamento não é confiável. Por isso a lógica de negócio (Passo 3) fica
num módulo comum, sem `'use server'` e sem `redirect()`, testável direto;
a Server Action que faz `FormData` → `redirect()` é a Task 9.

**Files:**
- Create: `lib/admin/matricula-manual.ts`
- Test: `tests/integracao/matricula-manual.test.ts`

**Interfaces:**
- Consumes: `criarMatricula` (`lib/matricula/acoes.ts`), `obterCurso`
  (`lib/catalogo.ts`), `obterFrete` (`lib/frete.ts`), `avancarStatus`
  (`lib/matricula/avancar.ts`).
- Produces:
  - `registrarMatriculaManualNovoAluno(entrada: { cursoSlug: string; unidade: DadosUnidade; interno: DadosInterno; responsavel: DadosResponsavel }): Promise<ResultadoMatriculaManual>`
  - `registrarMatriculaParaAlunoExistente(entrada: { internoId: string; cursoSlug: string }): Promise<ResultadoMatriculaManual>`
  - `type ResultadoMatriculaManual = { ok: true; matriculaId: string; codigo: string } | { ok: false; erro: string }`

- [ ] **Step 1: Escrever o teste de integração**

Criar `tests/integracao/matricula-manual.test.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import {
  registrarMatriculaManualNovoAluno,
  registrarMatriculaParaAlunoExistente,
} from '@/lib/admin/matricula-manual'

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

function novoCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  function dv(digs: number[], pesoInicial: number) {
    let soma = 0
    digs.forEach((d, i) => {
      soma += d * (pesoInicial - i)
    })
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  const d1 = dv(base, 10)
  const d2 = dv([...base, d1], 11)
  return [...base, d1, d2].join('')
}

async function unidadeDf(): Promise<string> {
  const { data } = await admin
    .from('unidades_prisionais')
    .select('id')
    .eq('uf', 'DF')
    .limit(1)
    .single()
  return data!.id
}

describe('registrarMatriculaManualNovoAluno', () => {
  it('cria a matricula ja como paga, com pagamento manual', async () => {
    const r = await registrarMatriculaManualNovoAluno({
      cursoSlug: 'auxiliar-de-cozinha',
      unidade: { uf: 'DF', unidadeId: await unidadeDf() },
      interno: {
        nome: 'Aluno Manual Teste',
        cpf: novoCpf(),
        matriculaPrisional: 'MP-MANUAL-0001',
      },
      responsavel: {
        nome: 'Responsavel Manual',
        cpf: novoCpf(),
        email: `manual-${Date.now()}@exemplo.com`,
        telefone: '61999990000',
        parentesco: 'Mãe',
      },
    })

    expect(r.ok).toBe(true)
    if (!r.ok) return

    const { data: matricula } = await admin
      .from('matriculas')
      .select('status, total_centavos')
      .eq('id', r.matriculaId)
      .single()

    expect(matricula!.status).toBe('paga')

    const { data: pagamento } = await admin
      .from('pagamentos')
      .select('metodo, status, valor_centavos')
      .eq('gateway', 'manual')
      .eq('gateway_ref', `manual-${r.codigo}`)
      .single()

    expect(pagamento!.metodo).toBe('manual')
    expect(pagamento!.status).toBe('pago')
    expect(pagamento!.valor_centavos).toBe(matricula!.total_centavos)

    const { data: eventos } = await admin
      .from('matricula_eventos')
      .select('para_status, nota')
      .eq('matricula_id', r.matriculaId)
      .order('created_at')

    expect(eventos!.map((e) => e.para_status)).toEqual([
      'aguardando_pagamento',
      'paga',
    ])
  })
})

describe('registrarMatriculaParaAlunoExistente', () => {
  it('reaproveita interno e responsavel, so pede o curso', async () => {
    const primeira = await registrarMatriculaManualNovoAluno({
      cursoSlug: 'auxiliar-de-cozinha',
      unidade: { uf: 'DF', unidadeId: await unidadeDf() },
      interno: {
        nome: 'Aluno Segunda Matricula',
        cpf: novoCpf(),
        matriculaPrisional: 'MP-MANUAL-0002',
      },
      responsavel: {
        nome: 'Responsavel Segunda',
        cpf: novoCpf(),
        email: `manual2-${Date.now()}@exemplo.com`,
        telefone: '61999991111',
        parentesco: 'Pai',
      },
    })
    expect(primeira.ok).toBe(true)
    if (!primeira.ok) return

    const { data: interno } = await admin
      .from('internos').select('id, responsavel_id')
      .eq('matricula_prisional', 'MP-MANUAL-0002').single()

    const segunda = await registrarMatriculaParaAlunoExistente({
      internoId: interno!.id,
      cursoSlug: 'formacao-para-eletricista',
    })
    expect(segunda.ok).toBe(true)

    const { data: matriculas } = await admin
      .from('matriculas')
      .select('responsavel_id, status')
      .eq('interno_id', interno!.id)

    expect(matriculas!.length).toBe(2)
    expect(matriculas!.every((m) => m.responsavel_id === interno!.responsavel_id)).toBe(true)
    expect(matriculas!.every((m) => m.status === 'paga')).toBe(true)
  })

  it('recusa aluno inexistente', async () => {
    const r = await registrarMatriculaParaAlunoExistente({
      internoId: '00000000-0000-0000-0000-000000000000',
      cursoSlug: 'auxiliar-de-cozinha',
    })
    expect(r).toEqual({ ok: false, erro: 'Aluno não encontrado' })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:integracao -- matricula-manual`
Expected: FAIL — `lib/admin/matricula-manual.ts` ainda não existe.

- [ ] **Step 3: Implementar**

Criar `lib/admin/matricula-manual.ts`. Sem `'use server'`: é lógica pura,
igual `criarMatricula()` — quem faz `FormData` e `redirect()` é a Server
Action da Task 9. `import 'server-only'` no topo, mesmo padrão de
`lib/auth-cpf.ts` e `lib/admin/consultas.ts`: garante erro de build se
algum componente cliente importar isto por engano, em vez de vazar
`criarClienteAdmin()` (service role) pro bundle do navegador.

```ts
import 'server-only'
import { obterCurso } from '@/lib/catalogo'
import { calcularTotal } from '@/lib/dominio/precos'
import type {
  DadosInterno,
  DadosResponsavel,
  DadosUnidade,
} from '@/lib/dominio/esquemas'
import { obterFrete } from '@/lib/frete'
import { criarMatricula } from '@/lib/matricula/acoes'
import { avancarStatus } from '@/lib/matricula/avancar'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type ResultadoMatriculaManual =
  | { ok: true; matriculaId: string; codigo: string }
  | { ok: false; erro: string }

/**
 * Cadastro manual acontece depois que o pagamento já foi confirmado fora
 * do site (telefone, presencial) — a matrícula entra direto em `paga`,
 * mas passa pelos mesmos dois avanços de status que uma compra online,
 * pra manter a mesma trilha de auditoria.
 */
async function confirmarPagamentoManual(matriculaId: string): Promise<void> {
  const supabase = criarClienteAdmin()

  const { data: matricula } = await supabase
    .from('matriculas')
    .select('codigo, total_centavos')
    .eq('id', matriculaId)
    .single()

  await supabase.from('pagamentos').insert({
    matricula_id: matriculaId,
    gateway: 'manual',
    gateway_ref: `manual-${matricula!.codigo}`,
    metodo: 'manual',
    valor_centavos: matricula!.total_centavos,
    status: 'pago',
    pago_em: new Date().toISOString(),
  })

  await avancarStatus({
    matriculaId,
    para: 'aguardando_pagamento',
    nota: 'Matrícula cadastrada manualmente pelo colaborador',
  })
  await avancarStatus({
    matriculaId,
    para: 'paga',
    nota: 'Pagamento confirmado manualmente',
  })
}

export async function registrarMatriculaManualNovoAluno(entrada: {
  cursoSlug: string
  unidade: DadosUnidade
  interno: DadosInterno
  responsavel: DadosResponsavel
}): Promise<ResultadoMatriculaManual> {
  // criarMatricula já valida unidade/interno/responsável com os mesmos
  // esquemas do site — revalidar aqui seria duplicar a checagem.
  const resultado = await criarMatricula({
    cursoSlug: entrada.cursoSlug,
    rascunho: { unidade: entrada.unidade, interno: entrada.interno },
    responsavel: entrada.responsavel,
  })

  if (!resultado.ok) return resultado

  await confirmarPagamentoManual(resultado.matriculaId)
  return resultado
}

export async function registrarMatriculaParaAlunoExistente(entrada: {
  internoId: string
  cursoSlug: string
}): Promise<ResultadoMatriculaManual> {
  const supabase = criarClienteAdmin()

  const { data: interno } = await supabase
    .from('internos')
    .select(
      'id, responsavel_id, unidade_prisional_id, unidades_prisionais:unidade_prisional_id (uf)',
    )
    .eq('id', entrada.internoId)
    .maybeSingle()

  if (!interno) return { ok: false, erro: 'Aluno não encontrado' }
  if (!interno.responsavel_id) {
    return { ok: false, erro: 'Este aluno não tem responsável vinculado' }
  }

  const { curso, indisponivel } = await obterCurso(entrada.cursoSlug)
  if (indisponivel || !curso) return { ok: false, erro: 'Curso não encontrado' }

  const uf = (interno.unidades_prisionais as unknown as { uf: string } | null)?.uf
  if (!uf) return { ok: false, erro: 'Unidade do aluno não encontrada' }

  let frete: { valorCentavos: number }
  try {
    frete = await obterFrete(uf)
  } catch {
    return { ok: false, erro: `Frete ainda não configurado para ${uf}.` }
  }

  calcularTotal(curso.precoCentavos, frete.valorCentavos)

  const { data: matricula, error } = await supabase
    .from('matriculas')
    .insert({
      interno_id: interno.id,
      curso_id: curso.id,
      responsavel_id: interno.responsavel_id,
      unidade_prisional_id: interno.unidade_prisional_id,
      preco_centavos: curso.precoCentavos,
      frete_centavos: frete.valorCentavos,
      status: 'rascunho',
    })
    .select('id, codigo')
    .single()

  if (error || !matricula) return { ok: false, erro: 'Não foi possível criar a matrícula.' }

  await confirmarPagamentoManual(matricula.id)
  return { ok: true, matriculaId: matricula.id, codigo: matricula.codigo }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:integracao -- matricula-manual`
Expected: PASS nos três testes.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npx tsc --noEmit && npm test && npm run test:integracao`
Expected: tudo verde — nada nas tasks anteriores foi tocado por esta.

- [ ] **Step 6: Commit**

```bash
git add lib/admin/matricula-manual.ts tests/integracao/matricula-manual.test.ts
git commit -m "feat: matricula manual reaproveitando criarMatricula, sem duplicar logica"
```

---

### Task 9: Server Actions e formulários de matrícula manual

**Files:**
- Create: `app/(admin)/admin/alunos/acoes.ts`
- Create: `components/admin/FormularioNovoAluno.tsx`
- Create: `app/(admin)/admin/alunos/novo/page.tsx`
- Create: `components/admin/FormularioNovaMatricula.tsx`
- Create: `app/(admin)/admin/alunos/[id]/nova-matricula/page.tsx`

**Interfaces:**
- Consumes: `registrarMatriculaManualNovoAluno`,
  `registrarMatriculaParaAlunoExistente`, `ResultadoMatriculaManual`
  (Task 8).
- Produces:
  - `cadastrarAlunoEMatricula(_: ResultadoMatriculaManual | null, formData: FormData): Promise<ResultadoMatriculaManual>` — Server Action
  - `matricularAlunoExistente(_: ResultadoMatriculaManual | null, formData: FormData): Promise<ResultadoMatriculaManual>` — Server Action

- [ ] **Step 1: Server Actions — a camada fina que faz `FormData` → `redirect()`**

Criar `app/(admin)/admin/alunos/acoes.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { exigirEquipe } from '@/lib/auth'
import {
  EsquemaInterno,
  EsquemaResponsavel,
  EsquemaUnidade,
} from '@/lib/dominio/esquemas'
import {
  registrarMatriculaManualNovoAluno,
  registrarMatriculaParaAlunoExistente,
  type ResultadoMatriculaManual,
} from '@/lib/admin/matricula-manual'

export async function cadastrarAlunoEMatricula(
  _anterior: ResultadoMatriculaManual | null,
  formData: FormData,
): Promise<ResultadoMatriculaManual> {
  await exigirEquipe()

  const cursoSlug = String(formData.get('cursoSlug') ?? '')
  if (!cursoSlug) return { ok: false, erro: 'Selecione um curso' }

  const unidade = EsquemaUnidade.safeParse({
    uf: formData.get('uf'),
    unidadeId: formData.get('unidadeId'),
  })
  const interno = EsquemaInterno.safeParse({
    nome: formData.get('nome'),
    cpf: formData.get('cpf'),
    matriculaPrisional: formData.get('matriculaPrisional'),
    rg: formData.get('rg') || undefined,
    dataNascimento: formData.get('dataNascimento') || undefined,
  })
  const responsavel = EsquemaResponsavel.safeParse({
    nome: formData.get('responsavelNome'),
    cpf: formData.get('responsavelCpf'),
    email: formData.get('responsavelEmail'),
    telefone: formData.get('responsavelTelefone'),
    parentesco: formData.get('parentesco'),
  })

  if (!unidade.success) return { ok: false, erro: unidade.error.issues[0]!.message }
  if (!interno.success) return { ok: false, erro: interno.error.issues[0]!.message }
  if (!responsavel.success) {
    return { ok: false, erro: responsavel.error.issues[0]!.message }
  }

  const resultado = await registrarMatriculaManualNovoAluno({
    cursoSlug,
    unidade: unidade.data,
    interno: interno.data,
    responsavel: responsavel.data,
  })

  if (!resultado.ok) return resultado
  redirect(`/admin/matriculas/${resultado.matriculaId}`)
}

export async function matricularAlunoExistente(
  _anterior: ResultadoMatriculaManual | null,
  formData: FormData,
): Promise<ResultadoMatriculaManual> {
  await exigirEquipe()

  const internoId = String(formData.get('internoId') ?? '')
  const cursoSlug = String(formData.get('cursoSlug') ?? '')
  if (!cursoSlug) return { ok: false, erro: 'Selecione um curso' }

  const resultado = await registrarMatriculaParaAlunoExistente({ internoId, cursoSlug })

  if (!resultado.ok) return resultado
  redirect(`/admin/matriculas/${resultado.matriculaId}`)
}
```

- [ ] **Step 2: Formulário de novo aluno (client component)**

Criar `components/admin/FormularioNovoAluno.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { cadastrarAlunoEMatricula } from '@/app/(admin)/admin/alunos/acoes'
import type { ResultadoMatriculaManual } from '@/lib/admin/matricula-manual'

type Unidade = { id: string; uf: string; nome: string }
type Curso = { slug: string; titulo: string }

export function FormularioNovoAluno({
  unidades,
  cursos,
}: {
  unidades: Unidade[]
  cursos: Curso[]
}) {
  const [estado, acao, pendente] = useActionState<
    ResultadoMatriculaManual | null,
    FormData
  >(cadastrarAlunoEMatricula, null)

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <form action={acao} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="font-semibold text-texto">Unidade e curso</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-texto">Unidade prisional</span>
            <select
              name="unidadeId"
              className={campo}
              required
              onChange={(e) => {
                const uf = e.currentTarget.selectedOptions[0]?.dataset.uf ?? ''
                const campoUf = e.currentTarget.form?.elements.namedItem(
                  'uf',
                ) as HTMLInputElement | null
                if (campoUf) campoUf.value = uf
              }}
            >
              <option value="">Selecione</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id} data-uf={u.uf}>
                  {u.uf} · {u.nome}
                </option>
              ))}
            </select>
            <input type="hidden" name="uf" />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-texto">Curso</span>
            <select name="cursoSlug" className={campo} required>
              <option value="">Selecione</option>
              {cursos.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.titulo}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-semibold text-texto">Dados do aluno</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-texto">Nome completo</span>
            <input name="nome" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">CPF</span>
            <input name="cpf" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">RG</span>
            <input name="rg" className={campo} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">Matrícula prisional</span>
            <input name="matriculaPrisional" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">Data de nascimento</span>
            <input name="dataNascimento" type="date" className={campo} />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-semibold text-texto">Dados do responsável</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-texto">Nome completo</span>
            <input name="responsavelNome" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">CPF</span>
            <input name="responsavelCpf" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">E-mail</span>
            <input name="responsavelEmail" type="email" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">Telefone</span>
            <input name="responsavelTelefone" className={campo} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-texto">Parentesco</span>
            <input name="parentesco" className={campo} required />
          </label>
        </div>
      </fieldset>

      {estado && !estado.ok && (
        <p role="alert" className="text-sm text-red-400">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo transition hover:bg-acento-claro disabled:opacity-60"
      >
        {pendente ? 'Cadastrando…' : 'Cadastrar aluno e matrícula'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Página de novo aluno**

Criar `app/(admin)/admin/alunos/novo/page.tsx`:

```tsx
import { exigirEquipe } from '@/lib/auth'
import { FormularioNovoAluno } from '@/components/admin/FormularioNovoAluno'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Novo aluno — Clique Estudos' }

export default async function NovoAluno() {
  await exigirEquipe()

  const supabase = criarClienteAdmin()
  const [{ data: unidades }, { data: cursos }] = await Promise.all([
    supabase.from('unidades_prisionais').select('id, uf, nome').eq('ativa', true).order('uf').order('nome'),
    supabase.from('cursos').select('slug, titulo').eq('ativo', true).order('titulo'),
  ])

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">Novo aluno</h1>
      <p className="mt-2 text-sm text-texto-suave">
        Matrícula cadastrada aqui já nasce como paga — preço e frete são
        calculados automaticamente pelo curso e pela unidade escolhidos.
      </p>

      <div className="mt-8">
        <FormularioNovoAluno unidades={unidades ?? []} cursos={cursos ?? []} />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Formulário de nova matrícula pra aluno existente**

Criar `components/admin/FormularioNovaMatricula.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { matricularAlunoExistente } from '@/app/(admin)/admin/alunos/acoes'
import type { ResultadoMatriculaManual } from '@/lib/admin/matricula-manual'

type Curso = { slug: string; titulo: string }

export function FormularioNovaMatricula({
  internoId,
  cursos,
}: {
  internoId: string
  cursos: Curso[]
}) {
  const [estado, acao, pendente] = useActionState<
    ResultadoMatriculaManual | null,
    FormData
  >(matricularAlunoExistente, null)

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="internoId" value={internoId} />

      <label className="block">
        <span className="text-sm font-medium text-texto">Curso</span>
        <select
          name="cursoSlug"
          required
          className="mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto"
        >
          <option value="">Selecione</option>
          {cursos.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.titulo}
            </option>
          ))}
        </select>
      </label>

      {estado && !estado.ok && (
        <p role="alert" className="text-sm text-red-400">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo transition hover:bg-acento-claro disabled:opacity-60"
      >
        {pendente ? 'Matriculando…' : 'Matricular'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Página de nova matrícula**

Criar `app/(admin)/admin/alunos/[id]/nova-matricula/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { exigirEquipe } from '@/lib/auth'
import { FormularioNovaMatricula } from '@/components/admin/FormularioNovaMatricula'
import { obterAlunoAdmin } from '@/lib/admin/consultas'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Nova matrícula — Clique Estudos' }

export default async function NovaMatricula({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await exigirEquipe()
  const { id } = await params

  const aluno = await obterAlunoAdmin(id)
  if (!aluno) notFound()

  const supabase = criarClienteAdmin()
  const { data: cursos } = await supabase
    .from('cursos')
    .select('slug, titulo')
    .eq('ativo', true)
    .order('titulo')

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-bold text-texto">
        Nova matrícula — {aluno.interno.nome}
      </h1>
      <p className="mt-2 text-sm text-texto-suave">
        Reaproveita a unidade e o responsável já cadastrados. Já nasce como
        paga.
      </p>

      <div className="mt-8">
        <FormularioNovaMatricula internoId={aluno.interno.id} cursos={cursos ?? []} />
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit`
Expected: limpo.

- [ ] **Step 7: Testar ao vivo — os dois caminhos completos**

`npm run dev`, logue como colaborador:
- `/admin/alunos/novo`: preencha unidade, curso, aluno e responsável.
  Confirme redirecionamento pra `/admin/matriculas/[id]` com status
  "Matrícula paga" e histórico mostrando as duas notas ("cadastrada
  manualmente" / "confirmado manualmente"). Confirme em
  `/admin/matriculas/[id]` que o pagamento aparece com método `manual`.
- No aluno recém-criado (`/admin/alunos/[id]`), clique "Nova matrícula",
  escolha outro curso, confirme que cria uma segunda matrícula pro mesmo
  aluno, mesmo responsável, e que a lista de matrículas do aluno mostra
  as duas.

- [ ] **Step 8: Commit**

```bash
git add "app/(admin)/admin/alunos/acoes.ts" components/admin/FormularioNovoAluno.tsx "app/(admin)/admin/alunos/novo" components/admin/FormularioNovaMatricula.tsx "app/(admin)/admin/alunos/[id]/nova-matricula"
git commit -m "feat: server actions e formularios de matricula manual (aluno novo e existente)"
```

---

### Task 10: Verificação final e rollout de produção

**Files:** nenhum arquivo novo — só verificação e operações de deploy.

- [ ] **Step 1: Suíte completa localmente**

Run: `npx supabase db reset`
Expected: todas as migrations (incluindo as 3 novas desta feature)
aplicam limpo.

Run: `npx tsc --noEmit && npm test && npm run test:integracao`
Expected: tudo verde.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build limpo, com as rotas novas listadas (`/admin/alunos`,
`/admin/alunos/[id]`, `/admin/alunos/novo`,
`/admin/alunos/[id]/nova-matricula`).

- [ ] **Step 3: Aplicar as migrations em produção**

Usar o Supabase MCP (`apply_migration`) pra aplicar, na ordem, as três
migrations novas no projeto `estudos` (`esujpfcfxkxlwzofuvim`):
`20260901000001_papel_colaborador_e_metodo_manual.sql`,
`20260901000002_rls_colaborador.sql`,
`20260901000003_regiao_unidades.sql`.

Confirmar depois com uma consulta: `select nome, regiao from
unidades_prisionais where uf = 'DF' order by regiao, nome;` — devem
aparecer as 7 unidades reais do DF agrupadas certo.

- [ ] **Step 4: Marcar a unidade de teste como inativa em produção**

A unidade de teste (`[TESTE] Unidade de Verificação`) inserida
manualmente antes desta feature tem matrículas de teste apontando pra
ela — não pode ser apagada (violaria a foreign key), só desativada pra
sumir das opções de nova matrícula:

```sql
update unidades_prisionais set ativa = false
  where nome = '[TESTE] Unidade de Verificação';
```

- [ ] **Step 5: Criar uma conta de colaborador de teste em produção**

Mesmo padrão usado pra criar `testeadmin@teste.com`: inserir em
`auth.users` com `crypt(senha, gen_salt('bf'))` e as quatro colunas de
token como string vazia (não `null`), depois `update profiles set role =
'colaborador'`. Usar um e-mail/senha combinados com o usuário antes de
executar.

- [ ] **Step 6: Deploy e verificação ao vivo em produção**

```bash
git push
```

Depois que o deploy da Vercel terminar, confirmar via navegador com a
conta de colaborador de teste:
- Login em `/entrar-equipe` funciona e cai em `/admin`.
- Menu mostra só Painel, Alunos, Matrículas.
- `/admin/cursos` acessado direto redireciona pra `/`.
- Cadastrar um aluno novo em `/admin/alunos/novo` funciona ponta a
  ponta, matrícula nasce paga.
- `/admin/unidades` (logado como admin) mostra as 7 unidades do DF
  agrupadas por região.
