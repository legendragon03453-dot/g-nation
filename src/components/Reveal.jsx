import { motion } from "framer-motion";

// Faithful port of the real section-title appear effect found in the site's
// source (augiA20Il.js): fade + slide up 40px, spring damping:50 mass:1
// stiffness:200, delay:0.2, animates once at 50% visibility.
const TITLE_TRANSITION = {
  type: "spring",
  damping: 50,
  mass: 1,
  stiffness: 200,
  delay: 0.2,
};

// Paragraph variant: fade + slide up 30px, softer spring, slightly longer delay.
const BODY_TRANSITION = {
  type: "spring",
  damping: 30,
  mass: 1,
  stiffness: 100,
  delay: 0.3,
};

export function RevealTitle({ children, as = "div", className, delay }) {
  const Component = motion[as] ?? motion.div;
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={delay !== undefined ? { ...TITLE_TRANSITION, delay } : TITLE_TRANSITION}
    >
      {children}
    </Component>
  );
}

export function RevealBody({ children, as = "div", className, delay, href }) {
  const Component = motion[as] ?? motion.div;
  return (
    <Component
      className={className}
      href={href}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={delay !== undefined ? { ...BODY_TRANSITION, delay } : BODY_TRANSITION}
    >
      {children}
    </Component>
  );
}
