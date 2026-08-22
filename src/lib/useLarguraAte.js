import { useEffect, useState } from "react";

/**
 * Verdadeiro enquanto a janela couber em `px` de largura, reagindo à
 * mudança (inclusive ao girar o aparelho).
 *
 * Existe porque em várias seções o CELULAR não muda só o tamanho das
 * peças, muda QUANTAS peças cabem — e isso é decisão de render, não de
 * CSS. A grade de Lançamentos passa de 3 para 2 colunas, então a faixa
 * precisa de 4 peças em vez de 6; a de "Confira também" passa de 3 para
 * 2, então precisa de 4 em vez de 3. Sem isso a última fileira fica pela
 * metade e a malha de fios abre um buraco no lugar da peça que falta.
 *
 * O ponto de corte vem por parâmetro porque cada seção vira em uma
 * largura diferente (a da Curtain em 900, a de Confira também em 640):
 * o número tem que ser o MESMO da media query que muda as colunas, senão
 * existe uma faixa de larguras em que o JS conta uma grade e o CSS
 * desenha outra.
 */
export function useLarguraAte(px) {
  const consulta = `(max-width: ${px}px)`;
  const [cabe, setCabe] = useState(
    () => typeof window !== "undefined" && window.matchMedia(consulta).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const ouvir = (e) => setCabe(e.matches);
    setCabe(mq.matches);
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, [consulta]);
  return cabe;
}
