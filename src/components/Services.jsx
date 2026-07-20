import { motion } from "framer-motion";
import { brandG } from "./LogoG";
import "./Services.css";
import { RevealTitle } from "./Reveal";

const SERVICES = [
  {
    title: "Cordões",
    bullets: [
      "Cubana cravejada",
      "Tennis chain",
      "Elo grumet",
      "Banho de ouro 18k",
      "Prata com zircônia",
    ],
  },
  {
    title: "Pingentes",
    bullets: [
      "Medalhões",
      "Letras e números",
      "Temáticos",
      "Full iced",
      "Crucifixos",
      "Placas personalizadas",
    ],
  },
  {
    title: "G-Customizadas",
    bullets: [
      "Peça desenhada do zero",
      "Nome, logo ou símbolo",
      "Escolha de pedra e banho",
      "Aprovação por render 3D",
      "Produção acompanhada",
      "Entrega com certificado",
    ],
  },
  {
    title: "Pulseiras e Anéis",
    bullets: [
      "Cuban bracelet",
      "Trevo Royal",
      "Anéis de brasão",
      "Conjuntos combinando",
    ],
  },
];

export default function Services() {
  return (
    <section className="services">
      <div className="services__title">
        <RevealTitle as="h2">Nossas Linhas</RevealTitle>
      </div>

      <div className="services__listing">
        {SERVICES.map((s, i) => (
          <motion.div
            className="services__card"
            key={s.title}
            style={{ zIndex: i + 1 }}
            initial={{ opacity: 0.3, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
          >
            <span className="services__index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3>{brandG(s.title)}</h3>
            <ul>
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
