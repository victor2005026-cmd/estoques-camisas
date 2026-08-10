-- Viagens (ex: idas pra SP comprar camisas) — cada uma com um valor total
-- gasto direto, que entra na conta do Total de gastos / Lucro líquido junto
-- com a tabela "gastos".

create table if not exists viagens (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  data date not null default current_date,
  valor_total numeric(10, 2) not null check (valor_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists viagens_data_idx on viagens (data);

alter table viagens enable row level security;

create policy "viagens_select_authenticated" on viagens
  for select using (auth.role() = 'authenticated');
create policy "viagens_insert_authenticated" on viagens
  for insert with check (auth.role() = 'authenticated');
create policy "viagens_update_authenticated" on viagens
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "viagens_delete_authenticated" on viagens
  for delete using (auth.role() = 'authenticated');

alter publication supabase_realtime add table viagens;
