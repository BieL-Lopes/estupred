# Cadastrar aluno, responsável pela compra e os 45 dias corridos

Data: 2026-09-04
Status: aprovado, aguardando plano de implementação

## Contexto

Feedback do cliente (relayado via WhatsApp) depois que a reorganização de
Alunos e Matrículas entrou em produção, com prints das telas. Quatro pontos:

- "Na tela Aluno, onde está em AMARELO quero um botão para cadastrar novo
  aluno CADASTRAR ALUNO. Essa função é apenas para alimentar o banco de dados
  ALUNOS."
- "No cadastro do Aluno, não encontrei a função onde posso inserir os dados do
  RESPONSÁVEL PELA COMPRA."
- "Também não localizei as funções para confirmar pagamento, nem como
  rastrear se o material já foi enviado para a unidade penal, e visualizar se
  o curso está em andamento."
- "É essencial o sistema me mostrar as datas: pagamento, início do curso (que
  é a data que entrega na unidade penal) e, a partir da data de entrega, a
  soma de 45 dias corridos para projetar a data provável de aplicação de
  prova (...) que é exatamente 45 dias depois da entrega do material."

## O que já existe

O terceiro ponto e a maior parte do quarto **já estão implementados**, na tela
de detalhe da matrícula (`/admin/matriculas/[id]`):

- confirmar pagamento — bloco "Valores", com o pagamento listado e o botão
  "Verificar no gateway" (`reconciliarPagamento`);
- rastrear envio de material — bloco "Avançar status", botão "Marcar como
  material enviado";
- curso em andamento — o selo de status, mais os rótulos "em curso" e "Nº na
  fila" que já aparecem no detalhe do aluno;
- as três datas — bloco "Datas do curso": Compra, Início (entrega do material)
  e Prova.

O cliente não achou porque estava na aba Alunos. **O problema é descoberta,
não função faltando.** Este documento não reconstrói nenhuma dessas funções:
duplicá-las em outra tela criaria dois caminhos para a mesma escrita, que é
como nasce divergência de dados. O que ele resolve é o acesso a elas.

## O conflito da regra dos 45 dias

O sistema hoje aplica a "regra 45+", vinda do documento "Projeto Faculdade" do
próprio cliente: 45 dias corridos **empurrados para o próximo dia útil** se o
quadragésimo quinto dia cair em fim de semana ou feriado nacional.

O cliente agora especificou "exatamente 45 dias depois da entrega do material".
Decisão tomada: **45 corridos, sem ajuste**.

Consequência: `proximoDiaUtil`, `ehDiaUtil`, `feriadosNacionais`, o algoritmo
de Páscoa de Meeus/Jones/Butcher e a tabela de feriados nacionais perdem todo
uso. São removidos junto com seus testes — cerca de 60 linhas. Mantê-los
faria alguém acreditar, mais tarde, que a regra ainda considera feriado.

Em produção não há data a corrigir: a única matrícula com `data_inicio`
preenchida (EST-2026-00002, entrega em 21/08/2026) já está com
`data_prova = 05/10/2026`, que é exatamente 45 dias corridos.

## 1. O responsável

Nasce `lib/matricula/responsavel.ts` com `garantirResponsavel()`: procura em
`profiles` pelo CPF com papel `responsavel`, devolve o id se achar, cria a
conta se não achar. É o que `criarMatricula` já faz inline hoje
(`lib/matricula/acoes.ts`); o bloco sai de lá e passa a chamar a função, então
o comportamento em produção não muda de resultado, só de endereço.

A função recebe um parâmetro explícito dizendo se os dados digitados devem
sobrescrever um cadastro existente:

- **painel: sim.** O colaborador está com a pessoa ao telefone; ele é a
  autoridade sobre o dado.
- **checkout público: não.** Mantém o comportamento atual, em que uma família
  comprando de novo não altera sozinha o cadastro.

Sobrescrever alcança **nome e telefone, nunca o e-mail.** O e-mail é a
identidade de autenticação: `prepararLoginPorCpf` resolve o e-mail pelo CPF em
`profiles` e gera o link mágico contra `auth.users`. Alterar só o lado de
`profiles` faria os dois divergirem e quebraria o login por CPF do responsável
— silenciosamente, e só na próxima vez que ele tentasse entrar.

Três lugares usam a função:

| Lugar | Responsável | Grava em |
|---|---|---|
| Checkout público | obrigatório, como hoje | `internos.responsavel_id` (na criação) e `matriculas.responsavel_id` |
| Cadastrar aluno | **opcional** | `internos.responsavel_id` e `internos.parentesco` |
| Matricular aluno | **obrigatório** | `matriculas.responsavel_id` |

Ao matricular, o bloco vem pré-preenchido com o responsável atual do aluno e é
editável. Isso expõe um caso que o modelo já suportava e nenhuma tela
alcançava: a mãe compra o primeiro curso, a esposa compra o segundo. Cada
matrícula guarda seu comprador, e como a RLS do Portal do Aluno filtra por
`matriculas.responsavel_id`, cada uma enxerga a sua sem tirar a da outra.

Regra exata sobre `internos.responsavel_id`, que refina a da spec anterior
("é o único campo que não é sobrescrito"):

- **Nos fluxos automáticos** — checkout público e matrícula pelo painel — ele é
  **preenchido quando está nulo** e **nunca trocado quando já tem valor**.
  Assim um aluno pré-cadastrado sem responsável ganha o primeiro que o
  matricular, e o cadastro de quem comprou primeiro nunca é tomado por quem
  comprou depois como efeito colateral de uma compra.
- **Na edição do cadastro do aluno** ele **pode ser trocado**. Ali o
  colaborador está corrigindo o cadastro de propósito, com a tela aberta para
  isso; recusar a troca tornaria a tela incapaz de consertar um responsável
  errado, que é justamente o que o cliente pediu.

A diferença é de intenção: numa compra, trocar o responsável do cadastro é
efeito colateral; na tela de edição, é o objetivo.

O bloco de responsável é **tudo ou nada**: ou os cinco campos vêm
preenchidos, ou nenhum. Preenchimento parcial é recusado com mensagem, porque
`garantirResponsavel` precisa de CPF para achar e de nome, e-mail e telefone
para criar. Na tela de matricular, onde é obrigatório, "nenhum" não é opção.

**Risco aceito, registrado explicitamente:** o painel passa a criar contas de
acesso. Um responsável cadastrado por ali entra no Portal do Aluno pelo CPF,
sem senha, e vê as matrículas vinculadas a ele. É o mesmo poder que o checkout
público já tem, agora atrás de `exigirEquipe()` — mas digitar um CPF errado
nessa tela concede acesso ao portal ao dono daquele CPF.

## 2. Cadastrar aluno

A aba Alunos recupera o botão, agora chamado **"Cadastrar aluno"**, para casar
com "Matricular aluno" do outro lado. Ele leva para `/admin/alunos/novo`, com
dois blocos:

- **Dados do aluno** — nome, CPF, RG, matrícula prisional, data de nascimento,
  unidade prisional.
- **Responsável (opcional)** — nome, CPF, e-mail, telefone, parentesco. O
  rótulo diz "opcional" na tela, senão o colaborador trava achando que
  precisa preencher.

Nenhuma matrícula é criada, que é o propósito declarado ("apenas para
alimentar o banco de dados ALUNOS").

**CPF repetido recusa, não sobrescreve.** Ao contrário da tela de matricular,
onde encontrar o CPF é o objetivo, aqui o colaborador declarou intenção de
criar um cadastro novo. Se o CPF já existe, a tela responde "Já existe um
aluno com este CPF" com link para o cadastro dele, em vez de alterar em
silêncio um registro que o colaborador não sabia existir.

Por isso esta tela **não** usa `garantirInterno()`, que atualiza o cadastro
quando acha o CPF — comportamento correto para uma compra, errado para um
"cadastrar novo". Ela insere direto e traduz a violação de unicidade (código
`23505`) na mensagem acima, do mesmo jeito que `atualizarAluno` já faz na
edição.

O mesmo bloco de responsável entra na tela de **detalhe do aluno**, que é onde
o cliente procurou e não achou. Ali ele edita o responsável de um aluno já
cadastrado.

Isto reabre de propósito a porta fechada na spec de 2026-09-03, que registrava
como consequência aceita que "não existe caminho para cadastrar um aluno sem
matriculá-lo" e que pré-cadastrar uma turma antes de vender ficaria impossível.
O cliente olhou a tela pronta e pediu essa porta de volta.

## 3. Descoberta das datas

No detalhe do aluno, cada matrícula da lista ganha uma linha discreta com as
três datas — compra, início e prova — exibidas apenas quando existem. Foi ali
que o cliente foi procurar. Ele passa a ver as datas sem clicar, e continua
clicando quando quer agir.

O rótulo do bloco de datas na matrícula muda de "Prova (regra 45+)" para
**"Prova (45 dias após a entrega)"**, que descreve o que a regra passa a
fazer.

## Testes

**Unitários** de `lib/matricula/prazos.ts`, reduzidos à soma pura: dia comum,
virada de mês, ano bissexto, e a rejeição de data fora do formato AAAA-MM-DD,
que continua valendo. Os testes de feriado, dia útil e próximo dia útil são
removidos junto com as funções.

**Integração** contra o Supabase local:

- `garantirResponsavel` cria a conta quando o CPF é novo;
- reaproveita pelo CPF quando já existe, e sobrescreve os dados só quando
  chamado com a intenção de atualizar;
- cadastro de aluno sem responsável grava `responsavel_id` nulo e o aluno
  continua aparecendo na listagem;
- cadastro de aluno com responsável vincula os dois;
- cadastro com CPF de aluno já existente é recusado, sem alterar o registro
  anterior;
- matrícula com responsável diferente do cadastro grava o comprador certo em
  `matriculas.responsavel_id` sem trocar o de `internos`;
- `calcularDataProva` gravada por `avancarStatus` bate com entrega + 45.

**Navegador**, o percurso inteiro: cadastrar aluno sem responsável, matricular
esse aluno informando o responsável, confirmar que a data de prova é a entrega
mais 45, e ver as três datas na lista do detalhe do aluno.

## Fora de escopo

- Reconstruir confirmação de pagamento, rastreio de material ou indicação de
  curso em andamento: já existem na tela de matrícula, conforme a seção "O que
  já existe".
- Tela de cadastro de colaborador dentro do sistema (adiada em rodadas
  anteriores).
- Edição de responsável fora do cadastro do aluno e da matrícula.
