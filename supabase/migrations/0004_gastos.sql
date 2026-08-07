-- Gastos gerais do negócio que não são compra de camisa (gasolina, pedágio, etc).
-- Usado nos Relatórios pra calcular o lucro líquido de verdade (lucro bruto - esses gastos).

create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric(10, 2) not null check (valor >= 0),
  data date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists gastos_data_idx on gastos (data);

alter table gastos enable row level security;

create policy "gastos_select_authenticated" on gastos
  for select using (auth.role() = 'authenticated');
create policy "gastos_insert_authenticated" on gastos
  for insert with check (auth.role() = 'authenticated');
create policy "gastos_update_authenticated" on gastos
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "gastos_delete_authenticated" on gastos
  for delete using (auth.role() = 'authenticated');

alter publication supabase_realtime add table gastos;
