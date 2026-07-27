-- gnation — 0012: esqueleto de pagamento AGNÓSTICO de provedor
--
-- Ainda não foi decidido o gateway (Mercado Pago / Shopify / Stripe). Mas
-- os três precisam EXATAMENTE das mesmas peças, então dá pra construir a
-- fundação agora sem amarrar em nenhum:
--
--   1. onde guardar a referência do pagamento no pedido (cada provedor
--      chama de um jeito, mas o formato "provedor + id externo + url pra
--      pagar" cobre todos):
--        - Mercado Pago: preference_id + init_point
--        - Shopify headless: checkout token + checkoutUrl
--        - Stripe: checkout session id + url
--
--   2. a PORTA por onde o gateway confirma o pagamento (webhook). É sempre
--      um sistema externo avisando "pedido X foi pago". Uma função só,
--      idempotente, que só o servidor (service_role) pode chamar.
--
-- Quando o provedor for escolhido, o que muda é só: (a) a função no front
-- que CRIA a cobrança e devolve a url, e (b) a Edge Function que RECEBE o
-- webhook e valida a assinatura do provedor — e essa Edge Function chama
-- a `registrar_pagamento` daqui. O resto (colunas, fluxo, estoque) já fica
-- pronto.

-- ============================================================
-- REFERÊNCIA DO PAGAMENTO NO PEDIDO
-- ============================================================
alter table public.pedidos
  add column if not exists pagamento_provedor text,     -- 'mercadopago' | 'shopify' | 'stripe'
  add column if not exists pagamento_ref text,          -- id externo (preference/session/checkout)
  add column if not exists pagamento_url text;          -- pra onde mandar o cliente pagar

-- ============================================================
-- REGISTRAR PAGAMENTO — a porta do webhook
-- ============================================================
-- Chamada pela Edge Function que recebe o aviso do gateway. NUNCA pelo
-- cliente: marcar o próprio pedido como pago é exatamente o que não pode
-- acontecer. Por isso o grant é só pra service_role.
--
-- IDEMPOTENTE: webhooks são reenviados (o gateway repete até receber 200).
-- Se o pedido já está pago, a função não faz nada e devolve o pedido como
-- está — reprocessar o mesmo aviso não pode pagar duas vezes nem duplicar
-- efeito nenhum.
--
-- O ESTOQUE já foi reservado quando o pedido nasceu (a 0002 baixa na hora
-- e segura por 24h via expira_em). Confirmar o pagamento só transforma a
-- reserva em venda: status vira 'pago' e o pedido deixa de expirar. Nada
-- de mexer em estoque aqui.
create or replace function public.registrar_pagamento(
  p_pedido_id uuid,
  p_provedor text,
  p_ref text default null
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

  -- já pago (reenvio do webhook) ou cancelado: não reprocessa
  if v_pedido.status = 'pago' or v_pedido.pago_em is not null then
    return v_pedido;
  end if;
  if v_pedido.status = 'cancelado' then
    raise exception 'PEDIDO_CANCELADO';
  end if;

  update public.pedidos
     set status = 'pago',
         pago_em = now(),
         expira_em = null,        -- pago não expira mais
         pagamento_provedor = coalesce(p_provedor, pagamento_provedor),
         pagamento_ref = coalesce(p_ref, pagamento_ref)
   where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

-- Trancado: nem anon nem usuário logado podem chamar. Só o servidor.
revoke all on function public.registrar_pagamento(uuid, text, text) from public, anon, authenticated;
grant execute on function public.registrar_pagamento(uuid, text, text) to service_role;

-- ============================================================
-- GUARDAR A COBRANÇA INICIADA
-- ============================================================
-- Quando o checkout criar a cobrança no provedor, ele guarda a url/ref no
-- pedido pra a página do pedido poder mostrar "Pagar agora" e pra o
-- webhook cruzar a referência depois. O dono do pedido pode gravar isso
-- (é o próprio pedido dele), mas SÓ estes três campos — nunca o status.
create or replace function public.definir_cobranca(
  p_pedido_id uuid,
  p_provedor text,
  p_ref text,
  p_url text
)
returns public.pedidos
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pedido public.pedidos%rowtype;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id;
  if not found or v_pedido.user_id <> auth.uid() then
    raise exception 'PEDIDO_NAO_ENCONTRADO';
  end if;
  if v_pedido.status <> 'aguardando_pagamento' then
    raise exception 'PEDIDO_NAO_PENDENTE';
  end if;

  update public.pedidos
     set pagamento_provedor = p_provedor,
         pagamento_ref = p_ref,
         pagamento_url = p_url
   where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

revoke all on function public.definir_cobranca(uuid, text, text, text) from public, anon;
grant execute on function public.definir_cobranca(uuid, text, text, text) to authenticated;
