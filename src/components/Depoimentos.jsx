import { motion } from "framer-motion";
import Fita from "./Fita";
import "./Depoimentos.css";

// Porte fiel do node 27:103 "PROVA SOCIAL" (Depoimentos) do Figma
// (TXte9vygIeSP76UVjnbwLT): fundo #fff6f6, título "DEPOIMENTOS" preto
// centralizado, 4 cards pretos 400px (padding 40, gap 24) com 5 estrelas
// (asset real), texto Inter 18px branco lh 1.6, divisor 12px + nome caps,
// linhas verticais nas margens. Fita de serviços (réplica do SYLVEN,
// expansível no hover) abre a seção — preto sobre o fundo claro.
//
// Motion premium (tudo framer-motion):
// - título revela por máscara (sobe de dentro de um overflow hidden)
// - cards entram em cascata com spring, levemente rotacionados, e
//   endireitam ao assentar
// - estrelas pipocam uma a uma (scale spring) quando o card entra
// - hover no card: levanta com sombra e a fileira de estrelas ganha
//   um shimmer sutil (escala 1.06)
// Texto dos cards: o literal do arquivo Figma (placeholder repetido nos
// 4 cards; mantido, sem inventar depoimentos falsos).
const CARD = {
  body:
    '"The quality of the craftsmanship is evident the moment you open the box. It fits perfectly into my minimalist setup and arrived much faster than I expected."',
  name: "Marcus Henderson",
};

const EASE = [0.16, 1, 0.3, 1];

function Card({ i }) {
  return (
    <motion.article
      className="depo__card"
      initial={{ opacity: 0, y: 56, rotate: i % 2 === 0 ? -2.5 : 2.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 120, damping: 19, delay: i * 0.12 }}
      whileHover={{ y: -10, boxShadow: "0 24px 48px rgba(0,0,0,0.35)" }}
    >
      <motion.div
        className="depo__stars"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.6 }}
        variants={{
          visible: { transition: { staggerChildren: 0.09, delayChildren: 0.25 + i * 0.12 } },
        }}
      >
        {[0, 1, 2, 3, 4].map((s) => (
          <motion.img
            key={s}
            src="/assets/sections/star-depoimentos.svg"
            alt=""
            variants={{
              hidden: { scale: 0, opacity: 0 },
              visible: { scale: 1, opacity: 1 },
            }}
            transition={{ type: "spring", stiffness: 420, damping: 17 }}
            whileHover={{ scale: 1.2, rotate: 8 }}
          />
        ))}
      </motion.div>
      <p className="depo__body">{CARD.body}</p>
      <div className="depo__attribution">
        <motion.span
          className="depo__divider"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 + i * 0.12, ease: EASE }}
        />
        <span className="depo__name">{CARD.name}</span>
      </div>
    </motion.article>
  );
}

export default function Depoimentos() {
  return (
    <section className="depo" id="depoimentos">
      <Fita />

      <div className="depo__inner">
        <span className="depo__line depo__line--left" />
        <span className="depo__line depo__line--right" />

        <div className="depo__title-mask">
          <motion.h2
            initial={{ y: "110%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <span className="tw-solid">DEPOIMENTOS</span>
            <span className="tw-outline">QUEM USA SABE</span>
          </motion.h2>
        </div>

        <div className="depo__row">
          {[0, 1, 2, 3].map((i) => (
            <Card i={i} key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
