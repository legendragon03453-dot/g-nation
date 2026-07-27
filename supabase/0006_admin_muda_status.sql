-- gnation — 0006: o admin muda status por função, não por UPDATE solto
--
-- A 0004 revogou UPDATE em `pedidos` de todo mundo, inclusive do admin —
-- de propósito. Mudar status não é "escrever numa coluna", é uma
-- TRANSIÇÃO com regra: um pedido cancelado não volta a "pago"; um pedido
-- que nunca foi pago não pode ser marcado como "enviado" e sair pelo
-- correio; cancelar precisa devolver o estoque.
--
-- Se o painel fizesse `update pedidos set status = 'enviado'` direto, a
-- regra viveria no JavaScript da tela — e bastaria uma segunda tela, ou
-- o próximo desenvolvedor, pra ela deixar de valer. Aqui ela é do banco.

create or replace function public.admin_mudar_status(
  p_pedido_id uuid,
  p_status text,
  p_rastreio_codigo text default null,
  p_rastreio_url text default null
)
returns public.pedidos
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pedido public.pedidos%rowtype;
begin
  if not public.eh_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'PEDIDO_NAO_ENCONTRADO';
  end if;

  if p_status not in ('aguardando_pagamento','pago','em_producao','enviado','entregue','cancelado') then
    raise exception 'STATUS_INVALIDO';
  end if;

  -- Cancelar tem caminho próprio: é o único que devolve estoque.
  if p_status = 'cancelado' then
    return public.cancelar_pedido(p_pedido_id, 'cancelado pela loja');
  end if;

  if v_pedido.status = 'cancelado' then
    raise exception 'PEDIDO_CANCELADO';
  end if;

  -- Peça só sai depois de paga. Sem esta linha, um clique errado na
  -- lista despacha joia de pedido não pago.
  if p_status in ('em_producao','enviado','entregue')
     and v_pedido.status = 'aguardando_pagamento' then
    raise exception 'PEDIDO_NAO_PAGO';
  end if;

  update public.pedidos
     set status = p_status,
         -- marca a data do pagamento na primeira vez que vira "pago", e
         -- não a cada reedição do pedido depois disso
         pago_em = case
           when p_status = 'pago' and pago_em is null then now()
           else pago_em
         end,
         -- pedido pago não expira mais: o estoque deixa de estar
         -- "reservado" e passa a estar vendido
         expira_em = case when p_status = 'pago' then null else expira_em end,
         rastreio_codigo = coalesce(p_rastreio_codigo, rastreio_codigo),
         rastreio_url = coalesce(p_rastreio_url, rastreio_url)
   where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

revoke all on function public.admin_mudar_status(uuid, text, text, text) from public, anon;
grant execute on function public.admin_mudar_status(uuid, text, text, text) to authenticated;
