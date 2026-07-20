import "./RadarBackground.css";

// Fundo global no conceito do template X-Axis (ancient-teammates
// .framer.app): base quase-preta #0d0d0d + mira central de 1px + anéis
// concêntricos de radar bem apagados. Camada fixa atrás de todo o
// conteúdo (pointer-events none); as seções com fundo próprio (cortina,
// lançamentos creme) cobrem por cima, e o radar aparece nos respiros
// pretos entre elas. Cores medidas no site original: base rgb(13,13,13),
// linhas rgb(26,26,26).
export default function RadarBackground() {
  return (
    <div className="radar-bg" aria-hidden="true">
      <div className="radar-bg__rings" />
      <div className="radar-bg__crosshair-v" />
      <div className="radar-bg__crosshair-h" />
    </div>
  );
}
