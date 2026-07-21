import { Link } from "react-router-dom";
import LogoG from "./LogoG";
import "./About.css";

export default function About() {
  return (
    <section className="about">
      <div className="about__grid">
        <Link className="about__tile" to="/colecao/g-shop">
          <img src="/assets/hero/slice-left-1.png" alt="G-Shop" />
          <div className="about__tile-overlay" />
          <div className="about__tile-content">
            <h3><LogoG />-Shop</h3>
            <span>Explorar Mais</span>
          </div>
        </Link>
        <Link className="about__tile" to="/sobre">
          <img src="/assets/hero/slice-right-2.jpg" alt="G-Customizadas" />
          <div className="about__tile-overlay" />
          <div className="about__tile-content">
            <h3><LogoG />-Customizadas</h3>
            <span>Explorar Mais</span>
          </div>
        </Link>
      </div>
    </section>
  );
}
