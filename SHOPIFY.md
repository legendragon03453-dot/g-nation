# Integração Shopify (pagamento) — guia de ativação

O código já está **todo pronto**. Pra ligar, faltam só os valores que só
existem no painel Shopify do cliente. Este guia é a sequência.

## Como funciona (resumo)

A vitrine e o admin continuam sendo os nossos. No **fechar pedido**, o site
monta um carrinho na **loja Shopify** com as variantes reais e manda o
cliente pro **checkout do próprio Shopify**, que cobra e cria o pedido lá.
Um **webhook** avisa o nosso sistema quando o pagamento é confirmado, e o
nosso pedido vira "pago" sozinho.

```
nosso checkout → cria pedido (Supabase) → monta carrinho Shopify
   → checkoutUrl do Shopify → cliente paga no Shopify
   → webhook orders/paid → registrar_pagamento → nosso pedido = "pago"
```

## Segurança (já implementada)

- Token do **Storefront** (público) no front: só cria carrinho, não vê
  conta nem pedido de ninguém.
- Token do **Admin** e segredo do webhook: **só no servidor** (Edge
  Function), nunca no bundle.
- Webhook confere **HMAC** do Shopify — ninguém forja um "foi pago".
- `registrar_pagamento` confere que o **valor pago bate** com o total do
  pedido, é **idempotente** e só **service_role** chama.

## Passo a passo pra ligar

### 1. Criar o app no Shopify (pega os tokens)
No painel do cliente: **Configurações → Apps e canais de venda → Desenvolver
apps → Criar app**.
- Em **Storefront API**: marque acesso de leitura de produtos e de escrita
  de carrinho. Copie o **Storefront API access token** (público).
- (Só se formos sincronizar produtos por API depois) Admin API scopes:
  `write_draft_orders`, `read_orders`.

### 2. Variáveis do site (Vercel → Environment Variables)
```
VITE_SHOPIFY_DOMAIN=<loja>.myshopify.com
VITE_SHOPIFY_STOREFRONT_TOKEN=<storefront token>
VITE_SHOPIFY_API_VERSION=2025-01
```
Redeploy do site.

### 3. Mapear os produtos (no nosso /admin)
Cada combinação (variante) precisa saber qual é a variante dela no Shopify.
Em **/admin → Produtos → abrir a peça**, no campo **"ID Shopify da
variante"** de cada combinação, cole o id numérico da variante lá do
Shopify (aparece na URL da variante no painel Shopify, ou via a API).
> Sem esse mapa, aquela combinação não entra no checkout do Shopify.

### 4. Publicar a Edge Function do webhook
```
supabase functions deploy shopify-webhook --no-verify-jwt
supabase secrets set SHOPIFY_WEBHOOK_SECRET=<segredo do webhook>
```
(`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem no projeto.)

### 5. Registrar o webhook no Shopify
**Configurações → Notificações → Webhooks** (ou via API):
- Evento: **Pagamento de pedido** (`orders/paid`)
- Formato: JSON
- URL: `https://<ref>.supabase.co/functions/v1/shopify-webhook`
- Copie o **segredo de assinatura** que o Shopify mostra → é o
  `SHOPIFY_WEBHOOK_SECRET` do passo 4.

### 6. Testar
Compra de teste → deve redirecionar pro checkout do Shopify → pagar (modo
teste do Shopify) → o webhook marca o pedido como **pago** no nosso admin
sem recarregar.

## Onde está cada peça no código

| Peça | Arquivo |
|---|---|
| Cliente Storefront (monta carrinho, checkoutUrl) | `src/lib/shopify.js` |
| Ponto que dispara o checkout | `src/components/CheckoutPage.jsx` → `iniciarPagamento` |
| Botão "Pagar agora" + auto-refresh | `src/components/OrderPage.jsx` |
| Webhook (HMAC + marca pago) | `supabase/functions/shopify-webhook/index.ts` |
| Marca pago (idempotente, service_role) | migration `0013` → `registrar_pagamento` |
| Mapa variante→Shopify | coluna `variantes.shopify_variant_id` (editável no /admin) |
