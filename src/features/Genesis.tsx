import { motion } from "framer-motion";
import { ArrowRight, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Stars } from "../shared/Stars";

const terminalLines = [
  "UNKNOWN SIGNAL DETECTED",
  "ESTABLISHING QUANTUM LINK",
  "IDENTITY CONFIRMED: BUILDER",
];

export function Genesis() {
  const go = useNavigate();

  return (
    <div className="genesis">
      <Stars />

      <motion.section
        className="glass gen-card"
        initial={{
          opacity: 0,
          y: 72,
          scale: 0.9,
          filter: "blur(14px)",
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
        }}
        transition={{
          duration: 1.35,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <motion.div
          className="sig"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <Radio />
        </motion.div>

        <code>
          {terminalLines.map((line, index) => (
            <motion.span
              key={line}
              style={{ display: "block" }}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 1 + index * 0.45,
                duration: 0.4,
              }}
            >
              {line}
            </motion.span>
          ))}
        </code>

        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6, duration: 0.5 }}
        >
          GENESIS PROTOCOL
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.9, duration: 0.6 }}
        >
          Welcome home, Builder.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.25, duration: 0.6 }}
        >
          The first signal has been answered. A living universe is waiting for
          your light.
        </motion.p>

        <motion.button
          onClick={() => go("/")}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.65, duration: 0.5 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          Begin building <ArrowRight size={18} />
        </motion.button>
      </motion.section>

      <small>WE ARE BUILDING SPACE</small>
    </div>
  );
}
