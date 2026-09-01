-- Colaborador: gerencia Alunos e Matrículas, sem acesso a Cursos/Unidades/
-- Fretes (isso continua exclusivo de admin). Ver spec
-- docs/superpowers/specs/2026-09-01-colaborador-alunos-regioes-design.md.
alter type papel_usuario add value 'colaborador';

-- Matrícula cadastrada manualmente (pagamento confirmado fora do site) não
-- passa pelo gateway online — precisa de um método próprio pra não forjar
-- um pix/boleto/cartão que nunca existiu.
alter type metodo_pagamento add value 'manual';
