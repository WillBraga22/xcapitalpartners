-- X Capital Partners: melhorias v6
-- Rode este arquivo no SQL Editor do Supabase antes de publicar a versão v6.
-- Ele é idempotente: pode rodar mais de uma vez.

create table if not exists public.cartas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  administradora text not null,
  credito numeric not null,
  entrada numeric not null,
  parcelas text not null,
  parcela_busca numeric,
  status text not null default 'Disponível',
  uso text,
  observacao_publica text,
  ocultar_publico boolean not null default false,
  nome_dono text,
  telefone_dono text,
  grupo text,
  cota text,
  valor_compra numeric,
  comissao numeric,
  responsavel text,
  documentos text,
  observacao_interna text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  email text,
  cidade text,
  mensagem text,
  carta_id uuid references public.cartas(id) on delete set null,
  carta_resumo text,
  origem text default 'site',
  status text not null default 'Novo',
  responsavel text,
  criado_em timestamptz not null default now()
);

create table if not exists public.cotas_venda (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  email text,
  tipo text,
  administradora text,
  credito text,
  situacao text,
  observacao text,
  origem text default 'site',
  status text not null default 'Novo',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.cartas enable row level security;
alter table public.leads enable row level security;
alter table public.cotas_venda enable row level security;

drop policy if exists "Permitir leitura publica de cartas visiveis" on public.cartas;
drop policy if exists "Permitir painel MVP gerenciar cartas" on public.cartas;
drop policy if exists "Permitir cadastro publico de leads" on public.leads;
drop policy if exists "Permitir painel MVP ler leads" on public.leads;
drop policy if exists "Permitir painel MVP atualizar leads" on public.leads;
drop policy if exists "Permitir cadastro publico de cotas para venda" on public.cotas_venda;
drop policy if exists "Permitir painel MVP ler cotas para venda" on public.cotas_venda;
drop policy if exists "Permitir painel MVP atualizar cotas para venda" on public.cotas_venda;

create policy "Permitir leitura publica de cartas visiveis"
on public.cartas for select to anon
using (ocultar_publico = false);

create policy "Permitir painel MVP gerenciar cartas"
on public.cartas for all to anon
using (true)
with check (true);

create policy "Permitir cadastro publico de leads"
on public.leads for insert to anon
with check (true);

create policy "Permitir painel MVP ler leads"
on public.leads for select to anon
using (true);

create policy "Permitir painel MVP atualizar leads"
on public.leads for update to anon
using (true)
with check (true);

create policy "Permitir cadastro publico de cotas para venda"
on public.cotas_venda for insert to anon
with check (true);

create policy "Permitir painel MVP ler cotas para venda"
on public.cotas_venda for select to anon
using (true);

create policy "Permitir painel MVP atualizar cotas para venda"
on public.cotas_venda for update to anon
using (true)
with check (true);

-- Garante que cartas vendidas e arquivadas fiquem fora da vitrine pública
update public.cartas set ocultar_publico = true where status in ('Vendida', 'Arquivada');
