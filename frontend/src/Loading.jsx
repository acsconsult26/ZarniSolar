import { motion } from "framer-motion";

export function Spinner({ size = 22 }) {
  return (
    <motion.span
      className="spinner"
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
    />
  );
}

export function LoadingBlock({ label = "Loading…" }) {
  return (
    <motion.div
      className="loading-block"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Spinner size={28} />
      <span>{label}</span>
    </motion.div>
  );
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="skeleton-rows">
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          className="skeleton-row"
          initial={{ opacity: 0.35 }}
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.08 }}
        />
      ))}
    </div>
  );
}

// Fade + rise wrapper for a whole tab's content when it mounts / becomes active.
export function FadeIn({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
