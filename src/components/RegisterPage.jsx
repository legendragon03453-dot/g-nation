import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import { useAuth, mensagemErro } from "../AuthContext";
import { avaliar, pareceComOsDados } from "../lib/senha";

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
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { criarConta, logado } = useAuth();
  const navigate = useNavigate();

  // Se a confirmação de e-mail estiver desligada no projeto, o signUp já
  // devolve sessão — nesse caso a pessoa entra direto, sem passar pelo
  // login. Com confirmação ligada, o `ok` abaixo é que dá a instrução.
  useEffect(() => {
    if (logado) navigate("/", { replace: true });
  }, [logado, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setAviso("");
    setOk("");
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      setAviso("Preencha nome, e-mail e senha para criar sua conta.");
      return;
    }
    // A mesma política que o banco exige, dita aqui em português e ANTES
    // de gastar uma ida ao servidor pra levar não.
    const forca = avaliar(senha);
    if (!forca.valida) {
      setAviso(forca.primeiroProblema);
      return;
    }
    if (pareceComOsDados(senha, email, nome)) {
      setAviso("Evite usar seu nome ou e-mail na senha.");
      return;
    }
    if (!aceite) {
      setAviso("É preciso aceitar os termos para criar a conta.");
      return;
    }
    setEnviando(true);
    const { data, error } = await criarConta(email.trim(), senha, nome.trim());
    setEnviando(false);
    if (error) {
      setAviso(mensagemErro(error));
      return;
    }
    if (!data.session) {
      setOk("Conta criada. Confirme o e-mail que enviamos para entrar.");
    }
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
              aria-describedby="reg-senha-regras"
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

          {/* As regras aparecem quando a pessoa começa a digitar, e não
              de cara: numa tela de cadastro, quatro exigências antes do
              primeiro caractere parecem um interrogatório. Depois de
              digitada, cada regra cumprida acende — assim ela vê o que
              falta em vez de descobrir no erro do envio. */}
          {senha.length > 0 && (
            <ul className="auth__regras" id="reg-senha-regras">
              {avaliar(senha).regras.map((r) => (
                <li
                  key={r.id}
                  className={r.ok ? "is-ok" : undefined}
                  /* o estado real vai no texto pra leitor de tela, não só
                     na cor — quem não enxerga a cor precisa da mesma
                     informação */
                  aria-label={`${r.texto}: ${r.ok ? "cumprido" : "faltando"}`}
                >
                  <span className="auth__regra-marca" aria-hidden="true" />
                  {r.texto}
                </li>
              ))}
            </ul>
          )}
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
        {ok && <p className="auth__ok">{ok}</p>}

        <div className="auth__submit-block">
          <button type="submit" className="auth__submit" disabled={enviando}>
            {enviando ? "Criando…" : "Criar conta"}
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
