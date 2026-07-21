import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabase";
import {
  brl,
  cpfValido,
  mascaraCep,
  mascaraCpf,
  mascaraTelefone,
  soDigitos,
  telefoneValido,
} from "../lib/br";
import "./AccountPage.css";

const EASE = [0.16, 1, 0.3, 1];

const STATUS = {
  aguardando_pagamento: { rotulo: "Aguardando pagamento", tom: "espera" },
  pago: { rotulo: "Pago", tom: "ok" },
  em_producao: { rotulo: "Em produção", tom: "andando" },
  enviado: { rotulo: "Enviado", tom: "andando" },
  entregue: { rotulo: "Entregue", tom: "ok" },
  cancelado: { rotulo: "Cancelado", tom: "ruim" },
};

// Minha conta — três blocos que existem porque têm dado real por trás:
// dados editáveis, endereços salvos e pedidos. Nada de tela decorativa.
export default function AccountPage() {
  const { usuario, nome, logado, carregando, sair } = useAuth();

  const [aba, setAba] = useState("pedidos");
  const [pedidos, setPedidos] = useState([]);
  const [enderecos, setEnderecos] = useState([]);
  const [perfil, setPerfil] = useState({ nome: "", telefone: "", cpf: "" });
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState("");
  const [carregandoDados, setCarregandoDados] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    (async () => {
      const [{ data: pf }, { data: ends }, { data: peds }] = await Promise.all([
        supabase.from("perfis").select("nome, telefone, cpf").eq("id", usuario.id).maybeSingle(),
        supabase.from("enderecos").select("*").eq("user_id", usuario.id).order("padrao", { ascending: false }),
        supabase
          .from("pedidos")
          .select("id, numero, status, total_centavos, criado_em, pagamento_metodo")
          .order("criado_em", { ascending: false }),
      ]);
      if (!vivo) return;
      setPerfil({
        nome: pf?.nome || usuario.user_metadata?.nome || "",
        telefone: pf?.telefone ? mascaraTelefone(pf.telefone) : "",
        cpf: pf?.cpf ? mascaraCpf(pf.cpf) : "",
      });
      setEnderecos(ends || []);
      setPedidos(peds || []);
      setCarregandoDados(false);
    })();
    return () => {
      vivo = false;
    };
  }, [usuario]);

  async function salvarPerfil(e) {
    e.preventDefault();
    setSalvo("");
    const err = {};
    if (!perfil.nome.trim()) err.nome = "Informe seu nome.";
    if (perfil.telefone && !telefoneValido(perfil.telefone)) err.telefone = "Telefone incompleto.";
    if (perfil.cpf && !cpfValido(perfil.cpf)) err.cpf = "CPF inválido.";
    setErros(err);
    if (Object.keys(err).length) return;

    setSalvando(true);
    const { error } = await supabase.from("perfis").upsert({
      id: usuario.id,
      nome: perfil.nome.trim(),
      telefone: perfil.telefone ? soDigitos(perfil.telefone) : null,
      cpf: perfil.cpf ? soDigitos(perfil.cpf) : null,
    });
    setSalvando(false);
    setSalvo(error ? `Não foi possível salvar: ${error.message}` : "Dados salvos.");
  }

  async function tornarPadrao(id) {
    await supabase.from("enderecos").update({ padrao: true }).eq("id", id);
    const { data } = await supabase
      .from("enderecos")
      .select("*")
      .eq("user_id", usuario.id)
      .order("padrao", { ascending: false });
    setEnderecos(data || []);
  }

  async function removerEndereco(id) {
    await supabase.from("enderecos").delete().eq("id", id);
    setEnderecos((atual) => atual.filter((x) => x.id !== id));
  }

  // espera a sessão voltar do storage — sem isso quem está logado pisca
  // no login a cada recarga
  if (carregando) {
    return (
      <div className="conta">
        <Navbar variant="inline" />
        <p className="conta__carregando">Carregando…</p>
      </div>
    );
  }

  if (!logado) return <Navigate to="/login" replace state={{ de: "/conta" }} />;

  const abas = [
    { id: "pedidos", rotulo: "Pedidos" },
    { id: "dados", rotulo: "Meus dados" },
    { id: "enderecos", rotulo: "Endereços" },
  ];

  return (
    <div className="conta">
      <Navbar variant="inline" />

      <motion.div
        className="conta__inner"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <header className="conta__head">
          <p className="conta__eyebrow">Minha conta</p>
          <h1 className="conta__nome">{nome}</h1>
        </header>

        <nav className="conta__abas">
          {abas.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`conta__aba${aba === a.id ? " is-ativa" : ""}`}
              onClick={() => setAba(a.id)}
            >
              {a.rotulo}
              {a.id === "pedidos" && pedidos.length > 0 && (
                <span className="conta__aba-n">{pedidos.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* ---------- PEDIDOS ---------- */}
        {aba === "pedidos" && (
          <section className="conta__painel">
            {carregandoDados ? (
              <p className="conta__vazio">Carregando…</p>
            ) : pedidos.length === 0 ? (
              <div className="conta__nada">
                <p>Você ainda não fez nenhum pedido.</p>
                <Link className="conta__ghost" to="/colecao/g-shop">
                  Ver a vitrine
                </Link>
              </div>
            ) : (
              <ul className="conta__pedidos">
                {pedidos.map((p) => {
                  const st = STATUS[p.status] || STATUS.aguardando_pagamento;
                  return (
                    <li key={p.id}>
                      <Link className="conta__pedido" to={`/pedido/${p.id}`}>
                        <span className="conta__pedido-num">#{p.numero}</span>
                        <span className="conta__pedido-data">
                          {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                        </span>
                        <span className={`conta__status conta__status--${st.tom}`}>
                          {st.rotulo}
                        </span>
                        <span className="conta__pedido-total">{brl(p.total_centavos)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* ---------- DADOS ---------- */}
        {aba === "dados" && (
          <section className="conta__painel">
            <form className="conta__form" onSubmit={salvarPerfil}>
              <div className="conta__campo">
                <label htmlFor="ct-nome">Nome</label>
                <input
                  id="ct-nome"
                  value={perfil.nome}
                  autoComplete="name"
                  onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })}
                />
                {erros.nome && <span className="conta__campo-erro">{erros.nome}</span>}
              </div>

              <div className="conta__linha">
                <div className="conta__campo">
                  <label htmlFor="ct-tel">Telefone</label>
                  <input
                    id="ct-tel"
                    value={perfil.telefone}
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    onChange={(e) =>
                      setPerfil({ ...perfil, telefone: mascaraTelefone(e.target.value) })
                    }
                  />
                  {erros.telefone && <span className="conta__campo-erro">{erros.telefone}</span>}
                </div>
                <div className="conta__campo">
                  <label htmlFor="ct-cpf">CPF</label>
                  <input
                    id="ct-cpf"
                    value={perfil.cpf}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    onChange={(e) => setPerfil({ ...perfil, cpf: mascaraCpf(e.target.value) })}
                  />
                  {erros.cpf && <span className="conta__campo-erro">{erros.cpf}</span>}
                </div>
              </div>

              <div className="conta__campo">
                <label htmlFor="ct-email">E-mail</label>
                {/* o e-mail é a identidade da conta no Supabase: trocar
                    exige confirmar o novo endereço, então não fica solto
                    aqui junto com nome e telefone */}
                <input id="ct-email" value={usuario.email} disabled />
                <span className="conta__campo-nota">
                  Para trocar o e-mail, fale com o atendimento.
                </span>
              </div>

              {salvo && <p className="conta__salvo">{salvo}</p>}

              <button type="submit" className="conta__cta" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar alterações"}
              </button>
            </form>
          </section>
        )}

        {/* ---------- ENDEREÇOS ---------- */}
        {aba === "enderecos" && (
          <section className="conta__painel">
            {enderecos.length === 0 ? (
              <div className="conta__nada">
                <p>
                  Nenhum endereço salvo. O endereço que você usar no checkout fica
                  guardado aqui para a próxima compra.
                </p>
                <Link className="conta__ghost" to="/colecao/g-shop">
                  Ver a vitrine
                </Link>
              </div>
            ) : (
              <ul className="conta__enderecos">
                {enderecos.map((e) => (
                  <li key={e.id} className={e.padrao ? "is-padrao" : undefined}>
                    <div className="conta__end-texto">
                      {e.padrao && <span className="conta__end-tag">Padrão</span>}
                      <strong>
                        {e.rua}, {e.numero}
                        {e.complemento ? ` — ${e.complemento}` : ""}
                      </strong>
                      <span>{e.bairro}</span>
                      <span>
                        {e.cidade} — {e.uf} · CEP {mascaraCep(e.cep)}
                      </span>
                    </div>
                    <div className="conta__end-acoes">
                      {!e.padrao && (
                        <button type="button" onClick={() => tornarPadrao(e.id)}>
                          Usar como padrão
                        </button>
                      )}
                      <button
                        type="button"
                        className="conta__end-remover"
                        onClick={() => removerEndereco(e.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <button type="button" className="conta__sair" onClick={sair}>
          Sair da conta
        </button>
      </motion.div>

      <Footer />
    </div>
  );
}
