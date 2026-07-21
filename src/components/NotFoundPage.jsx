import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import Footer from "./Footer";
import "./NotFoundPage.css";

const EASE = [0.16, 1, 0.3, 1];

// 404. Antes qualquer URL fora das rotas conhecidas renderizava NADA —
// tela branca com o botão de som flutuando, sem nem dizer que estava
// errado e sem caminho de volta. O SPA responde 200 em tudo (rewrite da
// Vercel), então quem tem que tratar o caso é o roteador, não o servidor.
export default function NotFoundPage() {
  return (
    <div className="e404">
      <Navbar variant="inline" />

      <motion.div
        className="e404__inner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <p className="e404__codigo" aria-hidden="true">
          404
        </p>
        <h1 className="e404__titulo">
          <span className="tw-solid">PÁGINA</span>
          <span className="tw-outline">SUMIU</span>
        </h1>
        <p className="e404__texto">
          O endereço que você abriu não existe mais — ou nunca existiu. As peças
          continuam todas na vitrine.
        </p>

        <div className="e404__acoes">
          <Link className="e404__cta" to="/colecao/g-shop">
            Ver a vitrine
          </Link>
          <Link className="e404__ghost" to="/">
            Voltar pro início
          </Link>
        </div>
      </motion.div>

      <Footer />
    </div>
  );
}
