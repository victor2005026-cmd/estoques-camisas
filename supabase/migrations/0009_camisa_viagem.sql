-- Liga cada camisa à viagem em que foi comprada (opcional), pra dar pra
-- calcular o financeiro (investido, vendido, lucro, margem, quantidade
-- vendida) separado por viagem.

alter table camisas add column if not exists viagem_id uuid references viagens(id) on delete set null;

create index if not exists camisas_viagem_id_idx on camisas (viagem_id);
