import { motion } from "framer-motion";
import {
  Activity,
  Award,
  Orbit,
  ShieldCheck,
} from "lucide-react";
import { Title } from "../shared/Title";
import { useBuilderStore } from "./identity/hooks/useBuilderStore";

export function Deck() {
  const builder = useBuilderStore();

  const cards = [
    [
      "Builder Identity",
      builder.username || "BOBU Builder",
      `Level ${builder.level}`,
      ShieldCheck,
    ],
    [
      "Current Cycle",
      "000001",
      "Genesis era",
      Orbit,
    ],
    [
      "GP Balance",
      builder.gp.toLocaleString("tr-TR"),
      "Verified Builder rewards",
      Award,
    ],
    [
      "Signal Strength",
      "98.4%",
      "Quantum link stable",
      Activity,
    ],
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Title
        k="COMMAND DECK"
        t="Your place in the universe."
        p="Track identity, progress, signals and the structures you helped create."
      />

      <section className="cards">
        {cards.map(([label, value, detail, Icon]) => (
          <article className="glass" key={label}>
            <Icon />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>

      <section className="glass log">
        <div>
          <span>SHIP LOG</span>
          <h2>Recent activity</h2>
        </div>

        <div>
          <p>01 — Genesis protocol completed.</p>
          <p>02 — First Light beacon synchronized.</p>
          <p>03 — Restore Quantum Relay unlocked.</p>
        </div>
      </section>
    </motion.div>
  );
}
