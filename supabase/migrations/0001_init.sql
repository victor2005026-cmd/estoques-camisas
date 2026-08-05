-- Sistema de Vendas de Camisas — schema inicial
-- Rode este arquivo inteiro no SQL Editor do Supabase (Dashboard > SQL Editor > New query).

create extension if not exists "pgcrypto";

-- ============================================================
-- Tabelas
-- ============================================================

create table if not exists camisas (
  id uuid primary key default gen_random_uuid(),
  modelo text not null,
  tamanho text not null check (tamanho in ('P', 'M', 'G', 'GG')),
  estoque int not null default 0 check (estoque >= 0),
  preco_venda numeric(10, 2) not null default 0 check (preco_venda >= 0),
  preco_custo numeric(10, 2) not null default 0 check (preco_custo >= 0),
  estoque_minimo int not null default 0 check (estoque_minimo >= 0),
  foto_url text,
  created_at timestamptz not null default now(),
  unique (modelo, tamanho)
);

create table if not exists vendas (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  cliente text not null,
  camisa_id uuid not null references camisas(id) on delete restrict,
  quantidade int not null check (quantidade > 0),
  valor_recebido numeric(10, 2) not null default 0 check (valor_recebido >= 0),
  forma_pagamento text not null check (forma_pagamento in ('Pix', 'Dinheiro', 'Cartão')),
  status_pagamento text not null default 'Pago' check (status_pagamento in ('Pago', 'Pendente', 'Parcelado')),
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists vendas_camisa_id_idx on vendas (camisa_id);
create index if not exists vendas_data_idx on vendas (data);

-- ============================================================
-- Row Level Security — só usuários autenticados (você e seu amigo)
-- ============================================================

alter table camisas enable row level security;
alter table vendas enable row level security;

create policy "camisas_select_authenticated" on camisas
  for select using (auth.role() = 'authenticated');
create policy "camisas_insert_authenticated" on camisas
  for insert with check (auth.role() = 'authenticated');
create policy "camisas_update_authenticated" on camisas
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "camisas_delete_authenticated" on camisas
  for delete using (auth.role() = 'authenticated');

create policy "vendas_select_authenticated" on vendas
  for select using (auth.role() = 'authenticated');
create policy "vendas_insert_authenticated" on vendas
  for insert with check (auth.role() = 'authenticated');
create policy "vendas_update_authenticated" on vendas
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "vendas_delete_authenticated" on vendas
  for delete using (auth.role() = 'authenticated');

-- ============================================================
-- Trigger: abater estoque automaticamente ao registrar uma venda
-- (e impedir a venda se não houver estoque suficiente)
-- ============================================================

create or replace function abater_estoque_venda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  estoque_atual int;
begin
  select estoque into estoque_atual
  from camisas
  where id = new.camisa_id
  for update;

  if estoque_atual is null then
    raise exception 'Camisa não encontrada.';
  end if;

  if estoque_atual < new.quantidade then
    raise exception 'Estoque insuficiente. Disponível: % unidade(s).', estoque_atual;
  end if;

  update camisas set estoque = estoque - new.quantidade where id = new.camisa_id;

  return new;
end;
$$;

drop trigger if exists trg_abater_estoque_venda on vendas;
create trigger trg_abater_estoque_venda
  before insert on vendas
  for each row execute function abater_estoque_venda();

-- ============================================================
-- Trigger: devolver ao estoque quando uma venda é excluída
-- (usado para corrigir lançamentos errados / cancelar pendências não pagas)
-- ============================================================

create or replace function devolver_estoque_venda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update camisas set estoque = estoque + old.quantidade where id = old.camisa_id;
  return old;
end;
$$;

drop trigger if exists trg_devolver_estoque_venda on vendas;
create trigger trg_devolver_estoque_venda
  after delete on vendas
  for each row execute function devolver_estoque_venda();

-- ============================================================
-- Realtime — a tela atualiza sozinha quando o outro usuário mexe nos dados
-- ============================================================

alter publication supabase_realtime add table camisas;
alter publication supabase_realtime add table vendas;

-- ============================================================
-- Storage — bucket público para as fotos das camisas
-- ============================================================

insert into storage.buckets (id, name, public)
values ('fotos-camisas', 'fotos-camisas', true)
on conflict (id) do nothing;

create policy "fotos_camisas_select_public" on storage.objects
  for select using (bucket_id = 'fotos-camisas');
create policy "fotos_camisas_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'fotos-camisas' and auth.role() = 'authenticated');
create policy "fotos_camisas_update_authenticated" on storage.objects
  for update using (bucket_id = 'fotos-camisas' and auth.role() = 'authenticated');
create policy "fotos_camisas_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'fotos-camisas' and auth.role() = 'authenticated');
