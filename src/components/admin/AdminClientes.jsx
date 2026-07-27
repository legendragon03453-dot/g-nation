import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../supabase";
import { brl, mascaraTelefone } from "../../lib/br";
import RoloScroll from "../RoloScroll";

// CLIENTES — quem já comprou, e quanto.
//
// A lista vem da função `admin_clientes()` e não de um select na tabela,
// por duas razões concretas: o e-mail mora em `auth.users`, que o
// PostgREST não expõe; e o total gasto é uma agregação sobre `pedidos`
// que, feita na tela, viraria uma consulta por cliente.
//
// O "gasto" conta só pedido que virou dinheiro (pago em diante). Somar
// pedido pendente daria um número bonito e falso — e é justamente o
// número que o dono usaria pra decidir quem merece atenção.
export default function AdminClientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("admin_clientes");
      if (error) setErro("Não foi possível carregar os clientes.");
      setClientes(data || []);
      setCarregando(false);
    })();
  }, []);

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return clientes;
    return clientes.filter(
      (c) =>
        (c.nome || "").toLowerCase().includes(t) ||
        (c.email || "").toLowerCase().includes(t)
    );
  }, [clientes, busca]);

  const compradores = clientes.filter((c) => c.pedidos_total > 0);
  const receita = compradores.reduce((s, c) => s + Number(c.gasto_centavos), 0);
  // Ticket médio por cliente: numa loja de peça cara, esse número diz mais
  // sobre o negócio que a contagem de cadastros.
  const ticket = compradores.length ? Math.round(receita / compradores.length) : 0;

  return (
    <div className="adm__pagina">
      <header className="adm__cabeca">
        <p className="adm__ola">Base</p>
        <h1 className="adm__titulo">Clientes</h1>
      </header>

      <div className="adm__cards">
        <article className="adm__card">
          <p className="adm__card-rotulo">Cadastros</p>
          <p className="adm__card-valor">{clientes.length}</p>
          <p className="adm__card-pe">
            <span className="adm__card-nota">contas criadas</span>
          </p>
        </article>
        <article className="adm__card">
          <p className="adm__card-rotulo">Já compraram</p>
          <p className="adm__card-valor">{compradores.length}</p>
          <p className="adm__card-pe">
            <span className="adm__card-nota">
              {clientes.length
                ? `${Math.round((compradores.length / clientes.length) * 100)}% da base`
                : ""}
            </span>
          </p>
        </article>
        <article className="adm__card">
          <p className="adm__card-rotulo">Gasto médio</p>
          <p className="adm__card-valor">{brl(ticket)}</p>
          <p className="adm__card-pe">
            <span className="adm__card-nota">por cliente que comprou</span>
          </p>
        </article>
      </div>

      <div className="adm__ferramentas">
        <span />
        <input
          className="adm__busca"
          type="search"
          placeholder="Buscar por nome ou e-mail"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {erro && <p className="adm__erro">{erro}</p>}

      {carregando ? (
        <p className="adm__vazio-txt">Carregando…</p>
      ) : visiveis.length === 0 ? (
        <p className="adm__vazio-txt">Ninguém por aqui ainda.</p>
      ) : (
        <RoloScroll className="adm__tabela-rolo">
          <table className="adm__tabela">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th className="adm__col-num">Pedidos</th>
                <th className="adm__col-num">Gasto</th>
                <th>Última compra</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.nome || "sem nome"}</strong>
                    <span className="adm__cel-sub">
                      desde {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                    </span>
                  </td>
                  <td className="adm__cel-fraca">
                    {c.email}
                    {c.telefone && (
                      <span className="adm__cel-sub">
                        {mascaraTelefone(c.telefone)}
                      </span>
                    )}
                  </td>
                  <td className="adm__col-num">
                    {c.pedidos_total > 0 ? (
                      <Link className="adm__link" to={`/admin/pedidos?pedido=${c.email}`}>
                        {c.pedidos_total}
                      </Link>
                    ) : (
                      <span className="adm__cel-fraca">0</span>
                    )}
                  </td>
                  <td className="adm__col-num">
                    {Number(c.gasto_centavos) > 0 ? (
                      brl(Number(c.gasto_centavos))
                    ) : (
                      <span className="adm__cel-fraca">—</span>
                    )}
                  </td>
                  <td className="adm__cel-fraca">
                    {c.ultimo_pedido
                      ? new Date(c.ultimo_pedido).toLocaleDateString("pt-BR")
                      : "nunca comprou"}
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
