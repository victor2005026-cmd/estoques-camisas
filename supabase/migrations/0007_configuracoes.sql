-- Configurações gerais do sistema — hoje só guarda o "Total investido em camisas",
-- que precisa poder ser editado direto pela tela (antes era um número fixo no código).

create table if not exists configuracoes (
  id int primary key default 1 check (id = 1), -- linha única (singleton)
  total_investido numeric(10, 2) not null default 0,
  updated_at timestamptz not null default now()
);

insert into configuracoes (id, total_investido)
values (1, 1820)
on conflict (id) do nothing;

alter table configuracoes enable row level security;

create policy "configuracoes_select_authenticated" on configuracoes
  for select using (auth.role() = 'authenticated');
create policy "configuracoes_update_authenticated" on configuracoes
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter publication supabase_realtime add table configuracoes;
