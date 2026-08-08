-- Bloco de notas de camisas pra comprar (ou lembrar de comprar).
-- Quando compra, marca como comprado e anota quantas unidades foram compradas.

create table if not exists lista_compras (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  quantidade_desejada int,
  observacoes text,
  comprado boolean not null default false,
  quantidade_comprada int,
  created_at timestamptz not null default now()
);

create index if not exists lista_compras_comprado_idx on lista_compras (comprado);

alter table lista_compras enable row level security;

create policy "lista_compras_select_authenticated" on lista_compras
  for select using (auth.role() = 'authenticated');
create policy "lista_compras_insert_authenticated" on lista_compras
  for insert with check (auth.role() = 'authenticated');
create policy "lista_compras_update_authenticated" on lista_compras
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "lista_compras_delete_authenticated" on lista_compras
  for delete using (auth.role() = 'authenticated');

alter publication supabase_realtime add table lista_compras;
