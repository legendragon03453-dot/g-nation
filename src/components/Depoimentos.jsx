import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Fita from "./Fita";
import { supabase } from "../supabase";
import "./Depoimentos.css";

// PROVA SOCIAL — node 27:103 do Figma: fundo #fff6f6, título centralizado,
// cards pretos com estrelas e o nome de quem assina.
//
// O CONTEÚDO vem do banco, não do código. Antes eram quatro cards com o
// mesmo texto em inglês assinados pelo mesmo nome (o placeholder do
// Figma) — prova social fabricada, que engana quem compra. Agora a home
// mostra depoimento de cliente REAL, cadastrado no painel, ou não mostra
// a seção. Não existe depoimento inventado no meio.
//
// Motion mantido: título revela por máscara, cards entram em cascata,
// estrelas pipocam uma a uma.
const EASE = [0.16, 1, 0.3, 1];

function Estrelas({ nota, atraso }) {
  return (
    <motion.div
      className="depo__stars"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.6 }}
      variants={{ visible: { transition: { staggerChildren: 0.09, delayChildren: atraso } } }}
    >
      {[0, 1, 2, 3, 4].map((s) => (
        <motion.img
          key={s}
          src="/assets/sections/star-depoimentos.svg"
          alt=""
          className={s < nota ? undefined : "depo__star--vazia"}
          variants={{ hidden: { scale: 0, opacity: 0 }, visible: { scale: 1, opacity: 1 } }}
          transition={{ type: "spring", stiffness: 420, damping: 17 }}
        />
      ))}
    </motion.div>
  );
}

function Card({ d, i }) {
  return (
    <motion.article
      className="depo__card"
      initial={{ opacity: 0, y: 56, rotate: i % 2 === 0 ? -2.5 : 2.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 120, damping: 19, delay: i * 0.12 }}
      whileHover={{ y: -10, boxShadow: "0 24px 48px rgba(0,0,0,0.35)" }}
    >
      <Estrelas nota={d.nota} atraso={0.25 + i * 0.12} />
      <p className="depo__body">&ldquo;{d.texto}&rdquo;</p>
      <div className="depo__attribution">
        <motion.span
          className="depo__divider"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 + i * 0.12, ease: EASE }}
        />
        <span className="depo__name">
          {d.nome}
          {d.origem && <span className="depo__origem">{d.origem}</span>}
        </span>
      </div>
    </motion.article>
  );
}

export default function Depoimentos() {
  const [lista, setLista] = useState(null); // null = ainda carregando

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await supabase
        .from("depoimentos")
        .select("id, nome, origem, texto, nota")
        .eq("publicado", true)
        .order("ordem")
        .limit(8);
      if (vivo) setLista(data || []);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // Sem depoimento real, a seção não existe. Enquanto carrega (null)
  // também não renderiza nada, pra não piscar um bloco vazio que sabe que
  // vai sumir. A home fecha o vão sozinha.
  if (!lista || lista.length === 0) return null;

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
          {lista.map((d, i) => (
            <Card d={d} i={i} key={d.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
