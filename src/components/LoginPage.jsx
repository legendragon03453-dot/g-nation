import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Wordmark from "./Wordmark";
import "./LoginPage.css";

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

// Porte do node 27:368 "minha-conta" do Figma (TXte9vygIeSP76UVjnbwLT),
// via get_design_context + download_assets — os ícones de olho e de seta
// são os arquivos exportados do próprio node (public/assets/login/).
// As adaptações à identidade real do site e o empilhamento das camadas
// de vídeo estão comentados no CSS.
//
// Ainda não existe backend de conta: o formulário valida os campos e diz
// a verdade sobre o estado, em vez de simular uma sessão que não existe.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [aviso, setAviso] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !senha.trim()) {
      setAviso("Preencha e-mail e senha para entrar.");
      return;
    }
    setAviso("A área de membro ainda não está no ar. Em breve.");
  }

  return (
    <div className="login">
      {/* camada 1 — o clipe cobrindo a tela inteira */}
      <Clipe className="login__bg" src={CLIPE_BG} />
      {/* camada 2 — o branco da página POR CIMA do vídeo: é ele que
          continua sendo o fundo, o clipe só atravessa como flash */}
      <div className="login__scrim" aria-hidden="true" />
      {/* camada 3 — a marca gigante por cima do branco. Três agora: a
          central do Figma (27:369) e uma de cada lado, menores e mais
          apagadas, pra marca atravessar a tela toda em vez de morrer no
          miolo — é o mesmo gesto do "G" que vaza na navbar. */}
      <span className="login__watermark login__watermark--left" aria-hidden="true" />
      <span className="login__watermark" aria-hidden="true" />
      <span className="login__watermark login__watermark--right" aria-hidden="true" />

      <Link className="login__back" to="/">
        <img src="/assets/login/icon-arrow-left.svg" alt="" />
        <span>Voltar</span>
      </Link>

      <motion.form
        className="login__card"
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        {/* camada 4 — o clipe em HD preenchendo o quadro inteiro */}
        <Clipe className="login__card-video" src={CLIPE_HD} />
        <div className="login__card-veil" aria-hidden="true" />

        {/* topo: o clipe passa LIMPO aqui, a marca lê em branco por cima */}
        <div className="login__head">
          <span className="login__wordmark">
            <Wordmark />
          </span>
          <p className="login__subtitle">Login de membro</p>
        </div>

        {/* o formulário não tem placa própria: cada peça (campo, botão)
            carrega o seu vidro, então o clipe continua visível nos vãos */}
        <div className="login__panel">
          <div className="login__field">
            <label className="login__label" htmlFor="login-email">
              E-mail
            </label>
            <div className="login__input-wrap">
              <input
                id="login-email"
                className="login__input"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="login__field">
            <label className="login__label" htmlFor="login-senha">
              Senha
            </label>
            <div className="login__input-wrap">
              <input
                id="login-senha"
                className="login__input"
                type={verSenha ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button
                type="button"
                className="login__eye"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                <img src="/assets/login/icon-eye-off.svg" alt="" />
              </button>
            </div>
          </div>

          {aviso && <p className="login__error">{aviso}</p>}

          <div className="login__submit-block">
            <button type="submit" className="login__submit">
              Entrar
            </button>
            <button type="button" className="login__forgot">
              Esqueci minha senha
            </button>
          </div>

          <div className="login__or">
            <span>OU</span>
          </div>

          <button type="button" className="login__secondary">
            Criar conta
          </button>
        </div>
      </motion.form>
    </div>
  );
}
