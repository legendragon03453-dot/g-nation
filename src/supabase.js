import { createClient } from "@supabase/supabase-js";

// Cliente do Supabase (projeto "gnation", org viabetel, região sa-east-1).
//
// Banco PRÓPRIO da gnation, criado do zero — não é o de outro cliente.
// Reaproveitar projeto entre clientes já custou uma migração inteira na
// AKI depois que ela ficou misturada com a Maria Films.
//
// A chave `anon` é pública por natureza: ela vai no bundle e qualquer um
// consegue lê-la. Quem protege os dados é o RLS (Row Level Security) nas
// tabelas, não o segredo da chave. A `service_role`, essa sim secreta,
// NUNCA entra no front — só em servidor.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Sem as variáveis o createClient explode com um erro obscuro no meio da
// tela. Melhor falhar aqui, dizendo exatamente o que falta.
if (!url || !anonKey) {
  throw new Error(
    "Faltam VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY. " +
      "Copie .env.example para .env.local e preencha (local), " +
      "ou configure as variáveis no painel da Vercel (produção)."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // a sessão volta da URL depois da confirmação de e-mail
    detectSessionInUrl: true,
  },
});
