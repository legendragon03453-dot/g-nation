import "./Shop.css";
import { PRODUCTS } from "../data/products";

export default function Shop() {
  return (
    <section className="shop">
      <div className="shop__container">
        <div className="shop__header">
          <div className="shop__header-text">
            <span className="shop__tag">Novidades</span>
            <h2>O drop novo já tá na vitrine</h2>
          </div>
          <a className="shop__see-all" href="/projects">
            Ver todas as peças
          </a>
        </div>

        <div className="shop__grid">
          {PRODUCTS.map((p) => (
            <a className="shop__card" href={`/produto/${p.slug}`} key={p.slug}>
              <div className="shop__card-image">
                <img src={`/assets/products/${p.img}`} alt={p.title} />
              </div>
              <div className="shop__card-info">
                <span>{p.title}</span>
                <span>{p.price}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
