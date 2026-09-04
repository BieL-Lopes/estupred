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
