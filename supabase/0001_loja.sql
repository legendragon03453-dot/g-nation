-- gnation — schema da loja
--
-- Escrito pra ser PORTÁTIL: Postgres puro, sem extensão exclusiva do
-- Supabase além do `auth.users` (a única amarra, e só na chave
-- estrangeira). O ambiente de hoje é de teste; quando migrar, troca-se a
-- referência de `auth.users` pela tabela de usuários do novo lugar e o
-- resto vem junto sem reescrever.
--
-- Decisão de modelagem que importa: o pedido guarda SNAPSHOT do preço,
-- do título e do endereço. Se a peça mudar de preço amanhã, ou o cliente
-- editar o endereço, o pedido antigo continua contando a verdade do
-- momento em que foi feito. Pedido é registro histórico, não uma
-- consulta ao catálogo de agora.

-- ============================================================
-- PERFIS — dados do cliente que o auth não guarda
-- ============================================================
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  telefone text,
  cpf text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

drop policy if exists "perfil proprio: ler" on public.perfis;
create policy "perfil proprio: ler" on public.perfis
  for select using (auth.uid() = id);

drop policy if exists "perfil proprio: criar" on public.perfis;
create policy "perfil proprio: criar" on public.perfis
  for insert with check (auth.uid() = id);

drop policy if exists "perfil proprio: editar" on public.perfis;
create policy "perfil proprio: editar" on public.perfis
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Cria o perfil junto com o usuário. Sem isso, toda tela precisaria
-- tratar "e se o perfil não existir ainda".
create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, new.raw_user_meta_data->>'nome')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- ============================================================
-- ENDEREÇOS — salvos pra segunda compra não exigir redigitar
-- ============================================================
create table if not exists public.enderecos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  apelido text,
  cep text not null,
  rua text not null,
  numero text not null,
  complemento text,
  bairro text not null,
  cidade text not null,
  uf text not null,
  padrao boolean not null default false,
  criado_em timestamptz not null default now()
);

create index if not exists enderecos_user_idx on public.enderecos(user_id);

alter table public.enderecos enable row level security;

drop policy if exists "endereco proprio: tudo" on public.enderecos;
create policy "endereco proprio: tudo" on public.enderecos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Só um endereço padrão por cliente: ao marcar um, desmarca os outros.
create or replace function public.um_endereco_padrao()
returns trigger
language plpgsql
as $$
begin
  if new.padrao then
    update public.enderecos
       set padrao = false
     where user_id = new.user_id
       and id <> new.id
       and padrao;
  end if;
  return new;
end;
$$;

drop trigger if exists ao_salvar_endereco on public.enderecos;
create trigger ao_salvar_endereco
  after insert or update of padrao on public.enderecos
  for each row execute function public.um_endereco_padrao();

-- ============================================================
-- PEDIDOS
-- ============================================================
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,

  -- número curto e legível pra atendimento ("pedido 1042"), separado do
  -- uuid que vai na URL
  numero bigint generated always as identity,

  status text not null default 'aguardando_pagamento'
    check (status in (
      'aguardando_pagamento', 'pago', 'em_producao',
      'enviado', 'entregue', 'cancelado'
    )),

  -- dinheiro em CENTAVOS: float com dinheiro dá 0.1+0.2=0.30000000000000004
  subtotal_centavos integer not null check (subtotal_centavos >= 0),
  frete_centavos integer not null default 0 check (frete_centavos >= 0),
  total_centavos integer not null check (total_centavos >= 0),

  pagamento_metodo text check (pagamento_metodo in ('pix', 'cartao', 'boleto')),

  -- snapshot: o endereço como estava no dia da compra
  entrega jsonb not null,
  contato jsonb not null,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists pedidos_user_idx on public.pedidos(user_id, criado_em desc);

alter table public.pedidos enable row level security;

drop policy if exists "pedido proprio: ler" on public.pedidos;
create policy "pedido proprio: ler" on public.pedidos
  for select using (auth.uid() = user_id);

drop policy if exists "pedido proprio: criar" on public.pedidos;
create policy "pedido proprio: criar" on public.pedidos
  for insert with check (auth.uid() = user_id);

-- De propósito NÃO existe policy de UPDATE nem DELETE pro cliente:
-- mudar status é trabalho do backend/admin (service_role, que ignora
-- RLS). Sem isso, qualquer um marcaria o próprio pedido como "pago".

-- ============================================================
-- ITENS DO PEDIDO — com snapshot de título e preço
-- ============================================================
create table if not exists public.itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,

  produto_slug text not null,
  titulo text not null,
  material text,
  tamanho text,
  img text,

  preco_unit_centavos integer not null check (preco_unit_centavos >= 0),
  quantidade integer not null check (quantidade > 0)
);

create index if not exists itens_pedido_idx on public.itens_pedido(pedido_id);

alter table public.itens_pedido enable row level security;

-- O item herda a permissão do pedido dono dele.
drop policy if exists "item: ler pelo pedido" on public.itens_pedido;
create policy "item: ler pelo pedido" on public.itens_pedido
  for select using (
    exists (
      select 1 from public.pedidos p
       where p.id = itens_pedido.pedido_id
         and p.user_id = auth.uid()
    )
  );

drop policy if exists "item: criar pelo pedido" on public.itens_pedido;
create policy "item: criar pelo pedido" on public.itens_pedido
  for insert with check (
    exists (
      select 1 from public.pedidos p
       where p.id = itens_pedido.pedido_id
         and p.user_id = auth.uid()
    )
  );

-- ============================================================
-- carimbo de atualização
-- ============================================================
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists perfis_touch on public.perfis;
create trigger perfis_touch before update on public.perfis
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists pedidos_touch on public.pedidos;
create trigger pedidos_touch before update on public.pedidos
  for each row execute function public.tocar_atualizado_em();
