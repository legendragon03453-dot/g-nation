import { useCallback, useEffect, useRef, useState } from "react";
import "./RoloScroll.css";

// Contêiner que rola na horizontal E AVISA que rola.
//
// O pedido: em toda tabela/lista que passa da largura da tela no celular,
// não havia nenhum sinal de que dava pra arrastar de lado — a pessoa via
// a informação cortada e achava que era bug, não que faltava rolar.
//
// A sinalização é dupla e reage à posição do scroll:
//   - uma SOMBRA/desvanecer na borda que ainda tem conteúdo escondido
//     (some quando chega no fim daquele lado), e
//   - uma dica "arraste →" que aparece só enquanto ainda não se rolou,
//     e some no primeiro toque.
// Sem conteúdo escondido (cabe na tela), nada aparece.
export default function RoloScroll({ children, className = "", dica = "arraste" }) {
  const ref = useRef(null);
  const [estado, setEstado] = useState({ esq: false, dir: false, rolou: false });

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const esq = el.scrollLeft > 4;
    const dir = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEstado((s) => ({ esq, dir, rolou: s.rolou || esq }));
  }, []);

  useEffect(() => {
    medir();
    const el = ref.current;
    // ResizeObserver pega quando o conteúdo (linhas da tabela) chega/muda
    const ro = new ResizeObserver(medir);
    if (el) ro.observe(el);
    window.addEventListener("resize", medir);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [medir, children]);

  return (
    <div
      className={`rolo${estado.esq ? " rolo--esq" : ""}${
        estado.dir ? " rolo--dir" : ""
      }`}
    >
      <div className={`rolo__scroll ${className}`.trim()} ref={ref} onScroll={medir}>
        {children}
      </div>

      {/* a dica só faz sentido enquanto há pra onde rolar e ninguém rolou
          ainda */}
      {estado.dir && !estado.rolou && (
        <span className="rolo__dica" aria-hidden="true">
          {dica} <span className="rolo__dica-seta">→</span>
        </span>
      )}
    </div>
  );
}
