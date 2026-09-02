// Callback OAuth da Shopify — gera o token Admin (shpat_) do app custom.
//
// Fluxo: abre-se a URL de autorização no navegador logado no painel da loja,
// a Shopify redireciona pra cá com ?code=..., e este endpoint troca o code
// pelo access_token permanente. O token aparece na tela pra ser copiado —
// ele NÃO é gravado em lugar nenhum. Depois de pegar o token, este arquivo
// pode ser removido.
//
// Env (Vercel): SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_OAUTH_STATE
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || "0bdcy6-nu.myshopify.com";
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const EXPECTED_STATE = process.env.SHOPIFY_OAUTH_STATE;

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>body{font-family:-apple-system,sans-serif;max-width:640px;margin:60px auto;padding:0 20px;line-height:1.6}
  code{background:#f0f0f5;padding:2px 8px;border-radius:4px;word-break:break-all}
  .box{background:#f8f8fa;border:1px solid #e6e6e6;border-radius:8px;padding:20px;margin-top:20px}
  .error{color:#ef4444}</style></head><body><h2>${esc(title)}</h2>${body}</body></html>`;
}

export default async function handler(req, res) {
  const { code, state, shop, error, error_description: desc } = req.query || {};
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (error) return res.status(400).send(page("Autorização falhou", `<p class="error">${esc(error)}: ${esc(desc || "")}</p>`));
  if (!EXPECTED_STATE || state !== EXPECTED_STATE)
    return res.status(400).send(page("Estado inválido", "<p class=\"error\">O parâmetro state não confere. Gere um novo link de autorização.</p>"));
  if (!code) return res.status(400).send(page("Código ausente", "<p class=\"error\">Nenhum código de autorização recebido.</p>"));
  if (shop && shop !== SHOPIFY_DOMAIN)
    return res.status(400).send(page("Loja errada", `<p class="error">Esperava ${esc(SHOPIFY_DOMAIN)}, veio ${esc(shop)}.</p>`));
  if (!CLIENT_ID || !CLIENT_SECRET)
    return res.status(500).send(page("Configuração ausente", "<p class=\"error\">SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET não configurados na Vercel.</p>"));

  try {
    const r = await fetch(`https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
    });
    const data = await r.json();
    if (!r.ok || !data.access_token)
      return res.status(400).send(page("Falha ao trocar o código", `<pre>${esc(JSON.stringify(data, null, 2))}</pre>`));

    return res.status(200).send(page("Token gerado!", `
      <p>Copie o token abaixo e me envie:</p>
      <div class="box"><code>${esc(data.access_token)}</code></div>
      <p style="margin-top:20px">Escopos concedidos: <code>${esc(data.scope || "")}</code></p>`));
  } catch (e) {
    return res.status(500).send(page("Erro inesperado", `<p class="error">${esc(e.message)}</p>`));
  }
}
