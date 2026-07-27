import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { supabase } from "../../supabase";
import Wordmark from "../Wordmark";
import "./admin.css";

// Casca do painel — node 27:545 do Figma ("painel-admin"): sidebar preta
// de 320px à esquerda com a marca em cima, navegação no meio e o cartão
// de quem está logado embaixo; conteúdo à direita sobre fundo preto.
//
// A sidebar é a mesma em todas as seções, então ela vive aqui e cada
// tela entra pelo <Outlet/>. Assim "Pedidos" e "Dashboard" não são duas
// páginas parecidas, são a mesma casca com outro miolo — a mesma decisão
// que o AuthShell tomou pro login e o criar-conta.
const SECOES = [
  { para: "/admin", fim: true, rotulo: "Dashboard", icone: "grid" },
  { para: "/admin/produtos", rotulo: "Produtos", icone: "cubo" },
  { para: "/admin/pedidos", rotulo: "Pedidos", icone: "sacola" },
  { para: "/admin/clientes", rotulo: "Clientes", icone: "pessoas" },
  { para: "/admin/cupons", rotulo: "Cupons", icone: "porcento" },
  { para: "/admin/depoimentos", rotulo: "Depoimentos", icone: "aspas" },
  { para: "/admin/configuracoes", rotulo: "Configurações", icone: "engrenagem" },
];

// Ícones desenhados aqui em vez de importados: o frame do Figma usa
// pictogramas de traço fino de 20px, e cada um é uma forma simples. Puxar
// uma biblioteca inteira de ícones pra seis glifos pesaria mais no bundle
// do que o painel todo.
function Icone({ nome }) {
  const comum = {
    width: 20,
    height: 20,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  switch (nome) {
    case "grid":
      return (
        <svg {...comum}>
          <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
          <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
          <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
          <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
        </svg>
      );
    case "cubo":
      return (
        <svg {...comum}>
          <path d="M10 2.5 17 6v8l-7 3.5L3 14V6l7-3.5Z" />
          <path d="M3 6l7 3.5L17 6M10 9.5v8" />
        </svg>
      );
    case "sacola":
      return (
        <svg {...comum}>
          <path d="M3.5 6.5h13v10a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-10Z" />
          <path d="M7 6.5V5a3 3 0 0 1 6 0v1.5" />
        </svg>
      );
    case "pessoas":
      return (
        <svg {...comum}>
          <circle cx="7.5" cy="7" r="2.75" />
          <path d="M2.5 17c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
          <path d="M13.5 5.5a2.75 2.75 0 0 1 0 5.5M14.5 12.8c1.9.5 3 2.2 3 4.2" />
        </svg>
      );
    case "porcento":
      return (
        <svg {...comum}>
          <path d="M15.5 4.5 4.5 15.5" />
          <circle cx="6.5" cy="6.5" r="2" />
          <circle cx="13.5" cy="13.5" r="2" />
        </svg>
      );
    case "aspas":
      return (
        <svg {...comum}>
          <path d="M7.5 6.5H4.5v4h3l-1 3M15.5 6.5h-3v4h3l-1 3" />
        </svg>
      );
    default:
      return (
        <svg {...comum}>
          <circle cx="10" cy="10" r="2.75" />
          <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7" />
        </svg>
      );
  }
}

export default function AdminLayout() {
  const { usuario, logado, carregando, nome, sair } = useAuth();
  const [ehAdmin, setEhAdmin] = useState(null); // null = ainda perguntando
  const { pathname } = useLocation();

  // Quem é admin está no banco, não na sessão. O JWT não carrega essa
  // flag, então a tela precisa perguntar — e enquanto não sabe, não
  // mostra nem o painel nem o "sem permissão".
  //
  // Isto é conveniência de navegação, NÃO a proteção: mesmo que alguém
  // force `ehAdmin = true` no console, cada consulta desta área bate no
  // RLS com `eh_admin()`, e as tabelas voltam vazias. O painel apareceria
  // sem um dado sequer.
  useEffect(() => {
    if (!usuario) {
      setEhAdmin(false);
      return;
    }
    let vivo = true;
    (async () => {
      const { data } = await supabase
        .from("perfis")
        .select("admin")
        .eq("id", usuario.id)
        .maybeSingle();
      if (vivo) setEhAdmin(!!data?.admin);
    })();
    return () => {
      vivo = false;
    };
  }, [usuario]);

  if (carregando || (logado && ehAdmin === null)) {
    return <div className="adm adm--vazio">Carregando o painel…</div>;
  }

  if (!logado) return <Navigate to="/login" replace state={{ de: pathname }} />;

  // Resposta honesta e sem pista: quem não é da casa não precisa saber se
  // a rota existe, nem o que teria dentro.
  if (!ehAdmin) {
    return (
      <div className="adm adm--vazio">
        <div className="adm__negado">
          <h1>Área restrita</h1>
          <p>Esta conta não tem acesso ao painel da loja.</p>
          <Link className="adm__btn" to="/">
            Voltar pra loja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="adm">
      <aside className="adm__side">
        {/* A logo REAL do site (Wordmark) no lugar do texto "G-NATION", e
            leva pra HOME — é a saída do painel de volta pra loja. O
            Dashboard continua no primeiro item do menu abaixo. */}
        <Link className="adm__marca" to="/" title="Voltar para a loja">
          <Wordmark flat className="adm__marca-logo" />
          <span className="adm__marca-tag">ADMIN</span>
        </Link>

        <nav className="adm__nav">
          {SECOES.map((s) => (
            <NavLink
              key={s.para}
              to={s.para}
              end={s.fim}
              className={({ isActive }) =>
                `adm__nav-item${isActive ? " is-ativo" : ""}`
              }
            >
              <Icone nome={s.icone} />
              {s.rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="adm__eu">
          <span className="adm__eu-foto" aria-hidden="true">
            {nome.slice(0, 1).toUpperCase()}
          </span>
          <span className="adm__eu-txt">
            <strong>{nome}</strong>
            <span>Administrador</span>
          </span>
          <button type="button" className="adm__sair" onClick={sair}>
            Sair
          </button>
        </div>
      </aside>

      <main className="adm__main">
        <Outlet />
      </main>
    </div>
  );
}
