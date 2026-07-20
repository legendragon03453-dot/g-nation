import "./OutrosProdutos.css";
import { RevealTitle } from "./Reveal";
import { PRODUCTS } from "../data/products";

// Peças reais do catálogo, diferentes das já destacadas em Lançamentos
// (Trevo Royal, Cubana Cravejada) — variedade pra quem quer ver mais.
const OUTROS = ["anel-cruz-royal", "anel-cruz-ice", "elo-grumet"]
  .map((slug) => PRODUCTS.find((p) => p.slug === slug))
  .filter(Boolean);

export default function OutrosProdutos() {
  return (
    <section className="outros-produtos">
      <div className="outros-produtos__title">
        <RevealTitle as="h2">
          <span className="tw-solid">CONFIRA</span>
          <span className="tw-outline">TAMBÉM</span>
        </RevealTitle>
      </div>
      <div className="outros-produtos__grid">
        {OUTROS.map((p) => (
          <a className="outros-produtos__card" href={`/produto/${p.slug}`} key={p.slug}>
            <div className="outros-produtos__image">
              <img src={`/assets/products/${p.img}`} alt={p.title} />
            </div>
            <h4>{p.title}</h4>
            <span>{p.price}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
