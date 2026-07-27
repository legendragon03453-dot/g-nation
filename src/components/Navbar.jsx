import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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
// As categorias que a loja tem. Batem com as chaves de COLLECTIONS —
// cada uma já tinha página funcionando, faltava o caminho até ela.
const CATEGORIAS = [
  { slug: "correntes", rotulo: "CORRENTES" },
  { slug: "pulseiras", rotulo: "PULSEIRAS" },
  { slug: "aneis", rotulo: "ANÉIS" },
  { slug: "pingentes", rotulo: "PINGENTES" },
];

export default function Navbar({ variant = "overlay" }) {
  const { totalItens, abrir } = useCart();
  const { logado, nome } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [catAberta, setCatAberta] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const campoBusca = useRef(null);

  // No mesmo ponto em que a barra vira o menu recolhido (960px), o menu de
  // categorias troca de hover pra clique/acordeão. Ler em JS porque o
  // COMPORTAMENTO muda (não só o estilo): no touch não existe hover.
  const [ehMobileNav, setEhMobileNav] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 960px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 960px)");
    const ouvir = (e) => setEhMobileNav(e.matches);
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, []);

  const ehAtual = (destino) => pathname.startsWith(destino);

  // troca de rota fecha o menu de categorias (senão fica aberto por cima
  // da página nova)
  useEffect(() => {
    setCatAberta(false);
  }, [pathname]);

  // O campo só existe depois de abrir, então o foco precisa esperar ele
  // entrar no DOM — sem isso a pessoa clica na lupa e tem que clicar de
  // novo pra digitar.
  useEffect(() => {
    if (buscaAberta) campoBusca.current?.focus();
  }, [buscaAberta]);

  function enviarBusca() {
    const q = termo.trim();
    if (!q) {
      setBuscaAberta(false);
      return;
    }
    // A busca sempre cai na vitrine inteira: procurar "anel" estando na
    // página de Pulseiras não pode devolver vazio por causa da categoria.
    navigate(`/colecao/g-shop?q=${encodeURIComponent(q)}`);
    setBuscaAberta(false);
    setTermo("");
  }

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
      {/* Textura da barra — o "G" gigante da marca vazando (Figma 27:41).
          Era uma letra "G" escrita em JetBrains Mono; o Figma usa a fonte
          MONSTERA, que é a tipografia rasgada da marca. Fontes diferentes
          desenham formas diferentes: saía um bloco geométrico chapado no
          canto em vez dos riscos que cruzam a barra. Agora é o recorte
          exportado do próprio arquivo, sem depender de ter a fonte. */}
      <span className="navbar__g-clip" aria-hidden="true">
        <span className="navbar__g" />
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

        {/* CATEGORIAS — menu com motion.
            No DESKTOP abre no hover; o vão entre o botão e o painel era
            uma margem "morta" que fechava o menu no meio do caminho —
            agora o vão é padding DENTRO da área de hover (ponte), então a
            seta cruza sem o menu sumir. No CELULAR não há hover: vira um
            acordeão que empurra o resto pra baixo, com a setinha girando.
            A entrada/saída e o stagger dos itens são framer-motion. */}
        <div
          className={`navbar__drop${catAberta ? " is-aberta" : ""}`}
          onMouseEnter={() => !ehMobileNav && setCatAberta(true)}
          onMouseLeave={() => !ehMobileNav && setCatAberta(false)}
        >
          <button
            type="button"
            className="navbar__drop-btn"
            aria-expanded={catAberta}
            onClick={() => setCatAberta((v) => !v)}
          >
            CATEGORIAS
            <motion.span
              className="navbar__drop-seta"
              aria-hidden="true"
              animate={{ rotate: catAberta ? 180 : 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              ▾
            </motion.span>
          </button>

          <AnimatePresence>
            {catAberta && (
              <motion.div
                className="navbar__drop-menu"
                initial={{ opacity: 0, y: ehMobileNav ? 0 : -8, height: ehMobileNav ? 0 : "auto" }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: ehMobileNav ? 0 : -8, height: ehMobileNav ? 0 : "auto" }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.div
                  className="navbar__drop-inner"
                  initial="oculto"
                  animate="visivel"
                  variants={{
                    visivel: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
                  }}
                >
                  {CATEGORIAS.map((c) => (
                    <motion.div
                      key={c.slug}
                      variants={{
                        oculto: { opacity: 0, x: -10 },
                        visivel: { opacity: 1, x: 0 },
                      }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link to={`/colecao/${c.slug}`} onClick={() => setCatAberta(false)}>
                        <span className="navbar__drop-traco" aria-hidden="true" />
                        {c.rotulo}
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Link to="/contato">CONTATO</Link>
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
        {/* BUSCA DE VERDADE. Era um <Link to="/colecao/g-shop">: clicar na
            lupa levava pra vitrine inteira, sem buscar nada. Agora abre um
            campo e leva o termo pra vitrine, que filtra por nome,
            categoria e descrição. */}
        <div className={`navbar__busca${buscaAberta ? " is-aberta" : ""}`}>
          {buscaAberta && (
            <input
              ref={campoBusca}
              type="search"
              value={termo}
              placeholder="O que você procura?"
              aria-label="Buscar peças"
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") enviarBusca();
                if (e.key === "Escape") setBuscaAberta(false);
              }}
              onBlur={() => !termo && setBuscaAberta(false)}
            />
          )}
          <button
            type="button"
            className="navbar__icon-btn"
            aria-label={buscaAberta ? "Buscar" : "Abrir busca"}
            onClick={() => (buscaAberta ? enviarBusca() : setBuscaAberta(true))}
          >
            <span
              className="navbar__icon"
              style={{ maskImage: "url(/assets/colecao/mask-search.png)", WebkitMaskImage: "url(/assets/colecao/mask-search.png)" }}
            />
          </button>
        </div>
      </div>
    </nav>
  );
}
