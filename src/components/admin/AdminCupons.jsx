import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { brl } from "../../lib/br";
import RoloScroll from "../RoloScroll";

// CUPONS — desconto com regra, não com combinado verbal.
//
// A validação inteira (janela de datas, pedido mínimo, limite de usos)
// roda dentro de `criar_pedido`, no banco. Esta tela só cadastra. É de
// propósito: se a regra vivesse aqui, bastaria chamar a API por fora pra
// usar um cupom vencido.
//
// O cliente NÃO consegue ler esta tabela — a policy só deixa o admin. Se
// desse pra ler, um `select` no console listaria todo código de desconto
// ativo da loja.
//
// Formatos que fazem sentido pra joia:
//  - PERCENTUAL pra campanha ampla ("10% na primeira compra")
//  - FIXO pra recuperar carrinho ("R$ 50 pra fechar hoje")
// O pedido mínimo existe pra promoção não corroer a peça de entrada: 10%
// em tudo pesa diferente numa peça de R$ 250 e numa de R$ 900.
const VAZIO = {
  codigo: "",
  tipo: "percentual",
  valor: "",
  minimo: "",
  expira_em: "",
  limite_usos: "",
};

export default function AdminCupons() {
  const [cupons, setCupons] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    const { data, error } = await supabase
      .from("cupons")
      .select("*")
      .order("criado_em", { ascending: false });
    if (error) setErro("Não foi possível carregar os cupons.");
    setCupons(data || []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setAviso("");

    const codigo = form.codigo.trim().toUpperCase().replace(/\s+/g, "");
    if (codigo.length < 3) return setErro("O código precisa de pelo menos 3 letras.");

    const valor =
      form.tipo === "percentual"
        ? Number(form.valor)
        : Math.round(Number(String(form.valor).replace(",", ".")) * 100);

    if (!valor || valor <= 0) return setErro("Informe o valor do desconto.");
    if (form.tipo === "percentual" && valor > 90) {
      return setErro("Desconto acima de 90% provavelmente é engano.");
    }

    const { error } = await supabase.from("cupons").insert({
      codigo,
      tipo: form.tipo,
      valor,
      minimo_centavos: form.minimo
        ? Math.round(Number(String(form.minimo).replace(",", ".")) * 100)
        : 0,
      // fim do dia, não meia-noite: cupom que vence "dia 30" vale o dia 30
      // inteiro, senão o cliente que compra às 10h da manhã leva não
      expira_em: form.expira_em ? `${form.expira_em}T23:59:59` : null,
      limite_usos: form.limite_usos ? Number(form.limite_usos) : null,
    });

    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe um cupom com esse código."
          : `Não foi possível criar: ${error.message}`
      );
      return;
    }

    setAviso(`Cupom ${codigo} criado.`);
    setForm(VAZIO);
    setCriando(false);
    carregar();
  }

  async function alternar(c) {
    await supabase.from("cupons").update({ ativo: !c.ativo }).eq("codigo", c.codigo);
    carregar();
  }

  function situacao(c) {
    if (!c.ativo) return { rotulo: "Desligado", tom: "ruim" };
    if (c.expira_em && new Date(c.expira_em) < new Date())
      return { rotulo: "Vencido", tom: "ruim" };
    if (c.limite_usos && c.usos >= c.limite_usos)
      return { rotulo: "Esgotado", tom: "espera" };
    return { rotulo: "Valendo", tom: "ok" };
  }

  return (
    <div className="adm__pagina">
      <header className="adm__cabeca">
        <p className="adm__ola">Campanhas</p>
        <h1 className="adm__titulo">Cupons</h1>
      </header>

      <div className="adm__ferramentas">
        <p className="adm__cel-fraca" style={{ margin: 0, fontSize: 13 }}>
          {cupons.filter((c) => situacao(c).rotulo === "Valendo").length} valendo agora
        </p>
        <button type="button" className="adm__btn" onClick={() => setCriando((v) => !v)}>
          {criando ? "Fechar" : "Criar cupom"}
        </button>
      </div>

      {erro && <p className="adm__erro">{erro}</p>}
      {aviso && <p className="adm__ok">{aviso}</p>}

      {criando && (
        <form className="adm__form" onSubmit={salvar}>
          <div className="adm__form-grid">
            <label className="adm__campo">
              <span>Código</span>
              <input
                placeholder="PRIMEIRACOMPRA"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              />
            </label>

            <label className="adm__campo">
              <span>Tipo</span>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value, valor: "" })}
              >
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Valor fixo (R$)</option>
              </select>
            </label>

            <label className="adm__campo">
              <span>{form.tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}</span>
              <input
                inputMode="decimal"
                placeholder={form.tipo === "percentual" ? "10" : "50.00"}
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </label>

            <label className="adm__campo">
              <span>Pedido mínimo (R$)</span>
              <input
                inputMode="decimal"
                placeholder="opcional"
                value={form.minimo}
                onChange={(e) => setForm({ ...form, minimo: e.target.value })}
              />
            </label>

            <label className="adm__campo">
              <span>Vale até</span>
              <input
                type="date"
                value={form.expira_em}
                onChange={(e) => setForm({ ...form, expira_em: e.target.value })}
              />
            </label>

            <label className="adm__campo">
              <span>Limite de usos</span>
              <input
                type="number"
                min="1"
                placeholder="sem limite"
                value={form.limite_usos}
                onChange={(e) => setForm({ ...form, limite_usos: e.target.value })}
              />
            </label>
          </div>

          <div className="adm__form-pe">
            <span className="adm__cel-fraca" style={{ fontSize: 12 }}>
              A validação roda no servidor, na hora de fechar o pedido.
            </span>
            <div className="adm__form-botoes">
              <button type="submit" className="adm__btn adm__btn--forte">
                Criar cupom
              </button>
            </div>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="adm__vazio-txt">Carregando…</p>
      ) : cupons.length === 0 ? (
        <p className="adm__vazio-txt">
          Nenhum cupom criado. Um código de primeira compra costuma ser o primeiro.
        </p>
      ) : (
        <RoloScroll className="adm__tabela-rolo">
          <table className="adm__tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Desconto</th>
                <th>Mínimo</th>
                <th>Vale até</th>
                <th className="adm__col-num">Usos</th>
                <th>Situação</th>
                <th className="adm__col-acao">Ação</th>
              </tr>
            </thead>
            <tbody>
              {cupons.map((c) => {
                const s = situacao(c);
                return (
                  <tr key={c.codigo}>
                    <td className="adm__cel-id">{c.codigo}</td>
                    <td>
                      {c.tipo === "percentual" ? `${c.valor}%` : brl(c.valor)}
                    </td>
                    <td className="adm__cel-fraca">
                      {c.minimo_centavos ? brl(c.minimo_centavos) : "—"}
                    </td>
                    <td className="adm__cel-fraca">
                      {c.expira_em
                        ? new Date(c.expira_em).toLocaleDateString("pt-BR")
                        : "sem prazo"}
                    </td>
                    <td className="adm__col-num">
                      {c.usos}
                      {c.limite_usos ? ` / ${c.limite_usos}` : ""}
                    </td>
                    <td>
                      <span className={`adm__badge adm__badge--${s.tom}`}>
                        {s.rotulo}
                      </span>
                    </td>
                    <td className="adm__col-acao">
                      <button
                        type="button"
                        className="adm__btn-fino"
                        onClick={() => alternar(c)}
                      >
                        {c.ativo ? "Desligar" : "Ligar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </RoloScroll>
      )}
    </div>
  );
}
