# Colaborador, página de Alunos, matrícula manual e regiões prisionais

Data: 2026-09-01
Status: aprovado, aguardando plano de implementação

## Contexto

Feedback do cliente (relayado via WhatsApp) sobre o painel administrativo,
depois que o painel essencial (Task 13) já estava em produção:

- Nem toda matrícula nasce pelo site: muitas vêm por telefone ou
  presencialmente, com o pagamento já confirmado fora do sistema. Um
  **colaborador** (papel distinto do admin) vai cadastrar e gerenciar esses
  alunos diretamente no painel.
- O painel precisa de uma página de **Alunos**, separada de Matrículas —
  hoje a lista de Matrículas é uma linha por curso, mas uma pessoa pode ter
  vários cursos.
- As unidades prisionais do DF são organizadas por **região** (ex.: Complexo
  da Papuda agrupa CDP, PDF I, PDF II e CIR). O cliente passou a lista real
  das unidades do DF.

Este documento cobre as quatro peças que saíram da conversa de brainstorm,
aprovadas seção por seção.

## 1. Papel do colaborador

- Novo valor `colaborador` no enum `papel_usuario` (hoje só `responsavel` e
  `admin`).
- Colaborador loga pela mesma tela `/entrar-equipe` (e-mail + senha) e cai no
  mesmo `/admin`. O menu mostra **Painel**, **Alunos** e **Matrículas** — sem
  Cursos, Unidades ou Fretes, que continuam exclusivos do admin.
- `lib/auth.ts` ganha `exigirEquipe()` (aceita `admin` ou `colaborador`),
  ao lado do `exigirAdmin()` já existente (só `admin`). Toda página e Server
  Action do painel escolhe qual dos dois checar — a checagem acontece no
  servidor a cada ação, não só na visibilidade do menu, então acessar a URL
  de Cursos/Unidades/Fretes direto ou chamar a Server Action correspondente
  continua bloqueado pra colaborador.
- RLS: hoje o painel lê e escreve tudo via `criarClienteAdmin()` (service
  role, ignora RLS), então a barreira real já é a checagem de papel acima —
  mas por completude e defesa em profundidade, as policies que hoje usam
  `is_admin()` em `internos`, na atualização de `matriculas` e no insert de
  `matricula_eventos` passam a aceitar também colaborador (via uma nova
  função `is_equipe()`, mesmo padrão de `is_admin()`). Policies de escrita em
  `cursos`, `curso_ufs`, `unidades_prisionais`, `fretes` e a policy
  `profile_admin_tudo` continuam exigindo `is_admin()` — colaborador não
  ganha acesso de escrita aí nem pode alterar papel de ninguém.
- Fora de escopo agora (decisão explícita): tela de "cadastrar colaborador"
  dentro do sistema. Contas de colaborador continuam sendo criadas
  manualmente por mim via Supabase, sob pedido — igual foi feito com a conta
  de teste.

## 2. Página "Alunos" (`/admin/alunos`)

Uma linha por `interno` (pessoa), não por matrícula.

- **Lista** (`/admin/alunos`): nome, CPF, matrícula prisional, unidade
  (com região), quantidade de matrículas. Busca por nome ou CPF.
- **Detalhe** (`/admin/alunos/[id]`): dados do aluno (nome, CPF, RG,
  nascimento, unidade) com formulário de edição — corrige dado errado,
  atualiza RG etc. Lista todas as matrículas desse aluno, cada uma linkando
  pro detalhe já existente em `/admin/matriculas/[id]`, e um botão **"Nova
  matrícula"** que inscreve esse mesmo aluno em outro curso (reaproveita
  interno e responsável já cadastrados, só pede o curso e confirma a
  unidade).
- **"Novo aluno"** (botão na lista): cadastro do zero — unidade, dados do
  aluno, dados do responsável (mesma lógica de achar-por-CPF-ou-criar que o
  site já usa) e curso.

`lib/admin/consultas.ts` ganha `listarAlunosAdmin()` e `obterAlunoAdmin(id)`
(agregando os internos e suas matrículas, mesmo padrão das funções que já
existem pra matrículas). `lib/admin/acoes.ts` ganha `salvarAluno` (edita os
campos do interno).

## 3. Matrícula manual

Reaproveita `criarMatricula()` (`lib/matricula/acoes.ts`) inteira — mesma
validação, mesmo achar-ou-criar responsável por CPF, mesmo cálculo de preço
e frete. Nenhuma lógica de negócio duplicada.

Por cima dessa chamada, a Server Action nova:

1. Chama `criarMatricula(...)`, que cria a matrícula em `rascunho`.
2. Insere uma linha em `pagamentos` com `metodo = 'manual'` (novo valor no
   enum `metodo_pagamento`, ao lado de `pix`/`boleto`/`cartao`),
   `status = 'pago'`, valor = total da matrícula.
3. Chama `avancarStatus` duas vezes (`rascunho` → `aguardando_pagamento` →
   `paga`), cada uma com uma nota explicando que foi cadastro manual —
   preserva a mesma trilha de auditoria de uma compra normal pelo site, só
   que carimbada de uma vez.

Preço e frete são sempre calculados automaticamente (curso + UF da
unidade) — sem campo pra digitar valor na mão, decisão do cliente pra evitar
cobrança errada por engano. Sem desconto manual nesta versão.

"Nova matrícula pra aluno existente" pula os campos de interno e
responsável (já conhecidos pelo `interno_id` selecionado) — só pede o curso
e confirma a unidade.

## 4. Região nas unidades prisionais

- `unidades_prisionais` ganha uma coluna `regiao` (texto livre, opcional).
  Não é uma entidade própria — nasce junto com a unidade, sem tela de
  gestão separada.
- `/admin/unidades` passa a agrupar visualmente por região em vez de listar
  tudo solto.
- Migration de dados: substitui a unidade de teste (`[TESTE] Unidade de
  Verificação`) pelas 7 unidades reais do DF, cada uma na sua região:
  - **Papuda**: CDP (Centro de Detenção Provisória), PDF I, PDF II,
    CIR (Centro de Internamento e Reeducação)
  - **Gama**: PFDF (Penitenciária Feminina do DF)
  - **SIA**: CPP (Centro de Progressão Penitenciária)
  - **Federal**: Penitenciária Federal de Brasília
- Endereço e CEP dessas 7 unidades **não foram fornecidos** e são usados de
  verdade na etiqueta de envio do material — não serão inventados. Nascem
  como `"A CONFIRMAR"` / CEP placeholder válido (formato correto, mas
  claramente marcado), editáveis depois pelo próprio admin em
  `/admin/unidades` assim que os dados reais chegarem. Aviso vai ficar
  destacado no painel até serem preenchidos (ex.: contagem de "endereços
  pendentes" no Painel).

## Fora de escopo (decisão explícita, não incluir nesta rodada)

- Tela de cadastro de conta de colaborador dentro do sistema.
- Região como entidade própria (com tela de gestão separada).
- Desconto ou valor customizado na matrícula manual.
