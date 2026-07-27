import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import "./SoundToggle.css";

// Trilha do site: tenta tocar assim que abre; se o browser bloquear o
// autoplay com som (política padrão), arma o primeiro gesto do usuário
// (toque, clique, scroll ou tecla) pra ligar. Botão flutuante alterna
// mute/unmute, com barrinhas de equalizador quando está tocando.
//
// QUAL música tocar vem do banco (tabela `configuracoes`), não mais de uma
// constante aqui: o dono troca a trilha pelo painel quando a coleção muda.
// Os valores abaixo são só o ponto de partida enquanto a configuração não
// chegou — sem eles, o primeiro segundo da home ficaria sem trilha
// nenhuma esperando a resposta do servidor.
const TRACK_PADRAO = "/assets/audio/theme.mp3";
const START_PADRAO = 44; // a faixa original entra a partir deste segundo

export default function SoundToggle() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [cfg, setCfg] = useState(null);

  // Busca a configuração ANTES de montar o áudio. Trocar o `src` de um
  // <audio> que já está tocando corta a música no meio; melhor esperar a
  // resposta (é uma consulta pequena) e montar já com a faixa certa.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await supabase
        .from("configuracoes")
        .select("musica_url, musica_inicio_seg, musica_volume, musica_ativa")
        .eq("id", 1)
        .maybeSingle();
      if (!vivo) return;
      // Sem configuração (banco fora do ar, tabela vazia) a loja continua
      // com a trilha original em vez de ficar muda.
      setCfg(
        data || {
          musica_url: TRACK_PADRAO,
          musica_inicio_seg: START_PADRAO,
          musica_volume: 0.55,
          musica_ativa: true,
        }
      );
    })();
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!cfg || !cfg.musica_ativa || !cfg.musica_url) return;

    const START_AT = Number(cfg.musica_inicio_seg) || 0;
    const audio = new Audio(cfg.musica_url);
    audio.loop = true;
    audio.volume = Number(cfg.musica_volume) || 0.55;
    audio.preload = "auto";
    audioRef.current = audio;
    window.__gnationAudio = audio; // pra inspeção/testes

    // começa em START_AT e, quando o loop nativo volta pro zero, pula de
    // volta pro ponto de entrada
    const seekToStart = () => {
      if (audio.currentTime < START_AT) audio.currentTime = START_AT;
    };
    audio.addEventListener("loadedmetadata", seekToStart);
    audio.addEventListener("timeupdate", seekToStart);

    let armed = true;
    const tryPlay = () =>
      audio
        .play()
        .then(() => {
          setPlaying(true);
          disarm();
        })
        .catch(() => {});

    // primeiro gesto do usuário libera o áudio quando o autoplay é bloqueado
    const gestures = ["pointerdown", "keydown", "wheel", "touchstart"];
    const onGesture = () => tryPlay();
    const arm = () =>
      gestures.forEach((g) =>
        window.addEventListener(g, onGesture, { passive: true })
      );
    const disarm = () => {
      if (!armed) return;
      armed = false;
      gestures.forEach((g) => window.removeEventListener(g, onGesture));
    };

    arm();
    tryPlay();

    return () => {
      disarm();
      audio.pause();
      audio.src = "";
    };
  }, [cfg]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  // Som desligado no painel: o botão some da loja inteira. Mostrar um
  // botão de som que não toca nada é pior que não ter botão.
  if (cfg && !cfg.musica_ativa) return null;

  return (
    <button
      type="button"
      className={`sound-toggle${playing ? " sound-toggle--on" : ""}`}
      onClick={toggle}
      aria-label={playing ? "Silenciar música" : "Tocar música"}
      title={playing ? "Silenciar" : "Som"}
    >
      <span className="sound-toggle__bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="sound-toggle__label">{playing ? "SOM" : "MUDO"}</span>
    </button>
  );
}
