import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Wordmark from "./Wordmark";
import "./LoginPage.css";

const EASE = [0.16, 1, 0.3, 1];

// Porte do node 27:368 "minha-conta" do Figma (TXte9vygIeSP76UVjnbwLT),
// via get_design_context + download_assets — os ícones de olho e de seta
// são os arquivos exportados do próprio node (public/assets/login/).
// As adaptações à identidade real do site estão comentadas no CSS.
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
      <span className="login__watermark" aria-hidden="true" />

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
        <div className="login__head">
          <span className="login__wordmark">
            <Wordmark ink />
          </span>
          <p className="login__subtitle">Login de membro</p>
        </div>

        <div className="login__form">
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
