// Preenche `variantes.shopify_variant_id` no Supabase cruzando pelo SKU da
// variante no Shopify. Convenção de SKU (a mesma do shopify-produtos-import.csv):
//   <slug>|<material>|<tamanho>
//
// Uso (na raiz do projeto, com .env.local preenchido):
//   ADMIN_EMAIL=... ADMIN_SENHA=... node scripts/mapear-shopify.mjs
//   (acrescente --aplicar para gravar; sem a flag só mostra o que faria)
//
// Só precisa do token PÚBLICO do Storefront (lê sku + id das variantes
// publicadas no canal Headless) e de um login de admin do nosso painel
// (a policy de UPDATE em variantes exige eh_admin()).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const DOM = env.VITE_SHOPIFY_DOMAIN;
const SF = env.VITE_SHOPIFY_STOREFRONT_TOKEN;
const VERSAO = env.VITE_SHOPIFY_API_VERSION || "2025-01";
const APLICAR = process.argv.includes("--aplicar");

if (!DOM || !SF) throw new Error("VITE_SHOPIFY_DOMAIN / VITE_SHOPIFY_STOREFRONT_TOKEN faltando no .env.local");
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_SENHA) throw new Error("ADMIN_EMAIL e ADMIN_SENHA são obrigatórios");

// 1. variantes do Shopify: sku -> id numérico
async function variantesShopify() {
  const mapa = new Map();
  let cursor = null;
  for (;;) {
    const q = `query($c: String) { products(first: 50, after: $c) { pageInfo { hasNextPage endCursor }
      nodes { handle variants(first: 100) { nodes { id sku } } } } }`;
    const r = await fetch(`https://${DOM}/api/${VERSAO}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": SF },
      body: JSON.stringify({ query: q, variables: { c: cursor } }),
    }).then((x) => x.json());
    if (r.errors) throw new Error(JSON.stringify(r.errors));
    const p = r.data.products;
    for (const prod of p.nodes)
      for (const v of prod.variants.nodes)
        if (v.sku) mapa.set(v.sku, v.id.replace("gid://shopify/ProductVariant/", ""));
    if (!p.pageInfo.hasNextPage) break;
    cursor = p.pageInfo.endCursor;
  }
  return mapa;
}

// 2. nossas variantes
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const { error: erroLogin } = await supabase.auth.signInWithPassword({
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_SENHA,
});
if (erroLogin) throw new Error("login admin: " + erroLogin.message);

const { data: nossas, error } = await supabase
  .from("variantes")
  .select("id, produto_slug, material, tamanho, shopify_variant_id");
if (error) throw new Error(error.message);

const shopify = await variantesShopify();
console.log(`Shopify: ${shopify.size} variantes com SKU · Supabase: ${nossas.length} variantes`);

let ok = 0, semPar = [];
for (const v of nossas) {
  const sku = `${v.produto_slug}|${v.material ?? ""}|${v.tamanho ?? ""}`;
  const id = shopify.get(sku);
  if (!id) { semPar.push(sku); continue; }
  if (v.shopify_variant_id === id) { ok++; continue; }
  console.log(`${APLICAR ? "grava" : "faria"}  ${sku}  ->  ${id}`);
  if (APLICAR) {
    const { error: e } = await supabase.from("variantes").update({ shopify_variant_id: id }).eq("id", v.id);
    if (e) throw new Error(`${sku}: ${e.message}`);
  }
  ok++;
}
console.log(`\nmapeadas: ${ok} · sem par no Shopify: ${semPar.length}`);
for (const s of semPar) console.log("  -", s);
if (!APLICAR) console.log("\n(nada gravado — rode de novo com --aplicar)");
