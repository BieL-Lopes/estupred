# estupred

Plataforma de cursos profissionalizantes para o sistema prisional brasileiro.
A família matricula o interno online, acompanha cada etapa até o certificado, e
a escola opera matrículas, expedição e provas por um painel administrativo.

O interno **não** acessa o sistema: não há internet na unidade. Quem se cadastra,
paga e acompanha é o familiar ou responsável. O curso acontece com apostila
física e prova escrita presencial — o software cuida do registro, da logística
e da certificação.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres,
Auth, Storage) · Vitest · Playwright.

## Rodando local

Requisitos: Node 22+, Docker Desktop **rodando** (o Supabase local sobe em
containers).

```bash
npm install
npx supabase start
cp .env.example .env.local
```

Preencha `.env.local` com os valores que `npx supabase status` imprime
(`API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`), depois:

```bash
npm run db:reset
npm run dev
```

O site sobe em http://localhost:3000 e o Supabase Studio em
http://localhost:54323.

### Usuários de desenvolvimento

Criados pelo seed, senha `senha-de-teste` para os três:

| E-mail | Papel |
|---|---|
| `admin@estupred.com.br` | admin |
| `ana@exemplo.com` | responsável |
| `bruno@exemplo.com` | responsável |

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes de unidade (sem banco) |
| `npm run test:integracao` | Testes contra o Supabase local |
| `npm run test:e2e` | Playwright |
| `npm run db:reset` | Recria o banco local e aplica o seed |
| `npm run db:tipos` | Regera `lib/supabase/tipos.ts` a partir do schema |

**Não rode `npm run build` com o `npm run dev` ativo.** Os dois escrevem em
`.next` e se atropelam, produzindo erros `ENOENT` em `_buildManifest.js.tmp` e
500 em todas as rotas. Pare o dev antes de buildar.

## Deploy na Vercel

### 1. Criar o projeto Supabase de produção

Em supabase.com, crie um projeto novo. Guarde a senha do banco.

### 2. Aplicar as migrations

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

`db push` aplica **somente** as migrations de `supabase/migrations/`.

> **Nunca rode `supabase db reset --linked`.** Isso apagaria o banco de
> produção e aplicaria `supabase/seed.sql`, que cria um usuário admin com uma
> senha de conhecimento público.

O catálogo de produção começa vazio: cadastre cursos, unidades prisionais e a
tabela de frete pelo painel administrativo.

### 3. Importar o repositório na Vercel

Framework detectado automaticamente como Next.js. Nada a configurar em build
command ou output directory.

### 4. Variáveis de ambiente

Em Project Settings → Environment Variables:

| Variável | Onde encontrar | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | Ignora RLS. Nunca com prefixo `NEXT_PUBLIC_` |
| `GATEWAY_PAGAMENTO` | — | Ver aviso abaixo |

`NEXT_PUBLIC_SITE_URL` é opcional: sem ela, a aplicação usa o domínio de
produção da Vercel e, em preview, a URL do próprio deploy.

### 5. Conferir o deploy

```
https://SEU-DOMINIO/api/saude
```

Responde 200 com `banco: "ok"` e a contagem de cursos ativos, ou 503 com o
motivo. Não expõe chave nenhuma.

## Estado atual

Pronto e testado:

- Landing, catálogo com filtros e página de curso
- Autenticação, middleware protegendo `/aluno` e `/admin`
- RLS em todas as tabelas, verificada por testes de integração
- Regra 45+ para data da prova, com feriados nacionais
- Consulta pública de andamento por CPF

Ainda não implementado:

- Wizard de matrícula (`/matricula/[slug]` retorna 404)
- Webhook de pagamento
- Área do Aluno e painel administrativo

### Sobre o pagamento em produção

`lib/pagamento/index.ts` **lança um erro** se `NODE_ENV=production` e
`GATEWAY_PAGAMENTO=fake`. É proposital: evita a pior falha possível deste
desenho, que seria a plataforma aceitar matrícula sem cobrar de verdade.

Como o wizard de matrícula ainda não existe, nenhuma rota de produção chama o
gateway hoje — o deploy sobe e funciona. Quando o wizard entrar, será preciso
implementar um adaptador real (Mercado Pago, Asaas ou outro) e apontar
`GATEWAY_PAGAMENTO` para ele antes de liberar matrículas.

## Documentação do projeto

- Especificação: `docs/superpowers/specs/2026-08-27-estupred-vitrine-matricula-design.md`
- Plano de implementação: `docs/superpowers/plans/2026-08-27-estupred-v1.md`
