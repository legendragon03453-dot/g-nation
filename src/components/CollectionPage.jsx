import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useCatalog } from "../CatalogContext";
import LogoG, { brandG } from "./LogoG";
import Wordmark from "./Wordmark";
import Navbar from "./Navbar";
import FiltrosVitrine, { aplicarFiltros, faixasDe } from "./FiltrosVitrine";
import "./CollectionPage.css";
import { fotoProduto } from "../lib/img";

// quantas peças por página da vitrine (grade 3 colunas → 2 fileiras)
const PAGE_SIZE = 6;

// Porte fiel do node 27:670 "CATEGORIA — CORRENTES" do Figma
// (TXte9vygIeSP76UVjnbwLT), via get_design_context + download_assets:
// navbar preta 155px com "G" gigante vermelho translúcido vazando de
// fundo + logo G central real (asset baixado) + ícones mascarados;
// hero de 400px com a foto real de corrente + véu preto 60% + título
// Benzin 100px; barra "Filtrar por:" com pills; grade de cards com
// borda preta 3px; paginação quadrada; footer próprio com accent bar
// vermelha. Conteúdo: produtos REAIS filtrados por categoria da fonte
// única (src/data/products.js) — coleção vazia mostra estado vazio
// honesto, sem preencher com placeholder.
//
// Motion (framer-motion): "G" do navbar desliza pra posição; título do
// hero sobe com máscara; pills de filtro entram em stagger; cards da
// grade revelam em cascata conforme entram na viewport (once) com hover
// de elevação; paginação com whileHover/whileTap.
const EASE = [0.16, 1, 0.3, 1];

export default function CollectionPage() {
  const { slug } = useParams();
  const { buscarColecao } = useCatalog();
  const collection = buscarColecao(slug);
  const [page, setPage] = useState(1);
  const [params, setParams] = useSearchParams();

  // O TERMO DE BUSCA VEM DA URL (?q=), porque é a lupa da navbar que o
  // manda pra cá. Manter na URL também deixa o resultado compartilhável e
  // faz o botão voltar do navegador funcionar entre buscas.
  const termo = params.get("q") || "";

  // O termo NÃO é guardado em estado — ele vive só na URL, e o estado
  // deriva dela. A primeira versão guardava nos dois lugares e eles
  // brigavam: ao abrir /colecao/g-shop?q=cruz, o estado nascia vazio, o
  // efeito de sincronia via "estado vazio + URL cheia" e apagava o ?q=
  // antes que o outro efeito pudesse copiar o valor. Resultado: a busca
  // se limpava sozinha ao carregar. Uma fonte de verdade só, e o
  // problema deixa de existir.
  const [selecao, setSelecao] = useState({
    materiais: [],
    tamanhos: [],
    faixa: null,
    ordem: "relevancia",
  });

  const filtros = useMemo(() => ({ ...selecao, termo }), [selecao, termo]);

  // Aceita tanto objeto quanto função (como o setState normal), e cuida
  // do termo na URL quando o pedido é limpar tudo.
  function setFiltros(novo) {
    const valor = typeof novo === "function" ? novo(filtros) : novo;
    const { termo: novoTermo, ...resto } = valor;
    setSelecao(resto);
    if (!novoTermo && termo) {
      const p = new URLSearchParams(params);
      p.delete("q");
      setParams(p, { replace: true });
    }
  }

  // Trocar de filtro volta pra primeira página: continuar na página 3 de
  // um resultado que agora tem 4 peças mostraria a vitrine vazia.
  useEffect(() => {
    setPage(1);
  }, [filtros, slug]);

  const visiveis = useMemo(
    () => (collection ? aplicarFiltros(collection.products, filtros) : []),
    [collection, filtros]
  );

  if (!collection) {
    return (
      <div className="cp cp--empty-page">
        <p>Coleção não encontrada.</p>
        <Link to="/">Voltar pra home</Link>
      </div>
    );
  }

  // Paginação REAL (antes os botões 2/3/4 eram fixos e não faziam nada):
  // fatia os produtos por página e só mostra os botões de páginas que
  // realmente existem. Coleções pequenas ficam com 1 página (sem botões).
  const totalPages = Math.max(1, Math.ceil(visiveis.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageProducts = visiveis.slice(
    (current - 1) * PAGE_SIZE,
    current * PAGE_SIZE
  );

  return (
    <div className="cp">
      <Navbar variant="inline" />

      <header className="cp__hero">
        <img className="cp__hero-bg" src="/assets/colecao/hero-correntes.png" alt="" />
        <div className="cp__hero-veil" />
        <div className="cp__hero-mask">
          <motion.h1
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
          >
            {brandG(collection.title)}
          </motion.h1>
        </div>
      </header>

      <FiltrosVitrine
        produtos={collection.products}
        filtros={filtros}
        setFiltros={setFiltros}
        mostrando={pageProducts.length}
        total={collection.products.length}
      />

      {visiveis.length === 0 ? (
        <div className="cp__empty">
          {collection.products.length === 0 ? (
            <>
              <p>Nenhuma peça nessa coleção ainda.</p>
              <Link to="/colecao/g-shop">Ver todas as peças</Link>
            </>
          ) : (
            <>
              {/* Filtro sem resultado NÃO é o mesmo que coleção vazia: aqui
                  existem peças, só nenhuma bate com a combinação escolhida.
                  Dizer "nenhuma peça nessa coleção" faria a pessoa achar que
                  a loja está vazia e ir embora. */}
              <p>
                {filtros.termo
                  ? `Nada encontrado para "${filtros.termo}".`
                  : "Nenhuma peça com essa combinação de filtros."}
              </p>
              <button
                type="button"
                className="cp__empty-btn"
                onClick={() =>
                  setFiltros({ materiais: [], tamanhos: [], faixa: null, ordem: "relevancia", termo: "" })
                }
              >
                Limpar filtros
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="cp__grid" key={current}>
          {pageProducts.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              /* amount 0.25 exigia um quarto do card dentro da tela pra
                 revelar — e os cards da primeira fileira, que já nascem
                 na dobra, nunca disparavam o observer: a vitrine abria
                 com opacity 0, seis produtos invisíveis e um buraco
                 branco no lugar da grade. amount 0 revela assim que
                 qualquer pixel entra, inclusive quem já está na tela. */
              viewport={{ once: true, amount: 0 }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.12, ease: EASE }}
            >
              {/* whileTap espelha o whileHover pro celular: no toque, o
                  card faz o MESMO movimento que faz no hover do desktop
                  (sobe e a foto amplia). No mobile não existe hover, então
                  o "as caixas se mexem" só acontece se ligar no tap. */}
              <motion.div
                whileHover={{ y: -8 }}
                whileTap={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              >
                <Link className="cp__card" to={`/produto/${p.slug}`}>
                  <p className="cp__card-title">{p.title}</p>
                  <motion.div
                    className="cp__card-photo"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 1.06 }}
                    transition={{ duration: 0.5, ease: EASE }}
                  >
                    <img src={fotoProduto(p.img)} alt={p.title} />
                  </motion.div>
                  <span className="cp__card-price">{p.price}</span>
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="cp__pagination">
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((n) => (
            <motion.button
              type="button"
              key={n}
              className={`cp__page${n === current ? " is-active" : ""}`}
              onClick={() => {
                setPage(n);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {n}
            </motion.button>
          ))}
        </div>
      )}

      <footer className="cp__footer">
        <div className="cp__footer-accent" />
        <div className="cp__footer-main">
          <div className="cp__footer-brand">
            <p className="cp__footer-wordmark"><Wordmark flat /></p>
            <p className="cp__footer-tagline">
              Streetwear premium com alma urbana e acabamento de luxo. A joia que define sua
              identidade na rua.
            </p>
          </div>
          <div className="cp__footer-col">
            <p className="cp__footer-col-title">NAVEGAÇÃO</p>
            <Link to="/colecao/g-shop"><LogoG className="logo-g--flat" />-Shop</Link>
            <Link to="/sobre">Manifesto</Link>
            <Link to="/colecao/g-customizadas">Personalizadas</Link>
            <Link to="/contato">Atendimento</Link>
          </div>
          <div className="cp__footer-col">
            <p className="cp__footer-col-title">CATEGORIAS</p>
            <Link to="/colecao/correntes">Correntes</Link>
            <Link to="/colecao/aneis">Anéis</Link>
            <Link to="/colecao/pulseiras">Braceletes</Link>
            <Link to="/colecao/pingentes">Pingentes</Link>
          </div>
        </div>
        <div className="cp__footer-divider" />
        <div className="cp__footer-bottom">
          <p>© 2024 <Wordmark flat /> URBAN JEWELRY. TODOS OS DIREITOS RESERVADOS.</p>
          <div className="cp__footer-socials">
            <img src="/assets/colecao/icon-instagram.svg" alt="Instagram" />
            <img src="/assets/colecao/icon-circle-x.svg" alt="X" />
          </div>
        </div>
      </footer>
    </div>
  );
}
