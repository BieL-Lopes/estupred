# Rastreamento do material em quatro etapas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar o único marco `material_enviado` em três etapas rastreáveis — produção, a caminho, entregue — com os 45 dias começando na entrega e a liberação da produção restrita ao admin.

**Architecture:** Três valores novos no enum de status, em migração isolada. `material_enviado` não é reaproveitado com significado novo: fica aposentado no código para que o histórico de `matricula_eventos` continue legível. O carimbo das datas migra de gatilho (de `material_enviado` para `material_entregue`) sem mudar de marco, já que ambos significam entrega na unidade. A trava de um curso por vez desce para a produção, e o trigger no banco passa a vigiar a entrada em qualquer etapa que ocupe o aluno.

**Tech Stack:** Next.js 15 (App Router, Server Components, Server Actions), Supabase (Postgres + RLS), TypeScript, Zod, Vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-05-rastreamento-material-quatro-etapas-design.md`

## Global Constraints

- Lógica pura e testável fica em `lib/*.ts`; `redirect()` e `cookies()` só em wrappers `'use server'`. `exigirAdmin()` e `exigirEquipe()` usam ambos, então nunca são chamadas de um módulo que os testes invocam direto.
- Todo módulo que toca `criarClienteAdmin()` (service role) começa com `import 'server-only'`.
- Português em nomes de arquivo, funções, variáveis, comentários e texto de tela. Comentário explica *por quê*, não *o quê*.
- Mudança de enum fica **isolada em migração própria**, sem nada mais junto. É convenção do projeto.
- `material_enviado` continua em `STATUS_MATRICULA` e em `ROTULO_STATUS`, com rótulo `'Material enviado (etapa antiga)'` e nenhuma transição de saída. `matricula_eventos` guarda eventos passados com esse valor e o painel precisa rotulá-los.
- Eventos históricos **nunca** são reescritos. Só a coluna `matriculas.status` é migrada.
- A regra dos 45 dias corridos (`calcularDataProva`) não muda nesta rodada.
- `supabase/seed.sql` é exclusivo de desenvolvimento local.
- Cada tarefa termina com `npx tsc --noEmit` limpo antes do commit.
- Testes unitários: `npm test`. Integração: `npm run test:integracao` (exige `npx supabase start`). Se a integração falhar de forma estranha, rode `npm run db:reset` antes de investigar.
- Testes de integração criam suas **próprias unidades prisionais**: `tests/integracao/schema.test.ts` cria e apaga unidades, e o vitest roda os arquivos em paralelo.
- O Supabase local roda em **portas 544xx** (API 54421, banco 54422, studio 54423), não nas padrão.

---

### Task 1: Os três valores no enum

**Files:**
- Create: `supabase/migrations/20260905000001_status_material_quatro_etapas.sql`

**Interfaces:**
- Consumes: nada.
- Produces: os valores `material_em_producao`, `material_a_caminho` e `material_entregue` no tipo `status_matricula` do Postgres.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260905000001_status_material_quatro_etapas.sql`:

```sql
-- Rastreamento em quatro etapas pedido pelo cliente em 04/09: compra,
-- produção, envio e entrega, com os 45 dias começando na entrega. Ver
-- docs/superpowers/specs/2026-09-05-rastreamento-material-quatro-etapas-design.md
--
-- `material_enviado` NÃO é reaproveitado com o significado novo de "a
-- caminho". Ele fica no enum sem uso novo porque matricula_eventos guarda
-- eventos que já aconteceram com esse valor, gravados quando ele queria dizer
-- "entregue na unidade" — era ele que carimbava data_inicio. Migrar matrícula
-- é fácil; migrar o significado de um evento passado é impossível.
--
-- Postgres não remove valor de enum sem recriar o tipo, e recriar por
-- cosmética não compensa. O valor fica documentado aqui como aposentado.
alter type status_matricula add value 'material_em_producao';
alter type status_matricula add value 'material_a_caminho';
alter type status_matricula add value 'material_entregue';
```

- [ ] **Step 2: Apply and verify**

```bash
npm run db:reset
```

Then confirm the three values exist:

```bash
docker exec supabase_db_estupred psql -U postgres -d postgres -t -c "select unnest(enum_range(null::status_matricula));"
```

Expected: a lista inclui `material_em_producao`, `material_a_caminho` e
`material_entregue`, além dos nove que já existiam.

- [ ] **Step 3: Confirm nothing else broke**

```bash
npm test
npm run test:integracao
```

Expected: tudo verde. Nada usa os valores novos ainda; esta tarefa só abre
espaço para eles.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260905000001_status_material_quatro_etapas.sql
git commit -m "feat: tres etapas de material no enum de status"
```

---

### Task 2: O domínio — status, grafo, fila e datas

**Files:**
- Modify: `lib/dominio/tipos.ts`
- Modify: `lib/matricula/transicoes.ts`
- Modify: `lib/matricula/fila.ts`
- Modify: `lib/matricula/avancar.ts`
- Modify: `lib/admin/consultas.ts` (uso de `bloqueioDeEnvio`)
- Modify: `components/ui/Selo.tsx`
- Test: `tests/unidade/transicoes.test.ts`, `tests/unidade/fila.test.ts`, `tests/integracao/datas.test.ts`, `tests/integracao/fila.test.ts`, `tests/integracao/admin.test.ts`

O `Selo` entra aqui, e não na tarefa das telas, por obrigação do compilador:
existem três `Record<StatusMatricula, …>` exaustivos no projeto —
`ROTULO_STATUS`, `TRANSICOES` e o `CORES` do `Selo`. Acrescentar valor ao
enum sem preencher os três de uma vez deixa `tsc` vermelho no fim da tarefa.

**Interfaces:**
- Consumes: os valores de enum da Task 1.
- Produces: `STATUS_EM_CURSO` cobrindo as três etapas novas mais `material_enviado`; `bloqueioDeProducao(alvoId: string, matriculas: readonly MatriculaDaFila[]): MatriculaDaFila | null` substituindo `bloqueioDeEnvio` com a mesma assinatura; `ROTULO_STATUS` com os quatro rótulos novos; `TRANSICOES` com o grafo de quatro etapas.

Esta tarefa é grande de propósito: grafo, fila e carimbo de datas mudam
juntos. Separá-los deixaria a suíte vermelha entre commits, porque um teste do
carimbo precisa alcançar `material_entregue`, o que depende do grafo.

- [ ] **Step 1: Update the unit tests first**

In `tests/unidade/transicoes.test.ts`, replace the happy-path array:

```ts
    const caminho = [
      'rascunho',
      'aguardando_pagamento',
      'paga',
      'material_em_producao',
      'material_a_caminho',
      'material_entregue',
      'prova_aplicada',
      'aprovado',
      'certificado_emitido',
    ] as const
```

Replace the "proíbe cancelar depois do pagamento" body:

```ts
    expect(transicaoPermitida('paga', 'cancelada')).toBe(false)
    expect(transicaoPermitida('material_entregue', 'cancelada')).toBe(false)
```

Replace the "proíbe pular etapas" body:

```ts
    expect(transicaoPermitida('aguardando_pagamento', 'material_em_producao')).toBe(false)
    expect(transicaoPermitida('paga', 'material_entregue')).toBe(false)
    expect(transicaoPermitida('paga', 'aprovado')).toBe(false)
    expect(transicaoPermitida('rascunho', 'paga')).toBe(false)
```

Add a new test inside the `transicaoPermitida` describe:

```ts
  it('trata material_enviado como etapa aposentada, sem saída', () => {
    // Fica no enum só para o histórico de matricula_eventos continuar
    // legível. Nenhuma matrícula deveria estar aqui depois da migração.
    expect(proximosStatus('material_enviado')).toEqual([])
  })
```

In `tests/unidade/fila.test.ts`, replace the constant assertion:

```ts
  it('declara todos os status em curso na constante exportada', () => {
    expect([...STATUS_EM_CURSO].sort()).toEqual(
      [
        'aprovado',
        'material_a_caminho',
        'material_em_producao',
        'material_entregue',
        'material_enviado',
        'prova_aplicada',
        'reprovado',
      ].sort(),
    )
  })
```

Replace the first `estaEmCurso` test:

```ts
  it('considera em curso desde a produção do material', () => {
    expect(estaEmCurso('material_em_producao')).toBe(true)
    expect(estaEmCurso('material_a_caminho')).toBe(true)
    expect(estaEmCurso('material_entregue')).toBe(true)
    expect(estaEmCurso('prova_aplicada')).toBe(true)
    expect(estaEmCurso('aprovado')).toBe(true)
    // Reprovado ainda ocupa: o aluno vai refazer a prova do mesmo curso.
    expect(estaEmCurso('reprovado')).toBe(true)
    // Aposentado, mas significava "entregue": se sobrar linha antiga, ocupa.
    expect(estaEmCurso('material_enviado')).toBe(true)
  })
```

Rename every remaining `bloqueioDeEnvio` in that file to `bloqueioDeProducao`,
including the import and the `describe` title. Inside the
`bloqueioDeProducao` tests, replace the two occurrences of the status
`'material_enviado'` with `'material_em_producao'`.

- [ ] **Step 2: Run unit tests to verify they fail**

Run: `npx vitest run tests/unidade/transicoes.test.ts tests/unidade/fila.test.ts`
Expected: FAIL — `bloqueioDeProducao` não existe e o grafo ainda é o antigo.

- [ ] **Step 3: Update the types**

In `lib/dominio/tipos.ts`, replace `STATUS_MATRICULA`:

```ts
export const STATUS_MATRICULA = [
  'rascunho',
  'aguardando_pagamento',
  'paga',
  'material_em_producao',
  'material_a_caminho',
  'material_entregue',
  'prova_aplicada',
  'aprovado',
  'reprovado',
  'certificado_emitido',
  'cancelada',
  // Aposentado. Continua aqui porque matricula_eventos guarda eventos
  // passados com este valor, e o painel precisa saber rotulá-los.
  'material_enviado',
] as const
```

Replace `ROTULO_STATUS`:

```ts
export const ROTULO_STATUS: Record<StatusMatricula, string> = {
  rascunho: 'Rascunho',
  aguardando_pagamento: 'Aguardando pagamento',
  paga: 'Matrícula paga',
  material_em_producao: 'Material em produção',
  material_a_caminho: 'Material a caminho',
  material_entregue: 'Curso em andamento',
  prova_aplicada: 'Prova aplicada',
  aprovado: 'Aprovado',
  reprovado: 'Em recuperação',
  certificado_emitido: 'Certificado emitido',
  cancelada: 'Cancelada',
  material_enviado: 'Material enviado (etapa antiga)',
}
```

- [ ] **Step 4: Update the transition graph**

In `lib/matricula/transicoes.ts`, replace the `TRANSICOES` object:

```ts
export const TRANSICOES: Readonly<
  Record<StatusMatricula, readonly StatusMatricula[]>
> = {
  rascunho: ['aguardando_pagamento', 'cancelada'],
  aguardando_pagamento: ['paga', 'cancelada'],
  paga: ['material_em_producao'],
  material_em_producao: ['material_a_caminho'],
  material_a_caminho: ['material_entregue'],
  material_entregue: ['prova_aplicada'],
  prova_aplicada: ['aprovado', 'reprovado'],
  reprovado: ['prova_aplicada'],
  aprovado: ['certificado_emitido'],
  certificado_emitido: [],
  cancelada: [],
  // Etapa aposentada: ninguém entra e ninguém sai. Ver a migração
  // 20260905000001 para o porquê de o valor continuar existindo.
  material_enviado: [],
}
```

- [ ] **Step 5: Update the queue**

In `lib/matricula/fila.ts`, replace `STATUS_EM_CURSO` and rename the blocking
function:

```ts
/**
 * Status em que o material já saiu do papel e há dinheiro comprometido: da
 * produção em diante o aluno está ocupado e não pode começar outro curso.
 * Uma matrícula apenas paga não segura ninguém, porque até ali nada foi gasto.
 *
 * `reprovado` continua ocupando: o aluno vai refazer a prova do mesmo curso.
 * `material_enviado` está aposentado, mas significava "entregue na unidade" —
 * se alguma linha antiga escapar da migração, ela tem que continuar ocupando.
 */
export const STATUS_EM_CURSO = [
  'material_em_producao',
  'material_a_caminho',
  'material_entregue',
  'material_enviado',
  'prova_aplicada',
  'aprovado',
  'reprovado',
] as const satisfies readonly StatusMatricula[]
```

Rename `bloqueioDeEnvio` to `bloqueioDeProducao`, keeping the body identical
and updating the doc comment:

```ts
/**
 * Devolve a matrícula que impede `alvoId` de começar a produção do material,
 * ou null se o caminho está livre.
 */
export function bloqueioDeProducao(
  alvoId: string,
  matriculas: readonly MatriculaDaFila[],
): MatriculaDaFila | null {
  const outras = matriculas.filter((m) => m.id !== alvoId)
  return situacaoDaFila(outras).emCurso
}
```

- [ ] **Step 6: Run unit tests to verify they pass**

Run: `npx vitest run tests/unidade/transicoes.test.ts tests/unidade/fila.test.ts`
Expected: PASS.

- [ ] **Step 7: Move the date stamp and the guard**

In `lib/matricula/avancar.ts`, update the import:

```ts
import { bloqueioDeProducao, type MatriculaDaFila } from './fila'
```

Replace the `AlunoOcupadoError` message:

```ts
export class AlunoOcupadoError extends Error {
  constructor(readonly bloqueadaPor: { id: string; codigo: string }) {
    super(
      `Este aluno já tem um curso em andamento (${bloqueadaPor.codigo}). ` +
        'A produção do material do próximo só começa depois que o certificado ' +
        'dele for emitido.',
    )
    this.name = 'AlunoOcupadoError'
  }
}
```

Replace `datasDaTransicao`:

```ts
/**
 * Carimba as datas que o cliente pediu no documento "Projeto Faculdade".
 * Elas são consequência da transição, não campos digitados à mão:
 *   - paga              → data da compra
 *   - material_entregue → entrega do material na unidade, que é o início do
 *                         curso, e a partir dela a data da prova (45 corridos)
 *
 * O gatilho mudou de `material_enviado` para `material_entregue` em 05/09,
 * quando as etapas foram separadas. O marco não mudou: `material_enviado`
 * já queria dizer "entregue na unidade".
 */
function datasDaTransicao(
  para: StatusMatricula,
  hoje: string,
): Record<string, string> {
  if (para === 'paga') return { data_compra: hoje }
  if (para === 'material_entregue') {
    return { data_inicio: hoje, data_prova: calcularDataProva(hoje) }
  }
  return {}
}
```

Replace the guard block (the one that starts with the comment "A regra de um
curso por vez trava aqui"):

```ts
  // A regra de um curso por vez trava na produção, que é o primeiro passo
  // depois de paga: é ali que o dinheiro começa a ser gasto. O trigger no
  // banco recusa o mesmo caso; esta checagem existe para o painel poder
  // mostrar o motivo antes de o colaborador clicar.
  if (entrada.para === 'material_em_producao') {
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

    const bloqueio = bloqueioDeProducao(entrada.matriculaId, lista)
    if (bloqueio) throw new AlunoOcupadoError(bloqueio)
  }
```

In `lib/admin/consultas.ts`, update the import and the call inside
`obterMatriculaAdmin`:

```ts
import { bloqueioDeProducao, type MatriculaDaFila } from '@/lib/matricula/fila'
```

```ts
  const bloqueio = bloqueioDeProducao(
    id,
    (irmas ?? []).map<MatriculaDaFila>((m) => ({
      id: m.id,
      codigo: m.codigo,
      status: m.status as StatusMatricula,
      criadaEm: m.created_at,
    })),
  )
```

- [ ] **Step 8: Update the integration tests**

In `tests/integracao/datas.test.ts`, replace the test "na entrega do material
grava início e calcula a prova pela regra 45+" with:

```ts
  it('grava início e prova só na entrega, não na produção nem no envio', async () => {
    const m = await matriculaNoStatus('paga')

    await avancarStatus({
      matriculaId: m.id,
      para: 'material_em_producao',
      hoje: '2026-01-05',
    })
    await avancarStatus({
      matriculaId: m.id,
      para: 'material_a_caminho',
      hoje: '2026-01-06',
    })

    const { data: antes } = await admin
      .from('matriculas')
      .select('data_inicio, data_prova')
      .eq('id', m.id)
      .single()

    // Produção e envio não carimbam nada: o relógio dos 45 dias só começa
    // quando o material chega na unidade.
    expect(antes!.data_inicio).toBeNull()
    expect(antes!.data_prova).toBeNull()

    await avancarStatus({
      matriculaId: m.id,
      para: 'material_entregue',
      hoje: '2026-01-07',
    })

    const { data } = await admin
      .from('matriculas')
      .select('data_inicio, data_prova')
      .eq('id', m.id)
      .single()

    expect(data!.data_inicio).toBe('2026-01-07')
    // 45 dias corridos, mesmo caindo num sábado.
    expect(data!.data_prova).toBe('2026-02-21')
    expect(data!.data_prova).toBe(calcularDataProva('2026-01-07'))
  })
```

In the same file, the two remaining tests advance to `material_enviado`.
Replace each such call with the three-step chain, keeping the dates they
already use. In "a data da compra é diferente da data de início", replace:

```ts
    await avancarStatus({
      matriculaId: m.id,
      para: 'material_enviado',
      hoje: '2026-02-02',
    })
```

with:

```ts
    for (const para of [
      'material_em_producao',
      'material_a_caminho',
      'material_entregue',
    ] as const) {
      await avancarStatus({ matriculaId: m.id, para, hoje: '2026-02-02' })
    }
```

Apply the identical replacement in "não sobrescreve a data de compra em
transições posteriores" (same three-step loop, same `hoje` that test already
passes).

In `tests/integracao/admin.test.ts`, the race test advances twice to
`material_enviado`. Replace both `para: 'material_enviado'` with
`para: 'material_em_producao'`, and the `.eq('para_status', 'material_enviado')`
with `.eq('para_status', 'material_em_producao')`.

In `tests/integracao/fila.test.ts`, replace every `para: 'material_enviado'`
with `para: 'material_em_producao'`, and in the test "libera a fila quando a
primeira chega ao certificado" replace the status array with:

```ts
    for (const para of [
      'material_em_producao',
      'material_a_caminho',
      'material_entregue',
      'prova_aplicada',
      'aprovado',
      'certificado_emitido',
    ] as const) {
      await avancarStatus({ matriculaId: primeira!, para })
    }
```

In "continua segurando enquanto a primeira está só aprovada", replace its
array with:

```ts
    for (const para of [
      'material_em_producao',
      'material_a_caminho',
      'material_entregue',
      'prova_aplicada',
      'aprovado',
    ] as const) {
      await avancarStatus({ matriculaId: primeira!, para })
    }
```

The last test in that file, "o trigger recusa mesmo quando a escrita não passa
pelo app", writes `status: 'material_enviado'` directly. Leave it as is for
now — Task 3 rewrites it along with the trigger.

- [ ] **Step 8b: Give the new statuses a colour**

In `components/ui/Selo.tsx`, replace the `CORES` record. Sem isso `tsc` acusa
as três chaves faltando, porque o record é exaustivo sobre `StatusMatricula`:

```tsx
const CORES: Record<StatusMatricula, string> = {
  rascunho: 'bg-cartao-2 text-texto-fraco',
  aguardando_pagamento: 'bg-aviso-fundo text-aviso',
  paga: 'bg-acento-fundo text-acento-claro',
  material_em_producao: 'bg-acento-fundo text-acento-claro',
  material_a_caminho: 'bg-acento-fundo text-acento-claro',
  material_entregue: 'bg-acento-fundo text-acento-claro',
  prova_aplicada: 'bg-acento-fundo text-acento-claro',
  aprovado: 'bg-ok-fundo text-ok',
  reprovado: 'bg-aviso-fundo text-aviso',
  certificado_emitido: 'bg-ok-fundo text-ok',
  cancelada: 'bg-cartao-2 text-texto-fraco',
  material_enviado: 'bg-acento-fundo text-acento-claro',
}
```

Laranja para todas as etapas de material, porque todas são "em progresso"; o
verde continua reservado para `aprovado` e `certificado_emitido`, que são
conclusão.

- [ ] **Step 9: Run the full suite**

```bash
npm run db:reset
npm test
npm run test:integracao
npx tsc --noEmit
```

Expected: os unitários verdes. Na integração, **o último teste de
`fila.test.ts` ainda falha**, porque o trigger no banco continua vigiando
`material_enviado` e a Task 3 é que o troca. Todo o resto deve passar.

- [ ] **Step 10: Commit**

```bash
git add lib/dominio/tipos.ts lib/matricula/transicoes.ts lib/matricula/fila.ts lib/matricula/avancar.ts lib/admin/consultas.ts components/ui/Selo.tsx tests/unidade tests/integracao
git commit -m "feat: separa producao, envio e entrega no fluxo da matricula"
```

---

### Task 3: O trigger e a migração dos dados

**Files:**
- Create: `supabase/migrations/20260905000002_migra_material_enviado_e_trigger.sql`
- Test: `tests/integracao/fila.test.ts`

**Interfaces:**
- Consumes: os status da Task 1 e `STATUS_EM_CURSO` da Task 2.
- Produces: o trigger `matriculas_um_curso_por_vez` vigiando a entrada em qualquer status que ocupe o aluno.

- [ ] **Step 1: Write the failing test**

In `tests/integracao/fila.test.ts`, replace the last test with these two:

```ts
  it('o trigger recusa mesmo quando a escrita não passa pelo app', async () => {
    const [primeira, segunda] = await alunoComMatriculasPagas(2)
    await avancarStatus({ matriculaId: primeira!, para: 'material_em_producao' })

    const { error } = await admin
      .from('matriculas')
      .update({ status: 'material_em_producao' })
      .eq('id', segunda!)

    expect(error).not.toBeNull()
    expect(error!.message).toContain('curso em andamento')
  })

  it('o trigger recusa também o salto direto para entregue', async () => {
    const [primeira, segunda] = await alunoComMatriculasPagas(2)
    await avancarStatus({ matriculaId: primeira!, para: 'material_em_producao' })

    // Pular etapas por SQL na mão é justamente o que o app não consegue
    // barrar sozinho — por isso o trigger vigia a entrada em qualquer etapa
    // que ocupe o aluno, não só a primeira.
    const { error } = await admin
      .from('matriculas')
      .update({ status: 'material_entregue' })
      .eq('id', segunda!)

    expect(error).not.toBeNull()
    expect(error!.message).toContain('curso em andamento')
  })

  it('deixa a matrícula andar entre etapas do próprio material', async () => {
    const [unica] = await alunoComMatriculasPagas(1)

    for (const para of [
      'material_em_producao',
      'material_a_caminho',
      'material_entregue',
    ] as const) {
      await avancarStatus({ matriculaId: unica!, para })
    }

    const { data } = await admin
      .from('matriculas')
      .select('status')
      .eq('id', unica!)
      .single()
    expect(data!.status).toBe('material_entregue')
  })
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run db:reset
npx vitest run tests/integracao/fila.test.ts
```

Expected: FAIL nos dois primeiros — o trigger antigo só vigia
`material_enviado`, então uma escrita direta para `material_em_producao` ou
`material_entregue` passa.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260905000002_migra_material_enviado_e_trigger.sql`:

```sql
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
```

O trigger em si não é recriado: `create or replace function` troca o corpo, e
o `create trigger matriculas_um_curso_por_vez` da migração
`20260903000002` continua apontando para ela.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run db:reset
npx vitest run tests/integracao/fila.test.ts
```

Expected: PASS.

Nota sobre a mensagem: o texto mudou de "conclua antes de enviar material"
para "conclua antes de comecar o proximo", e os testes conferem só o trecho
`'curso em andamento'`, que continua presente.

- [ ] **Step 5: Run the full suite**

```bash
npm run db:reset
npm test
npm run test:integracao
npx tsc --noEmit
```

Expected: tudo verde, agora sem a falha conhecida da Task 2.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260905000002_migra_material_enviado_e_trigger.sql tests/integracao/fila.test.ts
git commit -m "feat: trigger vigia entrada em qualquer etapa que ocupe o aluno"
```

---

### Task 4: Produção só o admin libera

**Files:**
- Create: `lib/matricula/permissoes.ts`
- Modify: `lib/admin/acoes.ts` (função `mudarStatus`)
- Modify: `components/admin/AcoesDeStatus.tsx`
- Modify: `app/(admin)/admin/matriculas/[id]/page.tsx`
- Test: `tests/unidade/permissoes.test.ts`

**Interfaces:**
- Consumes: `StatusMatricula` de `@/lib/dominio/tipos`.
- Produces: `type ChecagemDeTransicao = 'admin' | 'equipe'` e `checagemParaTransicao(para: StatusMatricula): ChecagemDeTransicao` de `@/lib/matricula/permissoes`. `AcoesDeStatus` ganha a prop `papel: 'admin' | 'colaborador'`.

- [ ] **Step 1: Write the failing test**

Create `tests/unidade/permissoes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { STATUS_MATRICULA } from '@/lib/dominio/tipos'
import { checagemParaTransicao } from '@/lib/matricula/permissoes'

describe('checagemParaTransicao', () => {
  it('exige admin para liberar a produção do material', () => {
    // É o passo que compromete dinheiro: quem autoriza o gasto é quem libera.
    expect(checagemParaTransicao('material_em_producao')).toBe('admin')
  })

  it('deixa o colaborador registrar envio e entrega', () => {
    expect(checagemParaTransicao('material_a_caminho')).toBe('equipe')
    expect(checagemParaTransicao('material_entregue')).toBe('equipe')
  })

  it('deixa o colaborador tocar o resto do fluxo', () => {
    expect(checagemParaTransicao('paga')).toBe('equipe')
    expect(checagemParaTransicao('prova_aplicada')).toBe('equipe')
    expect(checagemParaTransicao('aprovado')).toBe('equipe')
    expect(checagemParaTransicao('reprovado')).toBe('equipe')
    expect(checagemParaTransicao('certificado_emitido')).toBe('equipe')
  })

  it('responde para todo status declarado', () => {
    for (const status of STATUS_MATRICULA) {
      expect(['admin', 'equipe']).toContain(checagemParaTransicao(status))
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unidade/permissoes.test.ts`
Expected: FAIL — "Cannot find module '@/lib/matricula/permissoes'".

- [ ] **Step 3: Write the implementation**

Create `lib/matricula/permissoes.ts`:

```ts
import type { StatusMatricula } from '@/lib/dominio/tipos'

export type ChecagemDeTransicao = 'admin' | 'equipe'

/**
 * Qual checagem de papel cada transição exige.
 *
 * Função pura de propósito: `exigirAdmin` e `exigirEquipe` dependem de
 * `cookies()` e não podem ser chamadas de teste. Aqui fica a decisão, que é
 * a parte com regra; o wrapper em lib/admin/acoes.ts só aplica.
 *
 * Liberar a produção é exclusivo do admin porque é o passo que compromete
 * dinheiro — papel, impressão, apostila. Decisão marcada como "por enquanto"
 * na spec de 05/09: soltar para o colaborador é trocar esta linha.
 */
export function checagemParaTransicao(
  para: StatusMatricula,
): ChecagemDeTransicao {
  return para === 'material_em_producao' ? 'admin' : 'equipe'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unidade/permissoes.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 5: Apply the decision in the Server Action**

In `lib/admin/acoes.ts`, add the import:

```ts
import { checagemParaTransicao } from '@/lib/matricula/permissoes'
```

Replace `mudarStatus` with:

```ts
export async function mudarStatus(formData: FormData) {
  const entrada = z
    .object({
      matriculaId: z.string().uuid(),
      para: z.enum(STATUS_MATRICULA),
      nota: z.string().trim().max(500).optional(),
    })
    .parse({
      matriculaId: formData.get('matriculaId'),
      para: formData.get('para'),
      nota: formData.get('nota') || undefined,
    })

  // A checagem depende do destino: liberar produção é só do admin. Ela roda
  // aqui, no servidor, porque uma Server Action é um endpoint HTTP por si só
  // — esconder o botão na tela não protege nada sozinho.
  const perfil =
    checagemParaTransicao(entrada.para) === 'admin'
      ? await exigirAdmin()
      : await exigirEquipe()

  await avancarStatus({ ...entrada, autorId: perfil.id })
  revalidatePath(`/admin/matriculas/${entrada.matriculaId}`)
  revalidatePath('/admin/matriculas')
}
```

Note que a validação passou a vir **antes** da checagem de papel, porque a
checagem depende do destino informado. `z.parse` lança em entrada inválida,
que é o comportamento que já existia.

- [ ] **Step 6: Hide the button from a colaborador**

In `components/admin/AcoesDeStatus.tsx`, add the import and the prop:

```tsx
import { checagemParaTransicao } from '@/lib/matricula/permissoes'
```

```tsx
export function AcoesDeStatus({
  matriculaId,
  status,
  bloqueio,
  papel,
}: {
  matriculaId: string
  status: StatusMatricula
  bloqueio: { id: string; codigo: string } | null
  papel: 'admin' | 'colaborador'
}) {
```

Change the block guard to use the new transition name and add the role guard
right after it:

```tsx
  // Botão que só falha depois do clique é pior do que botão que não aparece:
  // o colaborador precisa saber por que não pode produzir, e qual matrícula
  // está segurando esta.
  if (bloqueio && destinos.includes('material_em_producao')) {
    return (
      <div className="rounded-lg border border-aviso/40 bg-aviso-fundo p-4">
        <p className="text-sm text-aviso">
          Este aluno já tem um curso em andamento. A produção do material desta
          matrícula só pode começar depois que o certificado do curso atual for
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

  const semPermissao = destinos.filter(
    (d) => checagemParaTransicao(d) === 'admin' && papel !== 'admin',
  )

  if (semPermissao.length === destinos.length) {
    return (
      <div className="rounded-lg border border-borda bg-cartao-2 p-4">
        <p className="text-sm text-texto-suave">
          A produção do material precisa ser liberada por um administrador.
        </p>
      </div>
    )
  }
```

Then filter the rendered forms so a colaborador never sees an admin-only
button. Replace `{destinos.map((destino) => (` with:

```tsx
      {destinos
        .filter((d) => checagemParaTransicao(d) !== 'admin' || papel === 'admin')
        .map((destino) => (
```

- [ ] **Step 7: Pass the role from the page**

In `app/(admin)/admin/matriculas/[id]/page.tsx`, import `exigirEquipe` and
capture the profile at the top of the component, before `obterMatriculaAdmin`:

```tsx
import { exigirEquipe } from '@/lib/auth'
```

```tsx
  const perfil = await exigirEquipe()
```

Then pass it down:

```tsx
          <AcoesDeStatus
            matriculaId={m.id}
            status={m.status}
            bloqueio={resultado.bloqueio}
            papel={perfil.role === 'admin' ? 'admin' : 'colaborador'}
          />
```

- [ ] **Step 8: Verify and commit**

```bash
npm run db:reset
npm test
npm run test:integracao
npx tsc --noEmit
npm run build
git add lib/matricula/permissoes.ts lib/admin/acoes.ts components/admin/AcoesDeStatus.tsx "app/(admin)/admin/matriculas/[id]/page.tsx" tests/unidade/permissoes.test.ts
git commit -m "feat: liberar producao do material vira exclusivo do admin"
```

---

### Task 5: A linha do tempo do Portal do Aluno

**Files:**
- Modify: `lib/matricula/consultas.ts` (`ETAPAS` e o mapeamento de status legado)
- Test: `tests/unidade/linha-do-tempo.test.ts`

**Interfaces:**
- Consumes: `ROTULO_STATUS` e `STATUS_MATRICULA` da Task 2.
- Produces: `montarLinhaDoTempo` devolvendo oito etapas.

- [ ] **Step 1: Update the timeline tests**

In `tests/unidade/linha-do-tempo.test.ts`, replace the first test:

```ts
  it('mostra as oito etapas mesmo no começo', () => {
    const etapas = montarLinhaDoTempo('aguardando_pagamento', [])
    expect(etapas.map((e) => e.status)).toEqual([
      'aguardando_pagamento',
      'paga',
      'material_em_producao',
      'material_a_caminho',
      'material_entregue',
      'prova_aplicada',
      'aprovado',
      'certificado_emitido',
    ])
  })
```

Replace the second test:

```ts
  it('marca a etapa atual e deixa as seguintes como futuras', () => {
    const etapas = montarLinhaDoTempo('material_a_caminho', [])
    const porStatus = Object.fromEntries(etapas.map((e) => [e.status, e.estado]))

    expect(porStatus.aguardando_pagamento).toBe('concluida')
    expect(porStatus.paga).toBe('concluida')
    expect(porStatus.material_em_producao).toBe('concluida')
    expect(porStatus.material_a_caminho).toBe('atual')
    expect(porStatus.material_entregue).toBe('futura')
    expect(porStatus.prova_aplicada).toBe('futura')
    expect(porStatus.certificado_emitido).toBe('futura')
  })
```

Add a new test at the end of the describe:

```ts
  it('posiciona uma matrícula antiga em material_enviado na etapa de entrega', () => {
    // material_enviado saiu da lista de etapas. Sem tratamento, indexOf
    // devolveria -1 e a família veria tudo como futuro — uma matrícula já
    // entregue apareceria como se nada tivesse começado.
    const etapas = montarLinhaDoTempo('material_enviado', [])
    const porStatus = Object.fromEntries(etapas.map((e) => [e.status, e.estado]))

    expect(porStatus.material_entregue).toBe('atual')
    expect(porStatus.paga).toBe('concluida')
    expect(porStatus.prova_aplicada).toBe('futura')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unidade/linha-do-tempo.test.ts`
Expected: FAIL — a lista ainda tem seis etapas.

- [ ] **Step 3: Update the timeline**

In `lib/matricula/consultas.ts`, replace `ETAPAS`:

```ts
const ETAPAS: readonly StatusMatricula[] = [
  'aguardando_pagamento',
  'paga',
  'material_em_producao',
  'material_a_caminho',
  'material_entregue',
  'prova_aplicada',
  'aprovado',
  'certificado_emitido',
]

/**
 * Status que não aparecem como etapa própria e precisam ser desenhados na
 * etapa de outro. Sem isso, `indexOf` devolveria -1 e a linha do tempo
 * inteira apareceria como futura.
 */
const EQUIVALENTE: Partial<Record<StatusMatricula, StatusMatricula>> = {
  // Recuperação: visualmente continua na etapa da prova, com o rótulo avisando.
  reprovado: 'prova_aplicada',
  // Etapa aposentada, que significava entrega na unidade.
  material_enviado: 'material_entregue',
}
```

Replace the two lines that compute `efetivo` and `atual`:

```ts
  const efetivo: StatusMatricula = EQUIVALENTE[status] ?? status
  const atual = ETAPAS.indexOf(efetivo)
```

Update the doc comment of `montarLinhaDoTempo` from "as seis etapas visíveis"
to "as oito etapas visíveis".

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unidade/linha-do-tempo.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

```bash
npm test
npm run test:integracao
npx tsc --noEmit
npm run build
git add lib/matricula/consultas.ts tests/unidade/linha-do-tempo.test.ts
git commit -m "feat: linha do tempo de oito etapas"
```

---

### Task 6: Produção — migrações, deploy e verificação

**Files:**
- Nenhum arquivo alterado.

**Interfaces:**
- Consumes: as duas migrações das Tasks 1 e 3.
- Produces: nada.

- [ ] **Step 1: Check what will be migrated**

Via Supabase MCP (`execute_sql`, projeto `esujpfcfxkxlwzofuvim`):

```sql
select codigo, status, data_inicio, data_prova
from matriculas
where status = 'material_enviado';
```

Anote os códigos. Esperado: `EST-2026-00002` e `EST-2026-00006`, ambos de
teste. Se aparecer alguma matrícula que **não** seja de teste, **pare e
reporte** — migrar status de matrícula real é decisão do cliente.

- [ ] **Step 2: Apply the enum migration**

Via Supabase MCP `apply_migration`, com o conteúdo exato do arquivo criado na
Task 1.

`alter type ... add value` não roda dentro de bloco de transação em versões
mais antigas do Postgres. Se o MCP recusar por isso, aplique os três `alter
type` em três chamadas separadas.

- [ ] **Step 3: Apply the data and trigger migration**

Via Supabase MCP `apply_migration`, com o conteúdo exato do arquivo criado na
Task 3.

- [ ] **Step 4: Confirm the result**

```sql
select
  (select count(*) from matriculas where status = 'material_enviado') as sobraram_no_status_antigo,
  (select count(*) from matriculas where status = 'material_entregue') as migradas,
  (select count(*) from matricula_eventos where para_status = 'material_enviado') as eventos_preservados;
```

Expected: `sobraram_no_status_antigo` = 0, `migradas` ≥ 2, e
`eventos_preservados` **maior que zero** — a trilha de auditoria não pode ter
sido tocada.

- [ ] **Step 5: Push and verify the deploy**

```bash
git push origin main
```

Via Vercel MCP `list_deployments` (projeto `prj_uZlPqp5PuUjdeYd6rD7BoFBCxgs4`,
time `team_UdLhgBLeqzuHvbJKPxTrDYn2`), confirme que o deploy do commit chega a
`READY`. O alias de produção é **`clique-estudos.vercel.app`** — não
`clique-facil.vercel.app`, que aponta para outro lugar.

- [ ] **Step 6: Smoke test in production**

Logado com a conta de teste em `https://clique-estudos.vercel.app`:

1. Abrir uma matrícula migrada (`EST-2026-00002`): o selo diz **"Curso em
   andamento"** e as datas continuam as mesmas de antes da migração.
2. Criar uma matrícula nova por `/admin/matriculas/nova` e percorrer as
   quatro etapas: paga → produção → a caminho → entregue, um botão por vez.
3. Conferir que `data_inicio` só aparece ao entregar, e que a data da prova é
   a entrega mais 45 dias.
4. Abrir o histórico da matrícula migrada: o evento antigo continua listado
   com o rótulo "Material enviado (etapa antiga)".
5. No Portal do Aluno, abrir a matrícula migrada e conferir que a linha do
   tempo mostra oito etapas com a entrega marcada como atual.

- [ ] **Step 7: Label any test data created**

Se o passo 6 criou aluno ou matrícula de teste em produção, renomeie o aluno
com prefixo `[TESTE]`, seguindo a convenção que já existe nos dados de
produção. Deixar dado de teste sem rótulo faz o cliente achar que é aluno
real.

---

## Notas para quem executa

- **A ordem das tarefas importa.** A Task 2 deixa um teste de integração
  vermelho de propósito (o do trigger), e a Task 3 é que o conserta. Isso está
  declarado no passo 9 da Task 2; não tente consertar por fora.
- **Não force push.** O trabalho vai direto para `main`, um commit por tarefa.
- **Se a integração falhar de forma inexplicável**, rode `npm run db:reset`
  antes de investigar.
- **`mudarStatus` continua sem tratamento de `AlunoOcupadoError`**, como antes:
  a tela tira o botão quando há bloqueio, então o erro só aparece numa corrida
  entre duas abas. Converter para `useActionState` é escopo de outra tarefa.
- **Endereços das unidades do DF continuam com `A CONFIRMAR`** e CEP
  `00000000`. É pendência do cliente, fora deste plano.
