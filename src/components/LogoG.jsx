import "./LogoG.css";

// A marca "G" do cliente no lugar da letra, para uso em DISPLAY (32px+).
// Em texto pequeno a arte vira borrão e a gota some — nesses casos use a
// letra normal. O alt="G" mantém "G-NATION" legível pro leitor de tela.
//
// A marca é ~2x mais alta que uma maiúscula: o dimensionamento é em `em`
// para acompanhar o font-size de quem a envolve, e as margens negativas
// impedem que ela estoure a entrelinha.
export default function LogoG({ className = "" }) {
  return (
    <img
      src="/assets/brand/g-mark.png"
      alt="G"
      className={`logo-g ${className}`.trim()}
      draggable="false"
    />
  );
}

// Troca o "G" de qualquer "G-Algo" pela marca dentro de uma string solta.
// Existe porque metade dos G do site nasce em arquivo de dados
// (products.js, depoimentos, categorias) e só vira texto na renderização —
// trocar na mão em cada ponto de uso deixaria buraco na próxima peça nova.
// Uso: {brandG(product.title)} — devolve array de nós, não string.
export function brandG(texto, { flat = false } = {}) {
  if (typeof texto !== "string" || !texto.includes("G-")) return texto;

  // só o G de marca: precedido de começo/espaço/pontuação, seguido de "-Letra"
  return texto.split(/\b(G-(?=\p{L}))/gu).map((parte, i) =>
    parte === "G-" ? (
      <span key={i} className="logo-g-wrap">
        <LogoG className={flat ? "logo-g--flat" : ""} />-
      </span>
    ) : (
      parte
    )
  );
}
