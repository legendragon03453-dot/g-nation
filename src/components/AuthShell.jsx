import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Wordmark from "./Wordmark";
import "./AuthShell.css";

const EASE = [0.16, 1, 0.3, 1];

// O clipe entra em duas qualidades, de propósito:
//
//   CLIPE_HD  dentro do quadro, onde a imagem é o assunto (14,7 MB)
//   CLIPE_BG  cobrindo a tela atrás do branco (120 KB)
//
// O de fundo é o mesmo clipe reencodado a 480px/18fps/CRF 34 — 122x mais
// leve. Ele aparece desfocado e sob um véu branco, então resolução ali é
// byte jogado fora: o que se vê são flashes de luz e cor, não a imagem.
// Dois arquivos distintos também evitam o bug de servir o MESMO src pra
// vários <video> ao mesmo tempo (o Chrome derruba as instâncias extras
// com ERR_CACHE_OPERATION_NOT_SUPPORTED / media error 4).
const CLIPE_HD = "/assets/login/clipe-trap-bracelet-v2.mp4";
const CLIPE_BG = "/assets/login/clipe-bg.mp4";

// Sempre mudo, em loop e inline: autoplay só é permitido sem som, e sem
// playsInline o iOS abre o vídeo em tela cheia.
function Clipe({ className, src }) {
  return (
    <video
      className={className}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

// Casca das telas de conta (login, criar conta e o que vier). Existe pra
// que essas telas sejam LITERALMENTE a mesma peça com conteúdo diferente,
// em vez de duas páginas parecidas que vão divergir na primeira mexida.
// Ela é dona de: fundo em vídeo, véu branco, as três marcas, o "voltar",
// o quadro e o cabeçalho. O formulário vem por children.
//
// Estrutura e medidas vêm do node 27:368 "minha-conta" do Figma
// (TXte9vygIeSP76UVjnbwLT) — ver AuthShell.css para as camadas e as
// adaptações à identidade real do site.
export default function AuthShell({ subtitle, children }) {
  return (
    <div className="auth">
      {/* camada 1 — o clipe cobrindo a tela inteira */}
      <Clipe className="auth__bg" src={CLIPE_BG} />
      {/* camada 2 — o branco da página POR CIMA do vídeo: é ele que
          continua sendo o fundo, o clipe só atravessa como flash */}
      <div className="auth__scrim" aria-hidden="true" />
      {/* camada 3 — a marca gigante por cima do branco. Três: a central
          do Figma (27:369) e uma de cada lado, menores e mais apagadas,
          pra marca atravessar a tela toda em vez de morrer no miolo. */}
      <span className="auth__watermark auth__watermark--left" aria-hidden="true" />
      <span className="auth__watermark" aria-hidden="true" />
      <span className="auth__watermark auth__watermark--right" aria-hidden="true" />

      <Link className="auth__back" to="/">
        <img src="/assets/login/icon-arrow-left.svg" alt="" />
        <span>Voltar</span>
      </Link>

      <motion.div
        className="auth__card"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        {/* camada 4 — o clipe em HD preenchendo o quadro inteiro */}
        <Clipe className="auth__card-video" src={CLIPE_HD} />
        <div className="auth__card-veil" aria-hidden="true" />

        {/* topo: o clipe passa LIMPO aqui, a marca lê em branco por cima */}
        <div className="auth__head">
          <span className="auth__wordmark">
            <Wordmark />
          </span>
          <p className="auth__subtitle">{subtitle}</p>
        </div>

        {children}
      </motion.div>
    </div>
  );
}
