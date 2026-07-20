import { Link } from "react-router-dom";
import LogoG from "./LogoG";
import "./Navbar.css";

// Porte fiel do node 27:40 "NAVBAR" do Figma (frame 1920x155): fundo
// #080808 com "G" tipográfico gigante vermelho translúcido vazando como
// textura (27:41), logo real centralizado (27:42, asset baixado —
// navbar-logo.png), links à esquerda em x=150 (27:53) e os três ícones
// mascarados (carrinho/conta/busca, 27:43) à direita em x=1622 — os
// mesmos assets já baixados pra navbar da página de coleção (27:671 é o
// mesmo componente no Figma).
export default function Navbar() {
  return (
    <nav className="navbar">
      <span className="navbar__g" aria-hidden="true">
        G
      </span>
      <div className="navbar__links">
        <Link to="/colecao/g-shop"><LogoG className="logo-g--flat" />-SHOP</Link>
        <Link to="/colecao/g-customizadas"><LogoG className="logo-g--flat" />-CUSTOMIZADAS</Link>
        <a href="/contact">CONTATO</a>
      </div>
      <Link className="navbar__logo" to="/">
        <img src="/assets/colecao/navbar-logo.png" alt="G-Nation" />
      </Link>
      <div className="navbar__icons">
        <span
          className="navbar__icon"
          style={{ maskImage: "url(/assets/colecao/mask-cart.png)", WebkitMaskImage: "url(/assets/colecao/mask-cart.png)" }}
        />
        <span
          className="navbar__icon"
          style={{ maskImage: "url(/assets/colecao/mask-user.png)", WebkitMaskImage: "url(/assets/colecao/mask-user.png)" }}
        />
        <span
          className="navbar__icon"
          style={{ maskImage: "url(/assets/colecao/mask-search.png)", WebkitMaskImage: "url(/assets/colecao/mask-search.png)" }}
        />
      </div>
    </nav>
  );
}
