import { Link } from "react-router-dom";
import Wordmark from "./Wordmark";
import "./Footer.css";

// Porte fiel do node 27:196 "footer-g-nation" da HOME do Figma
// (TXte9vygIeSP76UVjnbwLT), via get_design_context + download_assets:
// barra de acento vermelha 4px, footer-main (padding 80/150/60) com 3
// colunas — marca+socials / Navegação / Atendimento — linha divisória e
// footer-bottom (padding 32/150) com copyright + links legais. Fonte
// Inter em todo o bloco (é o que o Figma usa aqui, não JetBrains).
// O footer que estava no projeto (About/Works, Juiz de Fora, TikTok,
// "2026 © G-Nation") não existia no arquivo — foi substituído por este.
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__accent" />

      <div className="footer__main">
        <div className="footer__brand">
          <div className="footer__logo-wrap">
            <p className="footer__wordmark"><Wordmark flat /></p>
            <p className="footer__tagline">
              Marca de joias e acessórios de streetwear premium. Cultura de rua com
              acabamento de luxo. Curadoria fechada, peças com presença, preço que filtra.
            </p>
          </div>
          <div className="footer__socials">
            <p className="footer__col-title">Siga a cultura</p>
            <div className="footer__social-row">
              <a className="footer__social" href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">
                <img src="/assets/footer/instagram.svg" alt="" />
              </a>
              <a className="footer__social" href="https://x.com" target="_blank" rel="noopener" aria-label="X">
                <img src="/assets/footer/x.svg" alt="" />
              </a>
              <a className="footer__social" href="https://tiktok.com" target="_blank" rel="noopener" aria-label="TikTok">
                <img src="/assets/footer/x.svg" alt="" />
              </a>
            </div>
          </div>
        </div>

        <div className="footer__col">
          <p className="footer__col-title">Navegação</p>
          <div className="footer__links">
            <Link to="/">Início</Link>
            <Link to="/colecao/g-shop">Produtos</Link>
            <a href="/#lancamentos">Lançamentos</a>
            <a href="/#depoimentos">Depoimentos</a>
            <Link to="/contato">Contato</Link>
          </div>
        </div>

        <div className="footer__col">
          <p className="footer__col-title">Atendimento</p>
          <div className="footer__info">
            <div className="footer__info-block">
              <p className="footer__info-label">Email</p>
              <p className="footer__info-value">contato@gnation.com.br</p>
            </div>
            <div className="footer__info-block">
              <p className="footer__info-label">Horário</p>
              <p className="footer__info-value">Seg - Sex: 09h às 18h</p>
            </div>
            <div className="footer__info-block">
              <p className="footer__info-label">Pagamento</p>
              <div className="footer__pay-row">
                <span className="footer__pay"><img src="/assets/footer/pay-1.svg" alt="" /></span>
                <span className="footer__pay"><img src="/assets/footer/pay-card.svg" alt="" /></span>
                <span className="footer__pay"><img src="/assets/footer/pay-1.svg" alt="" /></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer__divider" />

      <div className="footer__bottom">
        <p>© 2024 <Wordmark flat /> URBAN JEWELRY. TODOS OS DIREITOS RESERVADOS.</p>
        <div className="footer__legal">
          <span>Políticas de Privacidade</span>
          <span>Termos de Uso</span>
          <span>Trocas e Devoluções</span>
        </div>
      </div>
    </footer>
  );
}
