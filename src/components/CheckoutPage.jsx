import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import { useAuth } from "../AuthContext";
import { useCart } from "../CartContext";
import { supabase } from "../supabase";
import {
  brl,
  buscarCep,
  cepValido,
  cpfValido,
  mascaraCep,
  mascaraCpf,
  mascaraTelefone,
  soDigitos,
  telefoneValido,
} from "../lib/br";
import "./CheckoutPage.css";

const EASE = [0.16, 1, 0.3, 1];

// Frete grátis é o que a página de produto já promete ("FRETE GRÁTIS
// PARA TODO BRASIL"). Fica como constante e não escondido no meio do
// cálculo: quando existir frete real por região, muda-se aqui.
const FRETE_CENTAVOS = 0;

// CHECKOUT — uma página só, não um assistente de 4 etapas.
//
// A pesquisa de checkout brasileiro (2026) é consistente: abandono fica
// entre 65% e 82%, e as causas do topo são custo que aparece no fim,
// formulário longo e falta de opção de pagamento. Daí as decisões:
//
//  - PÁGINA ÚNICA. Loja pequena não tem volume pra justificar etapas;
//    cada tela nova é uma chance de desistir.
//  - RESUMO COM O TOTAL SEMPRE VISÍVEL, desde o primeiro segundo. O
//    frete não aparece "de surpresa" no último passo — é a causa nº 1 de
//    abandono no Brasil.
//  - CEP PREENCHE O ENDEREÇO (ViaCEP). Menos campo pra digitar.
//  - PIX EM PRIMEIRO, e marcado como o mais usado. É o meio com maior
//    conversão no e-commerce brasileiro hoje.
//  - VALIDAÇÃO AO SAIR DO CAMPO, não só no clique final.
//  - TECLADO NUMÉRICO no celular pra CEP/CPF/telefone (inputMode).
//
// Pagamento: a integração com gateway ainda não foi escolhida (decisão
// do cliente). O pedido é gravado com status `aguardando_pagamento` e o
// ponto de entrada do gateway está isolado em `iniciarPagamento()` —
// quando o provedor for definido, mexe-se só naquela função.
export default function CheckoutPage() {
  const { usuario, logado, carregando: carregandoAuth } = useAuth();
  const { itens, subtotal, limpar } = useCart();
  const navigate = useNavigate();

  const [contato, setContato] = useState({ nome: "", telefone: "", cpf: "" });
  const [end, setEnd] = useState({
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  });
  const [pagamento, setPagamento] = useState("pix");
  const [erros, setErros] = useState({});
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const numeroRef = useRef(null);

  // Puxa o que já sabemos da conta pra pessoa não redigitar. É o mesmo
  // motivo de existir a tabela `perfis`.
  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    (async () => {
      const { data: perfil } = await supabase
        .from("perfis")
        .select("nome, telefone, cpf")
        .eq("id", usuario.id)
        .maybeSingle();
      if (!vivo) return;
      setContato({
        nome: perfil?.nome || usuario.user_metadata?.nome || "",
        telefone: perfil?.telefone ? mascaraTelefone(perfil.telefone) : "",
        cpf: perfil?.cpf ? mascaraCpf(perfil.cpf) : "",
      });

      // endereço padrão salvo, se houver: segunda compra não redigita nada
      const { data: endereco } = await supabase
        .from("enderecos")
        .select("*")
        .eq("user_id", usuario.id)
        .eq("padrao", true)
        .maybeSingle();
      if (vivo && endereco) {
        setEnd({
          cep: mascaraCep(endereco.cep),
          rua: endereco.rua || "",
          numero: endereco.numero || "",
          complemento: endereco.complemento || "",
          bairro: endereco.bairro || "",
          cidade: endereco.cidade || "",
          uf: endereco.uf || "",
        });
      }
    })();
    return () => {
      vivo = false;
    };
  }, [usuario]);

  async function onCepChange(v) {
    const mascarado = mascaraCep(v);
    setEnd((e) => ({ ...e, cep: mascarado }));
    setAvisoCep("");
    if (!cepValido(mascarado)) return;

    setBuscandoCep(true);
    const achado = await buscarCep(mascarado);
    setBuscandoCep(false);

    if (!achado) {
      // não trava a compra: libera pra digitar na mão
      setAvisoCep("Não encontramos esse CEP. Pode preencher à mão.");
      return;
    }
    setEnd((e) => ({ ...e, ...achado }));
    setErros((x) => ({ ...x, cep: null, rua: null, bairro: null, cidade: null, uf: null }));
    // manda o cursor pro número, que é o único que o CEP não sabe
    numeroRef.current?.focus();
  }

  function validar() {
    const e = {};
    if (!contato.nome.trim()) e.nome = "Como devemos te chamar?";
    if (!telefoneValido(contato.telefone)) e.telefone = "Telefone incompleto.";
    if (!cpfValido(contato.cpf)) e.cpf = "CPF inválido.";
    if (!cepValido(end.cep)) e.cep = "CEP incompleto.";
    if (!end.rua.trim()) e.rua = "Informe a rua.";
    if (!end.numero.trim()) e.numero = "Informe o número.";
    if (!end.bairro.trim()) e.bairro = "Informe o bairro.";
    if (!end.cidade.trim()) e.cidade = "Informe a cidade.";
    if (!end.uf.trim()) e.uf = "UF.";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  // COSTURA DO PAGAMENTO — o único ponto que muda quando o gateway for
  // escolhido. Hoje devolve "pendente", que é a verdade: o pedido existe
  // e está aguardando pagamento. Quando entrar Mercado Pago/Stripe, é
  // aqui que se cria a preferência e se devolve a URL de redirecionamento.
  async function iniciarPagamento(pedido) {
    return { situacao: "pendente", pedidoId: pedido.id };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErroGeral("");
    if (!validar()) {
      document.querySelector(".ck__campo-erro")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    setEnviando(true);
    try {
      const total = subtotal * 100 + FRETE_CENTAVOS;

      // guarda o que aprendemos, pra próxima compra ser mais curta
      await supabase.from("perfis").upsert({
        id: usuario.id,
        nome: contato.nome.trim(),
        telefone: soDigitos(contato.telefone),
        cpf: soDigitos(contato.cpf),
      });

      await supabase.from("enderecos").upsert(
        {
          user_id: usuario.id,
          cep: soDigitos(end.cep),
          rua: end.rua.trim(),
          numero: end.numero.trim(),
          complemento: end.complemento.trim() || null,
          bairro: end.bairro.trim(),
          cidade: end.cidade.trim(),
          uf: end.uf.trim().toUpperCase(),
          padrao: true,
        },
        { onConflict: "id" }
      );

      const { data: pedido, error: erroPedido } = await supabase
        .from("pedidos")
        .insert({
          user_id: usuario.id,
          subtotal_centavos: subtotal * 100,
          frete_centavos: FRETE_CENTAVOS,
          total_centavos: total,
          pagamento_metodo: pagamento,
          // SNAPSHOT: o pedido guarda o endereço e o contato como estavam
          // agora. Se a pessoa editar o cadastro amanhã, o pedido antigo
          // continua contando a verdade do dia da compra.
          entrega: {
            cep: soDigitos(end.cep),
            rua: end.rua.trim(),
            numero: end.numero.trim(),
            complemento: end.complemento.trim() || null,
            bairro: end.bairro.trim(),
            cidade: end.cidade.trim(),
            uf: end.uf.trim().toUpperCase(),
          },
          contato: {
            nome: contato.nome.trim(),
            email: usuario.email,
            telefone: soDigitos(contato.telefone),
            cpf: soDigitos(contato.cpf),
          },
        })
        .select()
        .single();

      if (erroPedido) throw erroPedido;

      const linhas = itens.map((i) => ({
        pedido_id: pedido.id,
        produto_slug: i.slug,
        titulo: i.title,
        material: i.material || null,
        tamanho: i.tamanho || null,
        img: i.img,
        preco_unit_centavos: i.priceValue * 100,
        quantidade: i.qtd,
      }));
      const { error: erroItens } = await supabase.from("itens_pedido").insert(linhas);
      if (erroItens) throw erroItens;

      await iniciarPagamento(pedido);

      limpar();
      navigate(`/pedido/${pedido.id}`, { replace: true });
    } catch (err) {
      setErroGeral(
        err?.message
          ? `Não conseguimos registrar seu pedido: ${err.message}`
          : "Não conseguimos registrar seu pedido. Tente de novo."
      );
      setEnviando(false);
    }
  }

  if (carregandoAuth) {
    return (
      <div className="ck">
        <Navbar variant="inline" />
        <p className="ck__carregando">Carregando…</p>
      </div>
    );
  }

  // compra só com conta (decisão do cliente)
  if (!logado) return <Navigate to="/login" replace state={{ de: "/checkout" }} />;

  // sacola vazia: não existe checkout de nada
  if (itens.length === 0) {
    return (
      <div className="ck">
        <Navbar variant="inline" />
        <div className="ck__vazio">
          <h1>Sua sacola está vazia</h1>
          <p>Escolha uma peça pra continuar.</p>
          <Link className="ck__cta" to="/colecao/g-shop">
            Ver a vitrine
          </Link>
        </div>
      </div>
    );
  }

  const totalCentavos = subtotal * 100 + FRETE_CENTAVOS;

  return (
    <div className="ck">
      <Navbar variant="inline" />

      <motion.div
        className="ck__inner"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <header className="ck__head">
          <p className="ck__eyebrow">Finalizar compra</p>
          <h1 className="ck__titulo">Entrega e pagamento</h1>
        </header>

        <form className="ck__grid" onSubmit={onSubmit} noValidate>
          <div className="ck__colunas">
            {/* ---------- CONTATO ---------- */}
            <section className="ck__bloco">
              <h2 className="ck__bloco-titulo">Seus dados</h2>

              <div className="ck__campo">
                <label htmlFor="ck-nome">Nome completo</label>
                <input
                  id="ck-nome"
                  value={contato.nome}
                  autoComplete="name"
                  onChange={(e) => setContato({ ...contato, nome: e.target.value })}
                  onBlur={() =>
                    setErros((x) => ({
                      ...x,
                      nome: contato.nome.trim() ? null : "Como devemos te chamar?",
                    }))
                  }
                />
                {erros.nome && <span className="ck__campo-erro">{erros.nome}</span>}
              </div>

              <div className="ck__linha ck__linha--2">
                <div className="ck__campo">
                  <label htmlFor="ck-tel">Telefone</label>
                  <input
                    id="ck-tel"
                    value={contato.telefone}
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    onChange={(e) =>
                      setContato({ ...contato, telefone: mascaraTelefone(e.target.value) })
                    }
                    onBlur={() =>
                      setErros((x) => ({
                        ...x,
                        telefone: telefoneValido(contato.telefone)
                          ? null
                          : "Telefone incompleto.",
                      }))
                    }
                  />
                  {erros.telefone && <span className="ck__campo-erro">{erros.telefone}</span>}
                </div>

                <div className="ck__campo">
                  <label htmlFor="ck-cpf">CPF</label>
                  <input
                    id="ck-cpf"
                    value={contato.cpf}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    onChange={(e) => setContato({ ...contato, cpf: mascaraCpf(e.target.value) })}
                    onBlur={() =>
                      setErros((x) => ({
                        ...x,
                        cpf: cpfValido(contato.cpf) ? null : "CPF inválido.",
                      }))
                    }
                  />
                  {erros.cpf && <span className="ck__campo-erro">{erros.cpf}</span>}
                </div>
              </div>

              <p className="ck__nota">
                Enviaremos a confirmação para <strong>{usuario.email}</strong>.
              </p>
            </section>

            {/* ---------- ENTREGA ---------- */}
            <section className="ck__bloco">
              <h2 className="ck__bloco-titulo">Entrega</h2>

              <div className="ck__linha ck__linha--cep">
                <div className="ck__campo">
                  <label htmlFor="ck-cep">CEP</label>
                  <input
                    id="ck-cep"
                    value={end.cep}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="00000-000"
                    onChange={(e) => onCepChange(e.target.value)}
                  />
                  {erros.cep && <span className="ck__campo-erro">{erros.cep}</span>}
                  {buscandoCep && <span className="ck__campo-nota">Buscando endereço…</span>}
                  {avisoCep && <span className="ck__campo-nota">{avisoCep}</span>}
                </div>
                <div className="ck__campo">
                  <label htmlFor="ck-num">Número</label>
                  <input
                    id="ck-num"
                    ref={numeroRef}
                    value={end.numero}
                    inputMode="numeric"
                    onChange={(e) => setEnd({ ...end, numero: e.target.value })}
                  />
                  {erros.numero && <span className="ck__campo-erro">{erros.numero}</span>}
                </div>
              </div>

              <div className="ck__campo">
                <label htmlFor="ck-rua">Rua</label>
                <input
                  id="ck-rua"
                  value={end.rua}
                  autoComplete="address-line1"
                  onChange={(e) => setEnd({ ...end, rua: e.target.value })}
                />
                {erros.rua && <span className="ck__campo-erro">{erros.rua}</span>}
              </div>

              <div className="ck__linha ck__linha--2">
                <div className="ck__campo">
                  <label htmlFor="ck-compl">Complemento</label>
                  <input
                    id="ck-compl"
                    value={end.complemento}
                    placeholder="Apto, bloco (opcional)"
                    onChange={(e) => setEnd({ ...end, complemento: e.target.value })}
                  />
                </div>
                <div className="ck__campo">
                  <label htmlFor="ck-bairro">Bairro</label>
                  <input
                    id="ck-bairro"
                    value={end.bairro}
                    onChange={(e) => setEnd({ ...end, bairro: e.target.value })}
                  />
                  {erros.bairro && <span className="ck__campo-erro">{erros.bairro}</span>}
                </div>
              </div>

              <div className="ck__linha ck__linha--cidade">
                <div className="ck__campo">
                  <label htmlFor="ck-cidade">Cidade</label>
                  <input
                    id="ck-cidade"
                    value={end.cidade}
                    onChange={(e) => setEnd({ ...end, cidade: e.target.value })}
                  />
                  {erros.cidade && <span className="ck__campo-erro">{erros.cidade}</span>}
                </div>
                <div className="ck__campo">
                  <label htmlFor="ck-uf">UF</label>
                  <input
                    id="ck-uf"
                    value={end.uf}
                    maxLength={2}
                    onChange={(e) => setEnd({ ...end, uf: e.target.value.toUpperCase() })}
                  />
                  {erros.uf && <span className="ck__campo-erro">{erros.uf}</span>}
                </div>
              </div>
            </section>

            {/* ---------- PAGAMENTO ---------- */}
            <section className="ck__bloco">
              <h2 className="ck__bloco-titulo">Pagamento</h2>

              <div className="ck__pgto">
                {[
                  { id: "pix", nome: "PIX", nota: "Aprovação na hora", destaque: true },
                  { id: "cartao", nome: "Cartão de crédito", nota: "Em até 6x" },
                  { id: "boleto", nome: "Boleto", nota: "Compensa em até 3 dias úteis" },
                ].map((op) => (
                  <label
                    key={op.id}
                    className={`ck__pgto-op${pagamento === op.id ? " is-ativo" : ""}`}
                  >
                    <input
                      type="radio"
                      name="pagamento"
                      value={op.id}
                      checked={pagamento === op.id}
                      onChange={() => setPagamento(op.id)}
                    />
                    <span className="ck__pgto-marca" aria-hidden="true" />
                    <span className="ck__pgto-texto">
                      <strong>{op.nome}</strong>
                      <span>{op.nota}</span>
                    </span>
                    {op.destaque && <span className="ck__pgto-tag">Mais usado</span>}
                  </label>
                ))}
              </div>

              <p className="ck__nota">
                O pagamento ainda não está ligado. Seu pedido é registrado e entramos
                em contato para combinar — nada é cobrado agora.
              </p>
            </section>
          </div>

          {/* ---------- RESUMO ---------- */}
          <aside className="ck__resumo">
            <h2 className="ck__bloco-titulo">Seu pedido</h2>

            <ul className="ck__itens">
              {itens.map((i) => (
                <li key={i.id}>
                  <span className="ck__item-foto">
                    <img src={`/assets/products/${i.img}`} alt="" />
                    <span className="ck__item-qtd">{i.qtd}</span>
                  </span>
                  <span className="ck__item-info">
                    <strong>{i.title}</strong>
                    {(i.material || i.tamanho) && (
                      <span>{[i.material, i.tamanho].filter(Boolean).join(" · ")}</span>
                    )}
                  </span>
                  <span className="ck__item-preco">{brl(i.priceValue * i.qtd * 100)}</span>
                </li>
              ))}
            </ul>

            <dl className="ck__contas">
              <div>
                <dt>Subtotal</dt>
                <dd>{brl(subtotal * 100)}</dd>
              </div>
              <div>
                <dt>Frete</dt>
                <dd className="ck__gratis">
                  {FRETE_CENTAVOS === 0 ? "Grátis" : brl(FRETE_CENTAVOS)}
                </dd>
              </div>
              <div className="ck__total">
                <dt>Total</dt>
                <dd>{brl(totalCentavos)}</dd>
              </div>
            </dl>

            {erroGeral && <p className="ck__erro-geral">{erroGeral}</p>}

            <button type="submit" className="ck__cta ck__cta--full" disabled={enviando}>
              {enviando ? "Registrando…" : "Fechar pedido"}
            </button>

            <Link className="ck__voltar" to="/colecao/g-shop">
              Continuar comprando
            </Link>
          </aside>
        </form>
      </motion.div>
    </div>
  );
}
