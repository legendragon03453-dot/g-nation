// Regras de senha do cliente.
//
// A política de verdade é a do Supabase, configurada no projeto:
// mínimo 8, exigindo minúscula + maiúscula + dígito. O banco recusa
// qualquer coisa fora disso, então NÃO dá pra burlar mexendo no front.
//
// Este arquivo existe pra que a pessoa saiba da regra ANTES de apanhar
// do servidor: o erro do Supabase chega em inglês e listando os
// alfabetos exigidos ("Password should contain at least one character of
// each: abcdefghijklmnopqrstuvwxyz, ABCDEFG..."), que não é coisa que se
// mostre pra quem só quer comprar uma corrente.
//
// Manter as duas em sincronia é obrigação: mudou aqui, muda lá (e
// vice-versa). Por isso a lista está num lugar só e não espalhada em
// cada tela que pede senha.
export const REGRAS = [
  { id: "tamanho", texto: "Pelo menos 8 caracteres", testa: (s) => s.length >= 8 },
  { id: "minuscula", texto: "Uma letra minúscula", testa: (s) => /[a-z]/.test(s) },
  { id: "maiuscula", texto: "Uma letra MAIÚSCULA", testa: (s) => /[A-Z]/.test(s) },
  { id: "numero", texto: "Um número", testa: (s) => /\d/.test(s) },
];

// Senhas que passam nas regras acima e mesmo assim são as primeiras que
// qualquer ataque de dicionário tenta. "Senha123" cumpre tudo: 8
// caracteres, maiúscula, minúscula e número.
const OBVIAS = [
  "senha123", "password", "password1", "abcd1234", "12345678",
  "qwerty123", "gnation1", "admin123", "mudar123", "teste123",
];

export function avaliar(senha) {
  const s = senha || "";
  const faltando = REGRAS.filter((r) => !r.testa(s));
  return {
    regras: REGRAS.map((r) => ({ ...r, ok: r.testa(s) })),
    valida: faltando.length === 0 && !ehObvia(s),
    // primeira pendência: é o que a mensagem de erro deve dizer, em vez
    // de despejar as quatro regras de uma vez
    primeiroProblema: ehObvia(s)
      ? "Essa senha é fácil demais de adivinhar. Escolha outra."
      : faltando[0]?.texto || null,
  };
}

function ehObvia(s) {
  return OBVIAS.includes(s.toLowerCase());
}

// A senha não pode ser o próprio e-mail nem o nome: é o primeiro palpite
// de quem já sabe quem a pessoa é.
export function pareceComOsDados(senha, email, nome) {
  const s = (senha || "").toLowerCase();
  if (!s) return false;
  const usuario = (email || "").split("@")[0].toLowerCase();
  const primeiro = (nome || "").trim().split(/\s+/)[0]?.toLowerCase() || "";
  if (usuario.length >= 4 && s.includes(usuario)) return true;
  if (primeiro.length >= 4 && s.includes(primeiro)) return true;
  return false;
}
