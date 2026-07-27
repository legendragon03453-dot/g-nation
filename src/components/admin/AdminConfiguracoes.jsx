import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabase";

// CONFIGURAÇÕES — o que a loja é, sem passar por deploy.
//
// Inclui a MÚSICA DA HOME. Ela era uma constante no SoundToggle
// (`/assets/audio/theme.mp3`), então trocar a trilha exigia um
// desenvolvedor. Numa marca de cultura de rua a trilha muda com a
// coleção: é conteúdo, igual foto de produto.
//
// O arquivo sobe pro bucket `loja` do Storage, cuja policy de escrita
// exige `eh_admin()`. O bucket é público só pra LEITURA — a tag de áudio
// precisa tocar sem login.
const LIMITE_MB = 8;

export default function AdminConfiguracoes() {
  const [cfg, setCfg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const audioRef = useRef(null);
  const arquivoRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) setErro("Não foi possível carregar as configurações.");
      setCfg(data);
    })();
  }, []);

  const set = (campo) => (e) =>
    setCfg((c) => ({
      ...c,
      [campo]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setAviso("");
    setSalvando(true);

    const { error } = await supabase
      .from("configuracoes")
      .update({
        loja_nome: cfg.loja_nome,
        loja_email: cfg.loja_email,
        loja_whatsapp: cfg.loja_whatsapp || null,
        loja_instagram: cfg.loja_instagram || null,
        frete_padrao_centavos: Math.round(Number(cfg.frete_padrao_centavos) || 0),
        frete_gratis_acima_centavos: Math.round(
          Number(cfg.frete_gratis_acima_centavos) || 0
        ),
        prazo_entrega_dias: cfg.prazo_entrega_dias,
        reserva_horas: Number(cfg.reserva_horas) || 24,
        musica_url: cfg.musica_url || null,
        musica_nome: cfg.musica_nome || null,
        musica_inicio_seg: Number(cfg.musica_inicio_seg) || 0,
        musica_volume: Number(cfg.musica_volume) || 0.55,
        musica_ativa: cfg.musica_ativa,
      })
      .eq("id", 1);

    setSalvando(false);
    if (error) setErro(`Não foi possível salvar: ${error.message}`);
    else setAviso("Configurações salvas.");
  }

  async function enviarMusica(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro("");
    setAviso("");

    if (!arquivo.type.startsWith("audio/")) {
      setErro("Esse arquivo não é áudio. Envie um MP3.");
      return;
    }
    // Trilha de fundo é a primeira coisa que carrega na home. Um arquivo
    // de 30MB faria o visitante pagar por isso antes de ver a vitrine.
    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      setErro(`Arquivo muito grande (máximo ${LIMITE_MB}MB). Comprima o MP3.`);
      return;
    }

    setEnviando(true);
    // Nome com carimbo de tempo: subir "theme.mp3" duas vezes sobrescreve
    // a anterior e o navegador continua servindo a versão velha do cache.
    const nome = `musica/${Date.now()}-${arquivo.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error: erroUp } = await supabase.storage
      .from("loja")
      .upload(nome, arquivo, { cacheControl: "3600", upsert: false });

    if (erroUp) {
      setEnviando(false);
      setErro(`Não foi possível enviar: ${erroUp.message}`);
      return;
    }

    const { data } = supabase.storage.from("loja").getPublicUrl(nome);
    setCfg((c) => ({
      ...c,
      musica_url: data.publicUrl,
      musica_nome: arquivo.name.replace(/\.[^.]+$/, ""),
    }));
    setEnviando(false);
    setAviso("Música enviada. Ouça abaixo e clique em salvar pra publicar.");
  }

  function ouvir() {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Number(cfg.musica_inicio_seg) || 0;
    a.volume = Number(cfg.musica_volume) || 0.55;
    a.play().catch(() => setErro("Não foi possível tocar esse arquivo."));
  }

  if (!cfg) {
    return (
      <div className="adm__pagina">
        <p className="adm__vazio-txt">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="adm__pagina">
      <header className="adm__cabeca">
        <p className="adm__ola">Ajustes</p>
        <h1 className="adm__titulo">Configurações</h1>
      </header>

      {erro && <p className="adm__erro">{erro}</p>}
      {aviso && <p className="adm__ok">{aviso}</p>}

      <form onSubmit={salvar}>
        {/* ---------- MÚSICA ---------- */}
        <section className="adm__form">
          <h3 className="adm__form-titulo">Música da home</h3>
          <p className="adm__cel-fraca" style={{ fontSize: 12.5, margin: "0 0 20px" }}>
            É a trilha que toca no botão de som da loja. Troque quando a coleção
            mudar — ninguém precisa mexer no código.
          </p>

          <div className="adm__musica">
            <div className="adm__musica-atual">
              <span className="adm__musica-nome">
                {cfg.musica_nome || "Nenhuma faixa escolhida"}
              </span>
              <span className="adm__cel-fraca" style={{ fontSize: 11 }}>
                {cfg.musica_url
                  ? cfg.musica_url.startsWith("http")
                    ? "enviada pelo painel"
                    : "arquivo original do site"
                  : "—"}
              </span>
            </div>

            <div className="adm__musica-acoes">
              <button type="button" className="adm__btn-fino" onClick={ouvir}>
                Ouvir
              </button>
              <button
                type="button"
                className="adm__btn-fino"
                onClick={() => audioRef.current?.pause()}
              >
                Parar
              </button>
              <button
                type="button"
                className="adm__btn"
                disabled={enviando}
                onClick={() => arquivoRef.current?.click()}
              >
                {enviando ? "Enviando…" : "Trocar música"}
              </button>
              <input
                ref={arquivoRef}
                type="file"
                accept="audio/*"
                hidden
                onChange={enviarMusica}
              />
            </div>
          </div>

          {cfg.musica_url && (
            <audio ref={audioRef} src={cfg.musica_url} preload="none" />
          )}

          <div className="adm__form-grid" style={{ marginTop: 20 }}>
            <label className="adm__campo">
              <span>Começa aos (segundos)</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={cfg.musica_inicio_seg}
                onChange={set("musica_inicio_seg")}
              />
            </label>

            <label className="adm__campo">
              <span>Volume (0 a 1)</span>
              <input
                type="number"
                min="0.05"
                max="1"
                step="0.05"
                value={cfg.musica_volume}
                onChange={set("musica_volume")}
              />
            </label>

            <label className="adm__campo adm__campo--largo">
              <span>Nome da faixa</span>
              <input value={cfg.musica_nome || ""} onChange={set("musica_nome")} />
            </label>
          </div>

          <label className="adm__check" style={{ marginTop: 14 }}>
            <input
              type="checkbox"
              checked={cfg.musica_ativa}
              onChange={set("musica_ativa")}
            />
            Mostrar o botão de som na loja
          </label>
        </section>

        {/* ---------- LOJA ---------- */}
        <section className="adm__form">
          <h3 className="adm__form-titulo">Dados da loja</h3>
          <div className="adm__form-grid">
            <label className="adm__campo adm__campo--largo">
              <span>Nome</span>
              <input value={cfg.loja_nome} onChange={set("loja_nome")} />
            </label>
            <label className="adm__campo adm__campo--largo">
              <span>E-mail de atendimento</span>
              <input value={cfg.loja_email} onChange={set("loja_email")} />
            </label>
            <label className="adm__campo">
              <span>WhatsApp</span>
              <input
                placeholder="5532988887777"
                value={cfg.loja_whatsapp || ""}
                onChange={set("loja_whatsapp")}
              />
            </label>
            <label className="adm__campo">
              <span>Instagram</span>
              <input
                placeholder="@gnation"
                value={cfg.loja_instagram || ""}
                onChange={set("loja_instagram")}
              />
            </label>
          </div>
        </section>

        {/* ---------- ENTREGA ---------- */}
        <section className="adm__form">
          <h3 className="adm__form-titulo">Entrega e reserva</h3>
          <div className="adm__form-grid">
            <label className="adm__campo">
              <span>Frete padrão (centavos)</span>
              <input
                type="number"
                min="0"
                value={cfg.frete_padrao_centavos}
                onChange={set("frete_padrao_centavos")}
              />
            </label>
            <label className="adm__campo">
              <span>Frete grátis acima de (centavos)</span>
              <input
                type="number"
                min="0"
                value={cfg.frete_gratis_acima_centavos}
                onChange={set("frete_gratis_acima_centavos")}
              />
            </label>
            <label className="adm__campo adm__campo--largo">
              <span>Prazo de entrega</span>
              <input
                value={cfg.prazo_entrega_dias}
                onChange={set("prazo_entrega_dias")}
              />
            </label>
            <label className="adm__campo adm__campo--todo">
              <span>Reserva de estoque (horas)</span>
              <input
                type="number"
                min="1"
                max="168"
                value={cfg.reserva_horas}
                onChange={set("reserva_horas")}
              />
              <small className="adm__cel-fraca">
                Quanto tempo um pedido não pago segura a peça antes de devolvê-la
                pra vitrine.
              </small>
            </label>
          </div>
        </section>

        <div className="adm__form-botoes" style={{ justifyContent: "flex-end" }}>
          <button type="submit" className="adm__btn adm__btn--forte" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar tudo"}
          </button>
        </div>
      </form>
    </div>
  );
}
