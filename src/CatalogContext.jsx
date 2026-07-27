import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import {
  PRODUCTS as PRODUTOS_EMBUTIDOS,
  COLLECTIONS,
} from "./data/products";

// CATÁLOGO — a vitrine passa a ler o banco.
//
// Até aqui, `src/data/products.js` era a fonte de verdade da loja: um
// array dentro do bundle. Isso significava que cadastrar uma peça ou
// mudar um preço exigia commit e deploy — e, depois que o painel-admin
// entrou, produzia o pior dos mundos: o dono cadastrava um pingente,
// via na lista do admin, e a loja continuava mostrando os oito produtos
// de sempre. Foi exatamente o que aconteceu ao testar.
//
// Agora o banco manda. O array continua no repositório com UMA função:
// ser o que a loja mostra enquanto a resposta do servidor não chegou, ou
// se ela não chegar. Uma vitrine em branco por meio segundo a cada visita
// seria pior que mostrar o catálogo conhecido e atualizá-lo em seguida.
const CatalogContext = createContext(null);

// O banco fala em centavos e nomes de coluna; o resto do site já fala
// `priceValue`, `title`, `img`. Traduzir aqui, num lugar só, evitou
// reescrever seis componentes — e mantém a porta aberta pra trocar o
// backend sem tocar na vitrine.
function daLinha(p, variantes) {
  const minhas = variantes.filter((v) => v.produto_slug === p.slug && v.ativo);
  const precoVigente = p.preco_promocional_centavos ?? p.preco_centavos;

  return {
    slug: p.slug,
    title: p.titulo,
    category: p.categoria,
    priceValue: precoVigente / 100,
    price: (precoVigente / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    }),
    // preço cheio só existe quando há promoção: é o "de" riscado
    priceFull:
      p.preco_promocional_centavos != null
        ? (p.preco_centavos / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })
        : null,
    img: p.img,
    description: p.descricao,
    destaque: p.destaque,
    confira: p.confira,
    // As opções da página de produto saem das combinações que existem de
    // verdade no estoque. Antes eram listas fixas no arquivo, e nada
    // impedia a página de oferecer um tamanho que a loja não tinha.
    materials: [...new Set(minhas.map((v) => v.material).filter(Boolean))],
    sizes: [...new Set(minhas.map((v) => v.tamanho).filter(Boolean))],
    estoque: minhas.reduce((s, v) => s + v.estoque, 0),
    variantes: minhas,
  };
}

export function CatalogProvider({ children }) {
  const [produtos, setProdutos] = useState(PRODUTOS_EMBUTIDOS);
  const [doBanco, setDoBanco] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [{ data: ps, error }, { data: vs }] = await Promise.all([
        supabase.from("produtos").select("*").eq("ativo", true).order("ordem"),
        supabase.from("variantes").select("*"),
      ]);
      // Erro de rede não pode apagar a vitrine: sem resposta, fica o que
      // já estava na tela.
      if (!vivo || error || !ps?.length) return;
      setProdutos(ps.map((p) => daLinha(p, vs || [])));
      setDoBanco(true);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const valor = useMemo(
    () => ({
      produtos,
      // `doBanco` distingue "ainda mostrando o embutido" de "já é o
      // catálogo real" — quem precisar decidir se espera, decide.
      doBanco,
      buscarPorSlug: (slug) => produtos.find((p) => p.slug === slug),
      buscarColecao: (slug) => {
        const c = COLLECTIONS[slug];
        if (!c) return null;
        return {
          ...c,
          slug,
          products: c.category
            ? produtos.filter((p) => p.category === c.category)
            : produtos,
        };
      },
      destaques: produtos.filter((p) => p.destaque),
      // Curadoria própria do "Confira também" — separada de `destaque`
      // porque as duas seções dividem a mesma home e marcar uma peça nas
      // duas a mostraria duas vezes na mesma rolagem.
      confiras: produtos.filter((p) => p.confira),
    }),
    [produtos, doBanco]
  );

  return (
    <CatalogContext.Provider value={valor}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog precisa estar dentro de <CatalogProvider>");
  return ctx;
}
