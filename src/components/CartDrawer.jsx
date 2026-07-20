import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useCart, brl } from "../CartContext";
import { brandG } from "./LogoG";
import "./CartDrawer.css";

const EASE = [0.16, 1, 0.3, 1];

// Gaveta da sacola. É gaveta e não página porque conferir o que já se
// pegou é uma consulta no meio da navegação — fechar devolve a pessoa
// exatamente onde ela estava, sem recarregar a vitrine.
export default function CartDrawer() {
  const { itens, totalItens, subtotal, aberta, fechar, remover, mudarQtd } = useCart();

  // Esc fecha, e o body para de rolar enquanto a gaveta está aberta —
  // sem isso o fundo rola atrás da gaveta quando a lista chega ao fim.
  useEffect(() => {
    if (!aberta) return;
    const onKey = (e) => {
      if (e.key === "Escape") fechar();
    };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", onKey);
    };
  }, [aberta, fechar]);

  return (
    <AnimatePresence>
      {aberta && (
        <>
          <motion.button
            type="button"
            className="cart-backdrop"
            aria-label="Fechar sacola"
            onClick={fechar}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />

          <motion.aside
            className="cart"
            role="dialog"
            aria-label="Sacola"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div className="cart__accent" />

            <div className="cart__head">
              <div>
                <p className="cart__title">Sacola</p>
                <span className="cart__count">
                  {totalItens === 0
                    ? "Vazia"
                    : `${totalItens} ${totalItens === 1 ? "peça" : "peças"}`}
                </span>
              </div>
              <button
                type="button"
                className="cart__close"
                onClick={fechar}
                aria-label="Fechar sacola"
              >
                ×
              </button>
            </div>

            {itens.length === 0 ? (
              <div className="cart__empty">
                <p>Sua sacola está vazia. Escolha uma peça e ela aparece aqui.</p>
                <Link className="cart__ghost" to="/colecao/g-shop" onClick={fechar}>
                  Ver a vitrine
                </Link>
              </div>
            ) : (
              <>
                <div className="cart__list">
                  {itens.map((i) => (
                    <div className="cart__item" key={i.id}>
                      <Link
                        className="cart__photo"
                        to={`/produto/${i.slug}`}
                        onClick={fechar}
                      >
                        <img src={`/assets/products/${i.img}`} alt={i.title} />
                      </Link>

                      <div className="cart__info">
                        <Link
                          className="cart__name"
                          to={`/produto/${i.slug}`}
                          onClick={fechar}
                        >
                          {brandG(i.title)}
                        </Link>

                        {(i.material || i.tamanho) && (
                          <span className="cart__variant">
                            {[i.material, i.tamanho].filter(Boolean).join(" · ")}
                          </span>
                        )}

                        <div className="cart__row">
                          <div className="cart__qty">
                            <button
                              type="button"
                              onClick={() => mudarQtd(i.id, -1)}
                              aria-label={`Diminuir ${i.title}`}
                            >
                              −
                            </button>
                            <span>{i.qtd}</span>
                            <button
                              type="button"
                              onClick={() => mudarQtd(i.id, 1)}
                              aria-label={`Aumentar ${i.title}`}
                            >
                              +
                            </button>
                          </div>
                          <span className="cart__price">
                            {brl(i.priceValue * i.qtd)}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="cart__remove"
                          onClick={() => remover(i.id)}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart__foot">
                  <div className="cart__total">
                    <span className="cart__total-label">Subtotal</span>
                    <span className="cart__total-value">{brl(subtotal)}</span>
                  </div>
                  <p className="cart__note">Frete grátis para todo o Brasil.</p>
                  <button type="button" className="cart__cta">
                    Finalizar compra
                  </button>
                  <button type="button" className="cart__ghost" onClick={fechar}>
                    Continuar comprando
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
