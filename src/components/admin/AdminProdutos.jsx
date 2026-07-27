import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../supabase";
import { brl } from "../../lib/br";
import { fotoProduto } from "../../lib/img";
import RoloScroll from "../RoloScroll";

// PRODUTOS — o catálogo deixa de morar no bundle.
//
// Antes, mudar um preço era editar `src/data/products.js`, commitar e
// esperar o deploy. Agora é um campo e um botão. Essa é a razão desta
// tela existir; o resto é consequência disso.
//
// DECISÕES QUE VÊM DA REALIDADE DE UMA LOJA DE JOIAS:
//
//  - ESTOQUE É DA COMBINAÇÃO, não do produto. "Trevo Royal" não tem 12
//    unidades; tem 3 de Prata/16cm e 0 de Banho Ouro/20cm. Quem vende
//    peça com tamanho sabe que essa é a conta que importa.
//
//  - NADA SE APAGA. Produto sai de linha com `ativo = false`. Apagar de
//    verdade quebraria o histórico: pedidos antigos apontam pro slug, e a
//    página do pedido de dois anos atrás precisa continuar abrindo.
//
//  - PROMOÇÃO É CAMPO SEPARADO, não preço rebaixado. Guardar o "de" e o
//    "por" é o que permite mostrar o corte na vitrine e voltar ao preço
//    cheio quando a promoção acaba.
//
// A escrita aqui é UPDATE direto na tabela, e não uma função como nos
// pedidos: `produtos` e `variantes` têm policy de escrita exigindo
// `eh_admin()`, e não existe regra de transição a proteger (preço não tem
// "estado anterior válido"). Onde a regra existe — status de pedido — a
// função é obrigatória.
const CATEGORIAS = ["Cordões", "Anéis", "Pulseiras", "Pingentes", "G-Customizadas"];

// Quantas peças a faixa de Lançamentos da home comporta. É 3×2 dentro do
// pin da cortina — uma terceira fileira não cabe na tela e faria o pin
// rolar por dentro. O número está repetido no Curtain (onde a regra é
// aplicada) e aqui (onde o dono precisa ser avisado); se um dia mudar,
// muda nos dois.
const VITRINE_LANCAMENTOS = 6;

// Reais na tela, centavos no banco. A conversão fica num par de funções
// pra ninguém multiplicar por 100 no meio do JSX e errar o arredondamento
// — `3.19 * 100` em ponto flutuante dá 318.99999999999994.
function paraCentavos(reais) {
  const n = Number(String(reais).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function paraReais(centavos) {
  return centavos == null ? "" : (centavos / 100).toFixed(2);
}

const VAZIO = {
  slug: "",
  titulo: "",
  categoria: "Pulseiras",
  preco: "",
  promocional: "",
  img: "",
  descricao: "",
  sku: "",
  peso: "",
  destaque: false,
  confira: false,
  ativo: true,
};

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    const [{ data: ps }, { data: vs }] = await Promise.all([
      supabase.from("produtos").select("*").order("ordem"),
      supabase.from("variantes").select("*"),
    ]);
    setProdutos(ps || []);
    setVariantes(vs || []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  // estoque somado por produto: o número que responde "tenho ou não
  // tenho essa peça pra vender"
  const estoquePorProduto = useMemo(() => {
    const m = {};
    for (const v of variantes) {
      if (!v.ativo) continue;
      m[v.produto_slug] = (m[v.produto_slug] || 0) + v.estoque;
    }
    return m;
  }, [variantes]);

  function abrirEdicao(p) {
    if (aberto === p.slug) {
      setAberto(null);
      return;
    }
    setCriando(false);
    setErro("");
    setAviso("");
    setAberto(p.slug);
    setForm({
      slug: p.slug,
      titulo: p.titulo,
      categoria: p.categoria,
      preco: paraReais(p.preco_centavos),
      promocional: paraReais(p.preco_promocional_centavos),
      img: p.img,
      descricao: p.descricao || "",
      sku: p.sku || "",
      peso: p.peso_gramas || "",
      destaque: p.destaque,
      confira: p.confira,
      ativo: p.ativo,
    });
  }

  function abrirNovo() {
    setCriando(true);
    setAberto(null);
    setErro("");
    setAviso("");
    setForm(VAZIO);
  }

  // O slug vai pra URL do produto (/produto/trevo-royal), então precisa
  // ser previsível: sem acento, sem espaço, sem maiúscula.
  function sugerirSlug(titulo) {
    return titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setAviso("");

    if (!form.titulo.trim()) return setErro("O produto precisa de um nome.");
    const preco = paraCentavos(form.preco);
    if (preco <= 0) return setErro("Informe um preço maior que zero.");
    const promo = form.promocional ? paraCentavos(form.promocional) : null;
    if (promo !== null && promo >= preco) {
      return setErro("O preço promocional precisa ser MENOR que o preço cheio.");
    }
    if (!form.img.trim()) {
      return setErro("Informe o arquivo da foto (ex.: trevo-gold.png).");
    }

    const slug = (criando ? sugerirSlug(form.titulo) : form.slug).trim();
    const linha = {
      slug,
      titulo: form.titulo.trim(),
      categoria: form.categoria,
      preco_centavos: preco,
      preco_promocional_centavos: promo,
      img: form.img.trim(),
      descricao: form.descricao.trim(),
      sku: form.sku.trim() || null,
      peso_gramas: form.peso ? Number(form.peso) : null,
      destaque: form.destaque,
      confira: form.confira,
      ativo: form.ativo,
    };

    setSalvando(true);
    const { error } = criando
      ? await supabase.from("produtos").insert({ ...linha, ordem: produtos.length + 1 })
      : await supabase.from("produtos").update(linha).eq("slug", form.slug);
    setSalvando(false);

    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe um produto com esse nome ou SKU."
          : `Não foi possível salvar: ${error.message}`
      );
      return;
    }

    setAviso(criando ? "Produto cadastrado." : "Alterações salvas.");
    setCriando(false);
    await carregar();
    if (criando) setAberto(slug);
  }

  async function mudarEstoque(variante, novo) {
    const valor = Math.max(0, Number(novo) || 0);
    setVariantes((vs) =>
      vs.map((v) => (v.id === variante.id ? { ...v, estoque: valor } : v))
    );
    const { error } = await supabase
      .from("variantes")
      .update({ estoque: valor })
      .eq("id", variante.id);
    if (error) {
      setErro("Não foi possível salvar o estoque.");
      carregar();
    }
  }

  // Mapa pro Shopify: o id da variante correspondente na loja Shopify. É o
  // que monta o carrinho do checkout do Shopify. Copia-se do painel do
  // Shopify (na variante do produto).
  async function mudarShopifyId(variante, valor) {
    const id = valor.trim() || null;
    setVariantes((vs) =>
      vs.map((v) => (v.id === variante.id ? { ...v, shopify_variant_id: id } : v))
    );
    const { error } = await supabase
      .from("variantes")
      .update({ shopify_variant_id: id })
      .eq("id", variante.id);
    if (error) {
      setErro("Não foi possível salvar o ID do Shopify.");
      carregar();
    }
  }

  async function alternarAtivo(p) {
    await supabase.from("produtos").update({ ativo: !p.ativo }).eq("slug", p.slug);
    carregar();
  }

  // Sem pelo menos uma combinação, a peça NÃO PODE ser comprada: o
  // `criar_pedido` procura a variante pra saber preço e estoque, e sem
  // ela devolve COMBINACAO_INDISPONIVEL. Por isso adicionar combinação
  // faz parte do cadastro, não é um extra.
  async function adicionarVariante(slug, material, tamanho, estoque) {
    setErro("");
    const { error } = await supabase.from("variantes").insert({
      produto_slug: slug,
      material: material.trim() || null,
      tamanho: tamanho.trim() || null,
      estoque: Math.max(0, Number(estoque) || 0),
    });
    if (error) {
      setErro(
        error.code === "23505"
          ? "Essa combinação já existe nessa peça."
          : `Não foi possível adicionar: ${error.message}`
      );
      return false;
    }
    await carregar();
    return true;
  }

  // Combinação que já foi vendida não some do banco (o item do pedido
  // aponta pra ela); ela é desligada. Combinação que nunca vendeu pode
  // ser apagada de verdade — foi erro de digitação.
  async function removerVariante(v) {
    const { count } = await supabase
      .from("itens_pedido")
      .select("id", { count: "exact", head: true })
      .eq("variante_id", v.id);

    if (count > 0) {
      await supabase.from("variantes").update({ ativo: false }).eq("id", v.id);
    } else {
      await supabase.from("variantes").delete().eq("id", v.id);
    }
    carregar();
  }

  const variantesDoAberto = variantes.filter((v) => v.produto_slug === aberto);
  const destaquesAtivos = produtos.filter((p) => p.destaque && p.ativo).length;
  const confiraAtivos = produtos.filter((p) => p.confira && p.ativo).length;
  // Peça marcada nas DUAS seções aparece duas vezes na mesma rolagem da
  // home — Lançamentos e "Confira também" ficam a poucas telas uma da
  // outra. Não é erro que trave nada, mas o dono precisa saber.
  const nasDuas = produtos.filter((p) => p.destaque && p.confira && p.ativo);

  return (
    <div className="adm__pagina">
      <header className="adm__cabeca">
        <p className="adm__ola">Catálogo</p>
        <h1 className="adm__titulo">Produtos</h1>
      </header>

      <div className="adm__ferramentas">
        <p className="adm__cel-fraca" style={{ margin: 0, fontSize: 13 }}>
          {produtos.length} peças cadastradas ·{" "}
          {produtos.filter((p) => !p.ativo).length} fora de linha ·{" "}
          {destaquesAtivos} em Lançamentos · {confiraAtivos} em Confira também
        </p>
        <button type="button" className="adm__btn" onClick={abrirNovo}>
          Cadastrar peça
        </button>
      </div>

      {/* A faixa de Lançamentos da home é uma grade de 3×2 dentro de uma
          seção que precisa caber numa tela. Marcar mais que 6 não quebra
          nada — as extras só não aparecem —, mas o dono precisa saber
          disso ou vai achar que o painel não salvou. */}
      {destaquesAtivos > VITRINE_LANCAMENTOS && (
        <p className="adm__alerta">
          A faixa de Lançamentos da home mostra {VITRINE_LANCAMENTOS} peças. Você
          tem {destaquesAtivos} em destaque, então{" "}
          {destaquesAtivos - VITRINE_LANCAMENTOS}{" "}
          {destaquesAtivos - VITRINE_LANCAMENTOS === 1
            ? "não vai aparecer"
            : "não vão aparecer"}
          . Vale tirar o destaque de quem saiu de campanha.
        </p>
      )}

      {destaquesAtivos > 0 && destaquesAtivos < VITRINE_LANCAMENTOS && (
        <p className="adm__cel-fraca" style={{ fontSize: 12.5, margin: "0 0 20px" }}>
          A faixa de Lançamentos mostra {VITRINE_LANCAMENTOS} peças: as{" "}
          {destaquesAtivos} em destaque vêm primeiro e o resto se completa com o
          catálogo.
        </p>
      )}

      {/* "Confira também" tem duas linhas: três peças na grade e o resto
          num trilho que rola de lado. Marcar só três deixa o trilho
          vazio. */}
      {confiraAtivos > 0 && confiraAtivos <= 3 && (
        <p className="adm__cel-fraca" style={{ fontSize: 12.5, margin: "0 0 20px" }}>
          O "Confira também" mostra 3 peças na grade e as demais num trilho que
          rola de lado. Com {confiraAtivos}{" "}
          {confiraAtivos === 1 ? "marcada" : "marcadas"}, o trilho se completa
          com o resto do catálogo.
        </p>
      )}

      {nasDuas.length > 0 && (
        <p className="adm__alerta">
          {nasDuas.length === 1
            ? `"${nasDuas[0].titulo}" está nas duas vitrines`
            : `${nasDuas.length} peças estão nas duas vitrines`}{" "}
          — vão aparecer duas vezes na mesma rolagem da home. Se for de
          propósito, tudo bem; se não, desmarque uma das duas.
        </p>
      )}

      {erro && <p className="adm__erro">{erro}</p>}
      {aviso && <p className="adm__ok">{aviso}</p>}

      {criando && (
        <FormProduto
          form={form}
          setForm={setForm}
          salvar={salvar}
          salvando={salvando}
          novo
          cancelar={() => setCriando(false)}
        />
      )}

      {carregando ? (
        <p className="adm__vazio-txt">Carregando catálogo…</p>
      ) : (
        <RoloScroll className="adm__tabela-rolo">
          <table className="adm__tabela">
            <thead>
              <tr>
                <th>Peça</th>
                <th>Categoria</th>
                <th className="adm__col-num">Preço</th>
                <th className="adm__col-num">Estoque</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => {
                const estoque = estoquePorProduto[p.slug] || 0;
                const estaAberto = aberto === p.slug;
                return [
                  <tr
                    key={p.slug}
                    className={`adm__linha${estaAberto ? " is-aberta" : ""}`}
                    onClick={() => abrirEdicao(p)}
                  >
                    <td>
                      <span className="adm__prod">
                        <img src={fotoProduto(p.img)} alt="" />
                        <span>
                          <strong>{p.titulo}</strong>
                          <span className="adm__cel-sub">
                            {p.sku ? `SKU ${p.sku}` : p.slug}
                            {p.destaque ? " · em destaque" : ""}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="adm__cel-fraca">{p.categoria}</td>
                    <td className="adm__col-num">
                      {p.preco_promocional_centavos ? (
                        <>
                          <span className="adm__preco-velho">
                            {brl(p.preco_centavos)}
                          </span>
                          <br />
                          <strong>{brl(p.preco_promocional_centavos)}</strong>
                        </>
                      ) : (
                        brl(p.preco_centavos)
                      )}
                    </td>
                    <td className="adm__col-num">
                      {/* estoque é o número que decide se a peça pode ser
                          vendida — merece cor quando está no fim */}
                      <span
                        className={
                          estoque === 0
                            ? "adm__estoque is-zero"
                            : estoque <= 2
                              ? "adm__estoque is-baixo"
                              : "adm__estoque"
                        }
                      >
                        {estoque}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`adm__badge adm__badge--${p.ativo ? "ok" : "ruim"}`}
                      >
                        {p.ativo ? "À venda" : "Fora de linha"}
                      </span>
                    </td>
                  </tr>,

                  estaAberto && (
                    <tr key={`${p.slug}-edit`} className="adm__detalhe-linha">
                      <td colSpan={5}>
                        <div className="adm__editor">
                          <FormProduto
                            form={form}
                            setForm={setForm}
                            salvar={salvar}
                            salvando={salvando}
                            cancelar={() => setAberto(null)}
                            extra={
                              <button
                                type="button"
                                className="adm__btn-fino"
                                onClick={() => alternarAtivo(p)}
                              >
                                {p.ativo ? "Tirar de linha" : "Voltar a vender"}
                              </button>
                            }
                          />

                          <Variantes
                            lista={variantesDoAberto}
                            mudarEstoque={mudarEstoque}
                            mudarShopifyId={mudarShopifyId}
                            adicionar={(m, t, q) => adicionarVariante(p.slug, m, t, q)}
                            remover={removerVariante}
                          />
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </RoloScroll>
      )}
    </div>
  );
}

// Painel de combinações: estoque de cada material × tamanho, mais o
// cadastro de uma nova. Fica em componente próprio porque tem estado
// local (os três campos do formulário de adicionar) que não interessa a
// mais ninguém — se morasse no pai, digitar aqui re-renderizaria a
// tabela inteira de produtos a cada tecla.
function Variantes({ lista, mudarEstoque, mudarShopifyId, adicionar, remover }) {
  const [material, setMaterial] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [estoque, setEstoque] = useState("1");

  async function onAdd() {
    if (!material.trim() && !tamanho.trim()) return;
    const ok = await adicionar(material, tamanho, estoque);
    if (ok) {
      // o material costuma repetir entre tamanhos — mantém pra cadastrar
      // 16cm, 18cm e 20cm em sequência sem redigitar "Prata 925"
      setTamanho("");
      setEstoque("1");
    }
  }

  return (
    <div className="adm__variantes">
      <h3>Estoque por combinação</h3>
      <p className="adm__cel-fraca" style={{ fontSize: 12 }}>
        Cada material e tamanho tem o próprio estoque. Zero some da vitrine.
      </p>

      {lista.length === 0 && (
        <p className="adm__aviso-inline">
          Sem nenhuma combinação, esta peça não pode ser comprada. Cadastre pelo
          menos uma abaixo.
        </p>
      )}

      <ul>
        {lista.map((v) => (
          <li key={v.id} className={v.ativo ? undefined : "is-desligada"}>
            <div className="adm__variante-linha">
              <span className="adm__variante-nome">
                {[v.material, v.tamanho].filter(Boolean).join(" · ") || "Peça única"}
              </span>
              <input
                className="adm__variante-estoque"
                type="number"
                min="0"
                value={v.estoque}
                title="Estoque"
                onChange={(e) => mudarEstoque(v, e.target.value)}
              />
              <button
                type="button"
                className="adm__x"
                onClick={() => remover(v)}
                aria-label="Remover combinação"
                title="Remover combinação"
              >
                ×
              </button>
            </div>
            {/* mapa pro Shopify: id da variante correspondente na loja
                Shopify. Sem ele, esta combinação não entra no checkout do
                Shopify. Copia-se do painel do Shopify. */}
            <input
              className="adm__variante-shopify"
              placeholder="ID Shopify da variante (p/ checkout)"
              value={v.shopify_variant_id || ""}
              onChange={(e) => mudarShopifyId(v, e.target.value)}
            />
          </li>
        ))}
      </ul>

      <div className="adm__variante-nova">
        <input
          placeholder="Material"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
        />
        <input
          placeholder="Tamanho"
          value={tamanho}
          onChange={(e) => setTamanho(e.target.value)}
        />
        <input
          type="number"
          min="0"
          value={estoque}
          onChange={(e) => setEstoque(e.target.value)}
        />
        <button type="button" className="adm__btn-fino" onClick={onAdd}>
          Adicionar
        </button>
      </div>
    </div>
  );
}

// UPLOAD DE FOTO DA PEÇA.
//
// Antes, a foto era o NOME de um arquivo que precisava já existir em
// public/assets/products/ — ou seja, cadastrar peça nova com foto nova
// exigia um desenvolvedor pra colocar o arquivo e dar deploy. Aqui o dono
// sobe a foto direto: ela vai pro bucket `loja` do Storage (pasta
// `produtos/`), cuja policy de escrita exige eh_admin(), e o campo passa
// a guardar a URL pública inteira. O `fotoProduto()` da vitrine já sabe
// lidar com URL completa e com nome de arquivo antigo ao mesmo tempo.
const LIMITE_MB = 5;

function FotoUpload({ valor, onChange }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const inputRef = useRef(null);

  async function enviar(e) {
    const arquivo = e.target.files?.[0];
    // limpa o input pra permitir reenviar o mesmo arquivo depois de um erro
    e.target.value = "";
    if (!arquivo) return;
    setErro("");

    if (!arquivo.type.startsWith("image/")) {
      setErro("Envie uma imagem (JPG, PNG ou WEBP).");
      return;
    }
    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      setErro(`Imagem muito grande (máx ${LIMITE_MB}MB). Comprima antes.`);
      return;
    }

    setEnviando(true);
    // nome com carimbo de tempo: subir a mesma foto duas vezes não
    // sobrescreve a anterior nem serve versão velha do cache
    const ext = arquivo.name.split(".").pop().toLowerCase();
    const caminho = `produtos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from("loja")
      .upload(caminho, arquivo, { cacheControl: "3600", upsert: false });
    setEnviando(false);

    if (error) {
      setErro(`Não foi possível enviar: ${error.message}`);
      return;
    }
    const { data } = supabase.storage.from("loja").getPublicUrl(caminho);
    onChange(data.publicUrl);
  }

  return (
    <div className="adm__foto">
      <div className="adm__foto-preview">
        {valor ? (
          <img src={fotoProduto(valor)} alt="" />
        ) : (
          <span className="adm__foto-vazia">sem foto</span>
        )}
      </div>

      <div className="adm__foto-lado">
        <button
          type="button"
          className="adm__btn"
          disabled={enviando}
          onClick={() => inputRef.current?.click()}
        >
          {enviando ? "Enviando…" : valor ? "Trocar foto" : "Enviar foto"}
        </button>
        {valor && (
          <button
            type="button"
            className="adm__btn-fino"
            onClick={() => onChange("")}
          >
            Remover
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={enviar}
        />
        {erro ? (
          <span className="adm__foto-erro">{erro}</span>
        ) : (
          <span className="adm__foto-dica">JPG, PNG ou WEBP · até {LIMITE_MB}MB</span>
        )}
      </div>
    </div>
  );
}

function FormProduto({ form, setForm, salvar, salvando, novo, cancelar, extra }) {
  const set = (campo) => (e) =>
    setForm((f) => ({
      ...f,
      [campo]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  return (
    <form className="adm__form" onSubmit={salvar}>
      {novo && <h3 className="adm__form-titulo">Nova peça</h3>}

      <div className="adm__form-grid">
        <label className="adm__campo adm__campo--largo">
          <span>Nome da peça</span>
          <input value={form.titulo} onChange={set("titulo")} />
        </label>

        <label className="adm__campo">
          <span>Categoria</span>
          <select value={form.categoria} onChange={set("categoria")}>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="adm__campo">
          <span>Preço (R$)</span>
          <input
            inputMode="decimal"
            placeholder="349.00"
            value={form.preco}
            onChange={set("preco")}
          />
        </label>

        <label className="adm__campo">
          <span>Promocional (R$)</span>
          <input
            inputMode="decimal"
            placeholder="opcional"
            value={form.promocional}
            onChange={set("promocional")}
          />
        </label>

        <label className="adm__campo">
          <span>SKU</span>
          <input placeholder="opcional" value={form.sku} onChange={set("sku")} />
        </label>

        <label className="adm__campo">
          <span>Peso (g)</span>
          <input
            type="number"
            placeholder="p/ frete"
            value={form.peso}
            onChange={set("peso")}
          />
        </label>

        <div className="adm__campo adm__campo--largo">
          <span>Foto da peça</span>
          <FotoUpload
            valor={form.img}
            onChange={(url) => setForm((f) => ({ ...f, img: url }))}
          />
        </div>

        <label className="adm__campo adm__campo--todo">
          <span>Descrição</span>
          <textarea rows={3} value={form.descricao} onChange={set("descricao")} />
        </label>
      </div>

      <div className="adm__form-pe">
        <div className="adm__vitrines">
          <label className="adm__check">
            <input type="checkbox" checked={form.destaque} onChange={set("destaque")} />
            Lançamentos (faixa de cima)
          </label>
          <label className="adm__check">
            <input type="checkbox" checked={form.confira} onChange={set("confira")} />
            Confira também (fim da home)
          </label>
        </div>

        <div className="adm__form-botoes">
          {extra}
          <button type="button" className="adm__btn-fino" onClick={cancelar}>
            Cancelar
          </button>
          <button type="submit" className="adm__btn adm__btn--forte" disabled={salvando}>
            {salvando ? "Salvando…" : novo ? "Cadastrar" : "Salvar"}
          </button>
        </div>
      </div>
    </form>
  );
}
