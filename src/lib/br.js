// Utilidades de formulário brasileiro.
//
// A pesquisa de checkout nacional é unânime em três pontos, e todos os
// três moram aqui:
//   1. preencher endereço pelo CEP (menos campo = menos abandono)
//   2. máscara em CPF/CEP/telefone, com teclado numérico no celular
//   3. validar enquanto digita, não só ao clicar em finalizar
//
// Sem dependência: são poucas regras e bem estáveis.

export function soDigitos(v) {
  return (v || "").replace(/\D/g, "");
}

// ---------- máscaras ----------

export function mascaraCep(v) {
  const d = soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function mascaraCpf(v) {
  const d = soDigitos(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// aceita fixo (10) e celular (11)
export function mascaraTelefone(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

// ---------- validação ----------

// CPF de verdade (dígitos verificadores), não só contagem de caracteres.
// Sem isso "111.111.111-11" passa e o pedido nasce com dado impossível.
export function cpfValido(v) {
  const c = soDigitos(v);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false; // todos iguais
  const dv = (base, pesoInicial) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(c.slice(0, 9), 10) === Number(c[9]) && dv(c.slice(0, 10), 11) === Number(c[10]);
}

export function cepValido(v) {
  return soDigitos(v).length === 8;
}

export function telefoneValido(v) {
  const d = soDigitos(v);
  return d.length === 10 || d.length === 11;
}

export function emailValido(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || "").trim());
}

// ---------- CEP -> endereço ----------

// ViaCEP: gratuito, sem chave, é o padrão do mercado brasileiro.
// Devolve null quando o CEP não existe — quem chama decide o que dizer.
export async function buscarCep(cep) {
  const d = soDigitos(cep);
  if (d.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!r.ok) return null;
    const j = await r.json();
    if (j.erro) return null;
    return {
      rua: j.logradouro || "",
      bairro: j.bairro || "",
      cidade: j.localidade || "",
      uf: j.uf || "",
    };
  } catch {
    // rede fora: quem chama libera os campos pra digitação manual, em vez
    // de travar a compra por causa de uma API de terceiro
    return null;
  }
}

// ---------- dinheiro ----------

// Centavos, sempre. Guardar dinheiro em float dá 0.1 + 0.2 = 0.30000000000000004
// e o total do pedido fecha errado por um centavo.
export function centavos(reais) {
  return Math.round(Number(reais) * 100);
}

export function brl(centavosValor) {
  return (centavosValor / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}
