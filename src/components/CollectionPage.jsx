import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getCollection } from "../data/products";
import LogoG, { brandG } from "./LogoG";
import Wordmark from "./Wordmark";
import Navbar from "./Navbar";
import "./CollectionPage.css";

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
  const collection = getCollection(slug);
  const [page, setPage] = useState(1);

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
  const totalPages = Math.max(1, Math.ceil(collection.products.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageProducts = collection.products.slice(
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

      <motion.div
        className="cp__filters"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.5 } } }}
      >
        <motion.span
          className="cp__filters-label"
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
        >
          Filtrar por:
        </motion.span>
        {["Material", "Preço", "Tamanho"].map((f) => (
          <motion.button
            type="button"
            className="cp__filter-pill"
            key={f}
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            whileHover={{ scale: 1.05, backgroundColor: "#000", color: "#fff" }}
            whileTap={{ scale: 0.95 }}
          >
            {f}
          </motion.button>
        ))}
        <motion.span
          className="cp__filters-count"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        >
          Mostrando {pageProducts.length} de {collection.products.length} peças
        </motion.span>
      </motion.div>

      {collection.products.length === 0 ? (
        <div className="cp__empty">
          <p>Nenhuma peça nessa coleção ainda.</p>
          <Link to="/colecao/g-shop">Ver todas as peças</Link>
        </div>
      ) : (
        <div className="cp__grid" key={current}>
          {pageProducts.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.12, ease: EASE }}
            >
              <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                <Link className="cp__card" to={`/produto/${p.slug}`}>
                  <p className="cp__card-title">{p.title}</p>
                  <motion.div
                    className="cp__card-photo"
                    whileHover={{ scale: 1.06 }}
                    transition={{ duration: 0.5, ease: EASE }}
                  >
                    <img src={`/assets/products/${p.img}`} alt={p.title} />
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
            <a href="/about">Manifesto</a>
            <Link to="/colecao/g-customizadas">Personalizadas</Link>
            <a href="/contact">Atendimento</a>
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
