-- Estrutura sugerida para transformar o protótipo em sistema real com Supabase
-- Antes de usar em produção, revise permissões, autenticação e políticas de segurança.

create table if not exists public.cartas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  administradora text not null,
  credito numeric(14,2) not null,
  entrada numeric(14,2) not null,
  parcelas text not null,
  parcela_busca numeric(14,2),
  status text not null default 'Disponível',
  uso text,
  observacao_publica text,
  ocultar_publico boolean not null default false,
  nome_dono text,
  telefone_dono text,
  grupo text,
  cota text,
  valor_compra numeric(14,2),
  comissao numeric(14,2),
  responsavel text,
  observacao_interna text,
  documentos text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads_cartas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  email text,
  cidade text,
  carta_id uuid references public.cartas(id) on delete set null,
  mensagem text,
  origem text default 'site-xcapital',
  status text not null default 'Novo',
  responsavel text,
  created_at timestamptz not null default now()
);

create table if not exists public.avaliacoes_cotas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  tipo text,
  administradora text,
  credito text,
  situacao text,
  observacao text,
  status text not null default 'Novo',
  created_at timestamptz not null default now()
);

create index if not exists idx_cartas_status on public.cartas(status);
create index if not exists idx_cartas_tipo on public.cartas(tipo);
create index if not exists idx_cartas_credito on public.cartas(credito);
create index if not exists idx_cartas_entrada on public.cartas(entrada);

-- Exemplo de políticas recomendadas para produção:
-- 1. Público pode ler apenas cartas visíveis e não vendidas.
-- 2. Apenas usuários autenticados da X Capital podem inserir, editar e excluir.
-- 3. Leads podem ser inseridos pelo público, mas lidos apenas por usuários autenticados.

alter table public.cartas enable row level security;
alter table public.leads_cartas enable row level security;
alter table public.avaliacoes_cotas enable row level security;

create policy "public_read_visible_cards"
on public.cartas
for select
using (ocultar_publico = false and status <> 'Vendida');

create policy "public_insert_leads"
on public.leads_cartas
for insert
with check (true);

create policy "public_insert_avaliacoes"
on public.avaliacoes_cotas
for insert
with check (true);
