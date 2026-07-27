import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import "./PecaCard.css";
import { fotoProduto } from "../lib/img";

// CARD DE PEÇA — um só, usado por Lançamentos e por "Confira também".
//
// As duas seções mostravam o mesmo tipo de conteúdo (peça, nome, preço)
// com dois sistemas visuais diferentes: uma preta com malha branca de
// 2px, foto 16:9, título em JetBrains Mono caixa alta alinhado à
// esquerda; a outra branca, com foto quadrada de canto arredondado,
// título em Open Sauce capitalizado e centralizado. Lado a lado na mesma
// home, pareciam vir de dois sites.
//
// A causa foi cada seção ter nascido com o próprio CSS. Enquanto o
// visual morar em dois arquivos, ele volta a divergir na primeira
// alteração — então agora mora aqui, num componente, e cada seção
// contribui só com a MALHA (as bordas entre células), que é o que de
// fato muda entre elas.
//
// `preco` chega pronto do catálogo. Quando há promoção, o preço cheio
// vem riscado ao lado do vigente — é o "de/por" que o painel cadastra.
export default function PecaCard({ p, i = 0, className = "" }) {
  return (
    <motion.div
      className={`peca-card ${className}`.trim()}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Link por dentro do motion.div: animar o próprio <a> fazia o
          Framer Motion reescrever o transform do elemento clicável a cada
          frame, e o alvo do clique andava junto com a animação. */}
      <Link className="peca-card__link" to={`/produto/${p.slug}`}>
        <span className="peca-card__photo">
          <img
            className="peca-card__img peca-card__img--base"
            src={fotoProduto(p.img)}
            alt={p.title}
            loading="lazy"
          />
          {p.hoverImg && (
            <img
              className="peca-card__img peca-card__img--hover"
              src={fotoProduto(p.hoverImg)}
              alt=""
              loading="lazy"
            />
          )}
        </span>

        <h4 className="peca-card__title">{p.title}</h4>

        <span className="peca-card__row">
          <span className="peca-card__price">{p.price}</span>
          {/* só existe quando a peça está em promoção */}
          {p.priceFull && <span className="peca-card__price-full">{p.priceFull}</span>}
        </span>
      </Link>
    </motion.div>
  );
}
