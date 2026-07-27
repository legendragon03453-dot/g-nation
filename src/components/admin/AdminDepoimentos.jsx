import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import RoloScroll from "../RoloScroll";

// DEPOIMENTOS — a prova social da home, com conteúdo REAL.
//
// A home mostrava quatro cards idênticos em inglês (o placeholder do
// Figma). Aqui o dono cadastra depoimento de cliente de verdade; a home
// só exibe a seção quando existe pelo menos um publicado. Nada é
// inventado no meio — depoimento falso engana quem está comprando.
//
// Escrita direta na tabela (não por função): `depoimentos` tem policy de
// escrita exigindo eh_admin(), e não há regra de transição a proteger.
const VAZIO = { nome: "", origem: "", texto: "", nota: 5 };

export default function AdminDepoimentos() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    const { data, error } = await supabase
      .from("depoimentos")
      .select("*")
      .order("ordem")
      .order("criado_em", { ascending: false });
    if (error) setErro("Não foi possível carregar os depoimentos.");
    setLista(data || []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setAviso("");
    if (!form.nome.trim()) return setErro("Informe o nome de quem deu o depoimento.");
    if (form.texto.trim().length < 12) return setErro("O depoimento está curto demais.");

    const { error } = await supabase.from("depoimentos").insert({
      nome: form.nome.trim(),
      origem: form.origem.trim() || null,
      texto: form.texto.trim(),
      nota: Number(form.nota),
      ordem: lista.length,
    });
    if (error) return setErro(`Não foi possível salvar: ${error.message}`);

    setAviso("Depoimento publicado.");
    setForm(VAZIO);
    setCriando(false);
    carregar();
  }

  async function alternar(d) {
    await supabase
      .from("depoimentos")
      .update({ publicado: !d.publicado })
      .eq("id", d.id);
    carregar();
  }

  async function remover(d) {
    await supabase.from("depoimentos").delete().eq("id", d.id);
    carregar();
  }

  const publicados = lista.filter((d) => d.publicado).length;

  return (
    <div className="adm__pagina">
      <header className="adm__cabeca">
        <p className="adm__ola">Prova social</p>
        <h1 className="adm__titulo">Depoimentos</h1>
      </header>

      <div className="adm__ferramentas">
        <p className="adm__cel-fraca" style={{ margin: 0, fontSize: 13 }}>
          {publicados} na home · {lista.length - publicados} despublicados
        </p>
        <button type="button" className="adm__btn" onClick={() => setCriando((v) => !v)}>
          {criando ? "Fechar" : "Novo depoimento"}
        </button>
      </div>

      {/* Enquanto não houver nenhum, a seção da home fica ESCONDIDA — não
          mostra card vazio nem elogio de mentira. */}
      {publicados === 0 && (
        <p className="adm__alerta">
          A seção de depoimentos da home está oculta: ela só aparece quando houver
          pelo menos um depoimento publicado. Cadastre depoimentos reais de
          clientes.
        </p>
      )}

      {erro && <p className="adm__erro">{erro}</p>}
      {aviso && <p className="adm__ok">{aviso}</p>}

      {criando && (
        <form className="adm__form" onSubmit={salvar}>
          <div className="adm__form-grid">
            <label className="adm__campo">
              <span>Nome do cliente</span>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </label>
            <label className="adm__campo">
              <span>Origem (cidade / @)</span>
              <input
                placeholder="opcional"
                value={form.origem}
                onChange={(e) => setForm({ ...form, origem: e.target.value })}
              />
            </label>
            <label className="adm__campo">
              <span>Nota</span>
              <select
                value={form.nota}
                onChange={(e) => setForm({ ...form, nota: e.target.value })}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)}
                    {"☆".repeat(5 - n)} ({n})
                  </option>
                ))}
              </select>
            </label>
            <label className="adm__campo adm__campo--todo">
              <span>Depoimento</span>
              <textarea
                rows={3}
                value={form.texto}
                onChange={(e) => setForm({ ...form, texto: e.target.value })}
              />
            </label>
          </div>
          <div className="adm__form-pe">
            <span className="adm__cel-fraca" style={{ fontSize: 12 }}>
              Use palavras do próprio cliente. Nada de texto inventado.
            </span>
            <div className="adm__form-botoes">
              <button type="submit" className="adm__btn adm__btn--forte">
                Publicar
              </button>
            </div>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="adm__vazio-txt">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="adm__vazio-txt">
          Nenhum depoimento ainda. O primeiro cliente satisfeito rende o primeiro.
        </p>
      ) : (
        <RoloScroll className="adm__tabela-rolo">
          <table className="adm__tabela">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Depoimento</th>
                <th>Nota</th>
                <th>Situação</th>
                <th className="adm__col-acao">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.nome}</strong>
                    {d.origem && <span className="adm__cel-sub">{d.origem}</span>}
                  </td>
                  <td className="adm__cel-fraca" style={{ maxWidth: 340 }}>
                    {d.texto.length > 90 ? d.texto.slice(0, 90) + "…" : d.texto}
                  </td>
                  <td style={{ whiteSpace: "nowrap", color: "#ffc44d" }}>
                    {"★".repeat(d.nota)}
                  </td>
                  <td>
                    <span
                      className={`adm__badge adm__badge--${d.publicado ? "ok" : "espera"}`}
                    >
                      {d.publicado ? "Na home" : "Oculto"}
                    </span>
                  </td>
                  <td className="adm__col-acao">
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="adm__btn-fino"
                        onClick={() => alternar(d)}
                      >
                        {d.publicado ? "Ocultar" : "Publicar"}
                      </button>
                      <button
                        type="button"
                        className="adm__x"
                        onClick={() => remover(d)}
                        aria-label="Excluir depoimento"
                        title="Excluir"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </RoloScroll>
      )}
    </div>
  );
}
