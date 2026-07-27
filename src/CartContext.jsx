import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Estado da sacola. Fica num contexto porque três lugares distantes
// precisam dele ao mesmo tempo: o ícone da navbar (contador + abrir), a
// página de produto (adicionar) e a própria gaveta (listar/alterar).
const CartContext = createContext(null);

// A sacola sobrevive a recarga e a fechar o navegador. Antes ela vivia só
// em memória: a pessoa montava o pedido, dava F5 e voltava pra vitrine com
// a sacola vazia — sem nenhum aviso de que tinha perdido algo.
//
// localStorage e não sessionStorage pela mesma razão da sessão do login:
// quem escolhe uma peça hoje à noite espera encontrá-la amanhã de manhã.
const CHAVE = "gnation:sacola:v1";

// A versão está na chave de propósito. Se o formato da linha mudar, a
// chave muda junto e a sacola velha é ignorada em vez de quebrar a tela
// de quem já tinha itens guardados no formato antigo.
function lerSalvo() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    // Só o que tem o mínimo pra virar pedido. Lixo no storage (editado à
    // mão, sobra de versão antiga) é descartado em silêncio.
    return dados.filter((i) => i && i.id && i.slug && i.qtd > 0);
  } catch {
    // storage cheio, JSON corrompido, modo privativo do Safari — nada
    // disso pode derrubar a loja inteira. Sem sacola é melhor que tela
    // branca.
    return [];
  }
}

// Cada linha da sacola é uma COMBINAÇÃO, não um produto: a mesma peça em
// materiais ou tamanhos diferentes são linhas separadas, como numa loja
// de verdade. A chave carrega as três coisas.
function linhaId(slug, material, tamanho) {
  return [slug, material, tamanho].filter(Boolean).join("|");
}

export function CartProvider({ children }) {
  // função no useState (lazy): lê o storage UMA vez, na montagem, em vez
  // de a cada render
  const [itens, setItens] = useState(lerSalvo);
  const [aberta, setAberta] = useState(false);

  // A gaveta NÃO abre sozinha ao carregar a página, mesmo com itens
  // dentro — só quando a pessoa adiciona algo ou clica na sacola.
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(itens));
    } catch {
      // não dá pra guardar (cota, modo privativo): a sacola segue
      // funcionando nesta aba, só não sobrevive à recarga
    }
  }, [itens]);

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

  // Esvazia a sacola depois que o pedido é fechado. Sem isso a pessoa
  // volta pra loja com os itens que acabou de comprar ainda no carrinho.
  const limpar = useCallback(() => {
    setItens([]);
    setAberta(false);
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
      limpar,
    };
  }, [itens, aberta, abrir, fechar, adicionar, remover, mudarQtd, limpar]);

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
