import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./FiltrosVitrine.css";

// FILTROS DA VITRINE — os de verdade.
//
// A barra "Filtrar por:" existe no Figma (node 27:670) e estava no site
// desde o começo, com três pills: Material, Preço, Tamanho. Só que elas
// não tinham onClick: eram botões com animação de hover e nada por trás.
// Quem clicasse não veria a lista mudar — pior que não ter filtro, porque
// promete uma função que não existe.
//
// AS OPÇÕES SAEM DO CATÁLOGO, não de uma lista fixa. Materiais e tamanhos
// são lidos das combinações que existem em estoque, então quando o dono
// cadastra "Banho Ródio" no painel, a opção aparece aqui sozinha — e
// quando uma peça sai de linha, some. Uma lista fixa no código voltaria a
// mentir na primeira mudança de catálogo.
//
// As faixas de preço são calculadas sobre o catálogo visível: numa loja
// cujo brief fala em peças "a partir de R$ 699", faixas fixas de
// "até R$ 100" seriam sempre vazias.
const EASE = [0.16, 1, 0.3, 1];

// No celular os filtros não cabem numa fileira; abaixo deste ponto a
// barra vira um botão único que abre um painel roomy (ver render).
function useEhMobile() {
  const [ehMobile, setEhMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const ouvir = (e) => setEhMobile(e.matches);
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, []);
  return ehMobile;
}

export const ORDENACOES = [
  { id: "relevancia", rotulo: "Relevância" },
  { id: "menor-preco", rotulo: "Menor preço" },
  { id: "maior-preco", rotulo: "Maior preço" },
  { id: "nome", rotulo: "Nome (A–Z)" },
];

// Aplica os filtros. Fica exportada e separada da tela porque a busca da
// navbar usa a MESMA função — filtro e busca que discordam sobre o que é
// "peça de prata" seriam dois resultados diferentes pro mesmo pedido.
export function aplicarFiltros(produtos, { materiais, tamanhos, faixa, ordem, termo }) {
  let saida = produtos;

  if (termo?.trim()) {
    const t = termo
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    // busca por nome, categoria e descrição — quem procura "cruz" quer
    // achar o anel e o pingente, não só o que tem "cruz" no título
    const limpa = (s) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
    saida = saida.filter(
      (p) =>
        limpa(p.title).includes(t) ||
        limpa(p.category).includes(t) ||
        limpa(p.description).includes(t)
    );
  }

  if (materiais?.length) {
    saida = saida.filter((p) => p.materials?.some((m) => materiais.includes(m)));
  }

  if (tamanhos?.length) {
    saida = saida.filter((p) => p.sizes?.some((s) => tamanhos.includes(s)));
  }

  if (faixa) {
    saida = saida.filter(
      (p) => p.priceValue >= faixa.min && (faixa.max == null || p.priceValue <= faixa.max)
    );
  }

  const ordenado = [...saida];
  if (ordem === "menor-preco") ordenado.sort((a, b) => a.priceValue - b.priceValue);
  else if (ordem === "maior-preco") ordenado.sort((a, b) => b.priceValue - a.priceValue);
  else if (ordem === "nome") ordenado.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  return ordenado;
}

// Faixas derivadas do catálogo: divide entre o menor e o maior preço em
// três degraus redondos. Assim elas sempre têm peça dentro.
export function faixasDe(produtos) {
  if (!produtos.length) return [];
  const precos = produtos.map((p) => p.priceValue);
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  if (min === max) return [];

  const passo = Math.ceil((max - min) / 3 / 50) * 50 || 50;
  const a = min + passo;
  const b = min + passo * 2;

  return [
    { id: "f1", rotulo: `Até ${real(a)}`, min: 0, max: a },
    { id: "f2", rotulo: `${real(a)} a ${real(b)}`, min: a, max: b },
    { id: "f3", rotulo: `Acima de ${real(b)}`, min: b, max: null },
  ];
}

function real(v) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export default function FiltrosVitrine({
  produtos,
  filtros,
  setFiltros,
  mostrando,
  total,
}) {
  const [aberto, setAberto] = useState(null);
  // No mobile, um painel único que lista todos os grupos de uma vez.
  const [painelAberto, setPainelAberto] = useState(false);
  const ehMobile = useEhMobile();
  const barraRef = useRef(null);

  // Opções vindas do catálogo real
  const materiais = useMemo(
    () => [...new Set(produtos.flatMap((p) => p.materials || []))].sort(),
    [produtos]
  );
  const tamanhos = useMemo(
    () =>
      [...new Set(produtos.flatMap((p) => p.sizes || []))].sort((a, b) => {
        // "16cm" e "18" ordenam por número, não por texto — senão "20cm"
        // viria antes de "9cm"
        const na = parseFloat(a);
        const nb = parseFloat(b);
        return Number.isNaN(na) || Number.isNaN(nb) ? a.localeCompare(b) : na - nb;
      }),
    [produtos]
  );
  const faixas = useMemo(() => faixasDe(produtos), [produtos]);

  // Clique fora fecha o painel aberto. Sem isso, abrir "Material" e sair
  // pra rolar a página deixaria a lista pendurada sobre os produtos.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => {
      if (barraRef.current && !barraRef.current.contains(e.target)) setAberto(null);
    };
    const esc = (e) => e.key === "Escape" && setAberto(null);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  function alternar(campo, valor) {
    setFiltros((f) => {
      const atual = f[campo] || [];
      return {
        ...f,
        [campo]: atual.includes(valor)
          ? atual.filter((v) => v !== valor)
          : [...atual, valor],
      };
    });
  }

  const ativos =
    (filtros.materiais?.length || 0) +
    (filtros.tamanhos?.length || 0) +
    (filtros.faixa ? 1 : 0) +
    (filtros.termo ? 1 : 0);

  const grupos = [
    { id: "materiais", rotulo: "Material", opcoes: materiais, tipo: "lista" },
    { id: "tamanhos", rotulo: "Tamanho", opcoes: tamanhos, tipo: "lista" },
    { id: "faixa", rotulo: "Preço", opcoes: faixas, tipo: "faixa" },
    { id: "ordem", rotulo: "Ordenar", opcoes: ORDENACOES, tipo: "ordem" },
  ];

  // Os chips de um grupo — usados TANTO na gaveta do desktop QUANTO no
  // painel do mobile, pra os dois nunca discordarem sobre o que uma opção
  // faz. `fecharAoEscolher` só no desktop de ordenação (a gaveta some ao
  // escolher); no painel mobile o usuário decide vários filtros antes de
  // fechar.
  function renderChips(g, { fecharAoEscolher = false } = {}) {
    if (g.tipo === "lista") {
      return g.opcoes.map((o) => (
        <button
          type="button"
          key={o}
          className={`fv__chip${filtros[g.id]?.includes(o) ? " is-on" : ""}`}
          onClick={() => alternar(g.id, o)}
        >
          {o}
        </button>
      ));
    }
    if (g.tipo === "faixa") {
      return g.opcoes.map((o) => (
        <button
          type="button"
          key={o.id}
          className={`fv__chip${filtros.faixa?.id === o.id ? " is-on" : ""}`}
          onClick={() =>
            setFiltros((f) => ({ ...f, faixa: f.faixa?.id === o.id ? null : o }))
          }
        >
          {o.rotulo}
        </button>
      ));
    }
    // ordem
    return g.opcoes.map((o) => (
      <button
        type="button"
        key={o.id}
        className={`fv__chip${filtros.ordem === o.id ? " is-on" : ""}`}
        onClick={() => {
          setFiltros((f) => ({ ...f, ordem: o.id }));
          if (fecharAoEscolher) setAberto(null);
        }}
      >
        {o.rotulo}
      </button>
    ));
  }

  function limparTudo() {
    setFiltros({
      materiais: [],
      tamanhos: [],
      faixa: null,
      ordem: "relevancia",
      termo: "",
    });
  }

  const gruposVisiveis = grupos.filter(
    (g) => g.tipo === "ordem" || g.opcoes.length >= 2
  );

  // ============================================================
  // MOBILE — um botão só, que abre um painel com TODOS os grupos.
  // ============================================================
  // A versão de desktop apertava 4 grupos + gaveta numa fileira que rolava
  // de lado e cortava as opções — a sensação de "mal planejado" que o
  // usuário descreveu. Aqui o filtro vira uma AÇÃO clara ("FILTRAR"), e o
  // painel que abre tem espaço de sobra: cada grupo é uma seção com seus
  // chips soltos, um embaixo do outro, sem rolagem lateral.
  if (ehMobile) {
    return (
      <div className="fv fv--mobile" ref={barraRef}>
        <div className="fv__barra-mob">
          <button
            type="button"
            className={`fv__abrir${ativos ? " is-ativo" : ""}`}
            onClick={() => setPainelAberto(true)}
          >
            <span className="fv__abrir-icone" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            Filtrar &amp; ordenar
            {ativos > 0 && <span className="fv__n">{ativos}</span>}
          </button>

          <span className="fv__conta">
            <strong>{mostrando}</strong> de <strong>{total}</strong>
          </span>
        </div>

        {/* tags aplicadas continuam à vista fora do painel, roláveis com
            sinalização (ver CSS: máscara de desvanecer na borda) */}
        {ativos > 0 && (
          <div className="fv__ativos fv__ativos--mob">
            {filtros.termo && (
              <button type="button" className="fv__tag" onClick={() => setFiltros((f) => ({ ...f, termo: "" }))}>
                busca: {filtros.termo}
              </button>
            )}
            {filtros.materiais?.map((m) => (
              <button type="button" key={m} className="fv__tag" onClick={() => alternar("materiais", m)}>{m}</button>
            ))}
            {filtros.tamanhos?.map((s) => (
              <button type="button" key={s} className="fv__tag" onClick={() => alternar("tamanhos", s)}>{s}</button>
            ))}
            {filtros.faixa && (
              <button type="button" className="fv__tag" onClick={() => setFiltros((f) => ({ ...f, faixa: null }))}>
                {filtros.faixa.rotulo}
              </button>
            )}
          </div>
        )}

        {/* PAINEL — sobe de baixo, cobre a tela. Fundo escuro, cada grupo
            com título e chips. Ações fixas no rodapé: limpar e "ver N". */}
        <AnimatePresence>
          {painelAberto && (
            <>
              <motion.div
                className="fv__backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setPainelAberto(false)}
              />
              <motion.div
                className="fv__folha"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                role="dialog"
                aria-label="Filtrar e ordenar"
              >
                <div className="fv__folha-topo">
                  <span className="fv__folha-titulo">
                    <span className="tw-solid">FILTRAR</span>{" "}
                    <span className="tw-outline">&amp; ORDENAR</span>
                  </span>
                  <button
                    type="button"
                    className="fv__folha-x"
                    onClick={() => setPainelAberto(false)}
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                <div className="fv__folha-corpo">
                  {gruposVisiveis.map((g) => (
                    <section className="fv__secao" key={g.id}>
                      <h3 className="fv__secao-titulo">{g.rotulo}</h3>
                      <div className="fv__chips">{renderChips(g)}</div>
                    </section>
                  ))}
                </div>

                <div className="fv__folha-pe">
                  {ativos > 0 && (
                    <button type="button" className="fv__folha-limpar" onClick={limparTudo}>
                      Limpar ({ativos})
                    </button>
                  )}
                  <button
                    type="button"
                    className="fv__folha-ver"
                    onClick={() => setPainelAberto(false)}
                  >
                    Ver {mostrando} {mostrando === 1 ? "peça" : "peças"}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ============================================================
  // DESKTOP — a barra com os grupos e a gaveta que desce.
  // ============================================================
  return (
    <motion.div
      className="fv"
      ref={barraRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
    >
      <div className="fv__barra">
        {/* Duo sólido + contorno: a mesma assinatura tipográfica do hero
            e dos títulos de seção. A barra deixa de ser um controle
            genérico e passa a falar a língua do site. */}
        <span className="fv__label">
          <span className="tw-solid">FILTRAR</span>
          <span className="tw-outline">POR</span>
        </span>

        <div className="fv__grupos">
          {grupos.map((g) => {
            if (g.tipo !== "ordem" && g.opcoes.length < 2) return null;
            const marcados =
              g.tipo === "lista"
                ? filtros[g.id]?.length || 0
                : g.id === "faixa" && filtros.faixa
                  ? 1
                  : g.id === "ordem" && filtros.ordem !== "relevancia"
                    ? 1
                    : 0;

            return (
              <button
                type="button"
                key={g.id}
                className={`fv__grupo${aberto === g.id ? " is-aberto" : ""}${
                  marcados ? " is-ativo" : ""
                }`}
                aria-expanded={aberto === g.id}
                onClick={() => setAberto(aberto === g.id ? null : g.id)}
              >
                {g.rotulo}
                {marcados > 0 && <span className="fv__n">{marcados}</span>}
              </button>
            );
          })}
        </div>

        {/* A contagem em mono, com o número em destaque: é dado de
            vitrine, não legenda — mesma família dos preços dos cards. */}
        <span className="fv__conta">
          <strong>{mostrando}</strong> de <strong>{total}</strong> peças
        </span>
      </div>

      {/* GAVETA. As opções descem dentro da própria barra preta em vez de
          flutuarem numa caixa branca por cima da vitrine — a caixa branca
          com checkbox do sistema parecia um formulário de painel colado
          num site de joia. Aqui elas são chips da mesma família dos
          grupos, e o bloco preto cresce como um painel só. */}
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            className="fv__gaveta"
            key={aberto}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <div className="fv__gaveta-inner">
              {grupos
                .filter((g) => g.id === aberto)
                .map((g) => (
                  <div className="fv__chips" key={g.id}>
                    {renderChips(g, { fecharAoEscolher: true })}
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* O que está valendo agora, sempre à vista. Sem isto a pessoa rola
          a vitrine e esquece por que só há três peças. Clicar no chip
          remove aquele filtro. */}
      {ativos > 0 && (
        <div className="fv__ativos">
          <span className="fv__ativos-label">Aplicados</span>

          {filtros.termo && (
            <button
              type="button"
              className="fv__tag"
              onClick={() => setFiltros((f) => ({ ...f, termo: "" }))}
            >
              busca: {filtros.termo}
            </button>
          )}

          {filtros.materiais?.map((m) => (
            <button
              type="button"
              key={m}
              className="fv__tag"
              onClick={() => alternar("materiais", m)}
            >
              {m}
            </button>
          ))}

          {filtros.tamanhos?.map((s) => (
            <button
              type="button"
              key={s}
              className="fv__tag"
              onClick={() => alternar("tamanhos", s)}
            >
              {s}
            </button>
          ))}

          {filtros.faixa && (
            <button
              type="button"
              className="fv__tag"
              onClick={() => setFiltros((f) => ({ ...f, faixa: null }))}
            >
              {filtros.faixa.rotulo}
            </button>
          )}

          <button type="button" className="fv__limpar" onClick={limparTudo}>
            limpar tudo
          </button>
        </div>
      )}
    </motion.div>
  );
}
