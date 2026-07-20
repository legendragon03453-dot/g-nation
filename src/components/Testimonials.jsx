import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { brandG } from "./LogoG";
import "./Testimonials.css";
import { RevealTitle } from "./Reveal";

const TESTIMONIALS = [
  {
    quote:
      "Comprei a Cubana Cravejada pra usar todo dia e o acabamento surpreendeu. Parece peça de vitrine, não parece bijuteria de streetwear.",
    name: "Rafael Duarte",
    role: "Cliente G-Shop",
  },
  {
    quote:
      "Fiz uma peça na G-Customizadas com meu símbolo e a curadoria fechada faz toda diferença — não é um catálogo genérico, é peça única mesmo.",
    name: "Bianca Alves",
    role: "Cliente G-Customizadas",
  },
  {
    quote:
      "O banho reforçado aguenta o uso pesado que eu dou. Já é a terceira peça que compro e nenhuma perdeu o brilho.",
    name: "Kayky Ferreira",
    role: "Cliente G-Shop",
  },
  {
    quote:
      "Entrega rápida, embalagem impecável e a corrente tem um peso que mostra que não é peça barata. Recomendo.",
    name: "Luana Prado",
    role: "Cliente G-Shop",
  },
];

// Faithful to the real component (Testimonials -> Slideshow.js): itemAmount 1,
// dragControl true, autoPlayControl false, direction left.
export default function Testimonials() {
  const [index, setIndex] = useState(0);

  const go = (dir) => {
    setIndex((i) => (i + dir + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  return (
    <section className="testimonials">
      <div className="testimonials__title">
        <RevealTitle as="h2">Depoimentos</RevealTitle>
      </div>

      <div className="testimonials__carousel">
        <AnimatePresence mode="wait">
          <motion.div
            className="testimonials__card"
            key={index}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) go(1);
              else if (info.offset.x > 80) go(-1);
            }}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
          >
            <p>&ldquo;{brandG(TESTIMONIALS[index].quote, { flat: true })}&rdquo;</p>
            <div className="testimonials__author">
              <strong>{TESTIMONIALS[index].name}</strong>
              <span>{brandG(TESTIMONIALS[index].role, { flat: true })}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="testimonials__dots">
        {TESTIMONIALS.map((t, i) => (
          <button
            key={t.name}
            className={i === index ? "is-active" : ""}
            aria-label={`Depoimento ${i + 1}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
