import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabase";
import { brl, mascaraCep, mascaraTelefone } from "../lib/br";
import "./OrderPage.css";

const EASE = [0.16, 1, 0.3, 1];

const STATUS = {
  aguardando_pagamento: { rotulo: "Aguardando pagamento", tom: "espera" },
  pago: { rotulo: "Pago", tom: "ok" },
  em_producao: { rotulo: "Em produção", tom: "andando" },
  enviado: { rotulo: "Enviado", tom: "andando" },
  entregue: { rotulo: "Entregue", tom: "ok" },
  cancelado: { rotulo: "Cancelado", tom: "ruim" },
};

const METODO = { pix: "PIX", cartao: "Cartão de crédito", boleto: "Boleto" };

// Confirmação do pedido. Mostra exatamente o que foi comprado, pra onde
// vai e quanto custou — tudo lido do SNAPSHOT gravado no pedido, não do
// catálogo de agora. Se a peça mudar de preço amanhã, este pedido
// continua contando a verdade do dia em que foi feito.
export default function OrderPage() {
  const { id } = useParams();
  const { logado, carregando: carregandoAuth } = useAuth();
  const [pedido, setPedido] = useState(null);
  const [itens, setItens] = useState([]);
  const [estado, setEstado] = useState("carregando");

  useEffect(() => {
    if (!logado) return;
    let vivo = true;
    (async () => {
      const { data: p, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!vivo) return;
      // RLS já garante que ninguém lê pedido dos outros: se não for seu,
      // simplesmente não vem — daí "não encontrado" cobre os dois casos.
      if (error || !p) {
        setEstado("nao-encontrado");
        return;
      }

      const { data: is } = await supabase
        .from("itens_pedido")
        .select("*")
        .eq("pedido_id", id);

      if (!vivo) return;
      setPedido(p);
      setItens(is || []);
      setEstado("ok");
    })();
    return () => {
      vivo = false;
    };
  }, [id, logado]);

  if (carregandoAuth) {
    return (
      <div className="pd">
        <Navbar variant="inline" />
        <p className="pd__carregando">Carregando…</p>
      </div>
    );
  }

  if (!logado) return <Navigate to="/login" replace state={{ de: `/pedido/${id}` }} />;

  if (estado === "carregando") {
    return (
      <div className="pd">
        <Navbar variant="inline" />
        <p className="pd__carregando">Buscando seu pedido…</p>
      </div>
    );
  }

  if (estado === "nao-encontrado") {
    return (
      <div className="pd">
        <Navbar variant="inline" />
        <div className="pd__vazio">
          <h1>Pedido não encontrado</h1>
          <p>Esse pedido não existe ou não pertence à sua conta.</p>
          <Link className="pd__cta" to="/conta">
            Ver meus pedidos
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const st = STATUS[pedido.status] || STATUS.aguardando_pagamento;
  const e = pedido.entrega;
  const c = pedido.contato;
  const data = new Date(pedido.criado_em).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="pd">
      <Navbar variant="inline" />

      <motion.div
        className="pd__inner"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <header className="pd__head">
          <p className="pd__eyebrow">Pedido recebido</p>
          <h1 className="pd__numero">Pedido #{pedido.numero}</h1>
          <div className="pd__meta">
            <span className={`pd__status pd__status--${st.tom}`}>{st.rotulo}</span>
            <span className="pd__data">{data}</span>
          </div>
        </header>

        {pedido.status === "aguardando_pagamento" && (
          <div className="pd__proximo">
            <strong>E agora?</strong>
            <p>
              Seu pedido está registrado. Vamos entrar em contato pelo e-mail{" "}
              <strong>{c.email}</strong> para combinar o pagamento por{" "}
              <strong>{METODO[pedido.pagamento_metodo] || "PIX"}</strong>. Nada foi
              cobrado ainda.
            </p>
          </div>
        )}

        <div className="pd__grid">
          <section className="pd__bloco">
            <h2 className="pd__bloco-titulo">Peças</h2>
            <ul className="pd__itens">
              {itens.map((i) => (
                <li key={i.id}>
                  <span className="pd__item-foto">
                    <img src={`/assets/products/${i.img}`} alt="" />
                    <span className="pd__item-qtd">{i.quantidade}</span>
                  </span>
                  <span className="pd__item-info">
                    <Link to={`/produto/${i.produto_slug}`}>{i.titulo}</Link>
                    {(i.material || i.tamanho) && (
                      <span>{[i.material, i.tamanho].filter(Boolean).join(" · ")}</span>
                    )}
                  </span>
                  <span className="pd__item-preco">
                    {brl(i.preco_unit_centavos * i.quantidade)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="pd__contas">
              <div>
                <dt>Subtotal</dt>
                <dd>{brl(pedido.subtotal_centavos)}</dd>
              </div>
              <div>
                <dt>Frete</dt>
                <dd className={pedido.frete_centavos === 0 ? "pd__gratis" : undefined}>
                  {pedido.frete_centavos === 0 ? "Grátis" : brl(pedido.frete_centavos)}
                </dd>
              </div>
              <div className="pd__total">
                <dt>Total</dt>
                <dd>{brl(pedido.total_centavos)}</dd>
              </div>
            </dl>
          </section>

          <section className="pd__bloco">
            <h2 className="pd__bloco-titulo">Entrega</h2>
            <address className="pd__endereco">
              <strong>{c.nome}</strong>
              <span>
                {e.rua}, {e.numero}
                {e.complemento ? ` — ${e.complemento}` : ""}
              </span>
              <span>{e.bairro}</span>
              <span>
                {e.cidade} — {e.uf}
              </span>
              <span>CEP {mascaraCep(e.cep)}</span>
            </address>

            <h2 className="pd__bloco-titulo pd__bloco-titulo--sep">Contato</h2>
            <div className="pd__contato">
              <span>{c.email}</span>
              {c.telefone && <span>{mascaraTelefone(c.telefone)}</span>}
            </div>
          </section>
        </div>

        <div className="pd__acoes">
          <Link className="pd__cta" to="/colecao/g-shop">
            Continuar comprando
          </Link>
          <Link className="pd__ghost" to="/conta">
            Meus pedidos
          </Link>
        </div>
      </motion.div>

      <Footer />
    </div>
  );
}
