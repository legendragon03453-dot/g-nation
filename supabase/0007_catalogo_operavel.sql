-- gnation — 0007: o catálogo do jeito que uma loja de joias opera
--
-- A 0002 criou `produtos`/`variantes` com o mínimo pra o pedido nascer no
-- servidor. Agora que o painel vai OPERAR o catálogo, faltam os campos
-- que essa loja usa de verdade no dia a dia. Cada um abaixo entrou por um
-- motivo concreto, não por completude:
--
--  - PREÇO PROMOCIONAL: "de R$ 349 por R$ 289" é como joia é vendida. Sem
--    um campo próprio, a única forma de dar desconto seria baixar o preço
--    — e aí o preço cheio some, o cliente não vê o corte, e o histórico
--    do que a peça custava se perde.
--
--  - DESTAQUE: a home tem a faixa de lançamentos. Hoje quem aparece lá
--    está decidido no código. Vira uma caixinha no painel.
--
--  - SKU: peça de R$ 300 é conferida na mão, uma a uma, na hora de
--    embalar. O número curto que o dono usa pra achar a peça na gaveta
--    não é o slug da URL.
--
--  - PESO: o brief do cliente pede cálculo de frete real (Correios /
--    transportadora). Frete se calcula por peso e destino. Sem guardar o
--    peso agora, na hora de ligar o cálculo seria preciso repesar 50 a
--    200 peças.
--
-- Não entrou de propósito: dimensões (joia é pequena, a caixa é padrão),
-- e "quantidade vendida" (isso se conta a partir de `itens_pedido`, não
-- se guarda duplicado num contador que sai de sincronia).

alter table public.produtos
  add column if not exists preco_promocional_centavos integer
    check (preco_promocional_centavos is null or preco_promocional_centavos >= 0),
  add column if not exists destaque boolean not null default false,
  add column if not exists sku text,
  add column if not exists peso_gramas integer check (peso_gramas is null or peso_gramas > 0);

-- Promoção que não é desconto não é promoção: se o "por" for maior ou
-- igual ao "de", a vitrine mostraria um corte que não existe.
alter table public.produtos drop constraint if exists produtos_promocao_menor;
alter table public.produtos add constraint produtos_promocao_menor
  check (preco_promocional_centavos is null
         or preco_promocional_centavos < preco_centavos);

create unique index if not exists produtos_sku_idx
  on public.produtos(sku) where sku is not null;

create index if not exists produtos_destaque_idx
  on public.produtos(destaque) where destaque and ativo;

-- ============================================================
-- O PREÇO QUE VALE
-- ============================================================
-- Uma função só, usada pela vitrine E pelo pedido. Sem isso, a regra
-- "promocional quando existe, cheio quando não existe" ficaria escrita
-- duas vezes — e o dia em que as duas discordarem é o dia em que o
-- cliente vê um preço na tela e paga outro.
create or replace function public.preco_vigente(p public.produtos)
returns integer
language sql
immutable
as $$
  select coalesce(p.preco_promocional_centavos, p.preco_centavos);
$$;

-- `criar_pedido` passa a cobrar o preço vigente. É a única linha que
-- muda na função — o resto (estoque, cupom, snapshot) continua igual.
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

  if jsonb_array_length(p_itens) > 50 then
    raise exception 'SACOLA_GRANDE_DEMAIS';
  end if;

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

  select u.email into v_email from auth.users u where u.id = v_uid;

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

    -- AQUI: preço vigente (promocional quando houver), não mais o cheio
    v_preco := public.preco_vigente(v_produto) + v_variante.preco_delta_centavos;
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
    v_desconto := least(v_desconto, v_subtotal);

    update public.cupons set usos = usos + 1 where codigo = v_cupom.codigo;
  end if;

  v_frete := public.frete_centavos(v_uf, v_subtotal);

  insert into public.pedidos (
    user_id, status, subtotal_centavos, desconto_centavos, frete_centavos,
    total_centavos, pagamento_metodo, cupom_codigo, entrega, contato, expira_em
  ) values (
    v_uid, 'aguardando_pagamento', v_subtotal, v_desconto, v_frete,
    v_subtotal - v_desconto + v_frete, p_pagamento, v_cupom.codigo,
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
    v_pedido.id, (l->>'variante_id')::uuid, l->>'produto_slug', l->>'titulo',
    l->>'material', l->>'tamanho', l->>'img',
    (l->>'preco_unit_centavos')::integer, (l->>'quantidade')::integer
  from jsonb_array_elements(v_linhas) l;

  return v_pedido;
end;
$$;

revoke all on function public.criar_pedido(jsonb, jsonb, jsonb, text, text) from public, anon;
grant execute on function public.criar_pedido(jsonb, jsonb, jsonb, text, text) to authenticated;

-- ============================================================
-- CONFIGURAÇÕES DA LOJA
-- ============================================================
-- Linha única (`id` fixo em 1): são os ajustes da loja, não uma lista.
-- A trava do check impede que apareça uma segunda linha e ninguém saiba
-- qual das duas vale.
create table if not exists public.configuracoes (
  id integer primary key default 1 check (id = 1),
  loja_nome text not null default 'G-Nation',
  loja_email text not null default 'contato@gnation.com.br',
  loja_whatsapp text,
  loja_instagram text,
  -- Frete: hoje é grátis pra tudo (é o que a página de produto promete).
  -- Quando virar cálculo real, este valor passa a ser o piso e o
  -- "grátis acima de" volta a fazer sentido.
  frete_padrao_centavos integer not null default 0 check (frete_padrao_centavos >= 0),
  frete_gratis_acima_centavos integer not null default 0 check (frete_gratis_acima_centavos >= 0),
  prazo_entrega_dias text not null default '2 a 5 dias úteis',
  -- Por quanto tempo um pedido não pago segura o estoque.
  reserva_horas integer not null default 24 check (reserva_horas between 1 and 168),
  atualizado_em timestamptz not null default now()
);

insert into public.configuracoes (id) values (1) on conflict (id) do nothing;

alter table public.configuracoes enable row level security;

-- Lida por qualquer visitante (o rodapé mostra e-mail e prazo), escrita
-- só pelo admin.
drop policy if exists "config: leitura publica" on public.configuracoes;
create policy "config: leitura publica" on public.configuracoes
  for select using (true);

drop policy if exists "config: admin escreve" on public.configuracoes;
create policy "config: admin escreve" on public.configuracoes
  for update using (public.eh_admin()) with check (public.eh_admin());

revoke insert, delete, truncate on public.configuracoes from authenticated, anon;

drop trigger if exists config_touch on public.configuracoes;
create trigger config_touch before update on public.configuracoes
  for each row execute function public.tocar_atualizado_em();

-- O frete passa a ler a configuração em vez de devolver zero fixo.
create or replace function public.frete_centavos(p_uf text, p_subtotal_centavos integer)
returns integer
language sql
stable
as $$
  select case
    when c.frete_gratis_acima_centavos > 0
     and p_subtotal_centavos >= c.frete_gratis_acima_centavos then 0
    else c.frete_padrao_centavos
  end
  from public.configuracoes c where c.id = 1;
$$;

-- ============================================================
-- CLIENTES — a lista que o painel mostra
-- ============================================================
-- O admin já pode ler `perfis` pela policy da 0002, mas a tela precisa de
-- coisas que não estão lá: e-mail (mora em `auth.users`, fora do alcance
-- do PostgREST) e o resumo de compras. Uma função resolve as três numa
-- consulta só, em vez de a tela buscar pedido por pedido pra somar.
create or replace function public.admin_clientes()
returns table (
  id uuid,
  nome text,
  email text,
  telefone text,
  criado_em timestamptz,
  pedidos_total bigint,
  gasto_centavos bigint,
  ultimo_pedido timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.eh_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  return query
  select
    p.id,
    p.nome,
    u.email::text,
    p.telefone,
    p.criado_em,
    count(pe.id) as pedidos_total,
    -- só o que virou dinheiro de verdade entra no "gasto"
    coalesce(sum(pe.total_centavos) filter (
      where pe.status in ('pago','em_producao','enviado','entregue')
    ), 0)::bigint as gasto_centavos,
    max(pe.criado_em) as ultimo_pedido
  from public.perfis p
  join auth.users u on u.id = p.id
  left join public.pedidos pe on pe.user_id = p.id
  group by p.id, p.nome, u.email, p.telefone, p.criado_em
  order by max(pe.criado_em) desc nulls last, p.criado_em desc;
end;
$$;

revoke all on function public.admin_clientes() from public, anon;
grant execute on function public.admin_clientes() to authenticated;
