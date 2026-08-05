-- Seed inicial: as camisas já cadastradas antes de migrar pro sistema novo,
-- mais as 2 vendas que já tinham sido feitas (Real Madrid e Itália Azul).
--
-- Rode este script UMA VEZ no SQL Editor do Supabase, depois de já ter
-- rodado o supabase/migrations/0001_init.sql.
--
-- Tamanho: todas entraram como "G" provisoriamente (não tínhamos controle
-- por tamanho ainda) — ajuste item a item depois pela tela de Cadastro.
-- Preço de venda: R$120 provisório pra todas — ajuste depois também.

insert into camisas (modelo, tamanho, estoque, preco_venda, preco_custo, estoque_minimo) values
  ('BARCELONA ROXA', 'G', 1, 120, 70, 1),
  ('PORTUGAL', 'G', 2, 120, 50, 1),
  ('SAO PAULO PRETA', 'G', 1, 120, 100, 1),
  ('SANTOS CHARLIE', 'G', 2, 120, 100, 1),
  ('CORITHIANS BRANCA PENALTY', 'G', 1, 120, 100, 1),
  ('CORITHIANS BRANCA NOVA', 'G', 2, 120, 100, 1),
  ('CORITHIANS PRETA', 'G', 1, 120, 100, 1),
  ('CORITHIANS PRETA LARANJA', 'G', 1, 120, 50, 1),
  ('PALMEIRAS VERDE', 'G', 1, 120, 50, 1),
  ('ITÁLIA AZUL', 'G', 2, 120, 50, 1), -- 2: já vendeu 1 (venda histórica abaixo) => sobra 1
  ('NAPOLI', 'G', 1, 120, 50, 1),
  ('FLAMENGO BRANCA', 'G', 2, 120, 50, 1),
  ('ESPANHA', 'G', 1, 120, 50, 1),
  ('ARGENTINA', 'G', 1, 120, 50, 1),
  ('SÃO PAULO BRANCA', 'G', 1, 120, 50, 1),
  ('BAYERN', 'G', 1, 120, 50, 1),
  ('BARCELONA PRETA TRAVIS', 'G', 2, 120, 50, 1),
  ('REAL MADRID', 'G', 2, 120, 30, 1), -- 2: já vendeu 1 (venda histórica abaixo) => sobra 1
  ('BARCELONA DOURADA', 'G', 1, 120, 30, 1),
  ('SANTOS NOVA', 'G', 1, 120, 50, 1),
  ('MILAN', 'G', 1, 120, 30, 1),
  ('MANCHESTER CITY', 'G', 1, 120, 50, 1),
  ('BARCELONA ATUAL', 'G', 1, 120, 50, 1);

-- Vendas já realizadas antes da migração. O trigger de estoque abate 1 unidade
-- automaticamente de cada uma ao inserir — por isso Real Madrid e Itália Azul
-- entraram com estoque 2 acima (2 - 1 = 1, que é o estoque real hoje).
-- Data usada: hoje, já que a data exata dessas vendas não foi anotada —
-- ajuste depois na aba Relatórios se lembrar o dia certo.

insert into vendas (data, cliente, camisa_id, quantidade, valor_recebido, forma_pagamento, status_pagamento)
values (
  current_date,
  'Professor Gargamel',
  (select id from camisas where modelo = 'REAL MADRID' and tamanho = 'G'),
  1, 120, 'Pix', 'Pago'
);

insert into vendas (data, cliente, camisa_id, quantidade, valor_recebido, forma_pagamento, status_pagamento)
values (
  current_date,
  'Titio Alexandre',
  (select id from camisas where modelo = 'ITÁLIA AZUL' and tamanho = 'G'),
  1, 120, 'Pix', 'Pago'
);
