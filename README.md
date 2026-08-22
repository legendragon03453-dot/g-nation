# G-Nation — site e loja

Loja de joias/streetwear da G-Nation. Vitrine, carrinho, checkout, conta do
cliente e um painel administrativo que gerencia catálogo, pedidos, cupons,
depoimentos e boa parte do conteúdo da home.

**Produção:** https://g-nation-framer.vercel.app

Vite + React 19 + React Router + framer-motion no front. Supabase (Postgres +
Auth + Storage) no back. Hospedado na Vercel — todo push no `master` publica
sozinho.

## Rodando local

```bash
npm install
cp .env.example .env.local   # preencha as duas variáveis (veja abaixo)
npm run dev                  # http://localhost:5173
```

Outros comandos: `npm run build`, `npm run preview`, `npm run lint` (oxlint).

### As duas variáveis de ambiente

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<chave anon do projeto>
```

Sem elas o app falha de propósito já no boot, com a mensagem dizendo o que
falta — melhor do que um erro obscuro no meio da tela (`src/supabase.js`).

A chave `anon` é pública por natureza: ela vai no bundle e qualquer visitante
do site consegue lê-la. Quem protege os dados é o RLS nas tabelas, não o
segredo da chave. A `service_role`, essa sim secreta, **nunca** entra no
front — só em servidor (Edge Function).

## Como o projeto se organiza

```
src/
  App.jsx           rotas
  AuthContext        sessão do cliente (Supabase Auth, persiste em localStorage)
  CartContext        carrinho
  CatalogContext     catálogo vindo do banco; src/data/products.js é só fallback
  components/        uma pasta por tela + componentes da home
  components/admin/  o painel /admin inteiro
  lib/               br.js (CEP, máscaras), img.js (resolve foto de produto),
                     senha.js (checklist de senha), shopify.js, useLarguraAte.js
supabase/            migrations numeradas + Edge Function do webhook
```

Rotas: `/`, `/colecao/:slug`, `/produto/:slug`, `/checkout`, `/pedido/:id`,
`/conta`, `/login`, `/criar-conta`, `/admin` (com dashboard, pedidos,
produtos, clientes, cupons, depoimentos, configurações).

## A regra que sustenta o back: o pedido nasce no servidor

O front manda **intenção**, nunca preço: `[{slug, material, tamanho, qtd}]`.
A RPC `criar_pedido` (security definer) é que lê o preço do catálogo, aplica
cupom, calcula frete, confere e baixa estoque com `for update`, fixa
`status='aguardando_pagamento'` e pega o e-mail do `auth.users` — não do
payload.

Isso existe porque antes o navegador mandava subtotal e total calculados, e
dava pra fechar um pedido de R$ 0,01 já marcado como pago pelo console. O
cliente **não tem** INSERT/UPDATE/DELETE em `pedidos` nem em `itens_pedido`,
só SELECT. Se você precisar mexer em pedido, mexa por RPC.

Pedido segura a peça por 24h (`expira_em`); `cancelar_pedido` e
`expirar_pedidos` devolvem o estoque.

## Banco

As migrations em `supabase/` são numeradas e foram aplicadas em ordem via
Management API. Vale ler antes de mexer: `0002` (catálogo, estoque, cupons,
RPCs, `eh_admin()`), `0004` (fecha uma escalada de privilégio de admin —
policy é por LINHA, então a flag de admin precisou de GRANT por COLUNA),
`0007` (promoção, destaque, SKU, configurações), `0010` (curadoria da
segunda vitrine da home), `0011` (depoimentos).

**Depoimento não se inventa.** A tabela nasce vazia e a seção da home só
aparece quando existe algo publicado — prova social falsa engana quem compra.

## Pagamento (Shopify) — pronto e inerte

A integração está escrita e desligada, esperando credenciais: o checkout
cria o pedido no Supabase, monta o carrinho no Shopify via Storefront API,
manda o cliente pagar lá, e o webhook `orders/paid` chama
`registrar_pagamento` (idempotente, só `service_role`, reconfere o valor).

Falta: domínio `.myshopify.com` + Storefront token (públicos, vão nas env
vars da Vercel), segredo do webhook (secret da Edge Function) e mapear cada
variante ao id do Shopify pelo `/admin`. **`SHOPIFY.md` tem o passo a passo.**

## Pendências conhecidas

- `site_url` do Supabase ainda aponta pra `localhost:3000` — recuperação de
  senha quebra em produção.
- `mailer_autoconfirm` ligado: e-mail não é verificado de verdade.
- `expirar_pedidos()` não tem cron agendado, então pedido abandonado segura
  estoque até alguém rodar.
- Sem limite de pedidos abertos por cliente — dá pra prender estoque de graça.
- `/contato` está no menu mas a rota não existe.
- Algumas fotos de produto ainda são lifestyle sem a peça em destaque. Card de
  produto tem que ter a PEÇA como protagonista; dá pra trocar pelo upload no
  `/admin`.
- Bundle passa de 500 kB sem code splitting.
