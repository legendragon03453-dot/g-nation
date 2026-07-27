import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../supabase";
import { useAuth } from "../../AuthContext";
import { brl } from "../../lib/br";
import { StatusBadge } from "./StatusBadge";
import RoloScroll from "../RoloScroll";

// DASHBOARD — node 27:545 do Figma: saudação, título grande, quatro
// cartões de número e a tabela "PEDIDOS RECENTES" com o botão VER TUDO.
//
// Os números do Figma são de exemplo (14.280 BRL, 28 pedidos, 1.204
// clientes). Aqui eles vêm do banco pela função `admin_metricas()` — uma
// chamada só, porque a tela pede os quatro de uma vez e quatro consultas
// separadas seriam quatro viagens pra montar um cabeçalho.
//
// Enquanto a loja não vendeu nada, os cartões mostram zero de verdade. Não
// há número inventado pra "parecer cheio": um dashboard que mente é pior
// que um dashboard vazio.
export default function AdminDashboard() {
  const { nome } = useAuth();
  const [m, setM] = useState(null);
  const [recentes, setRecentes] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [{ data: metricas, error: e1 }, { data: pedidos, error: e2 }] =
        await Promise.all([
          supabase.rpc("admin_metricas"),
          supabase
            .from("pedidos")
            .select("id, numero, status, total_centavos, criado_em, contato")
            .order("criado_em", { ascending: false })
            .limit(5),
        ]);
      if (!vivo) return;
      if (e1 || e2) {
        setErro("Não foi possível carregar os números agora.");
        return;
      }
      setM(metricas);
      setRecentes(pedidos || []);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // A variação vs. mês passado que aparece embaixo de cada número. Sem
  // base de comparação (primeiro mês da loja) não existe "+0%" honesto —
  // devolve nulo e o cartão simplesmente não mostra a linha.
  function variacao(agora, antes) {
    if (!antes) return null;
    const pct = Math.round(((agora - antes) / antes) * 100);
    return { pct, subiu: pct >= 0 };
  }

  const cartoes = m
    ? [
        {
          rotulo: "Vendas hoje",
          valor: brl(m.vendas_hoje_centavos),
          delta: null,
        },
        {
          rotulo: "Pedidos novos",
          valor: String(m.pedidos_novos),
          delta: variacao(m.pedidos_mes, m.pedidos_mes_passado),
          nota: "aguardando pagamento",
        },
        {
          rotulo: "Clientes ativos",
          valor: String(m.clientes_ativos),
          delta: variacao(m.clientes_ativos, m.clientes_mes_passado),
          nota: "compraram nos últimos 90 dias",
        },
        {
          rotulo: "Receita total",
          valor: brl(m.receita_total_centavos),
          delta: variacao(m.receita_mes_centavos, m.receita_mes_passado_centavos),
        },
      ]
    : [];

  return (
    <div className="adm__pagina">
      <header className="adm__cabeca">
        <p className="adm__ola">Bem-vindo de volta, {nome.split(" ")[0]}.</p>
        <h1 className="adm__titulo">Dashboard visão geral</h1>
      </header>

      {erro && <p className="adm__erro">{erro}</p>}

      <div className="adm__cards">
        {(m ? cartoes : [1, 2, 3, 4]).map((c, i) =>
          m ? (
            <article className="adm__card" key={c.rotulo}>
              <p className="adm__card-rotulo">{c.rotulo}</p>
              <p className="adm__card-valor">{c.valor}</p>
              <p className="adm__card-pe">
                {c.delta && (
                  <span
                    className={`adm__delta${c.delta.subiu ? "" : " is-queda"}`}
                  >
                    {c.delta.subiu ? "+" : ""}
                    {c.delta.pct}%
                  </span>
                )}{" "}
                <span className="adm__card-nota">
                  {c.delta ? "vs mês passado" : c.nota || ""}
                </span>
              </p>
            </article>
          ) : (
            /* esqueleto: o cartão já ocupa o espaço final, então a grade
               não "pula" quando os números chegam */
            <article className="adm__card is-carregando" key={i} aria-hidden="true">
              <span />
              <span />
            </article>
          )
        )}
      </div>

      {m?.estoque_baixo > 0 && (
        <p className="adm__alerta">
          {m.estoque_baixo === 1
            ? "1 variação está com estoque baixo (2 peças ou menos)."
            : `${m.estoque_baixo} variações estão com estoque baixo (2 peças ou menos).`}{" "}
          <Link to="/admin/produtos">Ver produtos</Link>
        </p>
      )}

      <section className="adm__bloco">
        <div className="adm__bloco-topo">
          <h2 className="adm__bloco-titulo">Pedidos recentes</h2>
          <Link className="adm__btn-fino" to="/admin/pedidos">
            Ver tudo
          </Link>
        </div>

        {recentes.length === 0 ? (
          <p className="adm__vazio-txt">
            Nenhum pedido ainda. Quando a primeira compra entrar, ela aparece aqui.
          </p>
        ) : (
          <RoloScroll className="adm__tabela-rolo">
            <table className="adm__tabela">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th className="adm__col-num">Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map((p) => (
                  <tr key={p.id}>
                    <td className="adm__cel-id">
                      <Link to={`/admin/pedidos?pedido=${p.numero}`}>#{p.numero}</Link>
                    </td>
                    <td>{p.contato?.nome || "—"}</td>
                    <td className="adm__cel-fraca">
                      {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="adm__col-num">{brl(p.total_centavos)}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </RoloScroll>
        )}
      </section>
    </div>
  );
}
