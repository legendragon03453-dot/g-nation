import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../supabase";
import { brl, mascaraCep, mascaraTelefone } from "../../lib/br";
import { STATUS, StatusBadge } from "./StatusBadge";
import { fotoProduto } from "../../lib/img";
import RoloScroll from "../RoloScroll";

// PEDIDOS — a tela onde a loja é operada de verdade: ver o que entrou,
// confirmar pagamento, despachar, cancelar.
//
// Esta seção não está desenhada no Figma (o frame `painel-admin` só tem
// o Dashboard; "Pedidos" existe na sidebar sem tela própria). Ela é
// construída com a MESMA linguagem do frame que existe — fundo preto,
// cartões #141414, tabela de cabeçalho cinza, as etiquetas de status já
// definidas lá — em vez de inventar um segundo estilo pro mesmo painel.
//
// A mudança de status NÃO é um update na tabela: o cliente (inclusive o
// admin) não tem permissão de escrever em `pedidos`. Quem muda é a função
// `admin_mudar_status`, que guarda as regras — peça só sai depois de paga,
// cancelamento devolve estoque, cancelado não volta atrás.
const FILTROS = [
  { id: "todos", rotulo: "Todos" },
  { id: "aguardando_pagamento", rotulo: "Pendentes" },
  { id: "pago", rotulo: "Pagos" },
  { id: "em_producao", rotulo: "Em produção" },
  { id: "enviado", rotulo: "Enviados" },
  { id: "entregue", rotulo: "Entregues" },
  { id: "cancelado", rotulo: "Cancelados" },
];

// A ordem em que um pedido caminha. O menu de ação mostra só o que faz
// sentido a partir de onde ele está — evita o clique errado que despacha
// um pedido não pago.
const PROXIMOS = {
  aguardando_pagamento: ["pago", "cancelado"],
  pago: ["em_producao", "enviado", "cancelado"],
  em_producao: ["enviado", "cancelado"],
  enviado: ["entregue"],
  entregue: [],
  cancelado: [],
};

export default function AdminPedidos() {
  const [params, setParams] = useSearchParams();
  const [pedidos, setPedidos] = useState([]);
  const [itensPorPedido, setItensPorPedido] = useState({});
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState(params.get("pedido") || "");
  const [aberto, setAberto] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mexendo, setMexendo] = useState(null);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(200);
    setCarregando(false);
    if (error) {
      setErro("Não foi possível carregar os pedidos.");
      return;
    }
    setPedidos(data || []);
  }

  useEffect(() => {
    carregar();
  }, []);

  // Os itens são buscados só quando a linha é aberta: carregar as peças
  // de 200 pedidos de uma vez pra mostrar 1 é desperdício de banda e de
  // tempo de tela.
  async function abrir(pedido) {
    const novo = aberto === pedido.id ? null : pedido.id;
    setAberto(novo);
    if (!novo || itensPorPedido[pedido.id]) return;
    const { data } = await supabase
      .from("itens_pedido")
      .select("*")
      .eq("pedido_id", pedido.id);
    setItensPorPedido((m) => ({ ...m, [pedido.id]: data || [] }));
  }

  async function mudarStatus(pedido, novo) {
    setMexendo(pedido.id);
    setErro("");
    const { data, error } = await supabase.rpc("admin_mudar_status", {
      p_pedido_id: pedido.id,
      p_status: novo,
    });
    setMexendo(null);

    if (error) {
      const codigo = (error.message || "").split(":")[0].trim();
      setErro(
        {
          PEDIDO_NAO_PAGO:
            "Esse pedido ainda não foi pago. Marque como pago antes de despachar.",
          PEDIDO_CANCELADO: "Pedido cancelado não volta atrás.",
          PEDIDO_JA_SAIU: "Esse pedido já saiu pra entrega.",
          SEM_PERMISSAO: "Sua conta não tem permissão pra isso.",
        }[codigo] || `Não foi possível mudar o status: ${error.message}`
      );
      return;
    }
    // troca a linha no lugar, sem recarregar a lista inteira
    setPedidos((lista) => lista.map((p) => (p.id === data.id ? data : p)));
  }

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase().replace("#", "");
    return pedidos.filter((p) => {
      if (filtro !== "todos" && p.status !== filtro) return false;
      if (!termo) return true;
      return (
        String(p.numero).includes(termo) ||
        (p.contato?.nome || "").toLowerCase().includes(termo) ||
        (p.contato?.email || "").toLowerCase().includes(termo)
      );
    });
  }, [pedidos, filtro, busca]);

  // Contagem por filtro: mostra onde está o trabalho parado sem precisar
  // clicar em cada aba.
  const contagem = useMemo(() => {
    const c = { todos: pedidos.length };
    for (const p of pedidos) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [pedidos]);

  return (
    <div className="adm__pagina">
      <header className="adm__cabeca">
        <p className="adm__ola">Operação</p>
        <h1 className="adm__titulo">Pedidos</h1>
      </header>

      <div className="adm__ferramentas">
        <div className="adm__filtros">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`adm__filtro${filtro === f.id ? " is-ativo" : ""}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.rotulo}
              {contagem[f.id] ? <span>{contagem[f.id]}</span> : null}
            </button>
          ))}
        </div>

        <input
          className="adm__busca"
          type="search"
          placeholder="Buscar por número, nome ou e-mail"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setParams(e.target.value ? { pedido: e.target.value } : {});
          }}
        />
      </div>

      {erro && <p className="adm__erro">{erro}</p>}

      {carregando ? (
        <p className="adm__vazio-txt">Carregando pedidos…</p>
      ) : visiveis.length === 0 ? (
        <p className="adm__vazio-txt">
          {pedidos.length === 0
            ? "Nenhum pedido ainda."
            : "Nenhum pedido bate com esse filtro."}
        </p>
      ) : (
        <RoloScroll className="adm__tabela-rolo">
          <table className="adm__tabela adm__tabela--pedidos">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Data</th>
                <th className="adm__col-num">Valor</th>
                <th>Status</th>
                <th className="adm__col-acao">Ação</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p) => {
                const estaAberto = aberto === p.id;
                const itens = itensPorPedido[p.id];
                return [
                  <tr
                    key={p.id}
                    className={`adm__linha${estaAberto ? " is-aberta" : ""}`}
                    onClick={() => abrir(p)}
                  >
                    <td className="adm__cel-id">#{p.numero}</td>
                    <td>
                      {p.contato?.nome || "—"}
                      <span className="adm__cel-sub">{p.contato?.email}</span>
                    </td>
                    <td className="adm__cel-fraca">
                      {new Date(p.criado_em).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="adm__col-num">{brl(p.total_centavos)}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="adm__col-acao">
                      {PROXIMOS[p.status]?.length ? (
                        <select
                          className="adm__acao"
                          value=""
                          disabled={mexendo === p.id}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            if (e.target.value) mudarStatus(p, e.target.value);
                          }}
                        >
                          <option value="">
                            {mexendo === p.id ? "Salvando…" : "Mudar para…"}
                          </option>
                          {PROXIMOS[p.status].map((s) => (
                            <option key={s} value={s}>
                              {STATUS[s].rotulo}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="adm__cel-fraca">—</span>
                      )}
                    </td>
                  </tr>,

                  estaAberto && (
                    <tr key={`${p.id}-detalhe`} className="adm__detalhe-linha">
                      <td colSpan={6}>
                        <div className="adm__detalhe">
                          <div>
                            <h3>Peças</h3>
                            {!itens ? (
                              <p className="adm__cel-fraca">Carregando…</p>
                            ) : (
                              <ul className="adm__pecas">
                                {itens.map((i) => (
                                  <li key={i.id}>
                                    <img src={fotoProduto(i.img)} alt="" />
                                    <span>
                                      <strong>{i.titulo}</strong>
                                      <span className="adm__cel-fraca">
                                        {[i.material, i.tamanho]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </span>
                                    </span>
                                    <span className="adm__peca-qtd">
                                      {i.quantidade}x {brl(i.preco_unit_centavos)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div>
                            <h3>Entrega</h3>
                            <address className="adm__endereco">
                              {p.entrega?.rua}, {p.entrega?.numero}
                              {p.entrega?.complemento
                                ? ` — ${p.entrega.complemento}`
                                : ""}
                              <br />
                              {p.entrega?.bairro} — {p.entrega?.cidade}/
                              {p.entrega?.uf}
                              <br />
                              CEP {mascaraCep(p.entrega?.cep || "")}
                            </address>
                            <h3>Contato</h3>
                            <p className="adm__cel-fraca">
                              {p.contato?.email}
                              <br />
                              {p.contato?.telefone
                                ? mascaraTelefone(p.contato.telefone)
                                : ""}
                            </p>
                          </div>

                          <div>
                            <h3>Conta</h3>
                            <dl className="adm__contas">
                              <div>
                                <dt>Subtotal</dt>
                                <dd>{brl(p.subtotal_centavos)}</dd>
                              </div>
                              {p.desconto_centavos > 0 && (
                                <div>
                                  <dt>Desconto {p.cupom_codigo ? `(${p.cupom_codigo})` : ""}</dt>
                                  <dd>-{brl(p.desconto_centavos)}</dd>
                                </div>
                              )}
                              <div>
                                <dt>Frete</dt>
                                <dd>
                                  {p.frete_centavos === 0
                                    ? "Grátis"
                                    : brl(p.frete_centavos)}
                                </dd>
                              </div>
                              <div className="adm__contas-total">
                                <dt>Total</dt>
                                <dd>{brl(p.total_centavos)}</dd>
                              </div>
                            </dl>
                            <p className="adm__cel-fraca">
                              Pagamento: {p.pagamento_metodo || "—"}
                            </p>
                          </div>
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
