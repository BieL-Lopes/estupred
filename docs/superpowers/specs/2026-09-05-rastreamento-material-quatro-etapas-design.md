# Rastreamento do material em quatro etapas

Data: 2026-09-05
Status: aprovado, aguardando plano de implementação

## Contexto

Conversa do cliente por WhatsApp em 04/09, sobre como o andamento da entrega
seria atualizado:

- "Esse rastreamento, como vai ser as atualizações de andamento da entrega dos
  materiais? Tipo, o aluno comprou o curso, já pagou, daí inicia a confecção
  dos materiais, de qual forma a gente vai atualizando o andamento da
  entrega?"
- "O andamento é o seguinte: compra, produção, envio e entrega. Realizada a
  entrega, inicia o prazo de 45 dias."
- "Ou seja, após realizada a entrega, tem que aparecer na tela CURSO EM
  ANDAMENTO e data provável da prova."
- "Mas como vai ser atualizado no sistema, quando os materiais estiverem em
  produção, a caminho da unidade e se já foram entregues? Vai ser
  manualmente?" — "Manualmente."

Hoje o fluxo tem um único marco entre o pagamento e a prova:
`paga → material_enviado → prova_aplicada`. O status `material_enviado`
concentra produção, envio e entrega, e é ele que carimba `data_inicio` e
`data_prova`.

## Decisões tomadas na conversa

- **A trava de um curso por vez fica na produção**, que é o primeiro passo
  depois de paga — o mesmo lugar relativo onde ela está hoje.
- **As etapas andam em ordem estrita**, uma de cada vez, sem pular e sem campo
  de data retroativa.
- **"Curso em andamento" não vira status próprio.** É o rótulo de
  `material_entregue`: a entrega *é* o início do curso e é ela que dispara os
  45 dias. Um status separado exigiria um clique a mais que não informa nada
  que a entrega já não tenha informado.

## 1. Os status e o grafo

Três valores novos no enum `status_matricula`, em migração isolada como manda
a convenção do projeto para mudança de enum:

| Valor | Rótulo na tela |
|---|---|
| `material_em_producao` | Material em produção |
| `material_a_caminho` | Material a caminho |
| `material_entregue` | Curso em andamento |

O grafo de `lib/matricula/transicoes.ts` passa a ser:

```
rascunho              → aguardando_pagamento, cancelada
aguardando_pagamento  → paga, cancelada
paga                  → material_em_producao
material_em_producao  → material_a_caminho
material_a_caminho    → material_entregue
material_entregue     → prova_aplicada
prova_aplicada        → aprovado, reprovado
reprovado             → prova_aplicada
aprovado              → certificado_emitido
certificado_emitido   → (terminal)
cancelada             → (terminal)
material_enviado      → (aposentado, sem saída)
```

### Por que `material_enviado` não é reaproveitado

A alternativa considerada e recusada foi manter `material_enviado` com o
significado novo de "a caminho", economizando um valor no enum. O problema é a
trilha de auditoria: `matricula_eventos` guarda eventos que **já aconteceram**
com `para_status = 'material_enviado'`, gravados quando aquele nome queria
dizer "entregue na unidade". Migrar matrículas é fácil; migrar o significado de
um evento passado é impossível — aquilo aconteceu. Quem abrisse o histórico
depois leria "material enviado" e entenderia "a caminho", quando o colaborador
quis dizer "chegou".

Por isso: conceito novo, nome novo.

`material_enviado` continua existindo no enum do Postgres — que não permite
remover valor sem recriar o tipo — e continua na união de tipos do TypeScript,
com rótulo **"Material enviado (etapa antiga)"** e nenhuma transição de saída.
O painel precisa dele para rotular eventos históricos ao desenhar o histórico.
Removê-lo do código deixaria eventos passados sem nome. O valor morto no enum
fica documentado no comentário da migração, em vez de cirurgia no tipo por
cosmética.

### Migração dos dados

As matrículas em `material_enviado` passam para `material_entregue`, porque é o
que aquele status significava quando foram gravadas. São duas linhas em
produção, ambas de teste (`EST-2026-00002` e `EST-2026-00006`).

Os eventos históricos **não** são reescritos. Eles registram o que o
colaborador fez naquele momento, e reescrever trilha de auditoria para ficar
coerente com o presente é pior do que conviver com um nome aposentado.

## 2. As datas e a fila

**O carimbo muda de lugar, não de significado.** `data_inicio` e `data_prova`
passam a ser gravadas ao entrar em `material_entregue`, no lugar de
`material_enviado`. Como o marco continua sendo a entrega na unidade, **nenhuma
data existente precisa ser corrigida**. `data_compra` continua sendo gravada em
`paga`. A regra dos 45 dias corridos, definida em 04/09, não muda.

**A fila cresce para cobrir as três etapas.** `STATUS_EM_CURSO` em
`lib/matricula/fila.ts` passa a ser `material_em_producao`,
`material_a_caminho`, `material_entregue`, `prova_aplicada`, `aprovado`,
`reprovado` — e mantém `material_enviado`. Se alguma linha antiga escapar da
migração, ela significava "entregue" e tem que continuar ocupando o aluno; é
defesa barata contra um caso que não deveria existir.

**A trava desce para a produção.** O trigger `checar_um_curso_por_vez` hoje
dispara ao entrar em `material_enviado`. Passa a recusar a entrada em
**qualquer** status que ocupe o aluno, vindo de qualquer status que não
ocupava. Isso é mais forte do que o de hoje em dois sentidos: barra antes de
gastar papel, e barra também quem tentar pular direto para `material_entregue`
por SQL na mão, fora do app.

Na prática a regra fica mais protetora do que era: antes o sistema deixava
produzir e enviar dois kits e só barrava na entrega.

Com a trava mudando de lugar, `bloqueioDeEnvio` vira **`bloqueioDeProducao`**,
e o aviso na tela troca de "o material desta matrícula só pode ser enviado
depois que..." para "a produção do material desta matrícula só pode começar
depois que...". Nome de função que descreve a transição errada engana quem lê
seis meses depois.

**Consequência aceita:** as três etapas viram três cliques, cada um gerando seu
evento com data própria. Se o colaborador marcar as três no mesmo dia porque
esqueceu de acompanhar, as três datas ficam iguais — o histórico mostra o que
ele registrou, não o que aconteceu. A alternativa (campo de data retroativa em
cada passo) foi considerada e recusada na conversa, em favor de ordem estrita
sem campo extra.

## 3. Quem pode marcar cada etapa

Marcar **"material em produção" é exclusivo do admin**. As demais transições
continuam abertas a toda a equipe (admin ou colaborador), como hoje.

A razão é operacional: a produção é o passo que compromete dinheiro, e quem
sabe que a gráfica começou a confecção é quem fala com ela. O colaborador
acompanha e registra envio e entrega; abrir a produção é decisão de quem
autoriza o gasto.

Isso muda `mudarStatus` em `lib/admin/acoes.ts`, que hoje chama `exigirEquipe()`
para qualquer transição. Passa a escolher a checagem pela transição pedida:
`exigirAdmin()` quando o destino é `material_em_producao`, `exigirEquipe()` nos
demais. A checagem no servidor é a barreira real — uma Server Action é um
endpoint HTTP por si só, e esconder o botão não protege nada sozinho.

Na tela, `AcoesDeStatus` recebe o papel do usuário e, para um colaborador numa
matrícula em `paga`, mostra no lugar do botão o aviso de que a produção precisa
ser liberada por um administrador. Botão que só falha depois do clique é pior
do que botão que não aparece — o mesmo princípio já aplicado ao bloqueio da
fila.

Decisão marcada como **"por enquanto"**: se o cliente depois quiser que o
colaborador também libere produção, a mudança é trocar uma linha na escolha da
checagem.

## 4. As telas

**Painel.** O `Selo` ganha cor para os três valores novos: as três etapas de
material em laranja, a cor de "em progresso", com o verde continuando reservado
para `aprovado` e `certificado_emitido`. O bloco "Avançar status" segue o grafo
e passa a oferecer um botão por vez.

A tela de matrícula já atende ao pedido do cliente sem elemento novo: ao entrar
em `material_entregue` o selo passa a dizer "Curso em andamento", e o bloco
"Datas do curso" já mostra "Prova (45 dias após a entrega)" ao lado.

**Portal do Aluno.** A linha do tempo passa de seis para oito etapas:
`aguardando_pagamento`, `paga`, `material_em_producao`, `material_a_caminho`,
`material_entregue`, `prova_aplicada`, `aprovado`, `certificado_emitido`.

`montarLinhaDoTempo` encontra a posição atual com `indexOf`, e um status fora
da lista devolve `-1`, o que faria **todas** as etapas aparecerem como futuras
— a família veria uma matrícula entregue como se nada tivesse começado. O
mecanismo para tratar isso já existe para `reprovado`, mapeado para
`prova_aplicada` antes da busca. O mesmo passa a valer para `material_enviado`,
mapeado para `material_entregue`.

**Lista e detalhe de Alunos.** Os rótulos "em curso" e "Nº na fila" vêm de
`situacaoDaFila`, que passa a cobrir as etapas novas pela mudança em
`STATUS_EM_CURSO`. Nenhuma alteração além da constante.

## 5. Testes

**Unitários:**

- o grafo cobre o caminho novo inteiro, e cada etapa de material tem uma saída
  só;
- `material_enviado` não tem saída e continua com rótulo;
- a fila reconhece as três etapas novas como ocupantes, e `paga` continua não
  ocupando;
- `bloqueioDeProducao` aponta a matrícula que está segurando;
- a linha do tempo devolve oito etapas, e posiciona corretamente uma matrícula
  antiga ainda em `material_enviado`.

**Integração** contra o Supabase local:

- percorrer `paga → produção → a caminho → entregue` grava `data_inicio` e
  `data_prova` **só na entrega**, e `data_prova` é a entrega mais 45;
- `avancarStatus` recusa a produção de um segundo curso com erro legível;
- o trigger recusa o mesmo caso, e recusa também um salto direto para
  `material_entregue` escrito por fora do app;
- uma matrícula deixada em `material_enviado` continua ocupando o aluno;
- `exigirAdmin` é a checagem usada quando o destino é `material_em_producao`, e
  `exigirEquipe` nos demais destinos. Como as duas dependem de `cookies()`, o
  teste cobre a função pura que escolhe qual checagem cada transição exige, não
  as checagens em si.

**Navegador**, em produção: percorrer as quatro etapas numa matrícula de teste,
conferindo que ao entregar o selo diz "Curso em andamento" e a data da prova
aparece como entrega mais 45.

## Fora de escopo

- Campo de data retroativa por etapa, recusado na conversa.
- Notificação à família a cada mudança de etapa.
- Rastreio de transportadora ou código de postagem.
- Remoção do valor `material_enviado` do enum do Postgres.
- Tornar configurável quem pode liberar produção: hoje é decisão de código.
