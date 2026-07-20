import { createContext, useCallback, useContext, useMemo, useState } from "react";

// Estado da sacola. Fica num contexto porque três lugares distantes
// precisam dele ao mesmo tempo: o ícone da navbar (contador + abrir), a
// página de produto (adicionar) e a própria gaveta (listar/alterar).
//
// Sem backend ainda — a sacola vive na sessão. Quando houver conta, este
// é o ponto único a trocar por uma chamada real, e nenhum componente que
// usa `useCart()` precisa mudar.
const CartContext = createContext(null);

// Cada linha da sacola é uma COMBINAÇÃO, não um produto: a mesma peça em
// materiais ou tamanhos diferentes são linhas separadas, como numa loja
// de verdade. A chave carrega as três coisas.
function linhaId(slug, material, tamanho) {
  return [slug, material, tamanho].filter(Boolean).join("|");
}

export function CartProvider({ children }) {
  const [itens, setItens] = useState([]);
  const [aberta, setAberta] = useState(false);

  const abrir = useCallback(() => setAberta(true), []);
  const fechar = useCallback(() => setAberta(false), []);

  // Adiciona e ABRE a gaveta: sem isso a pessoa clica em "adicionar" e
  // nada visível acontece — o clássico "será que foi?".
  const adicionar = useCallback((produto, { material, tamanho, qtd = 1 } = {}) => {
    const id = linhaId(produto.slug, material, tamanho);
    setItens((atual) => {
      const existente = atual.find((i) => i.id === id);
      if (existente) {
        return atual.map((i) => (i.id === id ? { ...i, qtd: i.qtd + qtd } : i));
      }
      return [
        ...atual,
        {
          id,
          slug: produto.slug,
          title: produto.title,
          price: produto.price,
          priceValue: produto.priceValue,
          img: produto.img,
          material,
          tamanho,
          qtd,
        },
      ];
    });
    setAberta(true);
  }, []);

  const remover = useCallback((id) => {
    setItens((atual) => atual.filter((i) => i.id !== id));
  }, []);

  // Quantidade 0 remove a linha, em vez de deixar um item fantasma com
  // zero unidades somando nada.
  const mudarQtd = useCallback((id, delta) => {
    setItens((atual) =>
      atual
        .map((i) => (i.id === id ? { ...i, qtd: i.qtd + delta } : i))
        .filter((i) => i.qtd > 0)
    );
  }, []);

  const valor = useMemo(() => {
    const totalItens = itens.reduce((s, i) => s + i.qtd, 0);
    const subtotal = itens.reduce((s, i) => s + i.priceValue * i.qtd, 0);
    return {
      itens,
      totalItens,
      subtotal,
      aberta,
      abrir,
      fechar,
      adicionar,
      remover,
      mudarQtd,
    };
  }, [itens, aberta, abrir, fechar, adicionar, remover, mudarQtd]);

  return <CartContext.Provider value={valor}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}

// Formata em real. Existe aqui pra sacola e o checkout mostrarem o total
// no MESMO formato que o `price` dos produtos ("R$ 319,00").
export function brl(n) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}
