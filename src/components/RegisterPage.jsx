import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "./AuthShell";

// "Criar conta" — a MESMA peça do login (AuthShell): mesmo quadro, mesmo
// vídeo, mesma tipografia, mesmos botões. Muda só o que o formulário
// pede. Não é uma segunda tela parecida, é a mesma com outro conteúdo.
//
// Campos enxutos de propósito: nome, e-mail, senha e o aceite. Cadastro
// de loja não precisa de CPF/telefone na porta de entrada — isso se pede
// no checkout, quando a pessoa já quer comprar.
//
// Sem backend ainda: valida de verdade e diz a verdade sobre o estado.
export default function RegisterPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [aviso, setAviso] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      setAviso("Preencha nome, e-mail e senha para criar sua conta.");
      return;
    }
    if (senha.trim().length < 8) {
      setAviso("A senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (!aceite) {
      setAviso("É preciso aceitar os termos para criar a conta.");
      return;
    }
    setAviso("A área de membro ainda não está no ar. Em breve.");
  }

  return (
    <AuthShell subtitle="Criar conta">
      <form className="auth__form" onSubmit={onSubmit}>
        <div className="auth__field">
          <label className="auth__label" htmlFor="reg-nome">
            Nome
          </label>
          <div className="auth__input-wrap">
            <input
              id="reg-nome"
              className="auth__input"
              type="text"
              autoComplete="name"
              placeholder="Como te chamamos"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
        </div>

        <div className="auth__field">
          <label className="auth__label" htmlFor="reg-email">
            E-mail
          </label>
          <div className="auth__input-wrap">
            <input
              id="reg-email"
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
          <label className="auth__label" htmlFor="reg-senha">
            Senha
          </label>
          <div className="auth__input-wrap">
            <input
              id="reg-senha"
              className="auth__input"
              type={verSenha ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
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

        <label className="auth__check">
          <input
            type="checkbox"
            checked={aceite}
            onChange={(e) => setAceite(e.target.checked)}
          />
          <span className="auth__check-box" aria-hidden="true" />
          <span className="auth__check-text">
            Aceito os termos de uso e a política de privacidade.
          </span>
        </label>

        {aviso && <p className="auth__error">{aviso}</p>}

        <div className="auth__submit-block">
          <button type="submit" className="auth__submit">
            Criar conta
          </button>
        </div>

        <div className="auth__or">
          <span>OU</span>
        </div>

        <Link className="auth__secondary" to="/login">
          Já tenho conta
        </Link>
      </form>
    </AuthShell>
  );
}
