-- gnation — 0013: integração com a loja Shopify
--
-- O pagamento passa a ser processado pela LOJA SHOPIFY do cliente: o
-- checkout do Shopify (real) recebe o cliente, cobra e cria o pedido lá.
-- O nosso site continua sendo a vitrine e o admin; o Shopify entra no
-- momento do pagamento.
--
-- Pra isso, cada combinação vendável AQUI precisa saber QUAL variante ela
-- é LÁ no Shopify — é esse id que monta o carrinho do checkout. O mapa
-- vive na nossa `variantes`.
alter table public.variantes
  add column if not exists shopify_variant_id text;

comment on column public.variantes.shopify_variant_id is
  'ID numérico da variante correspondente no Shopify (ex: 4567890123). '
  'Usado pra montar o carrinho do checkout do Shopify. Preenchido no /admin.';

-- Guardar também o id do pedido do Shopify no nosso pedido, pra rastreio
-- e pra fechar o ciclo (o webhook já grava em pagamento_ref, mas deixar
-- explícito o número do pedido Shopify ajuda o atendimento a cruzar os
-- dois sistemas).
alter table public.pedidos
  add column if not exists shopify_order_id text,
  add column if not exists shopify_order_numero text;

-- A função do webhook (0012, registrar_pagamento) já existe e já está
-- trancada em service_role + idempotente. Aqui só a estendemos pra gravar
-- o número do pedido Shopify junto, sem mudar a segurança.
create or replace function public.registrar_pagamento(
  p_pedido_id uuid,
  p_provedor text,
  p_ref text default null,
  p_shopify_order_id text default null,
  p_shopify_order_numero text default null,
  p_valor_pago_centavos integer default null
)
returns public.pedidos
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pedido public.pedidos%rowtype;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'PEDIDO_NAO_ENCONTRADO';
  end if;

  -- idempotente: reenvio de webhook não paga duas vezes
  if v_pedido.status = 'pago' or v_pedido.pago_em is not null then
    return v_pedido;
  end if;
  if v_pedido.status = 'cancelado' then
    raise exception 'PEDIDO_CANCELADO';
  end if;

  -- DEFESA EM PROFUNDIDADE: se o webhook informar o valor pago, ele TEM
  -- que bater com o total do nosso pedido. Impede que um pagamento de
  -- valor adulterado (ou de outro pedido) marque este como pago. Uma
  -- folga de 1 centavo cobre arredondamento de moeda.
  if p_valor_pago_centavos is not null
     and abs(p_valor_pago_centavos - v_pedido.total_centavos) > 1 then
    raise exception 'VALOR_DIVERGENTE: pago % esperado %',
      p_valor_pago_centavos, v_pedido.total_centavos;
  end if;

  update public.pedidos
     set status = 'pago',
         pago_em = now(),
         expira_em = null,
         pagamento_provedor = coalesce(p_provedor, pagamento_provedor),
         pagamento_ref = coalesce(p_ref, pagamento_ref),
         shopify_order_id = coalesce(p_shopify_order_id, shopify_order_id),
         shopify_order_numero = coalesce(p_shopify_order_numero, shopify_order_numero)
   where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

-- a assinatura mudou (novos parâmetros), então re-tranca a nova versão
revoke all on function public.registrar_pagamento(uuid, text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.registrar_pagamento(uuid, text, text, text, text, integer)
  to service_role;
