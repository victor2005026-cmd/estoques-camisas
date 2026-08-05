-- Remove o campo estoque_minimo: a partir de agora o status visual do estoque
-- (vermelho/amarelo/verde) é calculado direto pela quantidade em estoque
-- (0 = vermelho, 1 = amarelo, 2+ = verde), sem depender de um limite configurável.

alter table camisas drop column if exists estoque_minimo;
