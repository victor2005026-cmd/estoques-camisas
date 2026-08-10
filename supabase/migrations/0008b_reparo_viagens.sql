-- Script de reparo: garante que a tabela viagens, as políticas e o realtime
-- estão todos configurados certinho, sem dar erro mesmo se parte já existir
-- (por causa de uma tentativa anterior que parou no meio).

create table if not exists viagens (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  data date not null default current_date,
  valor_total numeric(10, 2) not null check (valor_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists viagens_data_idx on viagens (data);

alter table viagens enable row level security;

drop policy if exists "viagens_select_authenticated" on viagens;
create policy "viagens_select_authenticated" on viagens
  for select using (auth.role() = 'authenticated');

drop policy if exists "viagens_insert_authenticated" on viagens;
create policy "viagens_insert_authenticated" on viagens
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "viagens_update_authenticated" on viagens;
create policy "viagens_update_authenticated" on viagens
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "viagens_delete_authenticated" on viagens;
create policy "viagens_delete_authenticated" on viagens
  for delete using (auth.role() = 'authenticated');

-- Só adiciona à publicação do realtime se ainda não estiver nela.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'viagens'
  ) then
    alter publication supabase_realtime add table viagens;
  end if;
end $$;

-- Força o Supabase a recarregar o cache do schema, pra reconhecer a tabela na hora.
notify pgrst, 'reload schema';
