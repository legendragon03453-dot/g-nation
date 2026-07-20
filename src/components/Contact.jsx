import Wordmark from "./Wordmark";
import "./Contact.css";
import Ticker from "./Ticker";
import { RevealTitle } from "./Reveal";

const SLIDES = [
  "hero/slice-left-1.png",
  "hero/slice-right-2.jpg",
  "hero/slice-left-2.jpg",
  "hero/slice-right-1.png",
  "hero/slice-left-3.jpg",
  "hero/slice-right-3.jpg",
];

export default function Contact() {
  return (
    <section className="contact">
      <div className="contact__title">
        <RevealTitle as="h2" delay={0.2}>Brilho que fala</RevealTitle>
        <RevealTitle as="h2" delay={0.3}>por você</RevealTitle>
        <a
          className="contact__cta"
          href="https://wa.me/5500000000000"
          target="_blank"
          rel="noopener"
        >
          Chama a <Wordmark /> <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="contact__slideshow">
        <Ticker speed={50} direction="right" gap={10} hoverFactor={0.5} fadeWidth={50}>
          {SLIDES.map((s) => (
            <img key={s} src={`/assets/${s}`} alt="" className="contact__slide" />
          ))}
        </Ticker>
      </div>
    </section>
  );
}
