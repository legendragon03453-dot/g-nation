import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PRODUCTS, getProductBySlug } from "../data/products";
import Wordmark from "./Wordmark";
import Navbar from "./Navbar";
import { useCart } from "../CartContext";
import "./ProductPage.css";

// Motion da página (framer-motion): foto entra com fade+scale suave, a
// coluna de info revela em stagger (categoria → título → preço →
// seletores → CTAs → descrição → frete), chips e botões respondem com
// spring no hover/tap, e os cards do "Confira também" sobem em cascata
// ao entrar na viewport.
const EASE = [0.16, 1, 0.3, 1];
const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

// Porte fiel do node 27:400 "detalhe-produto" do Figma
// (TXte9vygIeSP76UVjnbwLT) — estrutura, espaçamento, cores e tipografia
// são os do arquivo original (via get_design_context + download_assets),
// navbar e footer próprios dessa tela (diferentes do Navbar/Footer do
// resto do site, porque no Figma são componentes distintos).
//
// Conteúdo: agora real por produto, via slug (fonte única em
// src/data/products.js) — título, preço, foto, materiais, tamanhos e
// descrição são os do produto clicado, não mais o placeholder "ICE COLD
// CUBAN LINK v2" fixo. "Confira também" lista os outros produtos reais,
// cada um linkando pra própria página.
//
// Fontes: Benzin-Bold não é licenciada/disponível — mantido o substituto
// já usado no resto do projeto (var(--font-mono), JetBrains Mono 700).
// Archivo Black e Open Sauce One são fontes reais do Google Fonts.
export default function ProductPage() {
  const { slug } = useParams();
  const product = getProductBySlug(slug);
  const photoUrl = product ? `/assets/products/${product.img}` : null;

  const [material, setMaterial] = useState(product?.materials[0]);
  const [size, setSize] = useState(product?.sizes[0]);
  const { adicionar } = useCart();

  // Material e tamanho vão junto: a sacola trata cada combinação como uma
  // linha própria, como numa loja de verdade. `adicionar` já abre a
  // gaveta — sem isso a pessoa clica e nada visível acontece.
  function addToCart() {
    adicionar(product, { material, tamanho: size });
  }

  if (!product) {
    return (
      <div className="pp pp--empty">
        <p>Produto não encontrado.</p>
        <Link to="/">Voltar pra home</Link>
      </div>
    );
  }

  const others = PRODUCTS.filter((p) => p.slug !== product.slug).slice(0, 3);

  return (
    <div className="pp">
      <Navbar variant="inline" />

      <div className="pp__main">
        <div className="pp__gallery">
          <motion.div
            className="pp__main-photo"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <img src={photoUrl} alt={product.title} />
          </motion.div>
        </div>

        <motion.div
          className="pp__info"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}
        >
          <motion.div className="pp__title-block" variants={itemVariants}>
            <span className="pp__eyebrow">{product.category}</span>
            <h1 className="pp__title">{product.title}</h1>
            <p className="pp__price">{product.price}</p>
          </motion.div>

          <motion.div className="pp__selectors" variants={itemVariants}>
            <div className="pp__selector">
              <span className="pp__selector-label">Material</span>
              <div className="pp__chips">
                {product.materials.map((m) => (
                  <motion.button
                    key={m}
                    type="button"
                    className={`pp__chip${m === material ? " is-active" : ""}`}
                    onClick={() => setMaterial(m)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  >
                    {m.toUpperCase()}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="pp__selector">
              <div className="pp__selector-head">
                <span className="pp__selector-label">Tamanho</span>
                <button type="button" className="pp__size-guide">
                  GUIA DE TAMANHOS
                </button>
              </div>
              <div className="pp__chips">
                {product.sizes.map((s) => (
                  <motion.button
                    key={s}
                    type="button"
                    className={`pp__chip pp__chip--size${s === size ? " is-active" : ""}`}
                    onClick={() => setSize(s)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div className="pp__actions" variants={itemVariants}>
            <motion.button
              type="button"
              className="pp__btn pp__btn--atc"
              onClick={addToCart}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
            >
              ADICIONAR AO CARRINHO
            </motion.button>
            <motion.button
              type="button"
              className="pp__btn pp__btn--buy"
              onClick={addToCart}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
            >
              COMPRAR AGORA
            </motion.button>
          </motion.div>

          <motion.div className="pp__description" variants={itemVariants}>
            <h3>SOBRE A PEÇA</h3>
            <p>{product.description}</p>
          </motion.div>

          <motion.div className="pp__shipping" variants={itemVariants}>
            <img src="/assets/produto/icon-truck.svg" alt="" />
            <div>
              <strong>FRETE GRÁTIS PARA TODO BRASIL</strong>
              <span>Entrega expressa entre 2 e 5 dias úteis.</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="pp__others">
        <motion.h2
          className="pp__others-title"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          CONFIRA
          <br />
          TAMBÉM:
        </motion.h2>
        <div className="pp__others-grid">
          {others.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55, delay: i * 0.12, ease: EASE }}
            >
              <Link className="pp__others-card" to={`/produto/${p.slug}`}>
                <p className="pp__others-card-title">{p.title}</p>
                <motion.div
                  className="pp__others-photo"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <img src={`/assets/products/${p.img}`} alt={p.title} />
                </motion.div>
                <span className="pp__others-price">{p.price}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <footer className="pp__footer">
        <div className="pp__footer-accent" />
        <div className="pp__footer-main">
          <div className="pp__footer-brand">
            <h4><Wordmark flat /></h4>
            <p>
              Marca de joias e acessórios de streetwear premium. Cultura de rua com acabamento
              de luxo. Curadoria fechada, peças com presença, preço que filtra.
            </p>
            <div className="pp__footer-socials">
              <span>SIGA A CULTURA</span>
              <div className="pp__footer-social-icons">
                <img src="/assets/produto/icon-social-1.svg" alt="Instagram" />
                <img src="/assets/produto/icon-social-2.svg" alt="TikTok" />
              </div>
            </div>
          </div>
          <div className="pp__footer-links">
            <span>NAVEGAÇÃO</span>
            <Link to="/">Início</Link>
            <a href="/projects">Produtos</a>
            <a href="/#lancamentos">Lançamentos</a>
            <a href="/#depoimentos">Depoimentos</a>
            <a href="/contact">Contato</a>
          </div>
          <div className="pp__footer-contact">
            <span>ATENDIMENTO</span>
            <div>
              <p className="pp__footer-contact-label">Email</p>
              <p className="pp__footer-contact-value">contato@gnation.com.br</p>
            </div>
            <div>
              <p className="pp__footer-contact-label">Horário</p>
              <p className="pp__footer-contact-value">Seg - Sex: 09h às 18h</p>
            </div>
          </div>
        </div>
        <div className="pp__footer-divider" />
        <div className="pp__footer-bottom">
          <p>© 2024 <Wordmark flat /> URBAN JEWELRY. TODOS OS DIREITOS RESERVADOS.</p>
          <div className="pp__footer-legal">
            <span>Políticas de Privacidade</span>
            <span>Termos de Uso</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
