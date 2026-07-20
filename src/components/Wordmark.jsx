import "./Wordmark.css";

// O wordmark COMPLETO da gnation: a marca do G + o lettering "-Nation"
// (variante sublinhada), os dois assets reais do cliente.
//
// Só entra onde o nome aparece inteiro ("G-NATION" / "G-Nation"). Em
// "G-Shop" e "G-Customizadas" o nome NÃO está completo — lá vale a marca
// do G sozinha com o resto em texto (ver LogoG).
//
// O lettering já traz o hífen desenhado, então não existe texto entre as
// duas peças: o lockup inteiro é imagem, e o aria-label é quem carrega o
// nome pro leitor de tela.
// flat → fundo escuro chapado (sem sombra); ink → fundo claro (a arte
// branca vira preta, ver Wordmark.css). Sem prop, nada muda.
export default function Wordmark({ className = "", flat = false, ink = false }) {
  return (
    <span
      className={`wordmark ${flat ? "wordmark--flat" : ""} ${ink ? "wordmark--ink" : ""} ${className}`.trim()}
      role="img"
      aria-label="G-Nation"
    >
      <img src="/assets/brand/g-mark.png" alt="" aria-hidden="true" draggable="false" />
      <img src="/assets/brand/nation-mark.png" alt="" aria-hidden="true" draggable="false" />
    </span>
  );
}
