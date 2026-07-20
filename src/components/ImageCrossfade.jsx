import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const transition = { type: "spring", damping: 30, mass: 0.1, stiffness: 300, delay: 0.2 };

/**
 * Faithful port of the Framer hero image-slice component (M4x9izFWJ / ayjHFrJ1o):
 * a 3-variant state machine that auto-advances every 1000ms, crossfading
 * with the exact spring transition found in the site's source map.
 */
export default function ImageCrossfade({ images, className }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 1000);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <AnimatePresence>
        <motion.img
          key={index}
          src={images[index]}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AnimatePresence>
    </div>
  );
}
