// Integração com a loja Shopify — lado do cliente (Storefront API).
//
// O checkout do pagamento é o do PRÓPRIO Shopify: a gente monta um
// carrinho lá com as variantes reais da loja e manda o cliente pro
// `checkoutUrl` do Shopify, que cobra e cria o pedido. O nosso site segue
// como vitrine + admin.
//
// POR QUE ISTO PODE RODAR NO NAVEGADOR: o token do Storefront API é
// PÚBLICO por design (é o que a Shopify criou pra front-ends acessarem a
// vitrine). Ele NÃO é o Admin token — com ele não dá pra ver pedido de
// ninguém nem mexer na conta; só criar carrinho e ler produto público. O
// que é secreto (Admin token, segredo do webhook) fica no servidor, nunca
// aqui.
const DOMINIO = import.meta.env.VITE_SHOPIFY_DOMAIN;            // ex: gnation.myshopify.com
const TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;    // token público do Storefront
const VERSAO = import.meta.env.VITE_SHOPIFY_API_VERSION || "2025-01";

// A loja está configurada? Sem as variáveis, o checkout Shopify não entra
// em ação e o site cai no fluxo "aguardando pagamento" de sempre — nada
// quebra enquanto as credenciais não chegam.
export function shopifyConfigurado() {
  return Boolean(DOMINIO && TOKEN);
}

// O carrinho do Shopify pede o id GLOBAL da variante (gid). No admin a
// gente guarda o id numérico (mais fácil de copiar do painel Shopify);
// aqui ele vira o gid que o Storefront espera.
function gid(idNumerico) {
  const s = String(idNumerico).trim();
  if (s.startsWith("gid://")) return s;
  return `gid://shopify/ProductVariant/${s}`;
}

async function storefront(query, variables) {
  const resp = await fetch(`https://${DOMINIO}/api/${VERSAO}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!resp.ok) throw new Error(`Shopify ${resp.status}`);
  return resp.json();
}

// Cria o carrinho no Shopify e devolve a URL do checkout.
//
// `itens`: [{ shopify_variant_id, quantidade }] — as variantes reais.
// `pedidoId`: o id do NOSSO pedido, carimbado como atributo do carrinho.
//   Ele sobrevive no pedido do Shopify e é o que o webhook usa depois pra
//   marcar o nosso pedido como pago. É a ponte entre os dois sistemas.
// `email`: pré-preenche o checkout do Shopify.
export async function criarCheckoutShopify({ itens, pedidoId, email }) {
  const lines = itens
    .filter((i) => i.shopify_variant_id)
    .map((i) => ({ merchandiseId: gid(i.shopify_variant_id), quantity: i.quantidade }));

  // Sem mapeamento pra Shopify em nenhum item, não há como cobrar lá.
  // Devolve null e o checkout segue no fluxo "aguardando pagamento".
  if (lines.length === 0) return null;

  const query = `
    mutation criarCarrinho($input: CartInput!) {
      cartCreate(input: $input) {
        cart { checkoutUrl }
        userErrors { field message }
      }
    }`;

  const input = {
    lines,
    attributes: [{ key: "gnation_pedido_id", value: String(pedidoId) }],
    buyerIdentity: email ? { email } : undefined,
  };

  const r = await storefront(query, { input });
  const erros = r?.data?.cartCreate?.userErrors;
  if (erros && erros.length) {
    throw new Error(erros.map((e) => e.message).join("; "));
  }
  return r?.data?.cartCreate?.cart?.checkoutUrl || null;
}
