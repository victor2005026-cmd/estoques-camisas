-- Pedidos de clientes específicos: cliente quer uma camisa que ainda não tem em
-- estoque. Anota pra lembrar, e quando comprar, marca como atendido — o app
-- soma direto no estoque (cria a camisa se não existir, ou soma a quantidade
-- se já existir uma com o mesmo modelo + tamanho).

create table if not exists pedidos_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  modelo text not null,
  tamanho text not null check (tamanho in ('P', 'M', 'G', 'GG')),
  observacoes text,
  atendido boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists pedidos_clientes_atendido_idx on pedidos_clientes (atendido);

alter table pedidos_clientes enable row level security;

create policy "pedidos_clientes_select_authenticated" on pedidos_clientes
  for select using (auth.role() = 'authenticated');
create policy "pedidos_clientes_insert_authenticated" on pedidos_clientes
  for insert with check (auth.role() = 'authenticated');
create policy "pedidos_clientes_update_authenticated" on pedidos_clientes
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "pedidos_clientes_delete_authenticated" on pedidos_clientes
  for delete using (auth.role() = 'authenticated');

alter publication supabase_realtime add table pedidos_clientes;
