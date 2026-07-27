// Resolve o caminho da foto de um produto.
//
// A foto pode chegar de dois lugares:
//   - CADASTRO ANTIGO: só o nome do arquivo ("trevo-gold.png"), servido
//     de public/assets/products/. É o que o catálogo semeado usa.
//   - UPLOAD PELO PAINEL: a URL pública inteira do Storage do Supabase
//     ("https://…/storage/v1/object/public/loja/produtos/…").
//
// Sem este resolvedor, montar `/assets/products/${img}` numa URL completa
// geraria "/assets/products/https://…" e a foto quebraria. Aqui, se o
// valor já é uma URL absoluta (http) ou um caminho de raiz (/), passa
// direto; senão, é nome de arquivo e ganha o prefixo da pasta local.
export function fotoProduto(img) {
  if (!img) return "";
  if (/^https?:\/\//.test(img) || img.startsWith("/")) return img;
  return `/assets/products/${img}`;
}
