import { Link } from "react-router-dom";
import "./ImageGrid.css";

// Banner duplo: as duas fotos vão pra coleção completa ao clicar (anotação
// do Figma no node 27:172, "PROVA SOCIAL").
export default function ImageGrid() {
  return (
    <Link className="image-grid" to="/colecao/g-shop" aria-label="Ver coleção completa">
      <div className="image-grid__tile">
        <img src="/assets/banner/homem-corrente.png" alt="" />
      </div>
      <div className="image-grid__tile">
        <img src="/assets/banner/maos-aneis.png" alt="" />
      </div>
      <span className="image-grid__cta">
        Ver coleção <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
