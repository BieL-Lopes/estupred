# Matricular aluno pela aba Matrículas, CPF único e um curso por vez

Data: 2026-09-03
Status: aprovado, aguardando plano de implementação

## Contexto

Feedback do cliente (relayado via WhatsApp) depois que a página de Alunos e a
matrícula manual entraram em produção. Três pedidos, na ordem em que ele
mandou:

- "Troca essa parte pra gente, coloca as ações na aba de Matrícula e deixa
  Alunos somente para listagem e detalhamento."
- "Agora na aba matrículas tem que ter a opção matricular aluno. Aí sim vou
  vincular ele a algum curso que esteja cadastrado, e à unidade penal, para
  que assim possamos rastrear a matrícula, entrega do material na unidade
  penal, e o dia da prova na unidade penal."
- "Primeiro cadastra-se o aluno, depois vincula ele a um curso, porque esse
  mesmo aluno tem que ter um ciclo de cursos: ele pode se matricular em
  vários cursos, mas apenas 1 por vez."

O fluxo que ele desenhou (`Aluno > Matrícula (Curso) > Envio de Material >
Aplicação de Provas > Certificado`) **já é** o que está implementado em
`lib/matricula/transicoes.ts`. Não há fluxo novo a construir. O que este
documento cobre é a reorganização das telas, mais duas regras de negócio que
o pedido dele expôs e que hoje não existem.

## Problemas encontrados na leitura do código

Dois furos vieram à tona ao confrontar o pedido com o que está no repositório.
Ambos entram no escopo: a regra do "um curso por vez" é inaplicável sem o
primeiro, e o segundo cobra dinheiro errado do cliente final.

**Cadastro duplicado.** O checkout público sempre faz `insert` em `internos`
(`lib/matricula/acoes.ts`), e `internos.cpf` não tem unicidade — só
`profiles.cpf` tem. Hoje, uma família que compra um segundo curso para a mesma
pessoa cria um **aluno novo**, que aparece duas vezes na lista e não carrega
histórico nenhum. Sem um CPF por aluno, "um curso por vez" não tem sujeito
sobre o qual valer.

**Frete errado em aluno transferido.** `registrarMatriculaParaAlunoExistente`
calcula o frete pela UF gravada no cadastro do aluno. Se a pessoa foi
transferida para outro estado desde a primeira matrícula, o frete da segunda
sai pela unidade antiga.

## 1. Telas e rotas

Nasce `/admin/matriculas/nova`: uma rota única, com busca por CPF do aluno na
frente. Se o CPF já existe, a tela mostra o cadastro encontrado em leitura e
pede curso e unidade; se não existe, abre os campos de cadastro (aluno e
responsável) na sequência. Um único submit no fim.

A alternativa considerada e recusada foi o wizard de três passos em rotas
separadas. Ele é a leitura mais literal do "primeiro cadastra-se o aluno,
depois vincula", mas cria estado intermediário: aluno cadastrado sem curso se
o colaborador fecha a aba no meio. A ordem que o cliente descreveu continua
visível na tela — o que ela não vira é três telas com estado entre elas.

Usar o CPF como porta de entrada faz a deduplicação acontecer sem depender de
alguém lembrar de procurar antes. É a mesma razão pela qual a opção de deixar
o colaborador escolher entre "novo aluno" e "aluno existente" foi descartada:
é justamente essa escolha manual que produz o duplicado de hoje.

Mudanças nas telas existentes:

- `/admin/matriculas` ganha o botão **Matricular aluno** no cabeçalho.
- `/admin/alunos` perde o botão **Novo aluno**. Ficam a busca e a tabela.
- `/admin/alunos/[id]` mantém o formulário de edição — o colaborador continua
  corrigindo nome, CPF, matrícula prisional e transferência de unidade por ali
  — e mantém a lista de matrículas do aluno, agora com selo indicando qual
  está em andamento e quais estão na fila. Perde o link "+ Nova matrícula".
- Somem `/admin/alunos/novo` e `/admin/alunos/[id]/nova-matricula`. O
  componente `FormularioNovoAluno` não é descartado: vira o bloco de cadastro
  dentro da tela nova.
- `app/(admin)/admin/alunos/acoes.ts` migra para
  `app/(admin)/admin/matriculas/acoes.ts`.
- Os `loading.tsx` acompanham: o de `alunos/` perde o esqueleto do botão, e
  nasce um para `matriculas/nova` no formato de formulário.

Consequência aceita explicitamente: depois disso não existe caminho para
cadastrar um aluno sem matriculá-lo. Todo aluno entra no sistema junto com um
curso, que é o que o cliente descreveu ("cadastro vai ser pela compra do
curso"). Pré-cadastrar uma turma antes de vender deixa de ser possível.

## 2. Um CPF, um aluno

Migração adicionando `unique (cpf)` em `internos`. A produção foi consultada
antes: zero CPFs duplicados hoje, então a constraint entra sem precisar juntar
cadastros.

Uma função nova `garantirInterno()` substitui o `insert` direto nos dois
caminhos (checkout público e admin): procura pelo CPF, atualiza os dados
cadastrais e a unidade se achou, insere se não achou.

`responsavel_id` do cadastro é o único campo que **não** é sobrescrito: fica
com o primeiro responsável. Cada matrícula grava separadamente quem pagou
aquela, e o acesso ao Portal do Aluno é filtrado por RLS em cima de
`matriculas.responsavel_id`, não de `internos.responsavel_id`. Então uma
segunda compradora — outra parente da mesma pessoa presa — enxerga a matrícula
dela sem tomar o cadastro da primeira.

A constraint também alcança a edição de cadastro em `/admin/alunos/[id]`:
corrigir o CPF de um aluno para um CPF que já existe passa a falhar no banco.
`salvarAluno` precisa traduzir esse erro em mensagem legível ("já existe um
aluno com este CPF") em vez de deixar a exceção subir para a tela.

## 3. Um curso por vez

O aluno está ocupado enquanto tem uma matrícula **em curso**, isto é, em
`material_enviado`, `prova_aplicada`, `aprovado` ou `reprovado`. Ela deixa de
ocupar ao chegar em `certificado_emitido` ou `cancelada` — o cliente escolheu
liberar a fila só na emissão do certificado, não na aprovação.

Matrícula em `rascunho`, `aguardando_pagamento` ou `paga` **não ocupa o
aluno**: nada saiu da gráfica ainda, então ela não impede nada. Se nenhuma
matrícula do aluno está em curso, ninguém está ocupando a vaga e a mais antiga
paga é a próxima da fila.

Ordenar por data de criação para achar a ativa daria a resposta errada — a
produção mostrou o caso: das três matrículas do aluno de teste, a mais antiga
está em `paga` e quem realmente está em curso é a segunda, que já teve
material entregue. O que define "em curso" é o material ter saído, não a data
da compra. A data serve só para ordenar a fila na tela.

**Onde a regra é aplicada:** na transição `paga → material_enviado`. De
propósito — é o primeiro passo que gasta dinheiro, porque antes dele nada saiu
da gráfica. A venda nunca é recusada: o cliente decidiu que a família pode
comprar o segundo curso normalmente e a entrega é que espera na fila. Isso
evita criar status novo no enum.

A decisão vira função pura em `lib/matricula/fila.ts`, que recebe o conjunto
de matrículas do aluno e devolve qual está em andamento e quais estão na fila.
`avancarStatus` consulta antes de escrever e recusa com erro legível. Um
trigger no banco recusa o mesmo caso — é o que garante a regra se alguém
escrever por fora do app, por script ou SQL na mão.

Na tela de matrícula, quando ela está na fila, o botão dá lugar a um aviso com
link para a matrícula que está segurando. Nada de botão que falha só depois do
clique.

## 4. Unidade escolhida por matrícula

`matriculas.unidade_prisional_id` já existe e já é gravado; o que muda é que
passa a ser escolhido no formulário em vez de copiado do cadastro do aluno. A
unidade escolhida também atualiza a unidade atual do aluno, na mesma lógica do
`garantirInterno()`.

Isso conserta o frete do aluno transferido descrito no contexto: o cálculo
passa a usar a UF da unidade escolhida na matrícula.

## Testes

**Unitários** para `lib/matricula/fila.ts`, que é pura e concentra a decisão:
nenhuma matrícula aberta; uma paga só; uma com material enviado mais duas
pagas; `reprovado` ainda contando como em curso; `certificado_emitido` e
`cancelada` não contando.

**Integração** contra o Supabase local, que é onde as regras de banco vivem: a
constraint recusa CPF repetido; `garantirInterno` reaproveita o cadastro e
atualiza a unidade sem trocar o responsável; o trigger recusa o segundo
`material_enviado`; `avancarStatus` devolve erro legível em vez de estourar; o
frete sai pela UF da unidade nova quando o aluno é transferido.

**Navegador** no fluxo inteiro de `/admin/matriculas/nova`: CPF novo (cadastra
e matricula) e CPF existente (reaproveita), mais a tela de matrícula mostrando
o aviso de fila em vez do botão.

## Migrações

Duas, separadas de propósito:

1. unicidade de CPF em `internos`;
2. trigger de um curso por vez.

Nenhuma mexe em linha existente. O trigger só age em `update`, então as três
matrículas de teste em produção continuam como estão.

## Fora de escopo

- Tela de cadastro de colaborador dentro do sistema (já adiada anteriormente).
- Pré-cadastro de aluno sem matrícula, conforme a seção 1.
- Qualquer mudança no fluxo de status em si, que já atende ao que o cliente
  descreveu.
