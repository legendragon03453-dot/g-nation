// EDGE FUNCTION — recebe o aviso de pagamento do Shopify (webhook
// `orders/paid`) e marca o NOSSO pedido como pago.
//
// Esta é a peça mais sensível da integração: é ela que decide que um
// pedido foi pago. Por isso a segurança é reforçada em três camadas:
//
//   1. HMAC — o Shopify assina cada webhook com um segredo compartilhado
//      (X-Shopify-Hmac-Sha256). Sem recalcular e conferir essa assinatura,
//      QUALQUER um poderia mandar um POST fingindo "pedido X pago" e levar
//      a mercadoria de graça. Comparação em tempo constante (não vaza por
//      timing).
//
//   2. VALOR — a `registrar_pagamento` confere que o valor pago bate com o
//      total do nosso pedido. Um pagamento de valor adulterado não marca o
//      pedido como pago.
//
//   3. service_role — só o servidor marca pago. A função é idempotente, e
//      o Shopify reenvia o webhook até receber 200, então reprocessar o
//      mesmo aviso não paga duas vezes.
//
// Correlação: o id do NOSSO pedido viaja no atributo `gnation_pedido_id`
// do carrinho, que sobrevive no pedido do Shopify (note_attributes). O
// webhook de pagamento do Shopify NÃO devolve o id do rascunho, então essa
// é a ponte confiável entre os dois sistemas.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("SHOPIFY_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// HMAC-SHA256 do corpo cru, em base64, comparado em tempo constante com o
// header assinado pelo Shopify.
async function assinaturaValida(corpoCru: string, assinatura: string): Promise<boolean> {
  if (!WEBHOOK_SECRET || !assinatura) return false;
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    chave,
    new TextEncoder().encode(corpoCru),
  );
  const esperado = btoa(String.fromCharCode(...new Uint8Array(mac)));
  // tempo constante
  if (esperado.length !== assinatura.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) {
    dif |= esperado.charCodeAt(i) ^ assinatura.charCodeAt(i);
  }
  return dif === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("no", { status: 405 });

  // o corpo CRU é obrigatório pro HMAC: qualquer reserialização (ex.
  // JSON.parse + stringify) muda os bytes e invalida a assinatura.
  const corpoCru = await req.text();
  const assinatura = req.headers.get("X-Shopify-Hmac-Sha256") ?? "";

  if (!(await assinaturaValida(corpoCru, assinatura))) {
    // não é do Shopify (ou segredo errado): recusa sem dar pista
    return new Response("assinatura inválida", { status: 401 });
  }

  let pedidoShopify: any;
  try {
    pedidoShopify = JSON.parse(corpoCru);
  } catch {
    return new Response("corpo inválido", { status: 400 });
  }

  // só age em pedido efetivamente pago
  const pago =
    pedidoShopify?.financial_status === "paid" ||
    pedidoShopify?.financial_status === "partially_paid";
  if (!pago) return new Response("ok (nao pago)", { status: 200 });

  // acha o id do NOSSO pedido nos atributos que carimbamos no carrinho
  const attrs: Array<{ name: string; value: string }> =
    pedidoShopify?.note_attributes ?? [];
  const meuPedidoId = attrs.find((a) => a.name === "gnation_pedido_id")?.value;

  // sem a correlação, não dá pra saber qual pedido é — responde 200 pra o
  // Shopify não ficar reenviando eternamente, mas registra pra auditoria
  if (!meuPedidoId) {
    console.warn("webhook sem gnation_pedido_id", pedidoShopify?.id);
    return new Response("ok (sem correlacao)", { status: 200 });
  }

  // valor pago em centavos, pra reconferência no banco
  const totalPago = Math.round(parseFloat(pedidoShopify?.total_price ?? "0") * 100);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const { error } = await admin.rpc("registrar_pagamento", {
    p_pedido_id: meuPedidoId,
    p_provedor: "shopify",
    p_ref: String(pedidoShopify?.id ?? ""),
    p_shopify_order_id: String(pedidoShopify?.id ?? ""),
    p_shopify_order_numero: String(pedidoShopify?.name ?? pedidoShopify?.order_number ?? ""),
    p_valor_pago_centavos: totalPago,
  });

  if (error) {
    // valor divergente / pedido cancelado: loga e responde 200 (não
    // adianta o Shopify reenviar — o problema não é de entrega do webhook)
    console.error("registrar_pagamento:", error.message);
    return new Response("ok (recusado: " + error.message + ")", { status: 200 });
  }

  return new Response("ok", { status: 200 });
});
