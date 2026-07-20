import { useEffect, useRef, useState } from "react";
import "./SoundToggle.css";

// Trilha do site: tenta tocar assim que abre; se o browser bloquear o
// autoplay com som (política padrão), arma o primeiro gesto do usuário
// (toque, clique, scroll ou tecla) pra ligar. Botão flutuante alterna
// mute/unmute, com barrinhas de equalizador quando está tocando.
const TRACK = "/assets/audio/theme.mp3";
const START_AT = 44; // a faixa entra a partir deste segundo (e o loop volta pra cá)

export default function SoundToggle() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(TRACK);
    audio.loop = true;
    audio.volume = 0.55;
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
  }, []);

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
