-- Execute este arquivo no SQL Editor do Supabase para o MVP da X Capital.
-- Ele cria as tabelas e libera as permissões necessárias para a vitrine e o painel funcionarem.
-- Observação: esta é uma versão MVP. Depois, o ideal é trocar o painel por login real com Supabase Auth.

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

alter table public.cartas enable row level security;
alter table public.leads enable row level security;

drop policy if exists "Permitir leitura publica de cartas visiveis" on public.cartas;
drop policy if exists "Permitir cadastro publico de leads" on public.leads;
drop policy if exists "Permitir painel MVP gerenciar cartas" on public.cartas;
drop policy if exists "Permitir painel MVP ler leads" on public.leads;

create policy "Permitir leitura publica de cartas visiveis"
on public.cartas
for select
to anon
using (ocultar_publico = false);

create policy "Permitir cadastro publico de leads"
on public.leads
for insert
to anon
with check (true);

-- Para o MVP, permite cadastrar, editar e excluir cartas pelo painel admin.html.
-- Como o painel usa uma senha no front-end, isso ainda não é segurança forte.
-- A próxima evolução correta é Supabase Auth com usuário e senha.
create policy "Permitir painel MVP gerenciar cartas"
on public.cartas
for all
to anon
using (true)
with check (true);

create policy "Permitir painel MVP ler leads"
on public.leads
for select
to anon
using (true);

insert into public.cartas
(tipo, administradora, credito, entrada, parcelas, parcela_busca, status, uso, observacao_publica)
select 'Imóvel', 'EMBRACON', 236553.87, 95990.00, '109x de R$ 2.316,60', 2316.60, 'Disponível', 'Imóvel', ''
where not exists (select 1 from public.cartas where administradora = 'EMBRACON' and credito = 236553.87);

insert into public.cartas
(tipo, administradora, credito, entrada, parcelas, parcela_busca, status, uso, observacao_publica)
select 'Imóvel', 'ZEMA', 534087.00, 186900.00, '126x de R$ 6.057,00', 6057.00, 'Disponível', 'Imóvel', ''
where not exists (select 1 from public.cartas where administradora = 'ZEMA' and credito = 534087.00);

insert into public.cartas
(tipo, administradora, credito, entrada, parcelas, parcela_busca, status, uso, observacao_publica)
select 'Imóvel', 'MAGGI', 1384086.00, 499990.00, '88x de R$ 13.481,95 + 73x de R$ 5.121,87 + 44x de R$ 2.089,43', 13481.95, 'Disponível', 'Imóvel, rural ou capital de giro', ''
where not exists (select 1 from public.cartas where administradora = 'MAGGI' and credito = 1384086.00);

insert into public.cartas
(tipo, administradora, credito, entrada, parcelas, parcela_busca, status, uso, observacao_publica)
select 'Imóvel', 'MULTIMARCAS', 303000.00, 126990.00, '150x de R$ 3.097,00 + 26x de R$ 2.354,00', 3097.00, 'Disponível', 'Imóvel', ''
where not exists (select 1 from public.cartas where administradora = 'MULTIMARCAS' and credito = 303000.00);