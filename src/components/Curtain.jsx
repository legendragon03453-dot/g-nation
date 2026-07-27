import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import "./Curtain.css";
import ImageCrossfade from "./ImageCrossfade";
import LogoG from "./LogoG";
import { useCatalog } from "../CatalogContext";
import PecaCard from "./PecaCard";

const LEFT_IMAGES = [
  "/assets/hero/slice-left-1.png",
  "/assets/hero/slice-left-2.jpg",
  "/assets/hero/slice-left-3.jpg",
];

const RIGHT_IMAGES = [
  "/assets/hero/slice-right-1.png",
  "/assets/hero/slice-right-2.jpg",
  "/assets/hero/slice-right-3.jpg",
];

// Grid de lançamentos — título/preço/foto/link vêm da fonte única de
// produtos (src/data/products.js). Agora 6 peças (3x2): os 4 originais
// + as duas pulseiras novas com foto REAL baixada do Figma (nodes
// 27:11/27:10 — Trevo Rosé e Trevo Gold).
// Ordem preferida da faixa de lançamentos. Quem marcar "mostrar em
// destaque" no painel entra na frente — é assim que o dono promove uma
// coleção nova sem pedir deploy.
const PREFERIDAS = [
  "trevo-royal",
  "trevo-rose",
  "trevo-gold",
  "cubana-cravejada",
  "tennis-ice",
  "anel-cruz-ice",
];

// QUANTAS PEÇAS ESTA FAIXA COMPORTA — e por quê.
//
// TETO 6. A grade é de 3 colunas e vive DENTRO do pin da cortina: a
// seção inteira precisa caber numa tela, senão o pin ganha scroll
// interno e a rolagem trava no meio da animação. Duas fileiras de 3
// (com a foto em min(20vh,210px)) é o que cabe. Uma terceira fileira
// estoura.
//
// SEMPRE MÚLTIPLO DE 3. A malha desenha o fio vertical em toda célula
// que não seja a 3ª da fileira; com 4 ou 5 peças a última fileira fica
// pela metade e o retângulo da moldura abre um buraco. Então 6 peças, ou
// 3 — nunca 4, 5, 7.
//
// Isso é limite de LAYOUT, não de catálogo: o dono pode marcar quantas
// peças quiser como destaque no painel, que a home mostra as 6
// primeiras. O aviso na tela de Produtos explica isso pra ele.
// A contagem depende do LAYOUT, que muda com a tela:
//   desktop → grade de 3 colunas, 2 fileiras = 6 peças
//   celular → grade de 2 colunas, 2 fileiras = 4 peças
// No celular, tentar encaixar 6 numa grade de 2 colunas dá 3 fileiras
// dentro do pin: a seção não cabe na tela travada, as fotos comprimem e
// cortam (foi o que o usuário viu). 4 (2×2) respira e mostra a peça
// inteira. Sempre múltiplo do número de colunas, pra malha não abrir
// buraco na última fileira.
const CONFIG_DESKTOP = { cabem: 6, porFileira: 3 };
const CONFIG_MOBILE = { cabem: 4, porFileira: 2 };

// Media query reativa: recalcula quando a largura cruza o ponto do
// layout mobile (o mesmo 900px em que a grade da Curtain vira 2 colunas),
// inclusive ao girar o aparelho.
function useEhMobile() {
  const [ehMobile, setEhMobile] = useState(
    typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const ouvir = (e) => setEhMobile(e.matches);
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, []);
  return ehMobile;
}

function useLancamentos() {
  const { produtos, destaques } = useCatalog();
  const ehMobile = useEhMobile();
  const { cabem, porFileira } = ehMobile ? CONFIG_MOBILE : CONFIG_DESKTOP;

  const preferidas = PREFERIDAS.map((s) => produtos.find((p) => p.slug === s)).filter(
    Boolean
  );

  // Ordem: quem está em destaque no painel primeiro, depois a lista
  // preferida do desenho original, depois o resto do catálogo — assim a
  // faixa se completa sozinha mesmo que o dono tire peças de linha.
  const vistos = new Set();
  const fila = [...destaques, ...preferidas, ...produtos].filter((p) =>
    vistos.has(p.slug) ? false : vistos.add(p.slug)
  );

  // Arredonda PRA BAIXO até fechar a fileira. Catálogo com 5 peças
  // ativas mostra 4 (mobile) ou 3 (desktop), nunca a malha quebrada.
  const teto = Math.min(fila.length, cabem);
  const cheias = teto - (teto % porFileira);
  return fila.slice(0, cheias);
}

// O visual do card mora em <PecaCard/> — o mesmo que o "Confira também"
// usa. Aqui fica só a classe da malha (curtain__lanc-card), que desenha
// os fios entre as células desta grade.
function LancCard({ p, i }) {
  return <PecaCard p={p} i={i} className="curtain__lanc-card" />;
}

// Faithful port of the real Hero Section scroll effect (augiA20Il.js):
// __framer__transformTrigger:"onScrollTarget", threshold 0.5, x target ±1000px.
// As you scroll through the pin, the two photo halves split apart like
// doors. Fiel ao Figma: o que fica revelado por trás NÃO é vazio — é a
// seção "DESTAQUE DE LANÇAMENTO" (node 27:77), que entra em cena (fade +
// leve subida) na segunda metade do scroll do pin, depois que as fotos já
// se abriram.
export default function Curtain() {
  const LANCAMENTOS = useLancamentos();
  const curtainRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: curtainRef,
    offset: ["start start", "end start"],
  });

  // Timing auditado com puppeteer (amostrando pinTop/opacity a cada 2% do
  // scroll): com altura 3400px e slice-open em [0.16,0.36], o pin soltava
  // em v≈0.71 (release = curtainHeight-pinHeight) mas tudo já estava
  // parado/estático desde v=0.36 — 1190px de scroll morto (nada mudando
  // na tela) só nesse trecho, mais 544px de preâmbulo parado no início.
  // Mais da metade do scroll da seção era tempo morto. Reduzida a altura
  // total (3400→2000) e redistribuído o timing pra sobrar só um respiro
  // curto antes de abrir e um "dwell" curto depois de revelado, em vez de
  // uma trava longa parada no meio do scroll.
  const leftX = useTransform(scrollYProgress, [0.09, 0.32], [0, -1000]);
  const rightX = useTransform(scrollYProgress, [0.09, 0.32], [0, 1000]);

  // O fade contínuo via useTransform (opacity) não estava atualizando neste
  // projeto (framer-motion 12 + React 19) — o valor ficava travado no
  // inicial mesmo com o scroll avançando, enquanto x/y funcionavam normal.
  // Troquei por um estado booleano (dispara quando o scroll cruza o ponto
  // logo depois da cortina abrir) + transição CSS, que é confiável.
  //
  // Reveal em 0.24, antes das fotos terminarem de sair (0.32) — janela de
  // sobreposição de 0.08 (160px) pra transição CSS de 0.6s completar sem
  // vão preto no meio.
  const [lancRevealed, setLancRevealed] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setLancRevealed(v >= 0.24);
  });

  return (
    <section className="curtain" id="lancamentos" ref={curtainRef}>
      <div className="curtain__pin">
        <div className="curtain__slices">
          <motion.div className="curtain__slice" style={{ x: leftX }}>
            <ImageCrossfade images={LEFT_IMAGES} className="curtain__slice-inner" />
            <motion.div
              className="curtain__tag curtain__tag--left"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="curtain__tag-label"><LogoG />-Shop</span>
              <motion.a
                className="curtain__tag-cta"
                href="/colecao/g-shop"
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
              >
                <span>Ver peças</span>
                <img className="curtain__tag-cta-icon" src="/assets/sections/arrow-right.svg" alt="" />
              </motion.a>
            </motion.div>
          </motion.div>

          <motion.div className="curtain__slice" style={{ x: rightX }}>
            <ImageCrossfade images={RIGHT_IMAGES} className="curtain__slice-inner" />
            <motion.div
              className="curtain__tag curtain__tag--right"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            >
              <span className="curtain__tag-label"><LogoG />-Customizadas</span>
              <motion.a
                className="curtain__tag-cta"
                href="/colecao/g-customizadas"
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
              >
                <span>Ver customizadas</span>
                <img className="curtain__tag-cta-icon" src="/assets/sections/arrow-right.svg" alt="" />
              </motion.a>
            </motion.div>
          </motion.div>

          <div className="curtain__white-under">
            <div
              className={`curtain__lancamentos${lancRevealed ? " is-visible" : ""}`}
            >
              {/* Porta o design real da seção "Featured Works" do template
                  espelho (grateful-popup-643840.framer.app, WorksSection
                  nodeId JQTMXIAPF): fundo preto sólido (backgroundColor
                  rgb(0,0,0) confirmado no XML do Framer, sem textura),
                  heading H2 grande + parágrafo centralizados, grid 2x2 de
                  cards full-bleed (sem moldura branca), botão ghost pill
                  "Secondary" embaixo — a mesma peça já usada nas tags
                  G-Shop/G-Customizadas do Categoria. Fotos: a macro de pulseira já usada
                  nesta seção (não as fotos de coquetel/carro/perfume/
                  cadeira do template, que não fazem sentido pra joalheria). */}
              <div className="curtain__lanc-head">
                <h2>
                  <span className="tw-solid">LANÇAMENTOS</span>
                  <span className="tw-outline">PESO NOVO</span>
                </h2>
                <p>
                  Cravação densa, banho reforçado, presença de vitrine.
                </p>
              </div>

              <div className="curtain__lanc-grid">
                {LANCAMENTOS.map((p, i) => (
                  <LancCard p={p} i={i} key={p.title} />
                ))}
              </div>

              {/* "Ver mais" apontava pra /projects, rota que nunca
                  existiu — clicar dava tela branca. O destino real é a
                  vitrine. */}
              <motion.div
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
              >
                <Link className="curtain__lanc-more" to="/colecao/g-shop">
                  <span>Ver mais</span>
                  <img className="curtain__lanc-more-icon" src="/assets/sections/arrow-right.svg" alt="" />
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
