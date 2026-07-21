import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import { useAuth } from "../AuthContext";
import "./AccountPage.css";

const EASE = [0.16, 1, 0.3, 1];

// Minha conta. Enxuta de propósito: mostra o que EXISTE de verdade hoje
// (quem está logado, e-mail, desde quando) e sai. "Meus pedidos" e
// "endereços" só entram quando houver pedido e endereço no banco —
// tela bonita com dado inventado não ajuda ninguém a testar nada.
export default function AccountPage() {
  const { usuario, nome, logado, carregando, sair } = useAuth();

  // espera a sessão voltar do storage antes de decidir — sem isso a
  // pessoa logada pisca no login toda vez que recarrega a página
  if (carregando) {
    return (
      <div className="conta">
        <Navbar variant="inline" />
        <div className="conta__inner">
          <p className="conta__carregando">Carregando…</p>
        </div>
      </div>
    );
  }

  if (!logado) return <Navigate to="/login" replace state={{ de: "/conta" }} />;

  const desde = usuario?.created_at
    ? new Date(usuario.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="conta">
      <Navbar variant="inline" />

      <motion.div
        className="conta__inner"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <header className="conta__head">
          <p className="conta__eyebrow">Minha conta</p>
          <h1 className="conta__nome">{nome}</h1>
        </header>

        <div className="conta__grid">
          <section className="conta__bloco">
            <h2 className="conta__bloco-titulo">Dados</h2>
            <dl className="conta__dados">
              <div>
                <dt>E-mail</dt>
                <dd>{usuario.email}</dd>
              </div>
              {desde && (
                <div>
                  <dt>Cliente desde</dt>
                  <dd>{desde}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="conta__bloco">
            <h2 className="conta__bloco-titulo">Pedidos</h2>
            <p className="conta__vazio">
              Você ainda não fez nenhum pedido. Quando fizer, ele aparece aqui.
            </p>
            <Link className="conta__ghost" to="/colecao/g-shop">
              Ver a vitrine
            </Link>
          </section>
        </div>

        <button type="button" className="conta__sair" onClick={sair}>
          Sair da conta
        </button>
      </motion.div>
    </div>
  );
}
