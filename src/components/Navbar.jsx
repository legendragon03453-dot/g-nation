import { Link, useLocation } from "react-router-dom";
import LogoG from "./LogoG";
import { useCart } from "../CartContext";
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
  const { pathname } = useLocation();

  const ehAtual = (destino) => pathname.startsWith(destino);

  return (
    <nav className={`navbar navbar--${variant}`}>
      <span className="navbar__g" aria-hidden="true">
        G
      </span>

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
        <Link className="navbar__icon-btn" to="/login" aria-label="Minha conta">
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
