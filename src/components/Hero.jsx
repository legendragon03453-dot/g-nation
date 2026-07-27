import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { useCatalog } from "../CatalogContext";
import Wordmark from "./Wordmark";
import "./Hero.css";
import Ticker from "./Ticker";
import { fotoProduto } from "../lib/img";

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
  const { buscarPorSlug } = useCatalog();
  const p = buscarPorSlug(slug);
  if (!p) return null;
  return (
    <Link className={`hero__card hero__card--${align}`} to={`/produto/${p.slug}`}>
      <span className="hero__card-photo">
        <img src={fotoProduto(p.img)} alt={p.title} loading="lazy" />
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

// Retrato/celular: decide a DRAMATURGIA da cena, não só o tamanho da
// fonte. No desktop o filme "recua" de full-bleed pra um quadro 16:9
// afastado — mostrar o enquadramento inteiro é o gesto. Num celular em
// pé, esse mesmo quadro 16:9 vira uma tarja de 206px no meio de uma tela
// de 844px (medido em 390px de largura): o filme, que é a cereja do
// site, ficava do tamanho de um banner. No celular o filme NÃO recua —
// ele ocupa a tela toda, do topo ao rodapé, e a tipografia entra por
// cima. Ler isso em JS (e não só em CSS) é necessário porque a largura
// do telão é animada inline pelo framer-motion, e estilo inline ganha
// de qualquer media query.
function useTelaEstreita() {
  const [estreita, setEstreita] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const onChange = (e) => setEstreita(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return estreita;
}

export default function Hero() {
  const ref = useRef(null);
  const telaEstreita = useTelaEstreita();
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
  // Saída do título em VH, não em %. Em % o deslocamento é relativo à
  // altura do próprio bloco: no desktop -320% limpava a tela, mas no
  // celular o bloco é baixo (fonte menor) e 320% dele não chegava a
  // 480px numa tela de 844px — "PRESENÇA" e "QUE PESA" ficavam presos
  // por cima do filme durante a cena inteira. Em vh o texto sempre sai,
  // em qualquer aparelho.
  const topY = useTransform(scrollYProgress, [0, 0.066], ["0vh", "-85vh"]);
  const bottomY = useTransform(scrollYProgress, [0, 0.066], ["0vh", "85vh"]);

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

    // PRIMING — o motivo de o filme não andar no celular.
    // `preload="auto"` é uma sugestão que navegador de celular ignora:
    // ele baixa só os metadados e espera um gesto pra buscar os dados.
    // Sem dados, `currentTime` não tem pra onde ir e a cena fica no
    // poster enquanto o scroll passa. Um play() mudo seguido de pause()
    // é gesto suficiente pra ele decodificar e encher o buffer, e como o
    // vídeo está mudo o autoplay é permitido. O toque na tela serve de
    // segunda chance pros aparelhos que exigem interação de verdade.
    const primeVideo = () => {
      const p = video.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          video.pause();
          video.currentTime = targetTime.current || 0;
        }).catch(() => {});
      }
    };
    primeVideo();
    window.addEventListener("touchstart", primeVideo, { once: true, passive: true });

    let raf;
    const chase = () => {
      // readyState >= 2 (HAVE_CURRENT_DATA): com >= 1 só há metadado, e
      // mandar currentTime nesse estado no celular não move nada.
      if (video.readyState >= 2) {
        const diff = targetTime.current - video.currentTime;
        if (Math.abs(diff) > 0.02) {
          video.currentTime += diff * 0.28;
        }
      }
      raf = requestAnimationFrame(chase);
    };
    raf = requestAnimationFrame(chase);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("touchstart", primeVideo);
    };
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
          {/* no celular o telão não recua: fica em 100vw a cena inteira
              (a altura vem do CSS, 100dvh) — ver useTelaEstreita */}
          <motion.div
            className="hero__screen"
            style={{ width: telaEstreita ? "100vw" : screenW }}
          >
            {/* No celular entra outra CÓPIA do filme, não o mesmo
                arquivo menor:

                  desktop  1280x720 paisagem, 14,89 MB
                  celular   406x720 RETRATO,   3,09 MB

                Duas razões. (1) O arquivo de 14,89 MB não terminava de
                baixar antes da pessoa rolar, e sem dados na mão o
                `currentTime` não anda — o filme ficava travado no poster
                enquanto o scroll passava. (2) Num celular em pé o
                `object-fit: cover` joga fora ~74% da largura do 16:9;
                codificar aquilo era gastar banda em pixel que ninguém vê
                e ainda sobrava pouco bitrate pro que aparece — daí a
                imagem ruim. A versão de celular já vem cortada em
                retrato, então cada byte vai pro que está na tela: com
                MENOS peso ela tem MAIS qualidade onde importa (CRF 20
                contra os 27 da primeira tentativa).

                As duas são all-intra (keyframe em ~todo frame), que é o
                que faz o seek ser instantâneo em vez de engasgar.
                O src vai direto no <video> (não em <source>) porque
                trocar o src de um <source> não recarrega o vídeo. */}
            <video
              ref={videoRef}
              className="hero__joia-media"
              src={
                telaEstreita
                  ? "/assets/hero/hero-video-mobile.mp4"
                  : "/assets/hero/hero-video.mp4"
              }
              poster="/assets/hero/hero-video-poster-new.jpg"
              preload="auto"
              muted
              playsInline
            />
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
        {/* opacity junto do papel: rede de segurança pro título. Se por
            qualquer motivo o deslocamento não limpar a tela (aparelho
            muito baixo, barra do navegador aparecendo), ele some com a
            cortina em vez de ficar preso sobre o filme. */}
        <motion.div className="hero__stack" style={{ opacity: paperOp }}>
          <motion.div className="hero__stack-half" style={{ y: topY }}>
            <p className="hero__eyebrow">
              Marca de joias e acessórios de streetwear premium
            </p>
            <h1 className="hero__giant">PRESENÇA</h1>
          </motion.div>
          <motion.div className="hero__stack-half" style={{ y: bottomY }}>
            <h1 className="hero__giant">QUE PESA</h1>
            <Link className="hero__cta" to="/colecao/g-shop">
              <span aria-hidden="true">↗</span> VER PEÇAS
            </Link>
          </motion.div>
        </motion.div>

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
