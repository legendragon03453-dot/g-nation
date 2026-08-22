import { useRef, useState } from "react";
import "./OutrosProdutos.css";
import { RevealTitle } from "./Reveal";
import { useCatalog } from "../CatalogContext";
import PecaCard from "./PecaCard";
import { useLarguraAte } from "../lib/useLarguraAte";

// "CONFIRA TAMBÉM" — node 27:176 do Figma.
//
// Duas linhas, com papéis diferentes:
//
//   LINHA 1 — três peças fixas, na grade, com a mesma malha de
//   Lançamentos. É a vitrine: o que a loja quer mostrar primeiro pra
//   quem chegou ao fim da página.
//
//   LINHA 2 — trilho que ROLA na horizontal, com o resto da curadoria.
//   Existe porque a seção é o último empurrão antes de a pessoa fechar a
//   aba: em vez de três opções e um beco sem saída, ela varre mais peças
//   sem sair da home nem carregar outra página. Rolar de lado é o gesto
//   que essa pessoa já faz o dia inteiro no feed.
//
// QUEM APARECE aqui é escolhido no painel, não no código. Antes era uma
// lista de slugs escrita neste arquivo — trocar a curadoria exigia
// deploy. Hoje é a marcação `confira` de cada produto, com campo próprio
// (e não o mesmo `destaque` de Lançamentos): as duas seções dividem a
// mesma home, e um campo só faria a peça marcada aparecer duas vezes na
// mesma rolagem.
// QUANTAS PEÇAS A GRADE COMPORTA — e por quê.
//
// Depende do LAYOUT, e o layout muda com a tela:
//   desktop → 3 colunas, 1 fileira = 3 peças
//   celular → 2 colunas, 2 fileiras = 4 peças
//
// Com 3 peças fixas numa grade de 2 colunas (o que valia até aqui), a
// terceira ficava sozinha na fileira de baixo e ao lado dela sobrava um
// retângulo VAZIO com o fio da malha desenhado em volta: lido na tela,
// parece card que não carregou. Medido em 390x844: grade de 2x195px com
// a célula da direita da segunda fileira em branco.
//
// É a mesma regra que a faixa de Lançamentos já segue (ver Curtain.jsx):
// sempre múltiplo do número de colunas. O 640 é o mesmo ponto em que o
// CSS troca as colunas, e os dois têm que continuar iguais.
const NA_GRADE_DESKTOP = 3;
const NA_GRADE_CELULAR = 4;

export default function OutrosProdutos() {
  const { produtos, confiras } = useCatalog();
  const ehCelular = useLarguraAte(640);
  const naGradeCabem = ehCelular ? NA_GRADE_CELULAR : NA_GRADE_DESKTOP;
  const trilho = useRef(null);
  const [posicao, setPosicao] = useState(0);

  // Ordem: primeiro quem o dono marcou, depois o resto do catálogo pra
  // completar. Assim a seção nunca fica com a malha quebrada, mesmo que
  // ninguém tenha marcado nada no painel.
  const vistos = new Set();
  const fila = [...confiras, ...produtos].filter((p) =>
    vistos.has(p.slug) ? false : vistos.add(p.slug)
  );

  const naGrade = fila.slice(0, naGradeCabem);
  const noTrilho = fila.slice(naGradeCabem);

  // Catálogo pequeno demais pra fechar a fileira: melhor não mostrar a
  // seção do que mostrar uma malha com buraco.
  if (naGrade.length < naGradeCabem) return null;

  function rolar(direcao) {
    const el = trilho.current;
    if (!el) return;
    // rola de card em card, não uma distância fixa: assim o trilho para
    // sempre com uma peça inteira na borda, nunca cortada ao meio
    const passo = el.querySelector(".peca-card")?.getBoundingClientRect().width || 280;
    el.scrollBy({ left: passo * direcao * 2, behavior: "smooth" });
  }

  function aoRolar() {
    const el = trilho.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setPosicao(max <= 0 ? 0 : el.scrollLeft / max);
  }

  return (
    <section className="outros-produtos">
      <div className="outros-produtos__topo">
        <div className="outros-produtos__title">
          <RevealTitle as="h2">
            <span className="tw-solid">CONFIRA</span>
            <span className="tw-outline">TAMBÉM</span>
          </RevealTitle>
        </div>

        <div className="outros-produtos__grid">
          {naGrade.map((p, i) => (
            <PecaCard key={p.slug} p={p} i={i} className="outros-produtos__card" />
          ))}
        </div>
      </div>

      {noTrilho.length > 0 && (
        <div className="outros-produtos__mais">
          <div className="outros-produtos__mais-cabeca">
            <span className="outros-produtos__mais-rotulo">
              Mais peças <strong>{noTrilho.length}</strong>
            </span>

            {/* As setas são um atalho pra mouse; o trilho rola por
                arrasto, roda e teclado sem elas. Por isso ficam de fora
                da ordem de tabulação do teclado — quem navega por Tab já
                alcança os produtos direto. */}
            <div className="outros-produtos__setas">
              <button
                type="button"
                className="outros-produtos__seta"
                onClick={() => rolar(-1)}
                aria-label="Ver peças anteriores"
                tabIndex={-1}
                disabled={posicao <= 0.01}
              >
                &#8592;
              </button>
              <button
                type="button"
                className="outros-produtos__seta"
                onClick={() => rolar(1)}
                aria-label="Ver mais peças"
                tabIndex={-1}
                disabled={posicao >= 0.99}
              >
                &#8594;
              </button>
            </div>
          </div>

          <div
            className="outros-produtos__trilho"
            ref={trilho}
            onScroll={aoRolar}
            tabIndex={0}
            role="region"
            aria-label="Mais peças, role para o lado"
          >
            {noTrilho.map((p, i) => (
              <PecaCard
                key={p.slug}
                p={p}
                i={Math.min(i, 5)}
                className="outros-produtos__item"
              />
            ))}
          </div>

          {/* Barra de progresso: numa lista que rola de lado, sem ela não
              há como saber que existe mais coisa nem quanto falta. */}
          <div className="outros-produtos__barra" aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.max(posicao, 0.06)})` }} />
          </div>
        </div>
      )}
    </section>
  );
}
