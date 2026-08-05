-- Corrige o cálculo de "falta receber" em pendências/parcelados: até aqui ele
-- usava o preço ATUAL da camisa no cadastro, que muda com o tempo e quebra o
-- cálculo de vendas antigas. Agora cada venda guarda o valor total combinado
-- na hora da venda (valor_total), fixo, independente do preço de tabela mudar depois.
--
-- Também adiciona data_prevista_pagamento, pra registrar quando o cliente
-- combinou de pagar o restante.

alter table vendas add column if not exists valor_total numeric(10, 2);
alter table vendas add column if not exists data_prevista_pagamento date;

-- Preenche valor_total pras vendas já existentes que ainda não têm:
-- vendas já pagas assumem valor_total = valor_recebido (já quitado, sem pendência);
-- as demais assumem o preço de tabela atual da camisa × quantidade (melhor estimativa possível).
update vendas
set valor_total = valor_recebido
where valor_total is null and status_pagamento = 'Pago';

update vendas
set valor_total = (
  select coalesce(c.preco_venda, 0) * vendas.quantidade
  from camisas c
  where c.id = vendas.camisa_id
)
where valor_total is null;

alter table vendas alter column valor_total set not null;
alter table vendas alter column valor_total set default 0;
