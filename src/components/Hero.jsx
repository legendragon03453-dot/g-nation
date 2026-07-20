import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { getProductBySlug } from "../data/products";
import Wordmark from "./Wordmark";
import "./Hero.css";
import Ticker from "./Ticker";

// Hero = cortina de papel rasgado (PRESENÇA / QUE PESA) que abre e revela
// o FILME da peça, dirigido pelo scroll (scrollytelling): o currentTime do
// vídeo anda com a rolagem. Depois da abertura o vídeo "recua" de full-bleed
// pra um quadro 16:9 afastado (mostra o enquadramento inteiro) e capítulos
// de tipografia + peças reais entram sincronizados com os momentos do filme:
//   t 1s a 4s  — close do bracelet verde  -> BRILHO DE VERDADE + Trevo Royal
//   t 4s a 6s  — close nos olhos          -> PRA QUEM ENCARA
//   t 6s a 8s  — plano médio, cordão      -> PESO NO PEITO + Trevo Gold + CTA
// mapeamento do progresso da cena: papel abre em [0, 0.08]; o filme roda
// em [0.02, 0.86] — a Categoria entra em ~0.72 e cobre por completo em
// ~0.875, então o vídeo segue rodando DURANTE a subida do cover e só
// congela quando já está coberto.
const VIDEO_RANGE = [0.02, 0.86];
const VIDEO_DUR = 8; // Man_wearing_luxury_bracelet (original)

function tToP(t) {
  // converte segundo do vídeo em progresso da cena
  return VIDEO_RANGE[0] + (t / VIDEO_DUR) * (VIDEO_RANGE[1] - VIDEO_RANGE[0]);
}

// Capítulo: janela [in, out] em segundos do vídeo, com fade de borda.
function useChapter(progress, tIn, tOut) {
  const pIn = tToP(tIn);
  const pOut = tToP(tOut);
  const fade = 0.02; // ~0.6s de filme por rampa
  // forma de função (não keyframes): rampa de entrada e de saída
  const ramp = (p) => {
    if (p <= pIn || p >= pOut) return 0;
    if (p < pIn + fade) return (p - pIn) / fade;
    if (p > pOut - fade) return (pOut - p) / fade;
    return 1;
  };
  const opacity = useTransform(progress, ramp);
  const y = useTransform(progress, (p) => {
    if (p <= pIn) return 36;
    if (p >= pOut) return -36;
    if (p < pIn + fade) return 36 * (1 - (p - pIn) / fade);
    if (p > pOut - fade) return -36 * ((p - (pOut - fade)) / fade);
    return 0;
  });
  return { opacity, y };
}

function ChapterCard({ slug, align }) {
  const p = getProductBySlug(slug);
  if (!p) return null;
  return (
    <Link className={`hero__card hero__card--${align}`} to={`/produto/${p.slug}`}>
      <span className="hero__card-photo">
        <img src={`/assets/products/${p.img}`} alt={p.title} loading="lazy" />
      </span>
      <span className="hero__card-cat">{p.category}</span>
      <span className="hero__card-title">{p.title}</span>
      <span className="hero__card-row">
        <span className="hero__card-price">{p.price}</span>
        <span className="hero__card-go">VER PEÇA</span>
      </span>
    </Link>
  );
}

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // FASE A (abre): o PAPEL RASGADO REAL (foto com alfa extraído) escala a
  // partir do centro do furo — o rasgo cresce e engole a tela, revelando o
  // filme. Textos voam pra fora junto.
  const paperScale = useTransform(scrollYProgress, [0, 0.08], [1, 3.6]);
  // opacity SEMPRE na forma de função: keyframes de opacity já falharam
  // silenciosamente aqui (ficam presos no valor inicial)
  const paperOp = useTransform(scrollYProgress, (p) =>
    p <= 0.066 ? 1 : p >= 0.086 ? 0 : (0.086 - p) / 0.02
  );
  const topY = useTransform(scrollYProgress, [0, 0.066], ["0%", "-320%"]);
  const bottomY = useTransform(scrollYProgress, [0, 0.066], ["0%", "320%"]);

  // O RECUO: logo depois da cortina abrir, o vídeo afasta de full-bleed
  // (112vw cobre a viewport) pro quadro 16:9 inteiro, com moldura hairline.
  const screenW = useTransform(scrollYProgress, [0.055, 0.1], ["112vw", "70vw"]);
  const frameOp = useTransform(scrollYProgress, (p) =>
    p <= 0.065 ? 0 : p >= 0.1 ? 1 : (p - 0.065) / 0.035
  );

  // SCROLLYTELLING do vídeo: o scroll dirige o currentTime. O arquivo é
  // all-intra (keyframe em todo frame) justamente pra seek instantâneo.
  // O alvo vem do scroll; um rAF persegue o alvo com lerp pra suavizar
  // rajadas de wheel.
  const videoRef = useRef(null);
  const targetTime = useRef(0);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const t = Math.min(
      Math.max((p - VIDEO_RANGE[0]) / (VIDEO_RANGE[1] - VIDEO_RANGE[0]), 0),
      1
    );
    targetTime.current = t * (video.duration - 0.05);
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // reduced-motion: vídeo toca sozinho em loop, sem scrub
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.loop = true;
      video.play().catch(() => {});
      return;
    }

    let raf;
    const chase = () => {
      if (video.readyState >= 1) {
        const diff = targetTime.current - video.currentTime;
        if (Math.abs(diff) > 0.02) {
          video.currentTime += diff * 0.28;
        }
      }
      raf = requestAnimationFrame(chase);
    };
    raf = requestAnimationFrame(chase);
    return () => cancelAnimationFrame(raf);
  }, []);

  // capítulos ancorados nos atos do filme de 8s: t0-1 plano médio |
  // t1-4 close do bracelet | t4-6 olhos | t6-8 plano médio com o cordão
  const chBrilho = useChapter(scrollYProgress, 1.6, 3.9);
  const chEncara = useChapter(scrollYProgress, 4.3, 6.0);
  const chPeso = useChapter(scrollYProgress, 6.3, 8.0);

  return (
    <section className="hero" ref={ref}>
      <div className="hero__pin">
        {/* FUNDO revelado na fresta: o filme da peça, que depois recua
            pro quadro 16:9 sobre o radar */}
        <div className="hero__joia">
          <motion.div className="hero__screen" style={{ width: screenW }}>
            <video
              ref={videoRef}
              className="hero__joia-media"
              poster="/assets/hero/hero-video-poster-new.jpg"
              preload="auto"
              muted
              playsInline
            >
              <source src="/assets/hero/hero-video.mp4" type="video/mp4" />
            </video>
            <div className="hero__joia-veil" />
            <motion.div className="hero__screen-frame" style={{ opacity: frameOp }} />
          </motion.div>

          {/* CAPÍTULO 1 — close do bracelet: a peça do filme à venda */}
          <motion.div
            className="hero__chapter hero__chapter--brilho"
            style={{ opacity: chBrilho.opacity, y: chBrilho.y }}
          >
            <h2 className="hero__word hero__word--left">
              <span className="hero__word-solid">BRILHO</span>
              <span className="hero__word-outline">DE VERDADE</span>
            </h2>
            <ChapterCard slug="trevo-royal" align="right" />
          </motion.div>

          {/* CAPÍTULO 2 — close nos olhos */}
          <motion.div
            className="hero__chapter hero__chapter--encara"
            style={{ opacity: chEncara.opacity, y: chEncara.y }}
          >
            <h2 className="hero__word hero__word--center">
              <span className="hero__word-outline">PRA QUEM</span>
              <span className="hero__word-solid hero__word-solid--red">ENCARA</span>
            </h2>
          </motion.div>

          {/* CAPÍTULO 3 — plano final: peso no peito + peça gold + CTA */}
          <motion.div
            className="hero__chapter hero__chapter--peso"
            style={{ opacity: chPeso.opacity, y: chPeso.y }}
          >
            <h2 className="hero__word hero__word--right">
              <span className="hero__word-solid">PESO</span>
              <span className="hero__word-outline">NO PEITO</span>
            </h2>
            <div className="hero__chapter-left">
              <ChapterCard slug="trevo-gold" align="left" />
              <Link className="hero__cta hero__cta--chapter" to="/colecao/g-shop">
                <span aria-hidden="true">↗</span> VER PEÇAS
              </Link>
            </div>
          </motion.div>
        </div>

        {/* O PAPEL RASGADO REAL: foto de papel preto com furo (alfa
            extraído do branco). Escala a partir do centro do furo e o
            rasgo engole a tela. */}
        <div className="hero__paper-wrap" aria-hidden="true">
          <motion.div
            className="hero__paper"
            style={{ scale: paperScale, opacity: paperOp }}
          >
            <img
              className="hero__paper-img"
              src="/assets/hero/paper-tear.webp"
              alt=""
              draggable="false"
            />
          </motion.div>
        </div>

        {/* pilha de texto CENTRALIZADA sobre o furo: eyebrow + título em
            duas linhas + CTA. Quando o rasgo abre, a metade de cima voa
            pra cima e a de baixo pra baixo. */}
        <div className="hero__stack">
          <motion.div className="hero__stack-half" style={{ y: topY }}>
            <p className="hero__eyebrow">
              Marca de joias e acessórios de streetwear premium
            </p>
            <h1 className="hero__giant">PRESENÇA</h1>
          </motion.div>
          <motion.div className="hero__stack-half" style={{ y: bottomY }}>
            <h1 className="hero__giant">QUE PESA</h1>
            <a className="hero__cta" href="/colecao/g-shop">
              <span aria-hidden="true">↗</span> VER PEÇAS
            </a>
          </motion.div>
        </div>

        {/* marquee no rodapé, some junto com o papel */}
        <motion.div className="hero__marquee-wrap" style={{ opacity: paperOp }}>
          <div className="hero__marquee">
            <Ticker speed={72} direction="left" gap={40} hoverFactor={1} fadeWidth={0}>
              <span className="hero__marquee-text">
                <Wordmark flat /> — STREETWEAR JEWELRY —
              </span>
            </Ticker>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
