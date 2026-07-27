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
import { fotoProduto } from "../lib/img";
import { criarCheckoutShopify, shopifyConfigurado } from "../lib/shopify";

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
  // id do endereço salvo que preencheu o formulário. Sem guardar isto, o
  // "upsert" da versão anterior criava um endereço NOVO a cada compra —
  // a lista de endereços da conta crescia com cópias do mesmo lugar.
  const [enderecoId, setEnderecoId] = useState(null);
  // Cupom: o código digitado, e o que o SERVIDOR respondeu sobre ele. O
  // desconto nunca é calculado aqui — a tela só mostra o que o banco
  // disse, e é o banco que refaz a conta na hora de fechar.
  const [cupom, setCupom] = useState("");
  const [cupomOk, setCupomOk] = useState(null);
  const [cupomErro, setCupomErro] = useState("");
  const [conferindoCupom, setConferindoCupom] = useState(false);

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
        setEnderecoId(endereco.id);
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

  // COSTURA DO PAGAMENTO — checkout da LOJA SHOPIFY.
  //
  // Monta um carrinho no Shopify com as variantes reais da loja e devolve
  // a URL do checkout do próprio Shopify, que cobra e cria o pedido lá. Se
  // a loja Shopify ainda não estiver configurada (sem as variáveis) ou os
  // produtos não estiverem mapeados, devolve `url: null` e o cliente cai
  // no fluxo "aguardando pagamento" — nada quebra nesse meio-tempo.
  async function iniciarPagamento(pedido) {
    if (!shopifyConfigurado()) return { url: null };

    // pega as variantes reais (com o id do Shopify) dos itens do pedido
    const { data: linhas } = await supabase
      .from("itens_pedido")
      .select("quantidade, variantes ( shopify_variant_id )")
      .eq("pedido_id", pedido.id);

    const itensShopify = (linhas || []).map((l) => ({
      shopify_variant_id: l.variantes?.shopify_variant_id,
      quantidade: l.quantidade,
    }));

    let url = null;
    try {
      url = await criarCheckoutShopify({
        itens: itensShopify,
        pedidoId: pedido.id,
        email: usuario.email,
      });
    } catch (e) {
      // falha ao falar com o Shopify não pode perder o pedido (que já foi
      // criado): cai no "aguardando pagamento" e a loja resolve.
      console.error("checkout Shopify falhou:", e);
      return { url: null };
    }

    // guarda a url no pedido pra a página do pedido mostrar "Pagar agora"
    // e o webhook cruzar depois
    if (url) {
      await supabase.rpc("definir_cobranca", {
        p_pedido_id: pedido.id,
        p_provedor: "shopify",
        p_ref: null,
        p_url: url,
      });
    }
    return { url };
  }

  // Traduz o que o banco recusou. A função `criar_pedido` levanta erros
  // com nome curto (SEM_ESTOQUE:Trevo Royal) justamente pra chegarem aqui
  // como caso tratável, e não como texto de Postgres na cara do cliente.
  function mensagemDoBanco(err) {
    const bruto = err?.message || "";
    const [codigo, detalhe] = bruto.split(":").map((s) => s.trim());

    switch (codigo) {
      case "SEM_ESTOQUE":
        return `${detalhe} acabou de esgotar no tamanho escolhido. Ajuste a sacola pra continuar.`;
      case "PRODUTO_INDISPONIVEL":
      case "COMBINACAO_INDISPONIVEL":
        return `${detalhe || "Uma das peças"} saiu de linha. Remova da sacola pra fechar o pedido.`;
      case "CUPOM_INVALIDO":
        return "Esse cupom não existe ou não está mais valendo.";
      case "CUPOM_EXPIRADO":
        return "Esse cupom já expirou.";
      case "CUPOM_ESGOTADO":
        return "Esse cupom atingiu o limite de usos.";
      case "CUPOM_MINIMO":
        return `Esse cupom vale a partir de ${brl(Number(detalhe) || 0)}.`;
      case "PRECISA_LOGIN":
        return "Sua sessão expirou. Entre de novo pra fechar o pedido.";
      case "ENDERECO_INCOMPLETO":
        return "Faltou algum dado do endereço. Confira os campos acima.";
      case "CONTATO_INCOMPLETO":
        return "Confira nome, telefone e CPF.";
      case "SACOLA_VAZIA":
        return "Sua sacola está vazia.";
      default:
        return bruto
          ? `Não conseguimos registrar seu pedido: ${bruto}`
          : "Não conseguimos registrar seu pedido. Tente de novo.";
    }
  }

  async function conferirCupom() {
    const codigo = cupom.trim();
    if (!codigo) return;
    setConferindoCupom(true);
    setCupomErro("");
    setCupomOk(null);

    const { data, error } = await supabase.rpc("validar_cupom", {
      p_codigo: codigo,
      p_subtotal_centavos: Math.round(subtotal * 100),
    });
    setConferindoCupom(false);

    if (error) {
      setCupomErro("Não foi possível conferir o cupom agora.");
      return;
    }
    if (!data.valido) {
      setCupomErro(
        {
          CUPOM_INVALIDO: "Esse cupom não existe ou não está valendo.",
          CUPOM_EXPIRADO: "Esse cupom já expirou.",
          CUPOM_ESGOTADO: "Esse cupom atingiu o limite de usos.",
          CUPOM_MINIMO: `Esse cupom vale a partir de ${brl(data.minimo_centavos)}.`,
        }[data.motivo] || "Cupom inválido."
      );
      return;
    }
    setCupomOk(data);
  }

  function tirarCupom() {
    setCupom("");
    setCupomOk(null);
    setCupomErro("");
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
      const entrega = {
        cep: soDigitos(end.cep),
        rua: end.rua.trim(),
        numero: end.numero.trim(),
        complemento: end.complemento.trim() || null,
        bairro: end.bairro.trim(),
        cidade: end.cidade.trim(),
        uf: end.uf.trim().toUpperCase(),
      };

      // Guarda o que aprendemos, pra próxima compra ser mais curta.
      //
      // UPDATE e não `upsert`: o perfil sempre existe — nasce junto com a
      // conta, pelo trigger `ao_criar_usuario`. E o upsert mandava o `id`
      // dentro do SET do UPDATE, que o banco recusa com 403 desde que a
      // 0004 restringiu a edição de perfil a nome/telefone/cpf. Trocar o
      // id do próprio perfil não é coisa que o cliente deva poder fazer,
      // então quem estava errado era a chamada, não a permissão.
      await supabase
        .from("perfis")
        .update({
          nome: contato.nome.trim(),
          telefone: soDigitos(contato.telefone),
          cpf: soDigitos(contato.cpf),
        })
        .eq("id", usuario.id);

      // Atualiza o endereço que já era da pessoa; só cria linha nova
      // quando não havia nenhum salvo.
      if (enderecoId) {
        await supabase
          .from("enderecos")
          .update({ ...entrega, padrao: true })
          .eq("id", enderecoId);
      } else {
        const { data: novo } = await supabase
          .from("enderecos")
          .insert({ ...entrega, user_id: usuario.id, padrao: true })
          .select("id")
          .single();
        if (novo) setEnderecoId(novo.id);
      }

      // O PEDIDO NASCE NO SERVIDOR.
      //
      // Antes esta função inseria em `pedidos` e `itens_pedido` mandando
      // subtotal, total e preço unitário calculados AQUI — no navegador.
      // Qualquer pessoa logada abria o console e gravava um pedido de R$
      // 0,01, ou já com status "pago". Agora o front manda só INTENÇÃO
      // (o que quer comprar, quanto de cada) e quem lê o preço, aplica
      // cupom, calcula frete, confere estoque e fecha a conta é o banco.
      //
      // O total mostrado na tela é, portanto, uma PREVISÃO. Se ele
      // divergir do que o servidor calcular, quem vale é o servidor — e é
      // por isso que a página do pedido lê os valores de volta do banco
      // em vez de reaproveitar o que estava na tela.
      const { data: pedido, error: erroPedido } = await supabase.rpc("criar_pedido", {
        p_itens: itens.map((i) => ({
          slug: i.slug,
          material: i.material || null,
          tamanho: i.tamanho || null,
          qtd: i.qtd,
        })),
        p_entrega: entrega,
        p_contato: {
          nome: contato.nome.trim(),
          telefone: soDigitos(contato.telefone),
          cpf: soDigitos(contato.cpf),
        },
        p_pagamento: pagamento,
        // manda o código, não o desconto: quem calcula de novo (e decide
        // se ainda vale) é o servidor
        p_cupom: cupomOk?.codigo || null,
      });

      if (erroPedido) throw erroPedido;

      limpar();

      // Cria a cobrança no provedor (quando houver). Se devolver uma URL,
      // o cliente vai PAGAR nela (checkout do Mercado Pago / Shopify /
      // Stripe). Sem provedor ainda, cai na página do pedido no estado
      // "aguardando pagamento".
      const { url } = await iniciarPagamento(pedido);
      if (url) {
        window.location.href = url;
        return;
      }
      navigate(`/pedido/${pedido.id}`, { replace: true });
    } catch (err) {
      setErroGeral(mensagemDoBanco(err));
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

  // Previsão do total pra tela. A palavra final é do servidor, que refaz
  // esta conta em `criar_pedido` com o preço lido do catálogo.
  const totalCentavos =
    Math.round(subtotal * 100) - (cupomOk?.desconto_centavos || 0) + FRETE_CENTAVOS;

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
                    <img src={fotoProduto(i.img)} alt="" />
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

            {/* Cupom fica no resumo, colado no total: é ali que a pessoa
                olha quando pensa em desconto. */}
            <div className="ck__cupom">
              {cupomOk ? (
                <div className="ck__cupom-ok">
                  <span>
                    <strong>{cupomOk.codigo}</strong> aplicado
                  </span>
                  <button type="button" onClick={tirarCupom}>
                    remover
                  </button>
                </div>
              ) : (
                <>
                  <div className="ck__cupom-linha">
                    <input
                      type="text"
                      placeholder="Cupom de desconto"
                      value={cupom}
                      onChange={(e) => setCupom(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        // Enter aqui não pode enviar o formulário inteiro:
                        // a pessoa está conferindo o cupom, não fechando
                        // o pedido.
                        if (e.key === "Enter") {
                          e.preventDefault();
                          conferirCupom();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={conferirCupom}
                      disabled={conferindoCupom || !cupom.trim()}
                    >
                      {conferindoCupom ? "…" : "Aplicar"}
                    </button>
                  </div>
                  {cupomErro && <p className="ck__cupom-erro">{cupomErro}</p>}
                </>
              )}
            </div>

            <dl className="ck__contas">
              <div>
                <dt>Subtotal</dt>
                <dd>{brl(subtotal * 100)}</dd>
              </div>
              {cupomOk && (
                <div>
                  <dt>Desconto</dt>
                  <dd className="ck__gratis">
                    -{brl(cupomOk.desconto_centavos)}
                  </dd>
                </div>
              )}
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
