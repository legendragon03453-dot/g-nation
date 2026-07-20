import LogoG from "./LogoG";
import "./About.css";

export default function About() {
  return (
    <section className="about">
      <div className="about__grid">
        <a className="about__tile" href="/projects">
          <img src="/assets/hero/slice-left-1.png" alt="G-Shop" />
          <div className="about__tile-overlay" />
          <div className="about__tile-content">
            <h3><LogoG />-Shop</h3>
            <span>Explorar Mais</span>
          </div>
        </a>
        <a className="about__tile" href="/about">
          <img src="/assets/hero/slice-right-2.jpg" alt="G-Customizadas" />
          <div className="about__tile-overlay" />
          <div className="about__tile-content">
            <h3><LogoG />-Customizadas</h3>
            <span>Explorar Mais</span>
          </div>
        </a>
      </div>
    </section>
  );
}
