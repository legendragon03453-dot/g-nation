-- gnation — 0002: o pedido passa a nascer no SERVIDOR
--
-- POR QUE ESTA MIGRATION EXISTE
--
-- A 0001 deixou o cliente inserir direto em `pedidos` e `itens_pedido`,
-- com uma policy que só checava `auth.uid() = user_id`. Isso significa
-- que o PREÇO nascia no navegador: qualquer pessoa logada abria o
-- console e gravava um pedido de R$ 0,01 — ou já com `status = 'pago'`,
-- porque o INSERT também não restringia o status. O comentário da 0001
-- dizia "mudar status é trabalho do backend"; ele esqueceu do insert.
--
-- Aqui isso é fechado de vez:
--
--   1. O CATÁLOGO VAI PRO BANCO (`produtos` + `variantes`). Sem uma
--      fonte de verdade no servidor não existe "validar o preço" — não
--      havia com o que comparar. De quebra, o cliente passa a editar
--      preço e estoque sem novo deploy, que é o que o painel-admin do
--      Figma pede.
--
--   2. O CLIENTE PERDE O INSERT. As policies de INSERT em `pedidos` e
--      `itens_pedido` são removidas. O único caminho é a função
--      `criar_pedido`, que roda como dona da tabela (security definer).
--
--   3. O FRONT MANDA SÓ INTENÇÃO: [{slug, material, tamanho, qtd}].
--      Nunca preço. O servidor lê o preço do catálogo, aplica cupom,
--      calcula frete, confere estoque e monta o total. Se o navegador
--      mentir, ele mente sobre o que quer comprar — não sobre quanto
--      custa.
--
--   4. ESTOQUE COM RESERVA. Joia é peça única; vender a mesma duas
--      vezes é problema real, não hipótese. A baixa acontece DENTRO da
--      mesma transação do pedido, com `for update` na variante, então
--      duas compras simultâneas da última peça não passam as duas.
--
-- O que NÃO mudou de propósito: o pedido continua guardando SNAPSHOT de
-- preço, título e endereço. Pedido é registro histórico.

-- ============================================================
-- QUEM É ADMIN
-- ============================================================
-- Flag no perfil em vez de tabela separada: é um bit por pessoa e o
-- perfil já existe pra todo usuário (trigger da 0001).
alter table public.perfis
  add column if not exists admin boolean not null default false;

-- Precisa ser SECURITY DEFINER: as policies de admin consultam esta
-- função de dentro de tabelas com RLS, e ela mesma lê `perfis`, que tem
-- RLS. Rodando como dona, ela ignora RLS e não entra em recursão.
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.admin from public.perfis p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to authenticated;

-- admin lê o perfil de todo mundo (tela "Clientes" do painel)
drop policy if exists "admin: ler perfis" on public.perfis;
create policy "admin: ler perfis" on public.perfis
  for select using (public.eh_admin());

-- ============================================================
-- CATÁLOGO
-- ============================================================
create table if not exists public.produtos (
  slug text primary key,
  titulo text not null,
  categoria text not null,
  -- preço BASE em centavos. Variante pode somar um delta (tamanho maior
  -- custa mais caro numa corrente, por exemplo).
  preco_centavos integer not null check (preco_centavos >= 0),
  img text not null,
  descricao text not null default '',
  ativo boolean not null default true,
  -- ordem de vitrine: o cliente arrasta no admin sem precisar renomear
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists produtos_categoria_idx
  on public.produtos(categoria) where ativo;

-- Uma linha por combinação comprável. É aqui que o estoque mora: o
-- estoque é da COMBINAÇÃO (Prata 925 / 18cm), não do produto — foi a
-- mesma decisão que a sacola já tomava ao tratar cada combinação como
-- uma linha própria.
create table if not exists public.variantes (
  id uuid primary key default gen_random_uuid(),
  produto_slug text not null references public.produtos(slug) on update cascade on delete cascade,
  material text,
  tamanho text,
  preco_delta_centavos integer not null default 0,
  estoque integer not null default 0 check (estoque >= 0),
  ativo boolean not null default true
);

-- `unique nulls not distinct` porque produto sem material/tamanho tem
-- NULL nessas colunas, e sem isso o índice deixaria duplicar a variante
-- única do produto quantas vezes quisessem.
create unique index if not exists variantes_combinacao_idx
  on public.variantes(produto_slug, material, tamanho) nulls not distinct;

create index if not exists variantes_produto_idx on public.variantes(produto_slug);

alter table public.produtos enable row level security;
alter table public.variantes enable row level security;

-- A vitrine é pública: dá pra navegar sem conta. Só o que está ativo.
drop policy if exists "catalogo: leitura publica" on public.produtos;
create policy "catalogo: leitura publica" on public.produtos
  for select using (ativo or public.eh_admin());

drop policy if exists "variante: leitura publica" on public.variantes;
create policy "variante: leitura publica" on public.variantes
  for select using (ativo or public.eh_admin());

-- Só admin mexe no catálogo.
drop policy if exists "catalogo: admin escreve" on public.produtos;
create policy "catalogo: admin escreve" on public.produtos
  for all using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "variante: admin escreve" on public.variantes;
create policy "variante: admin escreve" on public.variantes
  for all using (public.eh_admin()) with check (public.eh_admin());

-- ============================================================
-- CUPONS  (item "Cupons" da sidebar do painel-admin)
-- ============================================================
create table if not exists public.cupons (
  codigo text primary key,
  tipo text not null check (tipo in ('percentual', 'fixo')),
  -- percentual: 10 = 10%. fixo: valor em centavos.
  valor integer not null check (valor > 0),
  minimo_centavos integer not null default 0 check (minimo_centavos >= 0),
  inicia_em timestamptz,
  expira_em timestamptz,
  limite_usos integer check (limite_usos > 0),
  usos integer not null default 0 check (usos >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.cupons enable row level security;

-- Cupom NÃO é lido pelo cliente. Se a tabela fosse legível, bastava um
-- `select * from cupons` no console pra descobrir todo código de
-- desconto que existe. Quem valida é a `criar_pedido`, que roda como
-- dona e enxerga a tabela inteira.
drop policy if exists "cupom: admin" on public.cupons;
create policy "cupom: admin" on public.cupons
  for all using (public.eh_admin()) with check (public.eh_admin());

-- ============================================================
-- PEDIDOS — campos que faltavam
-- ============================================================
alter table public.pedidos
  add column if not exists desconto_centavos integer not null default 0
    check (desconto_centavos >= 0),
  add column if not exists cupom_codigo text references public.cupons(codigo),
  -- rastreamento: o brief do cliente pede "rastreamento de pedidos"
  add column if not exists rastreio_codigo text,
  add column if not exists rastreio_url text,
  -- pedido aguardando pagamento SEGURA estoque. Sem prazo, um carrinho
  -- abandonado tira a peça da vitrine pra sempre.
  add column if not exists expira_em timestamptz,
  add column if not exists pago_em timestamptz,
  add column if not exists cancelado_motivo text;

-- A aritmética do pedido vira lei do banco, não convenção do código.
alter table public.pedidos drop constraint if exists pedidos_total_fecha;
alter table public.pedidos add constraint pedidos_total_fecha
  check (total_centavos = subtotal_centavos - desconto_centavos + frete_centavos);

create index if not exists pedidos_status_idx on public.pedidos(status, criado_em desc);

alter table public.itens_pedido
  add column if not exists variante_id uuid references public.variantes(id);

-- --- O FECHAMENTO: cliente não escreve mais em pedido ---
drop policy if exists "pedido proprio: criar" on public.pedidos;
drop policy if exists "item: criar pelo pedido" on public.itens_pedido;

-- Cinto e suspensório: mesmo que alguém recrie uma policy por engano no
-- futuro, sem o privilégio de tabela o INSERT não acontece.
revoke insert, update, delete on public.pedidos from authenticated, anon;
revoke insert, update, delete on public.itens_pedido from authenticated, anon;

-- admin enxerga e opera todos os pedidos (telas Pedidos e Dashboard)
drop policy if exists "admin: ler pedidos" on public.pedidos;
create policy "admin: ler pedidos" on public.pedidos
  for select using (public.eh_admin());

drop policy if exists "admin: atualizar pedidos" on public.pedidos;
create policy "admin: atualizar pedidos" on public.pedidos
  for update using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "admin: ler itens" on public.itens_pedido;
create policy "admin: ler itens" on public.itens_pedido
  for select using (public.eh_admin());

-- O admin precisa de UPDATE em pedidos (mudar status), mas não de
-- INSERT/DELETE — pedido não se inventa nem se apaga, cancela-se.
grant update (status, rastreio_codigo, rastreio_url, pago_em, cancelado_motivo)
  on public.pedidos to authenticated;

-- ============================================================
-- FRETE
-- ============================================================
-- Isolado numa função porque hoje a resposta é "grátis" (é o que a
-- página de produto promete: FRETE GRÁTIS PARA TODO BRASIL) mas o brief
-- do cliente pede cálculo de frete real. Quando entrar Correios/
-- transportadora, muda-se só aqui — a `criar_pedido` não sabe a regra,
-- só pergunta.
create or replace function public.frete_centavos(p_uf text, p_subtotal_centavos integer)
returns integer
language sql
immutable
as $$
  select 0;
$$;

-- ============================================================
-- CRIAR PEDIDO — o coração
-- ============================================================
-- Recebe INTENÇÃO, devolve pedido. Tudo que envolve dinheiro é lido do
-- banco aqui dentro; nada de valor vem do cliente.
--
-- p_itens: [{"slug":"trevo-royal","material":"Prata 925","tamanho":"18cm","qtd":1}]
create or replace function public.criar_pedido(
  p_itens jsonb,
  p_entrega jsonb,
  p_contato jsonb,
  p_pagamento text,
  p_cupom text default null
)
returns public.pedidos
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_item jsonb;
  v_qtd integer;
  v_produto public.produtos%rowtype;
  v_variante public.variantes%rowtype;
  v_preco integer;
  v_subtotal integer := 0;
  v_desconto integer := 0;
  v_frete integer;
  v_cupom public.cupons%rowtype;
  v_pedido public.pedidos%rowtype;
  v_uf text;
  v_linhas jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'PRECISA_LOGIN' using hint = 'Entre na sua conta para fechar o pedido.';
  end if;

  if p_pagamento is null or p_pagamento not in ('pix', 'cartao', 'boleto') then
    raise exception 'PAGAMENTO_INVALIDO';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'SACOLA_VAZIA';
  end if;

  -- teto de sanidade: sacola de 100 linhas é robô, não cliente
  if jsonb_array_length(p_itens) > 50 then
    raise exception 'SACOLA_GRANDE_DEMAIS';
  end if;

  -- Endereço: o servidor não confia que o front validou. Se a pessoa
  -- burlar o formulário, o pedido não pode nascer sem pra onde ir.
  v_uf := upper(trim(coalesce(p_entrega->>'uf', '')));
  if coalesce(trim(p_entrega->>'cep'), '') = ''
     or coalesce(trim(p_entrega->>'rua'), '') = ''
     or coalesce(trim(p_entrega->>'numero'), '') = ''
     or coalesce(trim(p_entrega->>'bairro'), '') = ''
     or coalesce(trim(p_entrega->>'cidade'), '') = ''
     or length(v_uf) <> 2 then
    raise exception 'ENDERECO_INCOMPLETO';
  end if;

  if coalesce(trim(p_contato->>'nome'), '') = ''
     or length(regexp_replace(coalesce(p_contato->>'telefone', ''), '\D', '', 'g')) < 10
     or length(regexp_replace(coalesce(p_contato->>'cpf', ''), '\D', '', 'g')) <> 11 then
    raise exception 'CONTATO_INCOMPLETO';
  end if;

  -- O e-mail vem do auth, NÃO do payload: é o endereço que a pessoa
  -- comprovadamente controla. Aceitar o do cliente deixaria mandar
  -- confirmação de pedido pra terceiros.
  select u.email into v_email from auth.users u where u.id = v_uid;

  -- ---------- itens ----------
  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_qtd := coalesce((v_item->>'qtd')::integer, 0);
    if v_qtd < 1 or v_qtd > 20 then
      raise exception 'QUANTIDADE_INVALIDA';
    end if;

    select * into v_produto
      from public.produtos
     where slug = v_item->>'slug' and ativo;

    if not found then
      raise exception 'PRODUTO_INDISPONIVEL:%', coalesce(v_item->>'slug', '?');
    end if;

    -- `for update` segura a linha até o commit. É o que impede duas
    -- compras simultâneas da última peça de passarem as duas: a segunda
    -- espera aqui e só então lê o estoque já decrementado.
    select * into v_variante
      from public.variantes
     where produto_slug = v_produto.slug
       and material is not distinct from nullif(v_item->>'material', '')
       and tamanho is not distinct from nullif(v_item->>'tamanho', '')
       and ativo
     for update;

    if not found then
      raise exception 'COMBINACAO_INDISPONIVEL:%', v_produto.titulo;
    end if;

    if v_variante.estoque < v_qtd then
      raise exception 'SEM_ESTOQUE:%', v_produto.titulo;
    end if;

    v_preco := v_produto.preco_centavos + v_variante.preco_delta_centavos;
    v_subtotal := v_subtotal + v_preco * v_qtd;

    update public.variantes
       set estoque = estoque - v_qtd
     where id = v_variante.id;

    v_linhas := v_linhas || jsonb_build_object(
      'variante_id', v_variante.id,
      'produto_slug', v_produto.slug,
      'titulo', v_produto.titulo,
      'material', v_variante.material,
      'tamanho', v_variante.tamanho,
      'img', v_produto.img,
      'preco_unit_centavos', v_preco,
      'quantidade', v_qtd
    );
  end loop;

  -- ---------- cupom ----------
  if p_cupom is not null and trim(p_cupom) <> '' then
    select * into v_cupom
      from public.cupons
     where codigo = upper(trim(p_cupom))
     for update;

    if not found or not v_cupom.ativo then
      raise exception 'CUPOM_INVALIDO';
    end if;
    if v_cupom.inicia_em is not null and now() < v_cupom.inicia_em then
      raise exception 'CUPOM_INVALIDO';
    end if;
    if v_cupom.expira_em is not null and now() > v_cupom.expira_em then
      raise exception 'CUPOM_EXPIRADO';
    end if;
    if v_cupom.limite_usos is not null and v_cupom.usos >= v_cupom.limite_usos then
      raise exception 'CUPOM_ESGOTADO';
    end if;
    if v_subtotal < v_cupom.minimo_centavos then
      raise exception 'CUPOM_MINIMO:%', v_cupom.minimo_centavos;
    end if;

    v_desconto := case
      when v_cupom.tipo = 'percentual' then (v_subtotal * v_cupom.valor) / 100
      else v_cupom.valor
    end;
    -- desconto nunca passa do subtotal: total negativo viraria crédito
    v_desconto := least(v_desconto, v_subtotal);

    update public.cupons set usos = usos + 1 where codigo = v_cupom.codigo;
  end if;

  v_frete := public.frete_centavos(v_uf, v_subtotal);

  -- ---------- o pedido ----------
  insert into public.pedidos (
    user_id, status, subtotal_centavos, desconto_centavos, frete_centavos,
    total_centavos, pagamento_metodo, cupom_codigo, entrega, contato, expira_em
  ) values (
    v_uid,
    -- status é FIXO aqui. Era exatamente isto que o cliente conseguia
    -- escolher antes.
    'aguardando_pagamento',
    v_subtotal,
    v_desconto,
    v_frete,
    v_subtotal - v_desconto + v_frete,
    p_pagamento,
    v_cupom.codigo,
    jsonb_build_object(
      'cep', regexp_replace(p_entrega->>'cep', '\D', '', 'g'),
      'rua', trim(p_entrega->>'rua'),
      'numero', trim(p_entrega->>'numero'),
      'complemento', nullif(trim(coalesce(p_entrega->>'complemento', '')), ''),
      'bairro', trim(p_entrega->>'bairro'),
      'cidade', trim(p_entrega->>'cidade'),
      'uf', v_uf
    ),
    jsonb_build_object(
      'nome', trim(p_contato->>'nome'),
      'email', v_email,
      'telefone', regexp_replace(p_contato->>'telefone', '\D', '', 'g'),
      'cpf', regexp_replace(p_contato->>'cpf', '\D', '', 'g')
    ),
    now() + interval '24 hours'
  )
  returning * into v_pedido;

  insert into public.itens_pedido (
    pedido_id, variante_id, produto_slug, titulo, material, tamanho, img,
    preco_unit_centavos, quantidade
  )
  select
    v_pedido.id,
    (l->>'variante_id')::uuid,
    l->>'produto_slug',
    l->>'titulo',
    l->>'material',
    l->>'tamanho',
    l->>'img',
    (l->>'preco_unit_centavos')::integer,
    (l->>'quantidade')::integer
  from jsonb_array_elements(v_linhas) l;

  return v_pedido;
end;
$$;

revoke all on function public.criar_pedido(jsonb, jsonb, jsonb, text, text) from public, anon;
grant execute on function public.criar_pedido(jsonb, jsonb, jsonb, text, text) to authenticated;

-- ============================================================
-- CANCELAR — devolve o estoque
-- ============================================================
-- Cancelar sem repor estoque some com a peça do catálogo pra sempre.
-- Dono cancela o que ainda não foi pago; admin cancela o que não saiu.
create or replace function public.cancelar_pedido(p_pedido_id uuid, p_motivo text default null)
returns public.pedidos
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_admin boolean := public.eh_admin();
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'PEDIDO_NAO_ENCONTRADO';
  end if;

  if v_pedido.user_id <> auth.uid() and not v_admin then
    raise exception 'PEDIDO_NAO_ENCONTRADO';  -- não revela que existe
  end if;

  if v_pedido.status = 'cancelado' then
    return v_pedido;  -- idempotente: cancelar duas vezes não repõe duas
  end if;

  if not v_admin and v_pedido.status <> 'aguardando_pagamento' then
    raise exception 'PEDIDO_EM_ANDAMENTO';
  end if;

  if v_pedido.status in ('enviado', 'entregue') then
    raise exception 'PEDIDO_JA_SAIU';
  end if;

  update public.variantes v
     set estoque = v.estoque + i.quantidade
    from public.itens_pedido i
   where i.pedido_id = v_pedido.id
     and i.variante_id = v.id;

  if v_pedido.cupom_codigo is not null then
    update public.cupons set usos = greatest(usos - 1, 0)
     where codigo = v_pedido.cupom_codigo;
  end if;

  update public.pedidos
     set status = 'cancelado',
         cancelado_motivo = coalesce(p_motivo, case when v_admin then 'cancelado pela loja' else 'cancelado pelo cliente' end)
   where id = v_pedido.id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

revoke all on function public.cancelar_pedido(uuid, text) from public, anon;
grant execute on function public.cancelar_pedido(uuid, text) to authenticated;

-- ============================================================
-- EXPIRAR — solta o estoque preso em carrinho abandonado
-- ============================================================
-- Pra rodar de hora em hora (pg_cron ou um cron da Vercel batendo numa
-- Edge Function). Sem isso, pedido nunca pago segura peça pra sempre.
create or replace function public.expirar_pedidos()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_n integer := 0;
begin
  for v_id in
    select id from public.pedidos
     where status = 'aguardando_pagamento'
       and expira_em is not null
       and expira_em < now()
  loop
    update public.variantes v
       set estoque = v.estoque + i.quantidade
      from public.itens_pedido i
     where i.pedido_id = v_id and i.variante_id = v.id;

    update public.pedidos
       set status = 'cancelado', cancelado_motivo = 'expirou sem pagamento'
     where id = v_id;

    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

revoke all on function public.expirar_pedidos() from public, anon, authenticated;

-- ============================================================
-- MÉTRICAS DO DASHBOARD  (os 4 cards do painel-admin)
-- ============================================================
-- Uma função só porque a tela pede os quatro números de uma vez, cada um
-- com a comparação contra o mês passado — quatro consultas separadas do
-- front seriam quatro viagens pra montar um cabeçalho.
create or replace function public.admin_metricas()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_r jsonb;
begin
  if not public.eh_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  -- "vendas" conta só o que foi pago: pedido aguardando pagamento não é
  -- faturamento, é esperança.
  select jsonb_build_object(
    'vendas_hoje_centavos', coalesce((
      select sum(total_centavos) from public.pedidos
       where status <> 'cancelado' and criado_em >= date_trunc('day', now())
    ), 0),
    'pedidos_novos', (
      select count(*) from public.pedidos
       where status = 'aguardando_pagamento'
    ),
    'clientes_ativos', (
      select count(distinct user_id) from public.pedidos
       where criado_em >= now() - interval '90 days'
    ),
    'receita_total_centavos', coalesce((
      select sum(total_centavos) from public.pedidos
       where status in ('pago', 'em_producao', 'enviado', 'entregue')
    ), 0),
    'receita_mes_centavos', coalesce((
      select sum(total_centavos) from public.pedidos
       where status in ('pago', 'em_producao', 'enviado', 'entregue')
         and criado_em >= date_trunc('month', now())
    ), 0),
    'receita_mes_passado_centavos', coalesce((
      select sum(total_centavos) from public.pedidos
       where status in ('pago', 'em_producao', 'enviado', 'entregue')
         and criado_em >= date_trunc('month', now()) - interval '1 month'
         and criado_em < date_trunc('month', now())
    ), 0),
    'pedidos_mes', (
      select count(*) from public.pedidos
       where criado_em >= date_trunc('month', now())
    ),
    'pedidos_mes_passado', (
      select count(*) from public.pedidos
       where criado_em >= date_trunc('month', now()) - interval '1 month'
         and criado_em < date_trunc('month', now())
    ),
    'clientes_mes_passado', (
      select count(distinct user_id) from public.pedidos
       where criado_em >= date_trunc('month', now()) - interval '1 month'
         and criado_em < date_trunc('month', now())
    ),
    'estoque_baixo', (
      select count(*) from public.variantes where ativo and estoque <= 2
    )
  ) into v_r;

  return v_r;
end;
$$;

revoke all on function public.admin_metricas() from public, anon;
grant execute on function public.admin_metricas() to authenticated;

-- ============================================================
-- carimbo
-- ============================================================
drop trigger if exists produtos_touch on public.produtos;
create trigger produtos_touch before update on public.produtos
  for each row execute function public.tocar_atualizado_em();

-- ============================================================
-- SEED — o catálogo que hoje vive em src/data/products.js
-- ============================================================
-- Mesmos slugs, preços e imagens do arquivo, pra migração não mudar
-- nada do que já está no ar. A partir daqui o arquivo vira só fallback.
insert into public.produtos (slug, titulo, categoria, preco_centavos, img, descricao, ordem) values
  ('trevo-royal', 'Trevo Royal', 'Pulseiras', 31900, 'figma-lancamentos-foto.png',
   'Pulseira em prata com banho reforçado e cravação densa em trevos, fecho duplo de segurança. Peso real, presença de vitrine.', 1),
  ('cubana-cravejada', 'Cubana Cravejada', 'Cordões', 28900, 'figma-lancamentos-foto.png',
   'Corrente cubana clássica com cravação total em zircônia, acabamento polido à mão e fecho reforçado com trava dupla.', 2),
  ('tennis-ice', 'Tennis Ice', 'Cordões', 25900, 'figma-lancamentos-foto.png',
   'Tennis chain de cravação corrida, brilho parelho do início ao fim, fecho de segurança discreto. Um clássico atemporal.', 3),
  ('anel-cruz-ice', 'Anel Cruz Ice', 'Anéis', 32900, 'figma-lancamentos-foto.png',
   'Anel de brasão com cruz cravejada, volume generoso e acabamento gelado. Peça de assinatura pra quem não passa despercebido.', 4),
  ('anel-cruz-royal', 'Anel Cruz Royal', 'Anéis', 34900, 'anel-cruz-royal.png',
   'Versão royal do anel de brasão, cravação baguete e detalhes em banho reforçado. Feito pra durar e pra ser visto.', 5),
  ('trevo-rose', 'Trevo Rosé', 'Pulseiras', 33900, 'bracelet-foto-9.png',
   'Pulseira trevo em banho rosé com cravação em zircônia rosa, fecho gaveta cravejado com trava dupla. A versão mais delicada da linha, sem perder presença.', 6),
  ('trevo-gold', 'Trevo Gold', 'Pulseiras', 34900, 'bracelet-foto-10.png',
   'Pulseira trevo em banho ouro 18k com cravação em zircônia verde esmeralda, fecho gaveta cravejado com trava dupla. Peso real e brilho de vitrine.', 7),
  ('elo-grumet', 'Elo Grumet', 'Cordões', 24900, 'elo-grumet.png',
   'Corrente elo grumet trançado, acabamento espelhado e fecho reforçado. Discreta no dia a dia, presente na vitrine.', 8)
on conflict (slug) do update set
  titulo = excluded.titulo,
  categoria = excluded.categoria,
  preco_centavos = excluded.preco_centavos,
  img = excluded.img,
  descricao = excluded.descricao,
  ordem = excluded.ordem;

-- Variantes = material × tamanho, exatamente as combinações que a página
-- de produto já oferece. Estoque inicial 5: número de partida pro
-- cliente ajustar no admin, não uma invenção sobre o inventário real.
insert into public.variantes (produto_slug, material, tamanho, estoque)
select p.slug, m.material, t.tamanho, 5
from (values
  ('trevo-royal',      array['Prata 925','Banho Ouro 18k'], array['16cm','18cm','20cm']),
  ('cubana-cravejada', array['Prata 925','Banho Ouro 18k'], array['50cm','55cm','60cm']),
  ('tennis-ice',       array['Prata 925','Banho Ródio'],    array['45cm','50cm','55cm']),
  ('anel-cruz-ice',    array['Prata 925','Banho Ródio'],    array['18','20','22','24']),
  ('anel-cruz-royal',  array['Prata 925','Banho Ouro 18k'], array['18','20','22','24']),
  ('trevo-rose',       array['Prata 925','Banho Rosé'],     array['16cm','18cm','20cm']),
  ('trevo-gold',       array['Prata 925','Banho Ouro 18k'], array['16cm','18cm','20cm']),
  ('elo-grumet',       array['Prata 925','Banho Ouro 18k'], array['50cm','55cm','60cm','70cm'])
) as p(slug, materiais, tamanhos)
cross join lateral unnest(p.materiais) as m(material)
cross join lateral unnest(p.tamanhos)  as t(tamanho)
on conflict do nothing;

-- O pedido de teste da 0001 não tem variante ligada; deixá-lo
-- "aguardando pagamento" pra sempre segura nada (não baixou estoque),
-- mas suja o dashboard. Fica registrado como cancelado de teste.
update public.pedidos
   set status = 'cancelado', cancelado_motivo = 'pedido de teste da migration 0001'
 where numero = 1 and status = 'aguardando_pagamento';

-- Números de pedido começando em 1 denunciam loja recém-aberta pro
-- próprio cliente. O painel-admin do Figma mostra #10284 — a sequência
-- passa a nascer nessa faixa.
alter table public.pedidos alter column numero restart with 10285;
