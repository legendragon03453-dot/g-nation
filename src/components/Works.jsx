import LogoG, { brandG } from "./LogoG";
import Wordmark from "./Wordmark";
import "./Works.css";
import { RevealTitle, RevealBody } from "./Reveal";

// "Letra Custom" é peça sob encomenda (G-Customizadas), não tem SKU fixo
// no catálogo — linka pra Cubana Cravejada, a mesma foto que já usa aqui.
const CARDS = [
  { title: "TREVO ROYAL", category: "Pulseiras", img: "trevo-royal.png", slug: "trevo-royal" },
  {
    title: "LETRA CUSTOM",
    category: "G-Customizadas",
    img: "cubana-cravejada.png",
    slug: "cubana-cravejada",
  },
];

export default function Works() {
  return (
    <section className="works">
      <div className="works__title">
        <RevealTitle as="h2">Lançamentos</RevealTitle>
        <RevealBody as="p">
          Os drops mais recentes da <Wordmark flat />. Cordões, pingentes, pulseiras e
          anéis com cravação densa, banho reforçado e presença de vitrine.
          Toque em uma peça pra ver os detalhes de perto.
        </RevealBody>
      </div>

      <div className="works__cards">
        {CARDS.map((c) => (
          <a className="works__card" href={`/produto/${c.slug}`} key={c.title}>
            <div className="works__card-image">
              <img src={`/assets/products/${c.img}`} alt={c.title} />
            </div>
            <div className="works__card-info">
              <h4>{c.title}</h4>
              <span>{brandG(c.category, { flat: true })}</span>
            </div>
          </a>
        ))}
      </div>

      <a className="works__button" href="/projects">
        Ver Peças <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}
