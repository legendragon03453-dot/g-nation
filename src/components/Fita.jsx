import { useState } from "react";
import { motion } from "framer-motion";
import Ticker from "./Ticker";
import LogoG from "./LogoG";
import "./Fita.css";

// Fita de serviços — réplica da ribbon do template SYLVEN
// (careful-property-333188.framer.app), auditada no devtools: barra
// rgb(23,23,23) fina, texto mono 16px branco uppercase, marquee contínuo
// via translateX em UL (mesma mecânica do nosso Ticker). Expansível com
// framer-motion (pedido): a barra abre de altura no hover com spring, e
// o texto cresce junto — animação por variants coordenadas, sempre
// framer-motion (nada de transition CSS).
// Itens: categorias/linhas reais do catálogo gnation, não os serviços
// da agência do template.
const ITEMS = [
  "Correntes",
  "Anéis",
  "Pulseiras",
  "Pingentes",
  "G-Customizadas",
  "Banho Ouro 18k",
  "Prata 925",
  "Cravação em Zircônia",
];

export default function Fita() {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className="fita"
      onHoverStart={() => setOpen(true)}
      onHoverEnd={() => setOpen(false)}
      animate={open ? "open" : "rest"}
      initial="rest"
      variants={{
        rest: { height: 44 },
        open: { height: 76 },
      }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      {/* gap generoso (72px) pra sobrar espaço quando os itens crescem no
          hover (scale 1.4) sem colidir — scale (não fontSize) preserva a
          largura de layout, então o loop infinito do marquee não quebra. */}
      <Ticker speed={60} direction="left" gap={72} hoverFactor={0.4} fadeWidth={0}>
        {ITEMS.map((item) => (
          <motion.span
            className="fita__item"
            key={item}
            variants={{
              rest: { scale: 1 },
              open: { scale: 1.4 },
            }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            {item.startsWith("G-") ? (
              <>
                <LogoG className="logo-g--flat" />
                {item.slice(1)}
              </>
            ) : (
              item
            )}
          </motion.span>
        ))}
      </Ticker>
    </motion.div>
  );
}
