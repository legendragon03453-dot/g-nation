import { useRef, useEffect, useState } from "react";
import "./Ticker.css";

/**
 * Faithful reimplementation of Framer's built-in Ticker component logic
 * (extracted from the site's real source map): continuous px/second
 * translation via rAF, slows to speed * hoverFactor on hover, wraps
 * seamlessly by duplicating content once measured.
 */
export default function Ticker({
  children,
  speed = 50,
  direction = "left",
  gap = 20,
  hoverFactor = 1,
  fadeWidth = 50,
  className = "",
}) {
  const trackRef = useRef(null);
  const offsetRef = useRef(0);
  const hoverRef = useRef(false);
  const [itemWidth, setItemWidth] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const firstGroup = track.children[0];
    if (firstGroup) setItemWidth(firstGroup.getBoundingClientRect().width + gap);
  }, [gap, children]);

  useEffect(() => {
    if (!itemWidth) return;
    let raf;
    let last = performance.now();
    const sign = direction === "left" ? -1 : 1;
    offsetRef.current = sign === 1 ? -itemWidth : 0;

    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const currentSpeed = hoverRef.current ? speed * hoverFactor : speed;
      offsetRef.current += sign * currentSpeed * dt;

      if (sign === -1 && offsetRef.current <= -itemWidth) {
        offsetRef.current += itemWidth;
      } else if (sign === 1 && offsetRef.current >= 0) {
        offsetRef.current -= itemWidth;
      }

      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${offsetRef.current}px)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [itemWidth, speed, direction, hoverFactor]);

  return (
    <div
      className={`ticker ${className}`}
      style={{
        "--fade-width": `${fadeWidth}px`,
      }}
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      <div className="ticker__track" ref={trackRef} style={{ gap }}>
        <div className="ticker__group" style={{ display: "flex", gap }}>
          {children}
        </div>
        <div className="ticker__group" style={{ display: "flex", gap }} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
