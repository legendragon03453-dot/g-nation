import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import { useAuth, mensagemErro } from "../AuthContext";

// Porte do node 27:368 "minha-conta" do Figma (TXte9vygIeSP76UVjnbwLT).
// A casca (vídeo, véu, marcas, quadro, cabeçalho) é o AuthShell, o mesmo
// da tela de criar conta — aqui fica só o formulário.
//
// Autenticação real via Supabase (projeto gnation).
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [aviso, setAviso] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { entrar, recuperarSenha, logado } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Volta pra onde a pessoa queria ir antes de ser mandada pro login
  // (ex.: clicou em finalizar compra). Sem isso ela entra e cai na home,
  // tendo que refazer o caminho.
  const destino = location.state?.de || "/";

  useEffect(() => {
    if (logado) navigate(destino, { replace: true });
  }, [logado, destino, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setAviso("");
    setOk("");
    if (!email.trim() || !senha.trim()) {
      setAviso("Preencha e-mail e senha para entrar.");
      return;
    }
    setEnviando(true);
    const { error } = await entrar(email.trim(), senha);
    setEnviando(false);
    if (error) setAviso(mensagemErro(error));
    // sucesso não precisa de nada aqui: o useEffect acima redireciona
    // assim que a sessão chega
  }

  async function onEsqueci() {
    setAviso("");
    setOk("");
    if (!email.trim()) {
      setAviso("Escreva seu e-mail no campo acima para receber o link.");
      return;
    }
    setEnviando(true);
    const { error } = await recuperarSenha(email.trim());
    setEnviando(false);
    if (error) setAviso(mensagemErro(error));
    else setOk("Link enviado. Veja sua caixa de entrada.");
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
        {ok && <p className="auth__ok">{ok}</p>}

        <div className="auth__submit-block">
          <button type="submit" className="auth__submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
          <button
            type="button"
            className="auth__forgot"
            onClick={onEsqueci}
            disabled={enviando}
          >
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
