# CLAUDE.md — Diretrizes para Notas no Obsidian

Este arquivo define as regras que toda nota Markdown criada ou editada nesta pasta (vault do Obsidian) deve seguir.

## 1. Frontmatter YAML obrigatório

Toda nota deve começar com um bloco de frontmatter contendo, no mínimo, `tags`, `created` e `updated`:

```yaml
---
tags:
  - materia/nome-da-materia
  - tipo/resumo
created: 2026-08-30
updated: 2026-08-30
---
```

- `tags`: use tags hierárquicas com `/` para organizar por matéria e tipo de conteúdo (ex.: `materia/farmacologia`, `tipo/questao`, `tipo/flashcard`).
- `created`: data de criação da nota, formato `YYYY-MM-DD`, nunca alterada depois.
- `updated`: data da última edição, formato `YYYY-MM-DD`, atualizada a cada revisão relevante do conteúdo.

## 2. Hierarquia de títulos e callouts

- Use `#` apenas para o título principal da nota (um único por nota).
- Use `##` para seções principais e `###` para subseções. Não pule níveis (ex.: não ir de `##` direto para `####`).
- Use callouts do Obsidian para destacar informação:

```markdown
> [!tip] Macete
> Texto do macete ou mnemônico para fixação.

> [!info] Contexto
> Informação complementar ou definição.

> [!warning] Atenção
> Pegadinha comum ou erro frequente em provas/questões.
```

- Prefira `[!tip]` para mnemônicos e atalhos de memorização, `[!info]` para definições e contexto teórico, e `[!warning]` para pegadinhas e erros comuns.

## 3. Links bidirecionais entre termos e matérias

- Sempre que um termo técnico, conceito ou matéria relacionada aparecer no texto, conecte-o usando `[[Nome da Nota]]`.
- Use alias quando o texto corrido pedir uma forma diferente do nome da nota: `[[Nome da Nota|texto exibido]]`.
- Crie a nota de destino (mesmo que só com o frontmatter e um título) se ela ainda não existir, para manter o grafo de conexões consistente.
- Evite links soltos sem contexto: o termo linkado deve fazer sentido na frase, não ser um link inserido à força.

## 4. Linguagem técnica, direta e voltada à prática

- Escreva em linguagem técnica e objetiva, sem rodeios ou introduções longas.
- Priorize conteúdo aplicável: como reconhecer o conceito em uma questão, como resolver, quais são as pegadinhas.
- Estruture explicações complexas em listas ou tabelas em vez de parágrafos longos.
- Sempre que possível, inclua um exemplo de questão ou aplicação prática do conceito, junto com o raciocínio de resolução.
