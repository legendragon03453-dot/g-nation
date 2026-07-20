import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "./AuthShell";

// Porte do node 27:368 "minha-conta" do Figma (TXte9vygIeSP76UVjnbwLT).
// A casca (vídeo, véu, marcas, quadro, cabeçalho) é o AuthShell, o mesmo
// da tela de criar conta — aqui fica só o formulário.
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
    <AuthShell subtitle="Login de membro">
      <form className="auth__form" onSubmit={onSubmit}>
        <div className="auth__field">
          <label className="auth__label" htmlFor="login-email">
            E-mail
          </label>
          <div className="auth__input-wrap">
            <input
              id="login-email"
              className="auth__input"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="auth__field">
          <label className="auth__label" htmlFor="login-senha">
            Senha
          </label>
          <div className="auth__input-wrap">
            <input
              id="login-senha"
              className="auth__input"
              type={verSenha ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <button
              type="button"
              className="auth__eye"
              onClick={() => setVerSenha((v) => !v)}
              aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              <img src="/assets/login/icon-eye-off.svg" alt="" />
            </button>
          </div>
        </div>

        {aviso && <p className="auth__error">{aviso}</p>}

        <div className="auth__submit-block">
          <button type="submit" className="auth__submit">
            Entrar
          </button>
          <button type="button" className="auth__forgot">
            Esqueci minha senha
          </button>
        </div>

        <div className="auth__or">
          <span>OU</span>
        </div>

        <Link className="auth__secondary" to="/criar-conta">
          Criar conta
        </Link>
      </form>
    </AuthShell>
  );
}
