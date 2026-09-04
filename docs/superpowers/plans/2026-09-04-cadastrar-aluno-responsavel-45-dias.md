# Cadastrar aluno, responsável pela compra e 45 dias corridos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Devolver à aba Alunos um cadastro que não cria matrícula, expor os dados do responsável pela compra no cadastro do aluno e na matrícula, e trocar a regra da data da prova para 45 dias corridos exatos.

**Architecture:** A criação de conta de responsável, hoje escrita inline no checkout público, vira uma função única (`garantirResponsavel`) usada pelos três fluxos, com um parâmetro explícito dizendo se os dados digitados sobrescrevem um cadastro existente. O cadastro de aluno ganha rota própria que insere direto em `internos` (sem `garantirInterno`, que atualizaria em silêncio). A regra dos 45 dias vira soma pura e o maquinário de dia útil é removido.

**Tech Stack:** Next.js 15 (App Router, Server Components, Server Actions), Supabase (Postgres + RLS + Auth), TypeScript, Zod, Vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-04-cadastrar-aluno-responsavel-45-dias-design.md`

## Global Constraints

- Lógica pura e testável fica em `lib/*.ts`; `redirect()` e `cookies()` só em wrappers `'use server'` dentro de `app/**/acoes.ts`. `exigirEquipe()` usa `cookies()` e `redirect()`, então nunca é chamada de um módulo que os testes invocam direto.
- Todo módulo que toca `criarClienteAdmin()` (service role) começa com `import 'server-only'`.
- Português em nomes de arquivo, funções, variáveis, comentários e texto de tela. Comentário explica *por quê*, não *o quê*.
- Portal do Aluno é acesso **só por CPF**. Nada aqui cria caminho de senha para responsável.
- `garantirResponsavel` sobrescreve **nome e telefone, nunca o e-mail**. `prepararLoginPorCpf` (`lib/auth-cpf.ts:50`) resolve o e-mail pelo CPF em `profiles` e gera link mágico contra `auth.users`: alterar só o lado de `profiles` quebra o login do responsável em silêncio.
- `internos.responsavel_id` nos fluxos automáticos (checkout, matrícula) é **preenchido quando nulo, nunca trocado quando já tem valor**. Na edição do cadastro do aluno **pode ser trocado** — ali a troca é o objetivo, não efeito colateral.
- Nomes de campo do responsável, iguais em todos os formulários: `responsavelNome`, `responsavelCpf`, `responsavelEmail`, `responsavelTelefone`, `parentesco`.
- `supabase/seed.sql` é exclusivo de desenvolvimento local; nenhuma tarefa escreve nele com dado de produção.
- Cada tarefa termina com `npx tsc --noEmit` limpo antes do commit.
- Testes unitários: `npm test`. Integração: `npm run test:integracao` (exige `npx supabase start`). Se a integração falhar de forma estranha, rode `npm run db:reset` antes de investigar.
- Testes de integração criam suas **próprias unidades prisionais**: `tests/integracao/schema.test.ts` cria e apaga unidades, e o vitest roda os arquivos em paralelo — emprestar uma unidade do seed causa violação de chave estrangeira intermitente.

---

### Task 1: Data da prova vira 45 dias corridos

**Files:**
- Modify: `lib/matricula/prazos.ts`
- Modify: `tests/unidade/prazos.test.ts`
- Modify: `tests/integracao/datas.test.ts:101-103`
- Modify: `app/(admin)/admin/matriculas/[id]/page.tsx` (rótulo do bloco de datas)

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces: `calcularDataProva(dataInicio: string): string` — mesma assinatura, novo resultado. `DIAS_ATE_A_PROVA` continua exportada valendo `45`. `proximoDiaUtil`, `ehDiaUtil` e `feriadosNacionais` deixam de existir.

- [ ] **Step 1: Rewrite the unit test**

Replace the whole of `tests/unidade/prazos.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import { DIAS_ATE_A_PROVA, calcularDataProva } from '@/lib/matricula/prazos'

describe('calcularDataProva', () => {
  it('usa 45 dias, fixo para qualquer curso', () => {
    expect(DIAS_ATE_A_PROVA).toBe(45)
  })

  it('soma 45 dias corridos', () => {
    expect(calcularDataProva('2026-01-05')).toBe('2026-02-19')
  })

  it('não desvia quando os 45 dias caem no sábado', () => {
    // A regra antiga empurrava para segunda, 23/02. O cliente pediu a data
    // em que o aluno fica apto, que é o quadragésimo quinto dia, e ponto.
    expect(calcularDataProva('2026-01-07')).toBe('2026-02-21')
  })

  it('não desvia quando os 45 dias caem em feriado', () => {
    // 25 de dezembro. A regra antiga empurrava para 28.
    expect(calcularDataProva('2026-11-10')).toBe('2026-12-25')
  })

  it('atravessa a virada de ano', () => {
    expect(calcularDataProva('2026-12-01')).toBe('2027-01-15')
  })

  it('conta o 29 de fevereiro em ano bissexto', () => {
    // 2028 é bissexto: 20/01 + 45 cai em 05/03, não 04/03.
    expect(calcularDataProva('2028-01-20')).toBe('2028-03-05')
  })

  it('não depende do fuso horário da máquina', () => {
    // Datas de calendário, não instantes. O resultado tem de ser estável.
    expect(calcularDataProva('2026-03-01')).toBe(calcularDataProva('2026-03-01'))
    expect(calcularDataProva('2026-03-01')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('rejeita data mal formada', () => {
    expect(() => calcularDataProva('01/05/2026')).toThrow('AAAA-MM-DD')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unidade/prazos.test.ts`
Expected: FAIL — sábado dá `2026-02-23` e feriado dá `2026-12-28`, porque a regra antiga ainda empurra.

- [ ] **Step 3: Replace the implementation**

Replace the whole of `lib/matricula/prazos.ts` with:

```ts
/**
 * Regra definida pelo cliente: a prova acontece 45 dias corridos depois do
 * início do curso, e o início do curso é a entrega do material na unidade
 * prisional. É a data em que o aluno fica apto a fazer a prova.
 *
 * Uma versão anterior empurrava o resultado para o próximo dia útil quando
 * caía em fim de semana ou feriado. O cliente reviu isso em 04/09/2026 e
 * pediu 45 corridos exatos, então o cálculo de feriado saiu junto.
 *
 * São datas de calendário, não instantes: tudo trafega como 'AAAA-MM-DD' e as
 * contas são feitas em UTC, de modo que o fuso da máquina não muda o resultado.
 */

export const DIAS_ATE_A_PROVA = 45

const FORMATO = /^\d{4}-\d{2}-\d{2}$/

function paraUtc(data: string): Date {
  if (!FORMATO.test(data)) {
    throw new Error(`Data deve estar em AAAA-MM-DD, recebido: ${data}`)
  }
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(Date.UTC(ano!, mes! - 1, dia!))
}

function paraIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Data em que o aluno fica apto a fazer a prova, a partir do início do curso. */
export function calcularDataProva(dataInicio: string): string {
  const d = paraUtc(dataInicio)
  d.setUTCDate(d.getUTCDate() + DIAS_ATE_A_PROVA)
  return paraIso(d)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unidade/prazos.test.ts`
Expected: PASS, 8 testes.

- [ ] **Step 5: Fix the integration test expectation**

In `tests/integracao/datas.test.ts`, replace:

```ts
    expect(data!.data_inicio).toBe('2026-01-07')
    // 7 de janeiro + 45 dias cai num sábado, então a prova vai para segunda.
    expect(data!.data_prova).toBe('2026-02-23')
    expect(data!.data_prova).toBe(calcularDataProva('2026-01-07'))
```

with:

```ts
    expect(data!.data_inicio).toBe('2026-01-07')
    // 45 dias corridos, mesmo caindo num sábado.
    expect(data!.data_prova).toBe('2026-02-21')
    expect(data!.data_prova).toBe(calcularDataProva('2026-01-07'))
```

- [ ] **Step 6: Update the label on screen**

In `app/(admin)/admin/matriculas/[id]/page.tsx`, replace:

```tsx
              <dt className="text-texto-fraco">Prova (regra 45+)</dt>
```

with:

```tsx
              <dt className="text-texto-fraco">Prova (45 dias após a entrega)</dt>
```

- [ ] **Step 7: Run the full suite and commit**

```bash
npm run db:reset
npm test
npm run test:integracao
npx tsc --noEmit
git add lib/matricula/prazos.ts tests/unidade/prazos.test.ts tests/integracao/datas.test.ts "app/(admin)/admin/matriculas/[id]/page.tsx"
git commit -m "feat: data da prova vira 45 dias corridos exatos"
```

Expected: tudo verde. `tests/unidade/linha-do-tempo.test.ts` foi conferido e
não toca em `data_prova`, então não deve ser afetado.

---

### Task 2: garantirResponsavel, porta única de criação de conta

**Files:**
- Create: `lib/matricula/responsavel.ts`
- Modify: `lib/matricula/acoes.ts:61-98` (bloco que cria o responsável inline)
- Test: `tests/integracao/responsavel.test.ts`

**Interfaces:**
- Consumes: `DadosResponsavel` de `@/lib/dominio/esquemas`, `criarClienteAdmin` de `@/lib/supabase/admin`.
- Produces: `type ResultadoResponsavel = { ok: true; id: string; criado: boolean } | { ok: false; erro: string }` e `garantirResponsavel(dados: DadosResponsavel, opcoes: { atualizarCadastro: boolean }): Promise<ResultadoResponsavel>`, ambos exportados de `@/lib/matricula/responsavel`.

- [ ] **Step 1: Write the failing test**

Create `tests/integracao/responsavel.test.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { garantirResponsavel } from '@/lib/matricula/responsavel'

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

function marca(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

describe('garantirResponsavel', () => {
  it('cria a conta quando o CPF é novo', async () => {
    const m = marca()
    const r = await garantirResponsavel(
      {
        nome: 'Maria Responsavel',
        cpf: novoCpf(),
        email: `maria-${m}@exemplo.com`,
        telefone: '61999990000',
        parentesco: 'Mãe',
      },
      { atualizarCadastro: true },
    )

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.criado).toBe(true)

    const { data } = await admin
      .from('profiles')
      .select('nome, role, telefone')
      .eq('id', r.id)
      .single()
    expect(data!.nome).toBe('Maria Responsavel')
    expect(data!.role).toBe('responsavel')
  })

  it('reaproveita pelo CPF em vez de criar de novo', async () => {
    const m = marca()
    const cpf = novoCpf()

    const primeira = await garantirResponsavel(
      {
        nome: 'Ana Original',
        cpf,
        email: `ana-${m}@exemplo.com`,
        telefone: '61999991111',
        parentesco: 'Mãe',
      },
      { atualizarCadastro: false },
    )
    expect(primeira.ok).toBe(true)
    if (!primeira.ok) return

    const segunda = await garantirResponsavel(
      {
        nome: 'Ana Outra Grafia',
        cpf,
        email: `outro-${m}@exemplo.com`,
        telefone: '61988882222',
        parentesco: 'Esposa',
      },
      { atualizarCadastro: false },
    )
    expect(segunda.ok).toBe(true)
    if (!segunda.ok) return

    expect(segunda.criado).toBe(false)
    expect(segunda.id).toBe(primeira.id)

    // Sem atualizarCadastro, nada muda.
    const { data } = await admin
      .from('profiles')
      .select('nome, telefone')
      .eq('id', primeira.id)
      .single()
    expect(data!.nome).toBe('Ana Original')
    expect(data!.telefone).toBe('61999991111')
  })

  it('atualiza nome e telefone quando pedido, mas nunca o e-mail', async () => {
    const m = marca()
    const cpf = novoCpf()
    const emailOriginal = `bia-${m}@exemplo.com`

    const primeira = await garantirResponsavel(
      {
        nome: 'Bia Antiga',
        cpf,
        email: emailOriginal,
        telefone: '61999993333',
        parentesco: 'Irmã',
      },
      { atualizarCadastro: true },
    )
    expect(primeira.ok).toBe(true)
    if (!primeira.ok) return

    await garantirResponsavel(
      {
        nome: 'Bia Corrigida',
        cpf,
        email: `novo-${m}@exemplo.com`,
        telefone: '61977774444',
        parentesco: 'Irmã',
      },
      { atualizarCadastro: true },
    )

    const { data } = await admin
      .from('profiles')
      .select('nome, telefone, email')
      .eq('id', primeira.id)
      .single()

    expect(data!.nome).toBe('Bia Corrigida')
    expect(data!.telefone).toBe('61977774444')
    // O e-mail é a identidade de autenticação: prepararLoginPorCpf resolve o
    // e-mail por aqui e gera link mágico contra auth.users. Divergir quebra
    // o login por CPF do responsável.
    expect(data!.email).toBe(emailOriginal)
  })

  it('devolve erro legível quando o e-mail já é de outra conta', async () => {
    const m = marca()
    const email = `repetido-${m}@exemplo.com`

    const primeira = await garantirResponsavel(
      {
        nome: 'Carla Primeira',
        cpf: novoCpf(),
        email,
        telefone: '61999995555',
        parentesco: 'Mãe',
      },
      { atualizarCadastro: false },
    )
    expect(primeira.ok).toBe(true)

    // CPF diferente, mesmo e-mail: não dá pra reaproveitar pelo CPF e o
    // createUser vai barrar.
    const segunda = await garantirResponsavel(
      {
        nome: 'Carla Segunda',
        cpf: novoCpf(),
        email,
        telefone: '61999996666',
        parentesco: 'Mãe',
      },
      { atualizarCadastro: false },
    )

    expect(segunda.ok).toBe(false)
    if (segunda.ok) return
    expect(segunda.erro).toContain('e-mail')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run db:reset
npx vitest run tests/integracao/responsavel.test.ts
```

Expected: FAIL — "Failed to resolve import '@/lib/matricula/responsavel'".

- [ ] **Step 3: Write the implementation**

Create `lib/matricula/responsavel.ts`:

```ts
import 'server-only'
import type { DadosResponsavel } from '@/lib/dominio/esquemas'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type ResultadoResponsavel =
  | { ok: true; id: string; criado: boolean }
  | { ok: false; erro: string }

/**
 * Porta única de criação de conta de responsável. Antes disso a lógica vivia
 * inline no checkout público; o painel precisava dela também, e duplicar
 * criaria dois lugares onde conta de acesso nasce.
 *
 * `atualizarCadastro` separa as duas intenções: no painel o colaborador está
 * com a pessoa ao telefone e é a autoridade sobre o dado; no site, uma família
 * comprando de novo não deve alterar sozinha o cadastro.
 *
 * O e-mail nunca é sobrescrito, mesmo com `atualizarCadastro`. Ele é a
 * identidade de autenticação: prepararLoginPorCpf (lib/auth-cpf.ts) resolve o
 * e-mail pelo CPF em `profiles` e gera link mágico contra `auth.users`. Mexer
 * só de um lado quebra o login por CPF, e só na próxima tentativa de entrar.
 */
export async function garantirResponsavel(
  dados: DadosResponsavel,
  opcoes: { atualizarCadastro: boolean },
): Promise<ResultadoResponsavel> {
  const servidor = criarClienteAdmin()
  const cpf = dados.cpf.replace(/\D/g, '')

  // profiles.cpf é único: se o responsável já tem conta (segunda matrícula,
  // outro curso ou outro interno), reaproveita — criar de novo violaria a
  // constraint. O acesso continua sendo só por CPF (lib/auth-cpf.ts).
  const { data: existente } = await servidor
    .from('profiles')
    .select('id')
    .eq('cpf', cpf)
    .eq('role', 'responsavel')
    .maybeSingle()

  if (existente) {
    if (opcoes.atualizarCadastro) {
      const { error } = await servidor
        .from('profiles')
        .update({ nome: dados.nome, telefone: dados.telefone })
        .eq('id', existente.id)

      if (error) {
        return { ok: false, erro: 'Não foi possível atualizar o responsável.' }
      }
    }
    return { ok: true, id: existente.id, criado: false }
  }

  const { data: criado, error } = await servidor.auth.admin.createUser({
    email: dados.email,
    // Senha aleatória, nunca usada: o acesso é só por CPF.
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: {
      nome: dados.nome,
      cpf,
      telefone: dados.telefone,
    },
  })

  if (error || !criado.user) {
    if (error?.message.toLowerCase().includes('already been registered')) {
      return { ok: false, erro: 'Este e-mail já está em uso por outra conta.' }
    }
    return { ok: false, erro: 'Não foi possível criar o cadastro do responsável.' }
  }

  return { ok: true, id: criado.user.id, criado: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run db:reset
npx vitest run tests/integracao/responsavel.test.ts
```

Expected: PASS, 4 testes.

- [ ] **Step 5: Rewire the public checkout to the shared function**

In `lib/matricula/acoes.ts`, add the import:

```ts
import { garantirResponsavel } from '@/lib/matricula/responsavel'
```

Replace the whole inline block — from `// profiles.cpf é único:` through
`responsavelId = criado.user.id` and its closing brace — with:

```ts
  // O site nunca altera o cadastro de quem já tem conta: quem compra de novo
  // não deve sobrescrever nome e telefone sozinho.
  const resultadoResponsavel = await garantirResponsavel(responsavel.data, {
    atualizarCadastro: false,
  })
  if (!resultadoResponsavel.ok) {
    return { ok: false, erro: resultadoResponsavel.erro }
  }
  const responsavelId = resultadoResponsavel.id
```

The `const servidor = criarClienteAdmin()` line above it stays — the matrícula
insert below still uses it.

- [ ] **Step 6: Run the full suite and commit**

```bash
npm run db:reset
npm test
npm run test:integracao
npx tsc --noEmit
git add lib/matricula/responsavel.ts lib/matricula/acoes.ts tests/integracao/responsavel.test.ts
git commit -m "feat: uma porta so para criar conta de responsavel"
```

Expected: tudo verde, incluindo `tests/integracao/matricula.test.ts`, que
cobre o checkout público e não deve mudar de comportamento.

---

### Task 3: Cadastrar aluno sem matrícula

**Files:**
- Create: `lib/admin/cadastro-aluno.ts`
- Create: `app/(admin)/admin/alunos/acoes.ts`
- Create: `components/admin/CamposDoResponsavel.tsx`
- Create: `components/admin/FormularioCadastroAluno.tsx`
- Create: `app/(admin)/admin/alunos/novo/page.tsx`
- Create: `app/(admin)/admin/alunos/novo/loading.tsx`
- Modify: `app/(admin)/admin/alunos/page.tsx`
- Modify: `app/(admin)/admin/alunos/loading.tsx`
- Test: `tests/integracao/cadastro-aluno.test.ts`

**Interfaces:**
- Consumes: `garantirResponsavel` de `@/lib/matricula/responsavel` (Task 2).
- Produces: `type ResultadoCadastroAluno = { ok: true; internoId: string } | { ok: false; erro: string }` e `cadastrarAlunoNovo(entrada: { interno: DadosInterno; unidadeId: string; responsavel?: DadosResponsavel }): Promise<ResultadoCadastroAluno>` de `@/lib/admin/cadastro-aluno`; `cadastrarAluno(anterior: ResultadoCadastroAluno | null, formData: FormData): Promise<ResultadoCadastroAluno>` de `@/app/(admin)/admin/alunos/acoes`; `CamposDoResponsavel({ obrigatorio, legenda, valores }: { obrigatorio: boolean; legenda: string; valores?: { nome?: string; cpf?: string; email?: string; telefone?: string; parentesco?: string } })` de `@/components/admin/CamposDoResponsavel`.

- [ ] **Step 1: Write the failing test**

Create `tests/integracao/cadastro-aluno.test.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipos'
import { cadastrarAlunoNovo } from '@/lib/admin/cadastro-aluno'

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

/**
 * Unidade própria: tests/integracao/schema.test.ts cria e apaga unidades, e o
 * vitest roda os arquivos em paralelo — emprestar uma do seed dá violação de
 * chave estrangeira intermitente.
 */
async function unidadePropria(): Promise<string> {
  const { data } = await admin
    .from('unidades_prisionais')
    .insert({
      uf: 'DF',
      nome: `Unidade Cadastro ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      endereco: 'Rua do Cadastro, 1',
      cep: '70000000',
    })
    .select('id')
    .single()
  return data!.id
}

describe('cadastrarAlunoNovo', () => {
  it('cadastra o aluno sem responsável e sem criar matrícula', async () => {
    const unidadeId = await unidadePropria()

    const r = await cadastrarAlunoNovo({
      interno: {
        nome: 'Aluno Pre Cadastrado',
        cpf: novoCpf(),
        matriculaPrisional: 'MP-PRE-0001',
        rg: '',
        dataNascimento: '',
      },
      unidadeId,
    })

    expect(r.ok).toBe(true)
    if (!r.ok) return

    const { data: interno } = await admin
      .from('internos')
      .select('nome, responsavel_id, parentesco, unidade_prisional_id')
      .eq('id', r.internoId)
      .single()

    expect(interno!.nome).toBe('Aluno Pre Cadastrado')
    expect(interno!.responsavel_id).toBeNull()
    expect(interno!.parentesco).toBeNull()
    expect(interno!.unidade_prisional_id).toBe(unidadeId)

    const { count } = await admin
      .from('matriculas')
      .select('id', { count: 'exact', head: true })
      .eq('interno_id', r.internoId)
    expect(count).toBe(0)
  })

  it('vincula o responsável quando informado', async () => {
    const unidadeId = await unidadePropria()
    const m = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const r = await cadastrarAlunoNovo({
      interno: {
        nome: 'Aluno Com Responsavel',
        cpf: novoCpf(),
        matriculaPrisional: 'MP-PRE-0002',
        rg: '',
        dataNascimento: '',
      },
      unidadeId,
      responsavel: {
        nome: 'Responsavel Do Cadastro',
        cpf: novoCpf(),
        email: `cadastro-${m}@exemplo.com`,
        telefone: '61999990000',
        parentesco: 'Mãe',
      },
    })

    expect(r.ok).toBe(true)
    if (!r.ok) return

    const { data: interno } = await admin
      .from('internos')
      .select('parentesco, profiles:responsavel_id (nome)')
      .eq('id', r.internoId)
      .single()

    expect(interno!.parentesco).toBe('Mãe')
    expect(
      (interno!.profiles as unknown as { nome: string } | null)?.nome,
    ).toBe('Responsavel Do Cadastro')
  })

  it('recusa CPF de aluno já cadastrado sem alterar o registro anterior', async () => {
    const unidadeId = await unidadePropria()
    const cpf = novoCpf()

    const primeiro = await cadastrarAlunoNovo({
      interno: {
        nome: 'Aluno Original',
        cpf,
        matriculaPrisional: 'MP-ORIG',
        rg: '',
        dataNascimento: '',
      },
      unidadeId,
    })
    expect(primeiro.ok).toBe(true)
    if (!primeiro.ok) return

    const segundo = await cadastrarAlunoNovo({
      interno: {
        nome: 'Aluno Tentando De Novo',
        cpf,
        matriculaPrisional: 'MP-DUP',
        rg: '',
        dataNascimento: '',
      },
      unidadeId,
    })

    expect(segundo.ok).toBe(false)
    if (segundo.ok) return
    expect(segundo.erro).toContain('CPF')

    // O registro anterior fica intacto: esta tela cadastra, não atualiza.
    const { data } = await admin
      .from('internos')
      .select('nome, matricula_prisional')
      .eq('id', primeiro.internoId)
      .single()
    expect(data!.nome).toBe('Aluno Original')
    expect(data!.matricula_prisional).toBe('MP-ORIG')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run db:reset
npx vitest run tests/integracao/cadastro-aluno.test.ts
```

Expected: FAIL — "Failed to resolve import '@/lib/admin/cadastro-aluno'".

- [ ] **Step 3: Write the library**

Create `lib/admin/cadastro-aluno.ts`:

```ts
import 'server-only'
import type { DadosInterno, DadosResponsavel } from '@/lib/dominio/esquemas'
import { garantirResponsavel } from '@/lib/matricula/responsavel'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type ResultadoCadastroAluno =
  | { ok: true; internoId: string }
  | { ok: false; erro: string }

/**
 * Cadastro de aluno que não cria matrícula: serve para alimentar o banco de
 * alunos com uma lista da unidade penal, antes de existir comprador.
 *
 * Não usa garantirInterno de propósito. Aquela função atualiza o cadastro
 * quando encontra o CPF, que é o certo numa compra e o errado aqui: o
 * colaborador declarou intenção de criar um cadastro novo, e alterar em
 * silêncio um registro que ele não sabia existir é pior do que recusar.
 */
export async function cadastrarAlunoNovo(entrada: {
  interno: DadosInterno
  unidadeId: string
  responsavel?: DadosResponsavel
}): Promise<ResultadoCadastroAluno> {
  const supabase = criarClienteAdmin()

  let responsavelId: string | null = null
  let parentesco: string | null = null

  if (entrada.responsavel) {
    // No painel o colaborador está com a pessoa ao telefone: é ele a
    // autoridade sobre o dado.
    const resultado = await garantirResponsavel(entrada.responsavel, {
      atualizarCadastro: true,
    })
    if (!resultado.ok) return { ok: false, erro: resultado.erro }

    responsavelId = resultado.id
    parentesco = entrada.responsavel.parentesco
  }

  const { data, error } = await supabase
    .from('internos')
    .insert({
      nome: entrada.interno.nome,
      cpf: entrada.interno.cpf.replace(/\D/g, ''),
      rg: entrada.interno.rg || null,
      matricula_prisional: entrada.interno.matriculaPrisional,
      data_nascimento: entrada.interno.dataNascimento || null,
      unidade_prisional_id: entrada.unidadeId,
      responsavel_id: responsavelId,
      parentesco,
    })
    .select('id')
    .single()

  if (error?.code === '23505') {
    return { ok: false, erro: 'Já existe um aluno com este CPF.' }
  }
  if (error || !data) {
    return { ok: false, erro: 'Não foi possível cadastrar o aluno.' }
  }

  return { ok: true, internoId: data.id }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run db:reset
npx vitest run tests/integracao/cadastro-aluno.test.ts
```

Expected: PASS, 3 testes.

- [ ] **Step 5: Write the Server Action**

Create `app/(admin)/admin/alunos/acoes.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import {
  cadastrarAlunoNovo,
  type ResultadoCadastroAluno,
} from '@/lib/admin/cadastro-aluno'
import { exigirEquipe } from '@/lib/auth'
import { EsquemaInterno, EsquemaResponsavel } from '@/lib/dominio/esquemas'

/** Os cinco campos do responsável, ou nenhum. Meio preenchido é erro. */
const CAMPOS_RESPONSAVEL = [
  'responsavelNome',
  'responsavelCpf',
  'responsavelEmail',
  'responsavelTelefone',
  'parentesco',
] as const

export async function cadastrarAluno(
  _anterior: ResultadoCadastroAluno | null,
  formData: FormData,
): Promise<ResultadoCadastroAluno> {
  await exigirEquipe()

  const unidadeId = String(formData.get('unidadeId') ?? '')
  if (!unidadeId) return { ok: false, erro: 'Selecione a unidade prisional' }

  const interno = EsquemaInterno.safeParse({
    nome: formData.get('nome'),
    cpf: formData.get('cpf'),
    matriculaPrisional: formData.get('matriculaPrisional'),
    rg: formData.get('rg') || undefined,
    dataNascimento: formData.get('dataNascimento') || undefined,
  })
  if (!interno.success) {
    return { ok: false, erro: interno.error.issues[0]!.message }
  }

  const preenchidos = CAMPOS_RESPONSAVEL.filter((c) =>
    String(formData.get(c) ?? '').trim(),
  )

  if (preenchidos.length > 0 && preenchidos.length < CAMPOS_RESPONSAVEL.length) {
    return {
      ok: false,
      erro: 'Preencha todos os dados do responsável ou deixe todos em branco.',
    }
  }

  let responsavel
  if (preenchidos.length === CAMPOS_RESPONSAVEL.length) {
    const analisado = EsquemaResponsavel.safeParse({
      nome: formData.get('responsavelNome'),
      cpf: formData.get('responsavelCpf'),
      email: formData.get('responsavelEmail'),
      telefone: formData.get('responsavelTelefone'),
      parentesco: formData.get('parentesco'),
    })
    if (!analisado.success) {
      return { ok: false, erro: analisado.error.issues[0]!.message }
    }
    responsavel = analisado.data
  }

  const resultado = await cadastrarAlunoNovo({
    interno: interno.data,
    unidadeId,
    responsavel,
  })

  if (!resultado.ok) return resultado
  redirect(`/admin/alunos/${resultado.internoId}`)
}
```

- [ ] **Step 6: Write the shared responsável fieldset**

Create `components/admin/CamposDoResponsavel.tsx`:

```tsx
type Valores = {
  nome?: string
  cpf?: string
  email?: string
  telefone?: string
  parentesco?: string
}

/**
 * Os cinco campos do responsável, com os mesmos `name` em toda tela que os
 * usa — cadastro de aluno, edição de aluno e matrícula — para que as Server
 * Actions leiam sempre as mesmas chaves.
 */
export function CamposDoResponsavel({
  obrigatorio,
  legenda,
  valores,
}: {
  obrigatorio: boolean
  legenda: string
  valores?: Valores
}) {
  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <fieldset className="space-y-4">
      <legend className="font-semibold text-texto">
        {legenda}
        {!obrigatorio && (
          <span className="ml-2 text-xs font-normal text-texto-fraco">
            opcional
          </span>
        )}
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-texto">Nome completo</span>
          <input
            name="responsavelNome"
            defaultValue={valores?.nome ?? ''}
            className={campo}
            required={obrigatorio}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-texto">CPF</span>
          <input
            name="responsavelCpf"
            defaultValue={valores?.cpf ?? ''}
            className={campo}
            required={obrigatorio}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-texto">E-mail</span>
          <input
            name="responsavelEmail"
            type="email"
            defaultValue={valores?.email ?? ''}
            className={campo}
            required={obrigatorio}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-texto">Telefone</span>
          <input
            name="responsavelTelefone"
            defaultValue={valores?.telefone ?? ''}
            className={campo}
            required={obrigatorio}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-texto">Parentesco</span>
          <input
            name="parentesco"
            defaultValue={valores?.parentesco ?? ''}
            className={campo}
            required={obrigatorio}
          />
        </label>
      </div>
    </fieldset>
  )
}
```

- [ ] **Step 7: Write the cadastro form**

Create `components/admin/FormularioCadastroAluno.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { cadastrarAluno } from '@/app/(admin)/admin/alunos/acoes'
import { CamposDoResponsavel } from '@/components/admin/CamposDoResponsavel'
import { BotaoSubmit } from '@/components/ui/BotaoSubmit'
import type { ResultadoCadastroAluno } from '@/lib/admin/cadastro-aluno'

type Unidade = { id: string; uf: string; nome: string }

export function FormularioCadastroAluno({ unidades }: { unidades: Unidade[] }) {
  const [estado, acao] = useActionState<ResultadoCadastroAluno | null, FormData>(
    cadastrarAluno,
    null,
  )

  const campo =
    'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto'

  return (
    <form action={acao} className="space-y-6">
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
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-texto">Unidade prisional</span>
            <select name="unidadeId" className={campo} required>
              <option value="">Selecione</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.uf} · {u.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <CamposDoResponsavel obrigatorio={false} legenda="Responsável pela compra" />

      {estado && !estado.ok && (
        <p role="alert" className="text-sm text-red-400">
          {estado.erro}
        </p>
      )}

      <BotaoSubmit className="rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-fundo hover:bg-acento-claro">
        Cadastrar aluno
      </BotaoSubmit>
    </form>
  )
}
```

- [ ] **Step 8: Write the route**

Create `app/(admin)/admin/alunos/novo/page.tsx`:

```tsx
import Link from 'next/link'
import { FormularioCadastroAluno } from '@/components/admin/FormularioCadastroAluno'
import { exigirEquipe } from '@/lib/auth'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Cadastrar aluno — Clique Estudos' }

export default async function CadastrarAluno() {
  await exigirEquipe()

  const supabase = criarClienteAdmin()
  const { data: unidades } = await supabase
    .from('unidades_prisionais')
    .select('id, uf, nome')
    .eq('ativa', true)
    .order('uf')
    .order('nome')

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin/alunos" className="text-sm text-acento hover:underline">
        ← Alunos
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-texto">Cadastrar aluno</h1>
      <p className="mt-2 text-sm text-texto-suave">
        Só alimenta o cadastro de alunos — nenhuma matrícula é criada aqui. Para
        vincular um curso, use{' '}
        <Link href="/admin/matriculas/nova" className="text-acento hover:underline">
          Matricular aluno
        </Link>
        .
      </p>

      <div className="mt-8">
        <FormularioCadastroAluno unidades={unidades ?? []} />
      </div>
    </main>
  )
}
```

Create `app/(admin)/admin/alunos/novo/loading.tsx`:

```tsx
import { EsqueletoFormulario } from '@/components/ui/Esqueleto'

export default function Carregando() {
  return <EsqueletoFormulario campos={8} />
}
```

- [ ] **Step 9: Put the button back on the Alunos tab**

In `app/(admin)/admin/alunos/page.tsx`, replace:

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

with:

```tsx
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-texto">Alunos</h1>
        <Link
          href="/admin/alunos/novo"
          className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-fundo transition hover:bg-acento-claro"
        >
          Cadastrar aluno
        </Link>
      </div>
      <p className="mt-2 text-sm text-texto-suave">
        Cadastrar aqui só alimenta a lista de alunos. Para vincular um curso, use{' '}
        <Link href="/admin/matriculas/nova" className="text-acento hover:underline">
          Matricular aluno
        </Link>
        .
      </p>
```

In `app/(admin)/admin/alunos/loading.tsx`, put the button block back:

```tsx
import { EsqueletoTabela } from '@/components/ui/Esqueleto'

export default function Carregando() {
  return <EsqueletoTabela largura="max-w-5xl" colunas={5} comBusca comBotao />
}
```

- [ ] **Step 10: Verify and commit**

```bash
npm run db:reset
npm test
npm run test:integracao
npx tsc --noEmit
npm run build
git add lib/admin/cadastro-aluno.ts "app/(admin)/admin/alunos" components/admin/CamposDoResponsavel.tsx components/admin/FormularioCadastroAluno.tsx tests/integracao/cadastro-aluno.test.ts
git commit -m "feat: cadastrar aluno sem criar matricula"
```

---

### Task 4: Responsável na edição do cadastro do aluno

**Files:**
- Modify: `lib/admin/alunos.ts`
- Modify: `lib/admin/acoes.ts` (função `salvarAluno`)
- Modify: `components/admin/CamposDoAluno.tsx`
- Modify: `components/admin/FormularioAluno.tsx`
- Modify: `lib/admin/consultas.ts` (`obterAlunoAdmin` já traz `profiles`; precisa também de `cpf` e `parentesco`)
- Test: `tests/integracao/admin.test.ts`

**Interfaces:**
- Consumes: `garantirResponsavel` (Task 2), `CamposDoResponsavel` (Task 3).
- Produces: `DadosAlunoAdmin` ganha o campo opcional `responsavel?: DadosResponsavel`; `atualizarAluno` e `salvarAluno` mantêm as assinaturas atuais e o tipo `ResultadoSalvarAluno`.

- [ ] **Step 1: Write the failing test**

Append to `tests/integracao/admin.test.ts` (the helpers `novoCpf` and the
`admin` client already exist in that file):

```ts
describe('atualizarAluno com responsável', () => {
  it('vincula um responsável novo a um aluno que não tinha', async () => {
    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .select('id')
      .limit(1)
      .single()

    const { data: alvo } = await admin
      .from('internos')
      .insert({
        nome: 'Aluno Sem Responsavel',
        cpf: novoCpf(),
        matricula_prisional: 'MP-SEM-RESP',
        unidade_prisional_id: unidade!.id,
      })
      .select('id, cpf')
      .single()

    const m = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const r = await atualizarAluno({
      id: alvo!.id,
      nome: 'Aluno Sem Responsavel',
      cpf: alvo!.cpf,
      matriculaPrisional: 'MP-SEM-RESP',
      unidadeId: unidade!.id,
      responsavel: {
        nome: 'Responsavel Vinculado',
        cpf: novoCpf(),
        email: `vinculado-${m}@exemplo.com`,
        telefone: '61999990000',
        parentesco: 'Pai',
      },
    })

    expect(r.ok).toBe(true)

    const { data } = await admin
      .from('internos')
      .select('parentesco, profiles:responsavel_id (nome)')
      .eq('id', alvo!.id)
      .single()

    expect(data!.parentesco).toBe('Pai')
    expect((data!.profiles as unknown as { nome: string } | null)?.nome).toBe(
      'Responsavel Vinculado',
    )
  })

  it('troca o responsável de um aluno que já tinha outro', async () => {
    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .select('id')
      .limit(1)
      .single()

    const m = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const { data: primeiro } = await admin.auth.admin.createUser({
      email: `antigo-${m}@exemplo.com`,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        nome: 'Responsavel Antigo',
        cpf: novoCpf(),
        telefone: '61999991111',
      },
    })

    const { data: alvo } = await admin
      .from('internos')
      .insert({
        nome: 'Aluno Trocando Responsavel',
        cpf: novoCpf(),
        matricula_prisional: 'MP-TROCA',
        unidade_prisional_id: unidade!.id,
        responsavel_id: primeiro.user!.id,
      })
      .select('id, cpf')
      .single()

    // Na tela de edição a troca é o objetivo, não efeito colateral: aqui ela
    // é permitida, ao contrário do que acontece numa compra.
    const r = await atualizarAluno({
      id: alvo!.id,
      nome: 'Aluno Trocando Responsavel',
      cpf: alvo!.cpf,
      matriculaPrisional: 'MP-TROCA',
      unidadeId: unidade!.id,
      responsavel: {
        nome: 'Responsavel Novo',
        cpf: novoCpf(),
        email: `novo-${m}@exemplo.com`,
        telefone: '61988882222',
        parentesco: 'Esposa',
      },
    })

    expect(r.ok).toBe(true)

    const { data } = await admin
      .from('internos')
      .select('responsavel_id, profiles:responsavel_id (nome)')
      .eq('id', alvo!.id)
      .single()

    expect(data!.responsavel_id).not.toBe(primeiro.user!.id)
    expect((data!.profiles as unknown as { nome: string } | null)?.nome).toBe(
      'Responsavel Novo',
    )
  })

  it('mantém o responsável quando o bloco vem vazio', async () => {
    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .select('id')
      .limit(1)
      .single()

    const m = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const { data: perfil } = await admin.auth.admin.createUser({
      email: `mantido-${m}@exemplo.com`,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        nome: 'Responsavel Mantido',
        cpf: novoCpf(),
        telefone: '61999993333',
      },
    })

    const { data: alvo } = await admin
      .from('internos')
      .insert({
        nome: 'Aluno Mantendo',
        cpf: novoCpf(),
        matricula_prisional: 'MP-MANTEM',
        unidade_prisional_id: unidade!.id,
        responsavel_id: perfil.user!.id,
      })
      .select('id, cpf')
      .single()

    const r = await atualizarAluno({
      id: alvo!.id,
      nome: 'Aluno Mantendo Corrigido',
      cpf: alvo!.cpf,
      matriculaPrisional: 'MP-MANTEM',
      unidadeId: unidade!.id,
    })

    expect(r.ok).toBe(true)

    const { data } = await admin
      .from('internos')
      .select('nome, responsavel_id')
      .eq('id', alvo!.id)
      .single()
    expect(data!.nome).toBe('Aluno Mantendo Corrigido')
    expect(data!.responsavel_id).toBe(perfil.user!.id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run db:reset
npx vitest run tests/integracao/admin.test.ts
```

Expected: FAIL — `responsavel` não existe no tipo de `atualizarAluno`.

- [ ] **Step 3: Extend the library**

In `lib/admin/alunos.ts`, add the import and the field, and handle the
responsável:

```ts
import 'server-only'
import type { DadosResponsavel } from '@/lib/dominio/esquemas'
import { garantirResponsavel } from '@/lib/matricula/responsavel'
import { criarClienteAdmin } from '@/lib/supabase/admin'

export type DadosAlunoAdmin = {
  id: string
  nome: string
  cpf: string
  rg?: string
  matriculaPrisional: string
  dataNascimento?: string
  unidadeId: string
  /** Ausente significa "não mexer no que já está lá". */
  responsavel?: DadosResponsavel
}

export type ResultadoSalvarAluno = { ok: true } | { ok: false; erro: string }

export async function atualizarAluno(
  d: DadosAlunoAdmin,
): Promise<ResultadoSalvarAluno> {
  const supabase = criarClienteAdmin()

  const cadastrais: Record<string, unknown> = {
    nome: d.nome,
    cpf: d.cpf.replace(/\D/g, ''),
    rg: d.rg ?? null,
    matricula_prisional: d.matriculaPrisional,
    data_nascimento: d.dataNascimento ?? null,
    unidade_prisional_id: d.unidadeId,
  }

  // Nesta tela a troca de responsável é o objetivo, não efeito colateral de
  // uma compra — por isso aqui ela substitui o que existia, ao contrário do
  // que acontece no checkout e na matrícula.
  if (d.responsavel) {
    const resultado = await garantirResponsavel(d.responsavel, {
      atualizarCadastro: true,
    })
    if (!resultado.ok) return { ok: false, erro: resultado.erro }

    cadastrais.responsavel_id = resultado.id
    cadastrais.parentesco = d.responsavel.parentesco
  }

  const { error } = await supabase.from('internos').update(cadastrais).eq('id', d.id)

  // 23505 é violação de unicidade. Desde que o CPF virou a identidade do
  // aluno, digitar um CPF que já é de outro cadastro é erro de usuário e
  // precisa voltar como texto, não como exceção na tela.
  if (error?.code === '23505') {
    return { ok: false, erro: 'Já existe um aluno com este CPF.' }
  }
  if (error) return { ok: false, erro: 'Não foi possível salvar o aluno.' }

  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run db:reset
npx vitest run tests/integracao/admin.test.ts
```

Expected: PASS.

- [ ] **Step 5: Parse the responsável in the Server Action**

In `lib/admin/acoes.ts`, inside `salvarAluno`, after the `EsquemaAlunoAdmin.parse`
call, add the same all-or-nothing rule used in Task 3 and pass it through. Add
`EsquemaResponsavel` to the existing import from `@/lib/dominio/esquemas` if it
is not there yet, and replace the call to `atualizarAluno(d)` with:

```ts
  const camposResponsavel = [
    'responsavelNome',
    'responsavelCpf',
    'responsavelEmail',
    'responsavelTelefone',
    'parentesco',
  ] as const

  const preenchidos = camposResponsavel.filter((c) =>
    String(formData.get(c) ?? '').trim(),
  )

  if (preenchidos.length > 0 && preenchidos.length < camposResponsavel.length) {
    return {
      ok: false,
      erro: 'Preencha todos os dados do responsável ou deixe todos em branco.',
    }
  }

  let responsavel
  if (preenchidos.length === camposResponsavel.length) {
    const analisado = EsquemaResponsavel.safeParse({
      nome: formData.get('responsavelNome'),
      cpf: formData.get('responsavelCpf'),
      email: formData.get('responsavelEmail'),
      telefone: formData.get('responsavelTelefone'),
      parentesco: formData.get('parentesco'),
    })
    if (!analisado.success) {
      return { ok: false, erro: analisado.error.issues[0]!.message }
    }
    responsavel = analisado.data
  }

  const resultado = await atualizarAluno({ ...d, responsavel })
  if (!resultado.ok) return resultado
```

- [ ] **Step 6: Bring the responsável data to the screen**

In `lib/admin/consultas.ts`, in `obterAlunoAdmin`, the `internos` select
already carries `profiles:responsavel_id (nome, email, telefone)`. Add `cpf` to
that join and `parentesco` to the columns, so the form can prefill:

```ts
        id, nome, cpf, rg, matricula_prisional, data_nascimento, unidade_prisional_id,
        parentesco,
        unidades_prisionais:unidade_prisional_id (nome, uf, regiao),
        profiles:responsavel_id (nome, cpf, email, telefone)
```

Update the `AlunoDetalhe['interno']` type accordingly: add `parentesco: string | null`
and change `profiles` to `{ nome: string; cpf: string; email: string; telefone: string } | null`.

- [ ] **Step 7: Add the fieldset to the form**

In `components/admin/FormularioAluno.tsx`, widen the `Aluno` type with
`parentesco: string | null` and `profiles: { nome: string; cpf: string; email: string; telefone: string } | null`,
and pass the whole `aluno` through to `CamposDoAluno` unchanged.

In `components/admin/CamposDoAluno.tsx`, widen the local `Aluno` type the same
way, add the import:

```tsx
import { CamposDoResponsavel } from '@/components/admin/CamposDoResponsavel'
```

and insert, right after the closing `</div>` of the six-field grid and before
the `{estado && !estado.ok && (` block:

```tsx
      <CamposDoResponsavel
        obrigatorio={false}
        legenda="Responsável pela compra"
        valores={{
          nome: aluno.profiles?.nome,
          cpf: aluno.profiles?.cpf,
          email: aluno.profiles?.email,
          telefone: aluno.profiles?.telefone,
          parentesco: aluno.parentesco ?? undefined,
        }}
      />
```

- [ ] **Step 8: Verify and commit**

```bash
npm run db:reset
npm test
npm run test:integracao
npx tsc --noEmit
npm run build
git add lib/admin/alunos.ts lib/admin/acoes.ts lib/admin/consultas.ts components/admin/CamposDoAluno.tsx components/admin/FormularioAluno.tsx tests/integracao/admin.test.ts
git commit -m "feat: responsavel pela compra no cadastro do aluno"
```

---

### Task 5: Responsável na matrícula

**Files:**
- Modify: `lib/admin/matricula-manual.ts` (`registrarMatriculaParaAlunoExistente`)
- Modify: `app/(admin)/admin/matriculas/acoes.ts` (`matricularAlunoExistente`)
- Modify: `components/admin/FormularioNovaMatricula.tsx`
- Modify: `app/(admin)/admin/matriculas/nova/page.tsx`
- Test: `tests/integracao/matricula-manual.test.ts`

**Interfaces:**
- Consumes: `garantirResponsavel` (Task 2), `CamposDoResponsavel` (Task 3).
- Produces: `registrarMatriculaParaAlunoExistente(entrada: { internoId: string; cursoSlug: string; unidadeId: string; responsavel: DadosResponsavel }): Promise<ResultadoMatriculaManual>` — `responsavel` é novo e obrigatório. `FormularioNovaMatricula` ganha a prop `responsavelAtual?: { nome: string; cpf: string; email: string; telefone: string; parentesco?: string }`.

- [ ] **Step 1: Write the failing test**

Append to `tests/integracao/matricula-manual.test.ts`:

```ts
describe('registrarMatriculaParaAlunoExistente com responsável próprio', () => {
  it('grava o comprador na matrícula sem trocar o do cadastro', async () => {
    const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .insert({
        uf: 'DF',
        nome: `Unidade Comprador ${marca}`,
        endereco: 'Rua do Comprador, 1',
        cep: '70000000',
      })
      .select('id')
      .single()

    const primeira = await registrarMatriculaManualNovoAluno({
      cursoSlug: 'auxiliar-de-cozinha',
      unidade: { uf: 'DF', unidadeId: unidade!.id },
      interno: {
        nome: 'Aluno Dois Compradores',
        cpf: novoCpf(),
        matriculaPrisional: `MP-2COMP-${marca}`,
      },
      responsavel: {
        nome: 'Mae Compradora',
        cpf: novoCpf(),
        email: `mae-${marca}@exemplo.com`,
        telefone: '61999990000',
        parentesco: 'Mãe',
      },
    })
    expect(primeira.ok).toBe(true)
    if (!primeira.ok) return

    const { data: criada } = await admin
      .from('matriculas')
      .select('interno_id, responsavel_id')
      .eq('id', primeira.matriculaId)
      .single()

    const segunda = await registrarMatriculaParaAlunoExistente({
      internoId: criada!.interno_id,
      cursoSlug: 'formacao-para-eletricista',
      unidadeId: unidade!.id,
      responsavel: {
        nome: 'Esposa Compradora',
        cpf: novoCpf(),
        email: `esposa-${marca}@exemplo.com`,
        telefone: '61988881111',
        parentesco: 'Esposa',
      },
    })
    expect(segunda.ok).toBe(true)
    if (!segunda.ok) return

    const { data: nova } = await admin
      .from('matriculas')
      .select('responsavel_id, profiles:responsavel_id (nome)')
      .eq('id', segunda.matriculaId)
      .single()

    // A segunda compra é da esposa.
    expect((nova!.profiles as unknown as { nome: string }).nome).toBe(
      'Esposa Compradora',
    )
    expect(nova!.responsavel_id).not.toBe(criada!.responsavel_id)

    // E o cadastro do aluno continua com quem comprou primeiro: numa compra,
    // trocar o responsável do cadastro seria efeito colateral.
    const { data: interno } = await admin
      .from('internos')
      .select('profiles:responsavel_id (nome)')
      .eq('id', criada!.interno_id)
      .single()
    expect((interno!.profiles as unknown as { nome: string }).nome).toBe(
      'Mae Compradora',
    )
  })

  it('preenche o responsável do cadastro quando o aluno ainda não tinha', async () => {
    const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const { data: unidade } = await admin
      .from('unidades_prisionais')
      .insert({
        uf: 'DF',
        nome: `Unidade Pre Cadastro ${marca}`,
        endereco: 'Rua do Pre, 1',
        cep: '70000000',
      })
      .select('id')
      .single()

    const { data: interno } = await admin
      .from('internos')
      .insert({
        nome: 'Aluno Pre Sem Responsavel',
        cpf: novoCpf(),
        matricula_prisional: `MP-PRE-${marca}`,
        unidade_prisional_id: unidade!.id,
      })
      .select('id')
      .single()

    const r = await registrarMatriculaParaAlunoExistente({
      internoId: interno!.id,
      cursoSlug: 'auxiliar-de-cozinha',
      unidadeId: unidade!.id,
      responsavel: {
        nome: 'Primeiro Comprador',
        cpf: novoCpf(),
        email: `primeiro-${marca}@exemplo.com`,
        telefone: '61999992222',
        parentesco: 'Irmão',
      },
    })
    expect(r.ok).toBe(true)

    const { data } = await admin
      .from('internos')
      .select('parentesco, profiles:responsavel_id (nome)')
      .eq('id', interno!.id)
      .single()

    expect((data!.profiles as unknown as { nome: string }).nome).toBe(
      'Primeiro Comprador',
    )
    expect(data!.parentesco).toBe('Irmão')
  })
})
```

Two existing calls in that same file stop compiling, because `responsavel`
passou a ser obrigatório. Em **ambas**, acrescente este bloco como último
campo do objeto passado a `registrarMatriculaParaAlunoExistente`:

```ts
      responsavel: {
        nome: 'Responsavel Do Teste',
        cpf: novoCpf(),
        email: `resp-${Date.now()}-${Math.random().toString(36).slice(2)}@exemplo.com`,
        telefone: '61999997777',
        parentesco: 'Mãe',
      },
```

As duas chamadas são a do teste `'reaproveita interno e responsavel, so pede o
curso'` e a do teste `'recusa aluno inexistente'`. A primeira também tem uma
asserção `expect(matriculas!.every((m) => m.responsavel_id === interno!.responsavel_id)).toBe(true)`
que deixa de valer — agora a segunda matrícula tem comprador próprio. Troque
essa linha por uma que confira só o status:

```ts
    expect(matriculas!.every((m) => m.status === 'paga')).toBe(true)
```

(a asserção de status já existe logo abaixo; remova a duplicada.)

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run db:reset
npx vitest run tests/integracao/matricula-manual.test.ts
```

Expected: FAIL — `responsavel` não existe no tipo do parâmetro.

- [ ] **Step 3: Write the implementation**

In `lib/admin/matricula-manual.ts`, add the imports:

```ts
import type { DadosResponsavel } from '@/lib/dominio/esquemas'
import { garantirResponsavel } from '@/lib/matricula/responsavel'
```

Change the signature and the responsável handling. Replace:

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
```

with:

```ts
export async function registrarMatriculaParaAlunoExistente(entrada: {
  internoId: string
  cursoSlug: string
  unidadeId: string
  responsavel: DadosResponsavel
}): Promise<ResultadoMatriculaManual> {
  const supabase = criarClienteAdmin()

  const { data: interno } = await supabase
    .from('internos')
    .select('id, responsavel_id')
    .eq('id', entrada.internoId)
    .maybeSingle()

  if (!interno) return { ok: false, erro: 'Aluno não encontrado' }

  // Quem paga esta compra pode não ser quem pagou a anterior: a mãe comprou o
  // primeiro curso, a esposa compra o segundo.
  const comprador = await garantirResponsavel(entrada.responsavel, {
    atualizarCadastro: true,
  })
  if (!comprador.ok) return { ok: false, erro: comprador.erro }
```

Then change the matrícula insert to use `responsavel_id: comprador.id` instead
of `interno.responsavel_id`, and after the insert — next to the existing
`internos` update that carries the unidade — extend that update so it also
fills the responsável **only when the cadastro ainda não tem um**:

```ts
  // Transferência de unidade acompanha o cadastro do aluno. O responsável só
  // é preenchido quando está nulo: numa compra, trocar o responsável do
  // cadastro seria efeito colateral, e tiraria de quem comprou primeiro.
  await supabase
    .from('internos')
    .update({
      unidade_prisional_id: unidade.id,
      ...(interno.responsavel_id
        ? {}
        : { responsavel_id: comprador.id, parentesco: entrada.responsavel.parentesco }),
    })
    .eq('id', interno.id)
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run db:reset
npx vitest run tests/integracao/matricula-manual.test.ts
```

Expected: PASS.

- [ ] **Step 5: Parse the responsável in the Server Action**

In `app/(admin)/admin/matriculas/acoes.ts`, in `matricularAlunoExistente`,
replace the body after the `unidadeId` check with:

```ts
  const responsavel = EsquemaResponsavel.safeParse({
    nome: formData.get('responsavelNome'),
    cpf: formData.get('responsavelCpf'),
    email: formData.get('responsavelEmail'),
    telefone: formData.get('responsavelTelefone'),
    parentesco: formData.get('parentesco'),
  })
  if (!responsavel.success) {
    return { ok: false, erro: responsavel.error.issues[0]!.message }
  }

  const resultado = await registrarMatriculaParaAlunoExistente({
    internoId,
    cursoSlug,
    unidadeId,
    responsavel: responsavel.data,
  })

  if (!resultado.ok) return resultado
  redirect(`/admin/matriculas/${resultado.matriculaId}`)
```

`EsquemaResponsavel` já está importado nesse arquivo.

- [ ] **Step 6: Add the fieldset to the matrícula form**

In `components/admin/FormularioNovaMatricula.tsx`, add the import:

```tsx
import { CamposDoResponsavel } from '@/components/admin/CamposDoResponsavel'
```

Add the prop to the signature:

```tsx
export function FormularioNovaMatricula({
  internoId,
  cursos,
  unidades,
  unidadeAtualId,
  responsavelAtual,
}: {
  internoId: string
  cursos: Curso[]
  unidades: Unidade[]
  unidadeAtualId: string
  responsavelAtual?: {
    nome: string
    cpf: string
    email: string
    telefone: string
    parentesco?: string
  }
}) {
```

Insert, right before the `{estado && !estado.ok && (` block:

```tsx
      <CamposDoResponsavel
        obrigatorio
        legenda="Responsável pela compra"
        valores={responsavelAtual}
      />
      <p className="text-xs text-texto-fraco">
        Vem preenchido com o responsável do cadastro. Troque se quem está
        pagando esta compra for outra pessoa — o Portal do Aluno mostra a
        matrícula para quem pagou.
      </p>
```

- [ ] **Step 7: Feed the prop from the page**

In `app/(admin)/admin/matriculas/nova/page.tsx`, extend the `internos` select
to bring the responsável:

```ts
          .select(
            'id, nome, cpf, matricula_prisional, unidade_prisional_id, parentesco, profiles:responsavel_id (nome, cpf, email, telefone)',
          )
```

and pass it down:

```tsx
          <FormularioNovaMatricula
            internoId={aluno.id}
            cursos={cursos ?? []}
            unidades={unidades ?? []}
            unidadeAtualId={aluno.unidade_prisional_id}
            responsavelAtual={
              aluno.profiles
                ? {
                    ...(aluno.profiles as unknown as {
                      nome: string
                      cpf: string
                      email: string
                      telefone: string
                    }),
                    parentesco: aluno.parentesco ?? undefined,
                  }
                : undefined
            }
          />
```

- [ ] **Step 8: Verify and commit**

```bash
npm run db:reset
npm test
npm run test:integracao
npx tsc --noEmit
npm run build
git add lib/admin/matricula-manual.ts "app/(admin)/admin/matriculas" components/admin/FormularioNovaMatricula.tsx tests/integracao/matricula-manual.test.ts
git commit -m "feat: cada matricula grava seu proprio comprador"
```

---

### Task 6: As datas visíveis no detalhe do aluno

**Files:**
- Modify: `lib/admin/consultas.ts` (`obterAlunoAdmin`, seleção de matrículas)
- Modify: `app/(admin)/admin/alunos/[id]/page.tsx`

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces: `AlunoDetalhe['matriculas']` ganha `data_compra: string | null`, `data_inicio: string | null` e `data_prova: string | null`.

- [ ] **Step 1: Bring the dates in the query**

In `lib/admin/consultas.ts`, inside `obterAlunoAdmin`, change the matrículas
select from:

```ts
      .select('id, codigo, status, total_centavos, created_at, cursos:curso_id (titulo)')
```

to:

```ts
      .select(
        'id, codigo, status, total_centavos, created_at, data_compra, data_inicio, data_prova, cursos:curso_id (titulo)',
      )
```

and add the three fields to the `AlunoDetalhe['matriculas']` type:

```ts
  matriculas: {
    id: string
    codigo: string
    status: string
    total_centavos: number
    created_at: string
    data_compra: string | null
    data_inicio: string | null
    data_prova: string | null
    cursos: { titulo: string } | null
  }[]
```

- [ ] **Step 2: Show them under each matrícula**

In `app/(admin)/admin/alunos/[id]/page.tsx`, add a date formatter above the
component:

```tsx
function formatarData(data: string | null): string {
  if (!data) return '—'
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR')
}
```

The matrícula `<li>` currently holds a single `<Link>` with the code, course
title and the badges. Wrap that link and a new date line together, replacing
the `<li key={m.id}>` block's contents with:

```tsx
            <li key={m.id} className="rounded-lg border border-borda">
              <Link
                href={`/admin/matriculas/${m.id}`}
                className="flex flex-wrap items-center justify-between gap-2 p-3 hover:border-acento/50"
              >
                <span className="text-sm text-texto">
                  <span className="font-mono text-xs text-texto-fraco">{m.codigo}</span>{' '}
                  {m.cursos?.titulo}
                </span>
                <span className="flex items-center gap-3">
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
                  <span className="text-sm text-texto-suave">
                    {formatarBRL(m.total_centavos)}
                  </span>
                  <Selo status={m.status as StatusMatricula} />
                </span>
              </Link>

              {(m.data_compra || m.data_inicio || m.data_prova) && (
                <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-borda px-3 py-2 text-xs text-texto-fraco">
                  <div>
                    <dt className="inline">Pagamento: </dt>
                    <dd className="inline text-texto-suave">
                      {formatarData(m.data_compra)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Início (entrega): </dt>
                    <dd className="inline text-texto-suave">
                      {formatarData(m.data_inicio)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Prova (45 dias): </dt>
                    <dd className="inline text-texto-suave">
                      {formatarData(m.data_prova)}
                    </dd>
                  </div>
                </dl>
              )}
            </li>
```

Remove the `rounded-lg border border-borda` classes from the inner `<Link>`,
since the `<li>` now carries the border — otherwise the row draws two frames.

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit
npm run build
git add lib/admin/consultas.ts "app/(admin)/admin/alunos/[id]/page.tsx"
git commit -m "feat: datas de pagamento, entrega e prova no detalhe do aluno"
```

---

### Task 7: Verificação em produção

**Files:**
- Nenhum arquivo alterado.

**Interfaces:**
- Consumes: tudo das tarefas anteriores.
- Produces: nada.

Não há migração nesta rodada: nenhuma tarefa altera schema. `internos.responsavel_id`
e `internos.parentesco` já existem e já são nulos por padrão.

- [ ] **Step 1: Confirm no stored date needs fixing**

Via Supabase MCP (`execute_sql`, projeto `esujpfcfxkxlwzofuvim`):

```sql
select codigo, data_inicio, data_prova,
       (data_inicio + interval '45 days')::date as prova_45_corridos
from matriculas
where data_inicio is not null
  and data_prova <> (data_inicio + interval '45 days')::date;
```

Expected: nenhuma linha. Se vier alguma, a regra antiga empurrou aquela data e
ela precisa ser recalculada — **pare e reporte** antes de alterar dado de
produção.

- [ ] **Step 2: Push and verify the deploy**

```bash
git push origin main
```

Via Vercel MCP `list_deployments` (projeto `prj_uZlPqp5PuUjdeYd6rD7BoFBCxgs4`,
time `team_UdLhgBLeqzuHvbJKPxTrDYn2`), confirme que o deploy do commit chega a
`READY`. O alias de produção é **`clique-estudos.vercel.app`** — não
`clique-facil.vercel.app`, que aponta para outro lugar e responde 404 nas rotas
do admin.

- [ ] **Step 3: Smoke test in production**

Logado com a conta de teste em `https://clique-estudos.vercel.app`:

1. `/admin/alunos` mostra o botão **Cadastrar aluno**.
2. Cadastrar um aluno **sem** responsável funciona e cai no detalhe dele.
3. Repetir o mesmo CPF é recusado com "Já existe um aluno com este CPF".
4. No detalhe desse aluno, preencher o bloco Responsável e salvar vincula.
5. `/admin/matriculas/nova` com o CPF dele traz o responsável preenchido; trocar
   por outra pessoa cria a matrícula com o comprador novo, e o cadastro do
   aluno mantém o responsável anterior.
6. Avançar essa matrícula até "material enviado" e conferir que a data de prova
   é exatamente a data de entrega mais 45 dias.
7. O detalhe do aluno mostra pagamento, início e prova sob cada matrícula.

---

## Notas para quem executa

- **Não force push.** O trabalho vai direto para `main`, um commit por tarefa.
- **Se a integração falhar de forma inexplicável**, rode `npm run db:reset`
  antes de investigar. Testes que criam usuários sujam o banco local entre
  execuções.
- **Nenhuma tarefa reconstrói confirmação de pagamento, rastreio de material ou
  indicação de curso em andamento.** Isso existe na tela de detalhe da
  matrícula. Se parecer que falta, releia a seção "O que já existe" da spec
  antes de escrever qualquer coisa.
- **Endereços das unidades do DF continuam com `A CONFIRMAR`** e CEP
  `00000000`. É pendência do cliente, fora deste plano.
