# estupred — Vitrine + Matrícula Online (v1)

**Data:** 2026-08-27
**Status:** Aprovado
**Fase:** 1 de 5

## Contexto

O cliente opera venda de cursos profissionalizantes para pessoas privadas de
liberdade. Os cursos geram remição de pena: pela LEP, 12 horas de estudo remitem
um dia, e o interno pode estudar no máximo 4 horas por dia. Os certificados são
emitidos pela Faculdade Guerra, e os cursos seguem as portarias da VEP 10/2016.
São cerca de 50 cursos profissionalizantes.

O concorrente estabelecido é a Escola CENED, pioneira do setor. O estupred
precisa de paridade funcional com a CENED e da simplicidade de uso do site
A Clique Fácil.

### O que a análise das referências revelou

Isto **não é uma plataforma EAD**. O interno não tem acesso à internet. O
software é um sistema de gestão de logística, provas e certificação:

- Quem faz a matrícula é o **familiar ou responsável**, não o aluno.
- O material didático é uma **apostila física**, etiquetada e enviada ao Chefe
  do Núcleo de Ensino da unidade prisional.
- O curso é estudado na cela. A prova é **escrita e presencial**, aplicada na
  unidade e corrigida pela equipe pedagógica.
- Nota mínima de 60%, com uma recuperação gratuita.
- O certificado é **impresso** e entregue ao Núcleo de Ensino, que o repassa à
  assessoria jurídica para a certidão de remição.
- A CENED cobra **frete variável por estado** e a disponibilidade de cursos
  também varia por estado.
- A CENED opera três portais separados: área do aluno (onde o familiar
  acompanha), portal do agente penitenciário e portal de matrícula.

O valor que o software entrega ao familiar é **acompanhamento em tempo real** do
andamento do curso, da confirmação da matrícula à emissão do certificado.

## Decomposição do produto

| Fase | Subsistema | v1 |
|---|---|---|
| 1 | Vitrine + catálogo de cursos | Sim |
| 1 | Matrícula (wizard) + pagamento | Sim |
| 1 | Área do Aluno (acompanhamento de status) | Sim |
| 1 | Admin mínimo (cursos, unidades, fretes, matrículas) | Sim |
| 2 | Expedição e rastreio de apostilas | Não |
| 3 | Provas, notas e recuperação | Não |
| 4 | Certificados (Faculdade Guerra) e cálculo de remição | Não |
| 5 | Portal do Agente Penitenciário / Núcleo de Ensino | Não |

Cada fase posterior recebe sua própria spec.

### Fronteira explícita do v1

A Área do Aluno **exibe** a linha do tempo completa da matrícula, incluindo os
estados que as fases 2 a 4 vão automatizar. No v1, quem **avança** esses estados
é o administrador, manualmente, pelo painel. Isso entrega o diferencial visível
sem construir cinco subsistemas.

O cálculo de dias de remição foi deliberadamente deixado fora do v1. A prioridade
é paridade com o que a CENED já oferece.

## Arquitetura

Monólito Next.js 15 (App Router) + TypeScript, com Supabase para banco,
autenticação e storage. Um repositório, um deploy.

```
app/(site)    público, renderizado no servidor
app/(aluno)   autenticado, responsável
app/(admin)   autenticado, administrador
```

Escrita via Server Actions. Webhook de pagamento em Route Handler. Estilo com
Tailwind CSS.

Alternativas descartadas: separar vitrine estática e app autenticado em dois
projetos (isolamento que o tamanho atual não justifica, ao custo de catálogo
duplicado); usar o Supabase Studio no lugar de um admin próprio (economiza no v1
e cobra caro na operação, além de matar o argumento de "plataforma").

## Modelo de dados

```
profiles              id (uuid, = auth.users) · nome · cpf · telefone · email
                      · role (responsavel | admin)

unidades_prisionais   id · uf · nome · endereco · cep · responsavel_nucleo
                      · telefone · ativa

fretes                id · uf (unique) · valor_centavos · prazo_dias

cursos                id · slug · titulo · descricao · ementa (markdown)
                      · carga_horaria · preco_centavos · capa_url · categoria
                      · ativo · destaque

curso_ufs             curso_id · uf          -- disponibilidade por estado

internos              id · nome · cpf · matricula_prisional · data_nascimento
                      · unidade_prisional_id · responsavel_id · parentesco

matriculas            id · codigo (público) · interno_id · curso_id
                      · responsavel_id · unidade_prisional_id
                      · preco_centavos · frete_centavos · total_centavos
                      · status · autorizacao_url · created_at

pagamentos            id · matricula_id · gateway · gateway_ref
                      · metodo (pix | boleto | cartao) · valor_centavos
                      · status · payload (jsonb) · pago_em

matricula_eventos     id · matricula_id · de_status · para_status · nota
                      · autor_id · created_at
```

### Decisões de modelagem

**Valores monetários em centavos inteiros.** Nunca ponto flutuante.

**`internos` é separado de `profiles`** porque o interno não é usuário do
sistema: não tem login e não tem internet. Quem autentica é o responsável.

**`curso_ufs` existe** porque a disponibilidade de cursos varia por estado, como
a própria CENED declara.

**`codigo` público na matrícula** (formato `EST-2026-00417`) para o familiar
referenciar por WhatsApp sem expor identificadores internos.

**`autorizacao_url`** guarda o upload da autorização de estudo emitida pela
unidade prisional, em Supabase Storage. Este campo **não bloqueia** a matrícula:
a CENED trata a autorização como providência do responsável, e travar o checkout
reduziria a conversão.

**`matricula_eventos` é append-only.** Alimenta a linha do tempo da Área do Aluno
e fornece trilha de auditoria sem trabalho extra.

## Máquina de estados da matrícula

```
rascunho
  → aguardando_pagamento
      → paga
          → material_enviado
              → prova_aplicada
                  → aprovado → certificado_emitido
                  → reprovado → prova_aplicada        (recuperação)

cancelada  ← a partir de rascunho ou aguardando_pagamento
```

Cada transição grava uma linha em `matricula_eventos`.

No v1, a transição `aguardando_pagamento → paga` é disparada pelo webhook do
gateway. Todas as demais são executadas pelo administrador, com nota opcional.

Toda transição passa por um único módulo, `lib/matricula/transicoes.ts`, que
valida se o salto pertence ao grafo. Nenhum `update` de status ocorre fora dele.

## Rotas

### Público — `app/(site)`

| Rota | Conteúdo |
|---|---|
| `/` | Hero, "como funciona" em 6 passos, cursos em destaque, FAQ, WhatsApp |
| `/cursos` | Catálogo com busca e filtro por UF e categoria |
| `/cursos/[slug]` | Ementa, carga horária, preço, CTA de matrícula |
| `/como-funciona` | Passo a passo completo do programa |
| `/institucional` | Faculdade Guerra, credenciamento, VEP 10/2016 |
| `/matricula/[slug]` | Wizard de 4 passos |
| `/entrar`, `/recuperar-senha` | Autenticação |

### Área do Aluno — `app/(aluno)`

| Rota | Conteúdo |
|---|---|
| `/aluno` | Matrículas do responsável, com status e progresso |
| `/aluno/matricula/[codigo]` | Linha do tempo, dados do interno, comprovante, upload da autorização |
| `/aluno/perfil` | Dados cadastrais |

### Admin — `app/(admin)`

| Rota | Conteúdo |
|---|---|
| `/admin` | Matrículas por status, receita do mês, pendências |
| `/admin/matriculas` | Lista filtrável; detalhe com botões de transição |
| `/admin/cursos` | CRUD |
| `/admin/unidades` | CRUD |
| `/admin/fretes` | Tabela de frete por UF |

## Wizard de matrícula

Quatro passos, uma tela por passo.

1. **Onde ele está** — UF, depois unidade prisional. Vem primeiro porque
   determina o frete e a disponibilidade do curso.
2. **Dados do interno** — nome, CPF, matrícula prisional, data de nascimento.
3. **Seus dados** — responsável: nome, CPF, WhatsApp, e-mail, parentesco. A
   conta é criada aqui, com senha.
4. **Pagamento** — resumo `curso + frete = total` e escolha do método.

O rascunho é salvo a cada passo, com status `rascunho`, de modo que o
preenchimento nunca se perde. O total fica visível no rodapé a partir do passo 1.

## Identidade visual

Limpo e moderno, na linha do A Clique Fácil: cards com respiro, tipografia
generosa, um único CTA óbvio por tela. Tom sóbrio e digno, sem imagética
prisional. Azul profundo para confiança institucional, âmbar e verde para
progresso e conquista. Mobile-first: a compra acontece no celular.

## Autenticação e permissões

Supabase Auth com e-mail e senha. O papel fica em `profiles.role`.

Row Level Security em todas as tabelas:

- `cursos`, `unidades_prisionais`, `fretes` — leitura pública, escrita só admin
- `matriculas`, `internos`, `pagamentos` — o responsável acessa apenas os
  próprios registros; o admin acessa todos
- `matricula_eventos` — inserção apenas; sem `update` nem `delete`

As rotas `/admin` são adicionalmente protegidas no middleware. A redundância é
intencional: RLS é a garantia, o middleware é a experiência de uso.

Uma policy que consulta `profiles.role` dentro de uma policy da própria tabela
`profiles` causa recursão infinita. A verificação de papel usa uma função
`SECURITY DEFINER` chamada `is_admin()`.

## Pagamento

O gateway é abstraído atrás de uma interface, para ser definido depois que o
cliente resolver a conta e o CNPJ.

```ts
interface GatewayPagamento {
  criarCobranca(m: Matricula): Promise<{
    ref: string
    url?: string
    pixCopiaECola?: string
    expiraEm: Date
  }>
  consultarStatus(ref: string): Promise<StatusPagamento>
  interpretarWebhook(req: Request): Promise<{ ref: string; status: StatusPagamento } | null>
}
```

`FakeGateway` é a implementação de desenvolvimento, acompanhada da rota
`/api/dev/pagar`, que simula um PIX pago. O fluxo completo roda sem conta em
gateway algum. Plugar o gateway real é uma classe nova e uma variável de
ambiente.

Métodos exigidos na produção: PIX, boleto e cartão de crédito.

## Tratamento de erros

**Webhook duplicado.** Gateways reenviam notificações. A idempotência é
garantida por unique constraint em `(gateway_ref, evento)`; a segunda chegada é
no-op.

**Pagamento órfão.** Se chega um webhook que não corresponde a nenhuma matrícula
válida, o registro é gravado em `pagamentos` mesmo assim e uma pendência é
levantada em `/admin`. Dinheiro que entrou nunca é descartado silenciosamente.

**Transição ilegal.** Rejeitada por `lib/matricula/transicoes.ts`.

Complementos: botão de reconciliação no admin, que chama `consultarStatus` sob
demanda; validação com Zod compartilhada entre cliente e servidor; validação de
CPF com dígito verificador.

## Testes

Desenvolvimento guiado por testes: o teste vem antes da implementação.

**Vitest** — grafo de transições de estado, cálculo de `preço + frete`,
validação de CPF, interpretação de webhook, idempotência de webhook.

**Playwright** — o caminho crítico de receita: catálogo, os quatro passos do
wizard, pagamento pelo gateway fake, e a Área do Aluno exibindo o status `paga`.

## LGPD

Dados de pessoa privada de liberdade são sensíveis. No v1: RLS estrita, ausência
de CPF em URLs e em logs, e página de política de privacidade. Não é uma fase do
projeto, é higiene de base.

## Item em aberto

O cliente possui duas bases de dados existentes. O formato ainda é desconhecido
(planilha, dump SQL ou documento). A rotina de importação é tarefa separada, a
ser especificada quando o formato for conhecido. Não bloqueia o v1.
