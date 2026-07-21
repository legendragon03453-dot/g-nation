import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import LogoG from "./LogoG";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";
import "./Navbar.css";

// NAVBAR GLOBAL — uma só no site inteiro (node 27:40 do Figma).
//
// Antes existiam TRÊS: esta, a `.cp__navbar` da coleção (155px, fonte e
// ícones maiores) e a `.pp__navbar` do produto (120px, outra logo, outros
// arquivos de ícone, um link vermelho fixo). Mexer numa página bagunçava
// as outras, porque não havia fonte única — era o mesmo desenho copiado
// três vezes e já divergido.
//
// A adaptação por página é DECLARADA, não improvisada:
//
//   variant="overlay"  (padrão) barra fixa por cima do conteúdo. É o caso
//                      da home, onde o hero começa debaixo dela.
//   variant="inline"   barra estática, ocupando espaço no fluxo. É o caso
//                      das páginas internas, onde o conteúdo começa
//                      DEPOIS dela — sem isso a página precisaria de um
//                      padding-top compensando a barra fixa, que é
//                      exatamente o tipo de gambiarra que quebra layout
//                      quando alguém edita a página.
//
// O link da seção em que se está fica em vermelho sozinho, lendo a rota.
// Antes esse vermelho era escrito na mão na navbar do produto, e por isso
// apontava "G-SHOP" mesmo quando a peça era de outra categoria.
export default function Navbar({ variant = "overlay" }) {
  const { totalItens, abrir } = useCart();
  const { logado, nome } = useAuth();
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  const ehAtual = (destino) => pathname.startsWith(destino);

  // fecha o menu ao trocar de página — sem isso ele fica aberto por cima
  // do conteúdo novo depois de clicar num link
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  return (
    <nav className={`navbar navbar--${variant}${menuAberto ? " is-menu-aberto" : ""}`}>
      {/* O "G" gigante precisa ser recortado pela barra, mas o painel do
          menu (celular) precisa ESCAPAR dela. Como as duas coisas usam
          overflow, o recorte fica neste wrapper e não na .navbar. */}
      <span className="navbar__g-clip" aria-hidden="true">
        <span className="navbar__g">G</span>
      </span>

      {/* Só no celular: os três links não cabem ao lado da logo e dos
          ícones (atropelavam um ao outro em 390px). Viram este menu. */}
      <button
        type="button"
        className="navbar__burger"
        onClick={() => setMenuAberto((v) => !v)}
        aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
        aria-expanded={menuAberto}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="navbar__links">
        <Link
          to="/colecao/g-shop"
          className={ehAtual("/colecao/g-shop") ? "is-atual" : undefined}
        >
          <LogoG className="logo-g--flat" />-SHOP
        </Link>
        <Link
          to="/colecao/g-customizadas"
          className={ehAtual("/colecao/g-customizadas") ? "is-atual" : undefined}
        >
          <LogoG className="logo-g--flat" />-CUSTOMIZADAS
        </Link>
        <a href="/contact">CONTATO</a>
      </div>

      <Link className="navbar__logo" to="/">
        <img src="/assets/colecao/navbar-logo.png" alt="G-Nation" />
      </Link>

      {/* Os três ícones do Figma fazem o que prometem: carrinho abre a
          sacola (com contador), conta leva ao login, busca leva à vitrine. */}
      <div className="navbar__icons">
        <button
          type="button"
          className="navbar__icon-btn"
          onClick={abrir}
          aria-label={totalItens > 0 ? `Sacola (${totalItens})` : "Sacola"}
        >
          <span
            className="navbar__icon"
            style={{ maskImage: "url(/assets/colecao/mask-cart.png)", WebkitMaskImage: "url(/assets/colecao/mask-cart.png)" }}
          />
          {totalItens > 0 && <span className="navbar__badge">{totalItens}</span>}
        </button>
        {/* logado: o ícone acende no vermelho da marca e o título diz o
            nome — é o sinal de que a sessão está de pé */}
        <Link
          className={`navbar__icon-btn${logado ? " is-logado" : ""}`}
          to={logado ? "/conta" : "/login"}
          aria-label={logado ? `Minha conta (${nome})` : "Entrar"}
          title={logado ? nome : "Entrar"}
        >
          <span
            className="navbar__icon"
            style={{ maskImage: "url(/assets/colecao/mask-user.png)", WebkitMaskImage: "url(/assets/colecao/mask-user.png)" }}
          />
        </Link>
        <Link className="navbar__icon-btn" to="/colecao/g-shop" aria-label="Buscar peças">
          <span
            className="navbar__icon"
            style={{ maskImage: "url(/assets/colecao/mask-search.png)", WebkitMaskImage: "url(/assets/colecao/mask-search.png)" }}
          />
        </Link>
      </div>
    </nav>
  );
}
