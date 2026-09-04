# Matricular aluno pela aba Matrículas, CPF único e um curso por vez — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover as ações de criação de Alunos para Matrículas numa tela única guiada pelo CPF, tornar o CPF a chave única do aluno e impedir que um aluno receba material de dois cursos ao mesmo tempo.

**Architecture:** A decisão de "quem está em curso e quem está na fila" vira função pura em `lib/matricula/fila.ts`, testável sem banco. A escrita de `internos` passa por uma única porta (`garantirInterno`) usada tanto pelo checkout público quanto pelo admin. A regra de um curso por vez é aplicada em dois níveis: `avancarStatus` recusa com erro legível, e um trigger no Postgres recusa qualquer escrita que passe por fora do app. A tela nova usa o mesmo padrão de busca por `searchParams` que a lista de Alunos já usa — sem estado de cliente entre passos.

**Tech Stack:** Next.js 15 (App Router, Server Components, Server Actions), Supabase (Postgres + RLS), TypeScript, Zod, Vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-03-matricular-aluno-fila-cpf-unico-design.md`

## Global Constraints

- Lógica pura e testável fica em `lib/*.ts`; `redirect()` e `cookies()` só em wrappers `'use server'` dentro de `app/**/acoes.ts`. `redirect()` chamado direto de teste Vitest se comporta de forma não confiável.
- Todo módulo que toca `criarClienteAdmin()` (service role) começa com `import 'server-only'`.
- Português em nomes de arquivo, funções, variáveis, comentários e texto de tela. Comentário explica *por quê*, não *o quê*.
- Portal do Aluno é acesso **só por CPF**. Nada neste plano cria caminho de senha para responsável.
- `supabase/seed.sql` é exclusivo de desenvolvimento local. Nenhuma tarefa aqui escreve nele com dado de produção.
- Migrações que mexem em enum ficam isoladas em migração própria. Nenhuma tarefa aqui adiciona valor de enum.
- Cada tarefa termina com `npx tsc --noEmit` limpo antes do commit.
- Testes unitários: `npm test`. Integração: `npm run test:integracao` (exige `npx supabase start`). Se a integração falhar de forma estranha, rode `npm run db:reset` antes de investigar — teste anterior pode ter sujo o banco local.

---

### Task 1: Decisão da fila como função pura

**Files:**
- Create: `lib/matricula/fila.ts`
- Test: `tests/unidade/fila.test.ts`

**Interfaces:**
- Consumes: `StatusMatricula` de `@/lib/dominio/tipos`.
- Produces: `STATUS_EM_CURSO`, `type MatriculaDaFila = { id: string; codigo: string; status: StatusMatricula; criadaEm: string }`, `estaEmCurso(status: StatusMatricula): boolean`, `situacaoDaFila(matriculas: readonly MatriculaDaFila[]): { emCurso: MatriculaDaFila | null; naFila: MatriculaDaFila[] }`, `bloqueioDeEnvio(alvoId: string, matriculas: readonly MatriculaDaFila[]): MatriculaDaFila | null`.

- [ ] **Step 1: Write the failing test**

Create `tests/unidade/fila.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  STATUS_EM_CURSO,
  bloqueioDeEnvio,
  estaEmCurso,
  situacaoDaFila,
  type MatriculaDaFila,
} from '@/lib/matricula/fila'

function m(
  id: string,
  status: MatriculaDaFila['status'],
  criadaEm: string,
): MatriculaDaFila {
  return { id, codigo: `EST-2026-${id}`, status, criadaEm }
}

describe('estaEmCurso', () => {
  it('considera em curso só quem já teve material enviado', () => {
    expect(estaEmCurso('material_enviado')).toBe(true)
    expect(estaEmCurso('prova_aplicada')).toBe(true)
    expect(estaEmCurso('aprovado')).toBe(true)
    // Reprovado ainda ocupa: o aluno vai refazer a prova do mesmo curso.
    expect(estaEmCurso('reprovado')).toBe(true)
  })

  it('não considera em curso quem ainda não recebeu material', () => {
    expect(estaEmCurso('rascunho')).toBe(false)
    expect(estaEmCurso('aguardando_pagamento')).toBe(false)
    expect(estaEmCurso('paga')).toBe(false)
  })

  it('libera a vaga só no certificado ou no cancelamento', () => {
    expect(estaEmCurso('certificado_emitido')).toBe(false)
    expect(estaEmCurso('cancelada')).toBe(false)
  })

  it('declara todos os status em curso na constante exportada', () => {
    expect([...STATUS_EM_CURSO].sort()).toEqual(
      ['aprovado', 'material_enviado', 'prova_aplicada', 'reprovado'].sort(),
    )
  })
})

describe('situacaoDaFila', () => {
  it('devolve vazio quando o aluno não tem matrícula nenhuma', () => {
    expect(situacaoDaFila([])).toEqual({ emCurso: null, naFila: [] })
  })

  it('não coloca ninguém em curso quando só existe matrícula paga', () => {
    const s = situacaoDaFila([m('a', 'paga', '2026-01-10')])
    expect(s.emCurso).toBeNull()
    expect(s.naFila.map((x) => x.id)).toEqual(['a'])
  })

  it('elege a que já teve material enviado, ignorando a data de compra', () => {
    // O caso real da produção: a mais antiga está em paga, mas quem está em
    // curso é a segunda, que já recebeu material.
    const s = situacaoDaFila([
      m('velha', 'paga', '2026-01-01'),
      m('ativa', 'material_enviado', '2026-01-05'),
      m('nova', 'paga', '2026-01-09'),
    ])
    expect(s.emCurso?.id).toBe('ativa')
    expect(s.naFila.map((x) => x.id)).toEqual(['velha', 'nova'])
  })

  it('ordena a fila da mais antiga para a mais nova', () => {
    const s = situacaoDaFila([
      m('c', 'paga', '2026-03-01'),
      m('a', 'paga', '2026-01-01'),
      m('b', 'paga', '2026-02-01'),
    ])
    expect(s.naFila.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('mantém fora da fila quem ainda não pagou e quem já encerrou', () => {
    const s = situacaoDaFila([
      m('rascunho', 'rascunho', '2026-01-01'),
      m('aguardando', 'aguardando_pagamento', '2026-01-02'),
      m('encerrada', 'certificado_emitido', '2026-01-03'),
      m('cancelada', 'cancelada', '2026-01-04'),
      m('paga', 'paga', '2026-01-05'),
    ])
    expect(s.emCurso).toBeNull()
    expect(s.naFila.map((x) => x.id)).toEqual(['paga'])
  })

  it('desempata pela mais antiga quando duas estão em curso', () => {
    // Dado legado: não deveria acontecer depois do trigger, mas a função
    // precisa ser determinística se acontecer.
    const s = situacaoDaFila([
      m('nova', 'aprovado', '2026-02-01'),
      m('velha', 'material_enviado', '2026-01-01'),
    ])
    expect(s.emCurso?.id).toBe('velha')
  })
})

describe('bloqueioDeEnvio', () => {
  it('não bloqueia quando nenhuma outra está em curso', () => {
    const lista = [m('alvo', 'paga', '2026-01-02'), m('outra', 'paga', '2026-01-01')]
    expect(bloqueioDeEnvio('alvo', lista)).toBeNull()
  })

  it('bloqueia apontando qual matrícula está segurando', () => {
    const lista = [
      m('alvo', 'paga', '2026-01-02'),
      m('ativa', 'prova_aplicada', '2026-01-01'),
    ]
    expect(bloqueioDeEnvio('alvo', lista)?.id).toBe('ativa')
  })

  it('não considera a própria matrícula um bloqueio', () => {
    const lista = [m('alvo', 'material_enviado', '2026-01-02')]
    expect(bloqueioDeEnvio('alvo', lista)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unidade/fila.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/matricula/fila'".

- [ ] **Step 3: Write minimal implementation**

Create `lib/matricula/fila.ts`:

```ts
import type { StatusMatricula } from '@/lib/dominio/tipos'

/**
 * Status em que o material já saiu da gráfica e está na unidade prisional.
 * É isso que ocupa o aluno — não a data da compra. Uma matrícula paga não
 * segura ninguém, porque até ali nada foi gasto.
 *
 * `reprovado` continua ocupando: o aluno vai refazer a prova do mesmo curso.
 */
export const STATUS_EM_CURSO = [
  'material_enviado',
  'prova_aplicada',
  'aprovado',
  'reprovado',
] as const satisfies readonly StatusMatricula[]

export type MatriculaDaFila = {
  id: string
  codigo: string
  status: StatusMatricula
  /** ISO. Só ordena a fila; não decide quem está em curso. */
  criadaEm: string
}

export type SituacaoDaFila = {
  emCurso: MatriculaDaFila | null
  naFila: MatriculaDaFila[]
}

export function estaEmCurso(status: StatusMatricula): boolean {
  return (STATUS_EM_CURSO as readonly StatusMatricula[]).includes(status)
}

function porDataDeCriacao(a: MatriculaDaFila, b: MatriculaDaFila): number {
  return a.criadaEm.localeCompare(b.criadaEm)
}

export function situacaoDaFila(
  matriculas: readonly MatriculaDaFila[],
): SituacaoDaFila {
  const emCurso = [...matriculas].filter((m) => estaEmCurso(m.status)).sort(porDataDeCriacao)
  const naFila = [...matriculas].filter((m) => m.status === 'paga').sort(porDataDeCriacao)

  return { emCurso: emCurso[0] ?? null, naFila }
}

/**
 * Devolve a matrícula que impede `alvoId` de receber material, ou null se
 * o caminho está livre.
 */
export function bloqueioDeEnvio(
  alvoId: string,
  matriculas: readonly MatriculaDaFila[],
): MatriculaDaFila | null {
  const outras = matriculas.filter((m) => m.id !== alvoId)
  return situacaoDaFila(outras).emCurso
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unidade/fila.test.ts`
Expected: PASS, 13 testes.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add lib/matricula/fila.ts tests/unidade/fila.test.ts
git commit -m "feat: decide quem esta em curso e quem esta na fila"
```

---

### Task 2: CPF único em internos e porta única de escrita

**Files:**
- Create: `supabase/migrations/20260903000001_interno_cpf_unico.sql`
- Create: `lib/matricula/interno.ts`
- Modify: `lib/matricula/acoes.ts` (troca o `insert` direto em `internos`, linhas ~99-113)
- Test: `tests/integracao/interno.test.ts`

**Interfaces:**
- Consumes: `DadosInterno` de `@/lib/dominio/esquemas`, `criarClienteAdmin` de `@/lib/supabase/admin`.
- Produces: `garantirInterno(entrada: { interno: DadosInterno; unidadeId: string; responsavelId: string; parentesco?: string }): Promise<{ id: string; criado: boolean }>`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260903000001_interno_cpf_unico.sql`:

```sql
-- Um CPF, um aluno. Sem isso, cada compra do site criava um cadastro novo
-- para a mesma pessoa (lib/matricula/acoes.ts sempre fazia insert), e a
-- regra de "um curso por vez" não teria sujeito sobre o qual valer: o aluno
-- duplicado nasce sem matrícula nenhuma.
--
-- A produção foi conferida antes: zero CPFs duplicados, então a constraint
-- entra sem precisar juntar cadastro.
alter table internos add constraint internos_cpf_key unique (cpf);
```

- [ ] **Step 2: Write the failing test**

Create `tests/integracao/interno.test.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { garantirInterno } from '@/lib/matricula/interno'

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

async function duasUnidadesDeUfsDiferentes(): Promise<
  [{ id: string; uf: string }, { id: string; uf: string }]
> {
  const { data } = await admin
    .from('unidades_prisionais')
    .select('id, uf')
    .order('uf')
  const porUf = new Map<string, { id: string; uf: string }>()
  for (const u of data ?? []) if (!porUf.has(u.uf)) porUf.set(u.uf, u)
  const lista = [...porUf.values()]
  return [lista[0]!, lista[1]!]
}

async function novoResponsavel(): Promise<string> {
  const { data } = await admin.auth.admin.createUser({
    email: `resp-${Date.now()}-${Math.random().toString(36).slice(2)}@exemplo.com`,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { nome: 'Responsavel Teste', cpf: novoCpf(), telefone: '61999990000' },
  })
  return data.user!.id
}

describe('constraint de CPF único', () => {
  it('recusa dois internos com o mesmo CPF', async () => {
    const [unidade] = await duasUnidadesDeUfsDiferentes()
    const cpf = novoCpf()
    const responsavelId = await novoResponsavel()

    const comum = {
      nome: 'Aluno Duplicado',
      cpf,
      matricula_prisional: 'MP-DUP-1',
      unidade_prisional_id: unidade.id,
      responsavel_id: responsavelId,
    }

    const primeiro = await admin.from('internos').insert(comum).select('id').single()
    expect(primeiro.error).toBeNull()

    const segundo = await admin.from('internos').insert(comum).select('id').single()
    expect(segundo.error).not.toBeNull()
    expect(segundo.error!.code).toBe('23505')
  })
})

describe('garantirInterno', () => {
  it('cria o cadastro quando o CPF é novo', async () => {
    const [unidade] = await duasUnidadesDeUfsDiferentes()
    const responsavelId = await novoResponsavel()

    const r = await garantirInterno({
      interno: {
        nome: 'Aluno Novo Garantir',
        cpf: novoCpf(),
        matriculaPrisional: 'MP-GAR-1',
        rg: '',
        dataNascimento: '',
      },
      unidadeId: unidade.id,
      responsavelId,
      parentesco: 'Mãe',
    })

    expect(r.criado).toBe(true)

    const { data } = await admin
      .from('internos')
      .select('nome, responsavel_id, unidade_prisional_id')
      .eq('id', r.id)
      .single()
    expect(data!.nome).toBe('Aluno Novo Garantir')
    expect(data!.responsavel_id).toBe(responsavelId)
    expect(data!.unidade_prisional_id).toBe(unidade.id)
  })

  it('reaproveita o cadastro e atualiza a unidade, sem trocar o responsável', async () => {
    const [primeira, segunda] = await duasUnidadesDeUfsDiferentes()
    const cpf = novoCpf()
    const responsavelOriginal = await novoResponsavel()
    const outroResponsavel = await novoResponsavel()

    const inicial = await garantirInterno({
      interno: {
        nome: 'Aluno Reaproveitado',
        cpf,
        matriculaPrisional: 'MP-REAP-1',
        rg: '',
        dataNascimento: '',
      },
      unidadeId: primeira.id,
      responsavelId: responsavelOriginal,
      parentesco: 'Mãe',
    })

    const segundaVez = await garantirInterno({
      interno: {
        nome: 'Aluno Reaproveitado Corrigido',
        cpf,
        matriculaPrisional: 'MP-REAP-2',
        rg: '',
        dataNascimento: '',
      },
      unidadeId: segunda.id,
      responsavelId: outroResponsavel,
      parentesco: 'Esposa',
    })

    expect(segundaVez.criado).toBe(false)
    expect(segundaVez.id).toBe(inicial.id)

    const { data } = await admin
      .from('internos')
      .select('nome, matricula_prisional, unidade_prisional_id, responsavel_id')
      .eq('id', inicial.id)
      .single()

    expect(data!.nome).toBe('Aluno Reaproveitado Corrigido')
    expect(data!.matricula_prisional).toBe('MP-REAP-2')
    // Transferência de unidade acompanha a nova matrícula.
    expect(data!.unidade_prisional_id).toBe(segunda.id)
    // O responsável do cadastro é o primeiro e não é sobrescrito: o acesso
    // ao portal de cada família é filtrado por matriculas.responsavel_id.
    expect(data!.responsavel_id).toBe(responsavelOriginal)

    const { count } = await admin
      .from('internos')
      .select('id', { count: 'exact', head: true })
      .eq('cpf', cpf)
    expect(count).toBe(1)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run db:reset
npx vitest run tests/integracao/interno.test.ts
```

Expected: FAIL — "Failed to resolve import '@/lib/matricula/interno'".

- [ ] **Step 4: Write the implementation**

Create `lib/matricula/interno.ts`:

```ts
import 'server-only'
import type { DadosInterno } from '@/lib/dominio/esquemas'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type ResultadoInterno = { id: string; criado: boolean }

/**
 * Porta única de escrita de `internos`. Antes disso o checkout público fazia
 * insert direto e criava um aluno novo a cada compra.
 *
 * `responsavel_id` e `parentesco` só são gravados na criação: quem comprou o
 * segundo curso pode ser outra parente, e sobrescrever tiraria o cadastro de
 * quem comprou primeiro. Cada matrícula guarda o próprio comprador, e é por
 * ele que a RLS filtra o Portal do Aluno.
 */
export async function garantirInterno(entrada: {
  interno: DadosInterno
  unidadeId: string
  responsavelId: string
  parentesco?: string
}): Promise<ResultadoInterno> {
  const supabase = criarClienteAdmin()
  const cpf = entrada.interno.cpf.replace(/\D/g, '')

  const cadastrais = {
    nome: entrada.interno.nome,
    rg: entrada.interno.rg || null,
    matricula_prisional: entrada.interno.matriculaPrisional,
    data_nascimento: entrada.interno.dataNascimento || null,
    unidade_prisional_id: entrada.unidadeId,
  }

  const { data: existente } = await supabase
    .from('internos')
    .select('id')
    .eq('cpf', cpf)
    .maybeSingle()

  if (existente) {
    const { error } = await supabase
      .from('internos')
      .update(cadastrais)
      .eq('id', existente.id)

    if (error) throw error
    return { id: existente.id, criado: false }
  }

  const { data: criado, error } = await supabase
    .from('internos')
    .insert({
      ...cadastrais,
      cpf,
      responsavel_id: entrada.responsavelId,
      parentesco: entrada.parentesco ?? null,
    })
    .select('id')
    .single()

  if (error || !criado) throw error ?? new Error('Falha ao criar o interno')
  return { id: criado.id, criado: true }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run db:reset
npx vitest run tests/integracao/interno.test.ts
```

Expected: PASS, 3 testes.

- [ ] **Step 6: Wire the public checkout to the new door**

In `lib/matricula/acoes.ts`, replace the `internos` insert block (the one that
produces `internoCriado`) with a call to `garantirInterno`. Add the import at
the top:

```ts
import { garantirInterno } from '@/lib/matricula/interno'
```

Replace:

```ts
  const { data: internoCriado, error: erroInterno } = await servidor
    .from('internos')
    .insert({
      nome: interno.data.nome,
      cpf: interno.data.cpf,
      rg: interno.data.rg || null,
      matricula_prisional: interno.data.matriculaPrisional,
      data_nascimento: interno.data.dataNascimento || null,
      unidade_prisional_id: unidade.data.unidadeId,
      responsavel_id: responsavelId,
      parentesco: responsavel.data.parentesco,
    })
    .select('id')
    .single()

  if (erroInterno || !internoCriado) {
    return { ok: false, erro: 'Não foi possível registrar os dados do interno.' }
  }
```

with:

```ts
  // Segunda compra para a mesma pessoa reaproveita o cadastro em vez de criar
  // um aluno novo — o CPF é a identidade.
  let internoId: string
  try {
    const resultado = await garantirInterno({
      interno: interno.data,
      unidadeId: unidade.data.unidadeId,
      responsavelId,
      parentesco: responsavel.data.parentesco,
    })
    internoId = resultado.id
  } catch {
    return { ok: false, erro: 'Não foi possível registrar os dados do interno.' }
  }
```

Then change the matrícula insert to use `interno_id: internoId` instead of
`interno_id: internoCriado.id`.

- [ ] **Step 7: Run the full suite**

```bash
npm run db:reset
npm test
npm run test:integracao
npx tsc --noEmit
```

Expected: tudo passa. `tests/integracao/matricula.test.ts` cobre o checkout e
deve continuar verde.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260903000001_interno_cpf_unico.sql lib/matricula/interno.ts lib/matricula/acoes.ts tests/integracao/interno.test.ts
git commit -m "feat: cpf vira identidade do aluno, segunda compra reaproveita cadastro"
```

---

### Task 3: Trava de um curso por vez, no app e no banco

**Files:**
- Create: `supabase/migrations/20260903000002_um_curso_por_vez.sql`
- Modify: `lib/matricula/avancar.ts`
- Test: `tests/integracao/fila.test.ts`

**Interfaces:**
- Consumes: `bloqueioDeEnvio`, `MatriculaDaFila` de `@/lib/matricula/fila` (Task 1).
- Produces: `class AlunoOcupadoError extends Error` exportada de `@/lib/matricula/avancar`, com propriedade `bloqueadaPor: { id: string; codigo: string }`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260903000002_um_curso_por_vez.sql`:

```sql
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
```

- [ ] **Step 2: Write the failing test**

Create `tests/integracao/fila.test.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { AlunoOcupadoError, avancarStatus } from '@/lib/matricula/avancar'

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

/** Cria um aluno com N matrículas em `paga`, e devolve os ids. */
async function alunoComMatriculasPagas(quantas: number): Promise<string[]> {
  const { data: unidade } = await admin
    .from('unidades_prisionais')
    .select('id')
    .limit(1)
    .single()

  const { data: cursos } = await admin
    .from('cursos')
    .select('id, preco_centavos')
    .eq('ativo', true)
    .limit(quantas)

  const { data: interno } = await admin
    .from('internos')
    .insert({
      nome: 'Aluno Da Fila',
      cpf: novoCpf(),
      matricula_prisional: `MP-FILA-${Date.now()}`,
      unidade_prisional_id: unidade!.id,
    })
    .select('id')
    .single()

  const ids: string[] = []
  for (let i = 0; i < quantas; i++) {
    const { data } = await admin
      .from('matriculas')
      .insert({
        interno_id: interno!.id,
        curso_id: cursos![i]!.id,
        unidade_prisional_id: unidade!.id,
        preco_centavos: cursos![i]!.preco_centavos,
        frete_centavos: 0,
        status: 'paga',
      })
      .select('id')
      .single()
    ids.push(data!.id)
  }
  return ids
}

describe('um curso por vez', () => {
  it('deixa a primeira matrícula receber material', async () => {
    const [primeira] = await alunoComMatriculasPagas(1)
    await avancarStatus({ matriculaId: primeira!, para: 'material_enviado' })

    const { data } = await admin
      .from('matriculas')
      .select('status')
      .eq('id', primeira!)
      .single()
    expect(data!.status).toBe('material_enviado')
  })

  it('recusa a segunda com erro que aponta quem está segurando', async () => {
    const [primeira, segunda] = await alunoComMatriculasPagas(2)
    await avancarStatus({ matriculaId: primeira!, para: 'material_enviado' })

    await expect(
      avancarStatus({ matriculaId: segunda!, para: 'material_enviado' }),
    ).rejects.toBeInstanceOf(AlunoOcupadoError)

    const { data } = await admin
      .from('matriculas')
      .select('status')
      .eq('id', segunda!)
      .single()
    expect(data!.status).toBe('paga')
  })

  it('libera a fila quando a primeira chega ao certificado', async () => {
    const [primeira, segunda] = await alunoComMatriculasPagas(2)

    for (const para of [
      'material_enviado',
      'prova_aplicada',
      'aprovado',
      'certificado_emitido',
    ] as const) {
      await avancarStatus({ matriculaId: primeira!, para })
    }

    await avancarStatus({ matriculaId: segunda!, para: 'material_enviado' })

    const { data } = await admin
      .from('matriculas')
      .select('status')
      .eq('id', segunda!)
      .single()
    expect(data!.status).toBe('material_enviado')
  })

  it('continua segurando enquanto a primeira está só aprovada', async () => {
    const [primeira, segunda] = await alunoComMatriculasPagas(2)

    for (const para of ['material_enviado', 'prova_aplicada', 'aprovado'] as const) {
      await avancarStatus({ matriculaId: primeira!, para })
    }

    await expect(
      avancarStatus({ matriculaId: segunda!, para: 'material_enviado' }),
    ).rejects.toBeInstanceOf(AlunoOcupadoError)
  })

  it('o trigger recusa mesmo quando a escrita não passa pelo app', async () => {
    const [primeira, segunda] = await alunoComMatriculasPagas(2)
    await avancarStatus({ matriculaId: primeira!, para: 'material_enviado' })

    const { error } = await admin
      .from('matriculas')
      .update({ status: 'material_enviado' })
      .eq('id', segunda!)

    expect(error).not.toBeNull()
    expect(error!.message).toContain('curso em andamento')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run db:reset
npx vitest run tests/integracao/fila.test.ts
```

Expected: FAIL — `AlunoOcupadoError` não é exportado de `@/lib/matricula/avancar`.

- [ ] **Step 4: Write the implementation**

In `lib/matricula/avancar.ts`, add the imports:

```ts
import { bloqueioDeEnvio, type MatriculaDaFila } from './fila'
```

Add the error class after the `EntradaAvanco` type:

```ts
export class AlunoOcupadoError extends Error {
  constructor(readonly bloqueadaPor: { id: string; codigo: string }) {
    super(
      `Este aluno já tem um curso em andamento (${bloqueadaPor.codigo}). ` +
        'O material do próximo só sai depois que o certificado dele for emitido.',
    )
    this.name = 'AlunoOcupadoError'
  }
}
```

Change the matrícula read at the top of `avancarStatus` to also bring
`interno_id`:

```ts
  const { data: matricula, error: erroLeitura } = await supabase
    .from('matriculas')
    .select('id, status, interno_id')
    .eq('id', entrada.matriculaId)
    .single()
```

Then, right after `assertTransicao(de, entrada.para)`, insert the queue check:

```ts
  // A regra de um curso por vez trava aqui, no envio de material, porque é o
  // primeiro passo que gasta dinheiro: até a matrícula paga nada saiu da
  // gráfica. O trigger no banco recusa o mesmo caso; esta checagem existe
  // para o painel poder mostrar o motivo antes de o colaborador clicar.
  if (entrada.para === 'material_enviado') {
    const { data: irmas } = await supabase
      .from('matriculas')
      .select('id, codigo, status, created_at')
      .eq('interno_id', matricula.interno_id)

    const lista: MatriculaDaFila[] = (irmas ?? []).map((m) => ({
      id: m.id,
      codigo: m.codigo,
      status: m.status as StatusMatricula,
      criadaEm: m.created_at,
    }))

    const bloqueio = bloqueioDeEnvio(entrada.matriculaId, lista)
    if (bloqueio) throw new AlunoOcupadoError(bloqueio)
  }
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run db:reset
npx vitest run tests/integracao/fila.test.ts
```

Expected: PASS, 5 testes.

- [ ] **Step 6: Run the full suite**

```bash
npm run db:reset
npm test
npm run test:integracao
npx tsc --noEmit
```

Expected: tudo verde. Se `tests/integracao/matricula-manual.test.ts` quebrar,
é porque ele avança dois cursos do mesmo aluno — nesse caso ajuste o teste
para usar alunos distintos, que é o comportamento correto agora.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260903000002_um_curso_por_vez.sql lib/matricula/avancar.ts tests/integracao/fila.test.ts
git commit -m "feat: aluno recebe material de um curso por vez"
```

---

### Task 4: Erro legível ao editar CPF para um já existente

**Files:**
- Modify: `lib/admin/acoes.ts` (função `salvarAluno`)
- Modify: `components/admin/FormularioAluno.tsx`
- Modify: `app/(admin)/admin/alunos/[id]/page.tsx`
- Test: `tests/integracao/admin.test.ts`

**Interfaces:**
- Consumes: nada de tarefas anteriores além da constraint da Task 2.
- Produces: `salvarAluno(anterior: ResultadoSalvarAluno | null, formData: FormData): Promise<ResultadoSalvarAluno>`, onde `type ResultadoSalvarAluno = { ok: true } | { ok: false; erro: string }`, exportado de `@/lib/admin/acoes`.

- [ ] **Step 1: Write the failing test**

Add to `tests/integracao/admin.test.ts` (mantenha os imports existentes e
acrescente `salvarAluno` ao import de `@/lib/admin/acoes`):

```ts
describe('salvarAluno com CPF já usado', () => {
  it('devolve mensagem legível em vez de estourar', async () => {
    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .select('id')
      .limit(1)
      .single()

    const cpfOcupado = novoCpf()
    await admin.from('internos').insert({
      nome: 'Aluno Que Ja Existe',
      cpf: cpfOcupado,
      matricula_prisional: 'MP-OCUPADO',
      unidade_prisional_id: unidade!.id,
    })

    const { data: alvo } = await admin
      .from('internos')
      .insert({
        nome: 'Aluno Alvo',
        cpf: novoCpf(),
        matricula_prisional: 'MP-ALVO',
        unidade_prisional_id: unidade!.id,
      })
      .select('id')
      .single()

    const form = new FormData()
    form.set('id', alvo!.id)
    form.set('nome', 'Aluno Alvo Editado')
    form.set('cpf', cpfOcupado)
    form.set('matriculaPrisional', 'MP-ALVO')
    form.set('unidadeId', unidade!.id)

    const r = await salvarAluno(null, form)

    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erro).toContain('CPF')
  })
})
```

Se `novoCpf` ainda não existir nesse arquivo, copie a mesma helper usada em
`tests/integracao/matricula-manual.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run db:reset
npx vitest run tests/integracao/admin.test.ts
```

Expected: FAIL — `salvarAluno` hoje recebe só `FormData` e não devolve nada.

- [ ] **Step 3: Write the implementation**

In `lib/admin/acoes.ts`, replace `salvarAluno` with:

```ts
export type ResultadoSalvarAluno = { ok: true } | { ok: false; erro: string }

export async function salvarAluno(
  _anterior: ResultadoSalvarAluno | null,
  formData: FormData,
): Promise<ResultadoSalvarAluno> {
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
  const { error } = await supabase
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

  // 23505 é violação de unicidade. Desde que o CPF virou a identidade do
  // aluno, digitar um CPF que já é de outro cadastro é erro de usuário e
  // precisa voltar como texto, não como exceção na tela.
  if (error?.code === '23505') {
    return { ok: false, erro: 'Já existe um aluno com este CPF.' }
  }
  if (error) return { ok: false, erro: 'Não foi possível salvar o aluno.' }

  revalidatePath(`/admin/alunos/${d.id}`)
  revalidatePath('/admin/alunos')
  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run db:reset
npx vitest run tests/integracao/admin.test.ts
```

Expected: PASS.

- [ ] **Step 5: Show the error on screen**

`FormularioAluno` é Server Component hoje (busca as unidades). Divida em dois:
o server component continua buscando as unidades e passa para um client
component que carrega o estado do erro.

Rewrite `components/admin/FormularioAluno.tsx` keeping the same export name and
props, but delegating the form to a new client component:

```tsx
import { CamposDoAluno } from '@/components/admin/CamposDoAluno'
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

  return <CamposDoAluno aluno={aluno} unidades={unidades ?? []} />
}
```

Create `components/admin/CamposDoAluno.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { BotaoSubmit } from '@/components/ui/BotaoSubmit'
import { salvarAluno, type ResultadoSalvarAluno } from '@/lib/admin/acoes'

type Aluno = {
  id: string
  nome: string
  cpf: string
  rg: string | null
  matricula_prisional: string
  data_nascimento: string | null
  unidade_prisional_id: string
}

export function CamposDoAluno({
  aluno,
  unidades,
}: {
  aluno: Aluno
  unidades: { id: string; uf: string; nome: string }[]
}) {
  const [estado, acao] = useActionState<ResultadoSalvarAluno | null, FormData>(
    salvarAluno,
    null,
  )

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <form action={acao} className="space-y-4">
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
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.uf} · {u.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {estado && !estado.ok && (
        <p role="alert" className="text-sm text-red-400">
          {estado.erro}
        </p>
      )}

      <BotaoSubmit className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo hover:bg-acento-claro">
        Salvar aluno
      </BotaoSubmit>
    </form>
  )
}
```

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit
npm run build
git add lib/admin/acoes.ts components/admin/FormularioAluno.tsx components/admin/CamposDoAluno.tsx tests/integracao/admin.test.ts
git commit -m "fix: editar aluno com cpf repetido mostra aviso em vez de estourar"
```

---

### Task 5: Unidade escolhida na matrícula manual, frete pela unidade escolhida

**Files:**
- Modify: `lib/admin/matricula-manual.ts`
- Test: `tests/integracao/matricula-manual.test.ts`

**Interfaces:**
- Consumes: `garantirInterno` de `@/lib/matricula/interno` (Task 2).
- Produces: `registrarMatriculaParaAlunoExistente(entrada: { internoId: string; cursoSlug: string; unidadeId: string }): Promise<ResultadoMatriculaManual>` — o parâmetro `unidadeId` é novo e obrigatório.

- [ ] **Step 1: Write the failing test**

Add to `tests/integracao/matricula-manual.test.ts`:

```ts
describe('registrarMatriculaParaAlunoExistente com unidade escolhida', () => {
  it('usa a unidade da matrícula para o frete e atualiza o cadastro do aluno', async () => {
    const { data: unidades } = await admin
      .from('unidades_prisionais')
      .select('id, uf')
      .order('uf')

    const porUf = new Map<string, { id: string; uf: string }>()
    for (const u of unidades ?? []) if (!porUf.has(u.uf)) porUf.set(u.uf, u)
    const [origem, destino] = [...porUf.values()]

    const primeira = await registrarMatriculaManualNovoAluno({
      cursoSlug: 'auxiliar-de-cozinha',
      unidade: { uf: origem!.uf as 'DF', unidadeId: origem!.id },
      interno: {
        nome: 'Aluno Transferido',
        cpf: novoCpf(),
        matriculaPrisional: 'MP-TRANSF-1',
      },
      responsavel: {
        nome: 'Responsavel Transferido',
        cpf: novoCpf(),
        email: `transf-${Date.now()}@exemplo.com`,
        telefone: '61999990000',
        parentesco: 'Mãe',
      },
    })
    expect(primeira.ok).toBe(true)
    if (!primeira.ok) return

    const { data: criada } = await admin
      .from('matriculas')
      .select('interno_id')
      .eq('id', primeira.matriculaId)
      .single()

    const { data: freteDestino } = await admin
      .from('fretes')
      .select('valor_centavos')
      .eq('uf', destino!.uf)
      .single()

    const segunda = await registrarMatriculaParaAlunoExistente({
      internoId: criada!.interno_id,
      cursoSlug: 'informatica-avancada',
      unidadeId: destino!.id,
    })
    expect(segunda.ok).toBe(true)
    if (!segunda.ok) return

    const { data: nova } = await admin
      .from('matriculas')
      .select('unidade_prisional_id, frete_centavos')
      .eq('id', segunda.matriculaId)
      .single()

    expect(nova!.unidade_prisional_id).toBe(destino!.id)
    expect(nova!.frete_centavos).toBe(freteDestino!.valor_centavos)

    // A transferência acompanha o cadastro: a próxima matrícula já nasce na
    // unidade certa sem ninguém precisar corrigir à mão.
    const { data: interno } = await admin
      .from('internos')
      .select('unidade_prisional_id')
      .eq('id', criada!.interno_id)
      .single()
    expect(interno!.unidade_prisional_id).toBe(destino!.id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run db:reset
npx vitest run tests/integracao/matricula-manual.test.ts
```

Expected: FAIL — `unidadeId` não existe no tipo do parâmetro.

- [ ] **Step 3: Write the implementation**

In `lib/admin/matricula-manual.ts`, replace `registrarMatriculaParaAlunoExistente`
with:

```ts
export async function registrarMatriculaParaAlunoExistente(entrada: {
  internoId: string
  cursoSlug: string
  unidadeId: string
}): Promise<ResultadoMatriculaManual> {
  const supabase = criarClienteAdmin()

  const { data: interno } = await supabase
    .from('internos')
    .select('id, responsavel_id')
    .eq('id', entrada.internoId)
    .maybeSingle()

  if (!interno) return { ok: false, erro: 'Aluno não encontrado' }
  if (!interno.responsavel_id) {
    return { ok: false, erro: 'Este aluno não tem responsável vinculado' }
  }

  const { data: unidade } = await supabase
    .from('unidades_prisionais')
    .select('id, uf')
    .eq('id', entrada.unidadeId)
    .maybeSingle()

  if (!unidade) return { ok: false, erro: 'Unidade prisional não encontrada' }

  const { curso, indisponivel } = await obterCurso(entrada.cursoSlug)
  if (indisponivel || !curso) return { ok: false, erro: 'Curso não encontrado' }

  // O frete sai pela unidade escolhida nesta matrícula, não pela do cadastro:
  // aluno transferido de estado teria frete da unidade antiga.
  let frete: { valorCentavos: number }
  try {
    frete = await obterFrete(unidade.uf)
  } catch {
    return { ok: false, erro: `Frete ainda não configurado para ${unidade.uf}.` }
  }

  calcularTotal(curso.precoCentavos, frete.valorCentavos)

  const { data: matricula, error } = await supabase
    .from('matriculas')
    .insert({
      interno_id: interno.id,
      curso_id: curso.id,
      responsavel_id: interno.responsavel_id,
      unidade_prisional_id: unidade.id,
      preco_centavos: curso.precoCentavos,
      frete_centavos: frete.valorCentavos,
      status: 'rascunho',
    })
    .select('id, codigo')
    .single()

  if (error || !matricula) {
    return { ok: false, erro: 'Não foi possível criar a matrícula.' }
  }

  // Transferência de unidade acompanha o cadastro do aluno.
  await supabase
    .from('internos')
    .update({ unidade_prisional_id: unidade.id })
    .eq('id', interno.id)

  await confirmarPagamentoManual(matricula.id)
  return { ok: true, matriculaId: matricula.id, codigo: matricula.codigo }
}
```

Also update `registrarMatriculaManualNovoAluno` — it delegates to
`criarMatricula`, which already went through `garantirInterno` in Task 2, so no
change is needed there. Verify by reading it; do not edit if unchanged.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run db:reset
npx vitest run tests/integracao/matricula-manual.test.ts
```

Expected: PASS. O compilador vai apontar a chamada antiga em
`app/(admin)/admin/alunos/acoes.ts` — deixe quebrada por ora; a Task 6 remove
esse arquivo.

- [ ] **Step 5: Commit**

```bash
git add lib/admin/matricula-manual.ts tests/integracao/matricula-manual.test.ts
git commit -m "feat: matricula manual escolhe a unidade e calcula frete por ela"
```

---

### Task 6: Tela `/admin/matriculas/nova` guiada pelo CPF

**Files:**
- Create: `app/(admin)/admin/matriculas/nova/page.tsx`
- Create: `app/(admin)/admin/matriculas/nova/loading.tsx`
- Create: `app/(admin)/admin/matriculas/acoes.ts`
- Modify: `components/admin/FormularioNovoAluno.tsx`
- Modify: `components/admin/FormularioNovaMatricula.tsx`
- Delete: `app/(admin)/admin/alunos/acoes.ts`

**Interfaces:**
- Consumes: `registrarMatriculaParaAlunoExistente` com `unidadeId` (Task 5), `registrarMatriculaManualNovoAluno` (inalterado).
- Produces: `cadastrarAlunoEMatricula` e `matricularAlunoExistente`, ambos exportados de `@/app/(admin)/admin/matriculas/acoes`, com as mesmas assinaturas `useActionState` de hoje.

- [ ] **Step 1: Move the actions**

Create `app/(admin)/admin/matriculas/acoes.ts` with the exact content of
`app/(admin)/admin/alunos/acoes.ts`, changing only `matricularAlunoExistente`
to read and forward the new `unidadeId`:

```ts
export async function matricularAlunoExistente(
  _anterior: ResultadoMatriculaManual | null,
  formData: FormData,
): Promise<ResultadoMatriculaManual> {
  await exigirEquipe()

  const internoId = String(formData.get('internoId') ?? '')
  const cursoSlug = String(formData.get('cursoSlug') ?? '')
  const unidadeId = String(formData.get('unidadeId') ?? '')
  if (!cursoSlug) return { ok: false, erro: 'Selecione um curso' }
  if (!unidadeId) return { ok: false, erro: 'Selecione a unidade prisional' }

  const resultado = await registrarMatriculaParaAlunoExistente({
    internoId,
    cursoSlug,
    unidadeId,
  })

  if (!resultado.ok) return resultado
  redirect(`/admin/matriculas/${resultado.matriculaId}`)
}
```

Then delete the old file:

```bash
git rm app/\(admin\)/admin/alunos/acoes.ts
```

- [ ] **Step 2: Point the two form components at the new actions**

In `components/admin/FormularioNovoAluno.tsx`, change the import from
`@/app/(admin)/admin/alunos/acoes` to `@/app/(admin)/admin/matriculas/acoes`,
add a `cpfInicial` prop, and swap the raw `<button>` for `BotaoSubmit`:

```tsx
import { BotaoSubmit } from '@/components/ui/BotaoSubmit'
import { cadastrarAlunoEMatricula } from '@/app/(admin)/admin/matriculas/acoes'

export function FormularioNovoAluno({
  unidades,
  cursos,
  cpfInicial,
}: {
  unidades: Unidade[]
  cursos: Curso[]
  cpfInicial?: string
}) {
```

On the aluno CPF field, add `defaultValue={cpfInicial ?? ''}` so the CPF the
colaborador already typed in the search is not typed twice. Replace the
trailing button with:

```tsx
      <BotaoSubmit className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo hover:bg-acento-claro">
        Cadastrar aluno e matrícula
      </BotaoSubmit>
```

In `components/admin/FormularioNovaMatricula.tsx`, change the import the same
way, add the unidade select, and swap the button:

```tsx
'use client'

import { useActionState } from 'react'
import { BotaoSubmit } from '@/components/ui/BotaoSubmit'
import { matricularAlunoExistente } from '@/app/(admin)/admin/matriculas/acoes'
import type { ResultadoMatriculaManual } from '@/lib/admin/matricula-manual'

type Curso = { slug: string; titulo: string }
type Unidade = { id: string; uf: string; nome: string }

export function FormularioNovaMatricula({
  internoId,
  cursos,
  unidades,
  unidadeAtualId,
}: {
  internoId: string
  cursos: Curso[]
  unidades: Unidade[]
  unidadeAtualId: string
}) {
  const [estado, acao] = useActionState<ResultadoMatriculaManual | null, FormData>(
    matricularAlunoExistente,
    null,
  )

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="internoId" value={internoId} />

      <label className="block">
        <span className="text-sm font-medium text-texto">Curso</span>
        <select name="cursoSlug" required className={campo}>
          <option value="">Selecione</option>
          {cursos.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.titulo}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-texto">Unidade prisional</span>
        <select
          name="unidadeId"
          required
          defaultValue={unidadeAtualId}
          className={campo}
        >
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.uf} · {u.nome}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-texto-fraco">
          Já vem com a unidade atual do aluno. Troque se ele foi transferido —
          o frete e a entrega do material seguem esta escolha.
        </span>
      </label>

      {estado && !estado.ok && (
        <p role="alert" className="text-sm text-red-400">
          {estado.erro}
        </p>
      )}

      <BotaoSubmit className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo hover:bg-acento-claro">
        Matricular
      </BotaoSubmit>
    </form>
  )
}
```

- [ ] **Step 3: Write the page**

Create `app/(admin)/admin/matriculas/nova/page.tsx`:

```tsx
import Link from 'next/link'
import { FormularioNovoAluno } from '@/components/admin/FormularioNovoAluno'
import { FormularioNovaMatricula } from '@/components/admin/FormularioNovaMatricula'
import { exigirEquipe } from '@/lib/auth'
import { normalizarCpf, formatarCpf, cpfValido } from '@/lib/dominio/cpf'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Matricular aluno — Clique Estudos' }

export default async function NovaMatricula({
  searchParams,
}: {
  searchParams: Promise<{ cpf?: string }>
}) {
  await exigirEquipe()
  const { cpf: cpfBruto } = await searchParams
  const cpf = cpfBruto ? normalizarCpf(cpfBruto) : ''
  const buscou = cpf.length > 0

  const supabase = criarClienteAdmin()
  const [{ data: unidades }, { data: cursos }] = await Promise.all([
    supabase
      .from('unidades_prisionais')
      .select('id, uf, nome')
      .eq('ativa', true)
      .order('uf')
      .order('nome'),
    supabase.from('cursos').select('slug, titulo').eq('ativo', true).order('titulo'),
  ])

  const { data: aluno } =
    buscou && cpfValido(cpf)
      ? await supabase
          .from('internos')
          .select('id, nome, cpf, matricula_prisional, unidade_prisional_id')
          .eq('cpf', cpf)
          .maybeSingle()
      : { data: null }

  const campo =
    'w-full rounded-lg border border-borda bg-cartao px-3 py-2 text-sm text-texto placeholder:text-texto-fraco'

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin/matriculas" className="text-sm text-acento hover:underline">
        ← Matrículas
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-texto">Matricular aluno</h1>
      <p className="mt-2 text-sm text-texto-suave">
        Comece pelo CPF do aluno. Se ele já estiver no sistema, a matrícula é
        pendurada no cadastro que já existe — nada de aluno repetido.
      </p>

      <form className="mt-8 flex flex-wrap gap-2">
        <input
          name="cpf"
          defaultValue={cpfBruto ?? ''}
          placeholder="CPF do aluno"
          required
          className={`${campo} max-w-xs flex-1`}
        />
        <button
          type="submit"
          className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
        >
          Buscar
        </button>
      </form>

      {buscou && !cpfValido(cpf) && (
        <p role="alert" className="mt-6 text-sm text-red-400">
          CPF inválido. Confira os números e busque de novo.
        </p>
      )}

      {buscou && cpfValido(cpf) && aluno && (
        <section className="mt-8 space-y-6">
          <div className="rounded-cartao border border-borda bg-cartao p-6">
            <h2 className="font-semibold text-texto">Aluno encontrado</h2>
            <p className="mt-2 text-sm text-texto">
              {aluno.nome}
              <span className="text-texto-fraco">
                {' '}
                · CPF {formatarCpf(aluno.cpf)} · matrícula prisional{' '}
                {aluno.matricula_prisional}
              </span>
            </p>
            <Link
              href={`/admin/alunos/${aluno.id}`}
              className="mt-3 inline-block text-sm text-acento hover:underline"
            >
              Ver cadastro completo
            </Link>
          </div>

          <FormularioNovaMatricula
            internoId={aluno.id}
            cursos={cursos ?? []}
            unidades={unidades ?? []}
            unidadeAtualId={aluno.unidade_prisional_id}
          />
        </section>
      )}

      {buscou && cpfValido(cpf) && !aluno && (
        <section className="mt-8">
          <p className="text-sm text-texto-suave">
            Nenhum aluno com este CPF. Preencha o cadastro abaixo — ele nasce
            junto com a matrícula, já paga.
          </p>
          <div className="mt-6">
            <FormularioNovoAluno
              unidades={unidades ?? []}
              cursos={cursos ?? []}
              cpfInicial={cpf}
            />
          </div>
        </section>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Write the loading skeleton**

Create `app/(admin)/admin/matriculas/nova/loading.tsx`:

```tsx
import { EsqueletoFormulario } from '@/components/ui/Esqueleto'

export default function Carregando() {
  return <EsqueletoFormulario campos={4} />
}
```

A assinatura já existente é
`EsqueletoFormulario({ largura = 'max-w-2xl', campos = 6 })`, e `max-w-2xl` é
exatamente a largura da página nova — por isso só `campos` precisa ser passado.

- [ ] **Step 5: Verify it builds and typechecks**

```bash
npx tsc --noEmit
npm run build
```

Expected: limpo. Se o compilador reclamar de import de
`@/app/(admin)/admin/alunos/acoes`, algum consumidor ficou para trás — a
Task 7 apaga as páginas que usam, então rode este passo de novo depois dela se
necessário.

- [ ] **Step 6: Commit**

```bash
git add app/\(admin\)/admin/matriculas/nova app/\(admin\)/admin/matriculas/acoes.ts components/admin/FormularioNovoAluno.tsx components/admin/FormularioNovaMatricula.tsx
git commit -m "feat: matricular aluno numa tela so, guiada pelo cpf"
```

---

### Task 7: Alunos vira consulta, Matrículas ganha a ação

**Files:**
- Modify: `app/(admin)/admin/matriculas/page.tsx`
- Modify: `app/(admin)/admin/alunos/page.tsx`
- Modify: `app/(admin)/admin/alunos/loading.tsx`
- Modify: `app/(admin)/admin/matriculas/loading.tsx`
- Modify: `app/(admin)/admin/alunos/[id]/page.tsx`
- Delete: `app/(admin)/admin/alunos/novo/` (page + loading)
- Delete: `app/(admin)/admin/alunos/[id]/nova-matricula/` (page + loading)

**Interfaces:**
- Consumes: a rota `/admin/matriculas/nova` da Task 6.
- Produces: nada consumido por tarefas seguintes.

- [ ] **Step 1: Add the button to Matrículas**

In `app/(admin)/admin/matriculas/page.tsx`, replace the header block:

```tsx
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-texto">Matrículas</h1>
        {filtro.status && (
          <Link href="/admin/matriculas" className="text-sm text-acento hover:underline">
            Limpar filtro
          </Link>
        )}
      </div>
```

with:

```tsx
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-texto">Matrículas</h1>
        <div className="flex items-center gap-4">
          {filtro.status && (
            <Link
              href="/admin/matriculas"
              className="text-sm text-acento hover:underline"
            >
              Limpar filtro
            </Link>
          )}
          <Link
            href="/admin/matriculas/nova"
            className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
          >
            Matricular aluno
          </Link>
        </div>
      </div>
```

- [ ] **Step 2: Remove the button from Alunos**

In `app/(admin)/admin/alunos/page.tsx`, replace the header block:

```tsx
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-texto">Alunos</h1>
        <Link
          href="/admin/alunos/novo"
          className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
        >
          Novo aluno
        </Link>
      </div>
```

with:

```tsx
      <h1 className="text-2xl font-bold text-texto">Alunos</h1>
      <p className="mt-2 text-sm text-texto-suave">
        Consulta e correção de cadastro. Novas matrículas são feitas na aba{' '}
        <Link href="/admin/matriculas/nova" className="text-acento hover:underline">
          Matrículas
        </Link>
        .
      </p>
```

- [ ] **Step 3: Remove the "+ Nova matrícula" link from the aluno detail**

In `app/(admin)/admin/alunos/[id]/page.tsx`, replace:

```tsx
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-texto">Matrículas</h2>
          <Link
            href={`/admin/alunos/${interno.id}/nova-matricula`}
            className="text-sm font-semibold text-acento hover:underline"
          >
            + Nova matrícula
          </Link>
        </div>
```

with:

```tsx
        <h2 className="font-semibold text-texto">Matrículas</h2>
```

- [ ] **Step 4: Delete the dead routes**

```bash
git rm -r app/\(admin\)/admin/alunos/novo
git rm -r app/\(admin\)/admin/alunos/\[id\]/nova-matricula
```

- [ ] **Step 5: Fix the two skeletons to match the new shapes**

`EsqueletoTabela` já aceita as duas flags, então cada arquivo vira uma linha.

`app/(admin)/admin/alunos/loading.tsx` — tira `comBotao`, porque o botão
"Novo aluno" deixou de existir:

```tsx
import { EsqueletoTabela } from '@/components/ui/Esqueleto'

export default function Carregando() {
  return <EsqueletoTabela largura="max-w-5xl" colunas={5} comBusca />
}
```

`app/(admin)/admin/matriculas/loading.tsx` — ganha `comBotao`, espelhando o
"Matricular aluno" que entrou no cabeçalho:

```tsx
import { EsqueletoTabela } from '@/components/ui/Esqueleto'

export default function Carregando() {
  return <EsqueletoTabela colunas={6} linhas={8} comBotao />
}
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
npm run build
```

Expected: limpo, e nenhuma referência restante a `alunos/acoes` ou
`alunos/novo`. Confirme:

```bash
grep -rn "alunos/novo\|alunos/acoes\|nova-matricula" app components lib
```

Expected: sem resultado.

- [ ] **Step 7: Commit**

```bash
git add -A app/\(admin\)/admin
git commit -m "feat: acoes de matricula saem de alunos e entram em matriculas"
```

---

### Task 8: A fila na tela

**Files:**
- Modify: `lib/admin/consultas.ts` (`obterMatriculaAdmin`)
- Modify: `components/admin/AcoesDeStatus.tsx`
- Modify: `app/(admin)/admin/matriculas/[id]/page.tsx`
- Modify: `app/(admin)/admin/alunos/[id]/page.tsx`

**Interfaces:**
- Consumes: `situacaoDaFila`, `bloqueioDeEnvio`, `MatriculaDaFila` de `@/lib/matricula/fila` (Task 1).
- Produces: `obterMatriculaAdmin` passa a devolver também `bloqueio: { id: string; codigo: string } | null`.

- [ ] **Step 1: Carry the blocking matrícula out of the query**

In `lib/admin/consultas.ts`, inside `obterMatriculaAdmin`, after the matrícula
is loaded, fetch the sibling matrículas of the same interno and compute the
block. Add one import — `StatusMatricula` já está importado no topo do arquivo,
não duplique:

```ts
import { bloqueioDeEnvio, type MatriculaDaFila } from '@/lib/matricula/fila'
```

Add to the returned object a `bloqueio` field:

```ts
  // O painel precisa saber, antes de desenhar o botão, se o envio de material
  // está travado por outro curso do mesmo aluno — botão que só falha depois
  // do clique é pior do que botão que não aparece.
  const { data: irmas } = await supabase
    .from('matriculas')
    .select('id, codigo, status, created_at')
    .eq('interno_id', (matricula as { interno_id: string }).interno_id)

  const lista: MatriculaDaFila[] = (irmas ?? []).map((m) => ({
    id: m.id,
    codigo: m.codigo,
    status: m.status as StatusMatricula,
    criadaEm: m.created_at,
  }))

  const bloqueio = bloqueioDeEnvio(id, lista)
```

Make sure the `select` of the matrícula itself includes `interno_id`, and
return `{ matricula, eventos, pagamentos, bloqueio }` (keeping whatever keys it
already returns).

- [ ] **Step 2: Teach AcoesDeStatus about the block**

Rewrite `components/admin/AcoesDeStatus.tsx` in full:

```tsx
import Link from 'next/link'
import { BotaoSubmit } from '@/components/ui/BotaoSubmit'
import { ROTULO_STATUS, type StatusMatricula } from '@/lib/dominio/tipos'
import { mudarStatus } from '@/lib/admin/acoes'
import { proximosStatus } from '@/lib/matricula/transicoes'

export function AcoesDeStatus({
  matriculaId,
  status,
  bloqueio,
}: {
  matriculaId: string
  status: StatusMatricula
  bloqueio: { id: string; codigo: string } | null
}) {
  const destinos = proximosStatus(status)

  if (destinos.length === 0) {
    return (
      <p className="text-sm text-texto-fraco">
        Esta matrícula chegou ao fim do fluxo.
      </p>
    )
  }

  // Botão que só falha depois do clique é pior do que botão que não aparece:
  // o colaborador precisa saber por que não pode enviar, e qual matrícula
  // está segurando esta.
  if (bloqueio && destinos.includes('material_enviado')) {
    return (
      <div className="rounded-lg border border-aviso/40 bg-aviso-fundo p-4">
        <p className="text-sm text-aviso">
          Este aluno já tem um curso em andamento. O material desta matrícula
          só pode ser enviado depois que o certificado do curso atual for
          emitido.
        </p>
        <Link
          href={`/admin/matriculas/${bloqueio.id}`}
          className="mt-2 inline-block text-sm font-semibold text-acento hover:underline"
        >
          Ver a matrícula {bloqueio.codigo}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {destinos.map((destino) => (
        <form key={destino} action={mudarStatus} className="flex flex-wrap gap-2">
          <input type="hidden" name="matriculaId" value={matriculaId} />
          <input type="hidden" name="para" value={destino} />
          <input
            name="nota"
            placeholder="Observação (opcional)"
            className="flex-1 rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto"
          />
          <BotaoSubmit className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo hover:bg-acento-claro">
            Marcar como {ROTULO_STATUS[destino]}
          </BotaoSubmit>
        </form>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Pass it down**

In `app/(admin)/admin/matriculas/[id]/page.tsx`, read `bloqueio` from the
result of `obterMatriculaAdmin` and pass it to `<AcoesDeStatus ... />`:

```tsx
      <AcoesDeStatus matriculaId={m.id} status={m.status} bloqueio={resultado.bloqueio} />
```

- [ ] **Step 4: Mark the queue on the aluno detail**

In `app/(admin)/admin/alunos/[id]/page.tsx`, compute the situation from the
matrículas already loaded and add a small label next to each. Add the imports:

```tsx
import { situacaoDaFila, type MatriculaDaFila } from '@/lib/matricula/fila'
```

Before the JSX:

```tsx
  const situacao = situacaoDaFila(
    matriculas.map<MatriculaDaFila>((m) => ({
      id: m.id,
      codigo: m.codigo,
      status: m.status as StatusMatricula,
      criadaEm: m.created_at,
    })),
  )
  const posicaoNaFila = new Map(situacao.naFila.map((m, i) => [m.id, i + 1]))
```

Inside the `<li>` for each matrícula, next to the `<Selo>`, add:

```tsx
                  {situacao.emCurso?.id === m.id && (
                    <span className="text-xs font-semibold text-ok">em curso</span>
                  )}
                  {posicaoNaFila.has(m.id) && (
                    <span className="text-xs text-texto-fraco">
                      {situacao.emCurso
                        ? `${posicaoNaFila.get(m.id)}º na fila`
                        : 'próxima'}
                    </span>
                  )}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npm test
npm run test:integracao
npm run build
```

Expected: tudo verde.

- [ ] **Step 6: Check it in the browser**

```bash
npm run build && npm start
```

Entre em `/admin/matriculas` com a conta de teste, e confira:

1. O botão **Matricular aluno** aparece no cabeçalho.
2. Buscar um CPF que não existe abre o cadastro completo com o CPF preenchido.
3. Buscar o CPF do aluno de teste mostra o cartão "Aluno encontrado" e o
   formulário de curso + unidade, com a unidade atual já selecionada.
4. Abrir a matrícula `EST-2026-00001` (que está em `paga`, com a `00002` em
   `material_enviado`) mostra o aviso de fila com link, e **não** o botão de
   marcar como material enviado.
5. `/admin/alunos` não tem mais botão de criar, e o detalhe do aluno mostra
   "em curso" na `00002` e a posição na fila nas outras.

- [ ] **Step 7: Commit**

```bash
git add lib/admin/consultas.ts components/admin/AcoesDeStatus.tsx app/\(admin\)/admin
git commit -m "feat: painel mostra quem esta em curso e quem espera na fila"
```

---

### Task 9: Migrações em produção e verificação do deploy

**Files:**
- Nenhum arquivo alterado. Esta tarefa aplica o que as anteriores criaram.

**Interfaces:**
- Consumes: as duas migrações das Tasks 2 e 3.
- Produces: nada.

- [ ] **Step 1: Reconfirm production is clean for the unique constraint**

Via Supabase MCP (`execute_sql`, projeto `esujpfcfxkxlwzofuvim`):

```sql
select count(*) from (
  select cpf from internos group by cpf having count(*) > 1
) d;
```

Expected: `0`. Se vier diferente de zero, **pare** e reporte — juntar cadastros
é decisão do cliente, não deste plano.

- [ ] **Step 2: Apply both migrations to production**

Via Supabase MCP `apply_migration`, uma de cada vez, com o conteúdo exato dos
arquivos criados nas Tasks 2 e 3.

- [ ] **Step 3: Confirm the trigger is live**

```sql
select tgname from pg_trigger where tgname = 'matriculas_um_curso_por_vez';
```

Expected: uma linha.

- [ ] **Step 4: Push and verify the deploy**

```bash
git push origin main
```

Then, via Vercel MCP `list_deployments` (projeto
`prj_uZlPqp5PuUjdeYd6rD7BoFBCxgs4`, time `team_UdLhgBLeqzuHvbJKPxTrDYn2`),
confirm the deployment for the pushed commit reaches `READY`.

- [ ] **Step 5: Smoke test in production**

Entre no painel com a conta de teste e repita os cinco itens do Step 6 da
Task 8, agora em produção.

---

## Notas para quem executa

- **A ordem importa.** As Tasks 2 e 3 criam migrações; rodar `npm run db:reset`
  entre elas é o que garante que o banco local reflete o que você escreveu.
- **Se a integração falhar de forma inexplicável**, rode `npm run db:reset`
  antes de investigar. Testes que criam usuários e alteram senha sujam o banco
  local entre execuções.
- **Não force push.** O trabalho vai direto para `main`, um commit por tarefa.
- **`mudarStatus` continua sem tratamento de `AlunoOcupadoError`.** Isso é
  deliberado: a Task 8 tira o botão da tela quando há bloqueio, então o erro só
  aparece numa corrida (duas abas abertas, uma envia material do outro curso
  enquanto a outra está parada). Se isso incomodar na prática, converter
  `mudarStatus` para `useActionState` é a correção — mas é escopo de outra
  tarefa, não improvise aqui.
- **Endereços das unidades do DF continuam com `A CONFIRMAR`** e CEP
  `00000000`. Isso é pendência do cliente e está fora deste plano, mas se você
  for testar envio de material em produção, saiba que o endereço não é real.
