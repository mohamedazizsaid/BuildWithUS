'use client';

import { Children, isValidElement, useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useMotionValueEvent,
  type MotionValue,
} from 'framer-motion';

interface CardConfig {
  id: number;
  left: number; // % of panel width (resting position)
  top: number; // % of panel height
  w: number; // px
  h: number; // px
  rot: number; // base rotation in deg
  dur: number; // float loop duration in s
  delay: number;
  content: React.ReactNode;
}

// How close the cursor has to get before a card starts fleeing, and how hard it flees.
const REPEL_RADIUS = 240;
const REPEL_STRENGTH = 180;

const CARDS: CardConfig[] = [
  // ── Email template ─────────────────────────────────────────────
  {
    id: 1,
    left: 5,
    top: 28,
    w: 212,
    h: 256,
    rot: -4,
    dur: 6,
    delay: 0.1,
    content: (
      <>
        <div className="mb-3 flex items-center gap-1.5">
          <div className="h-5 w-5 rounded bg-violet-400/50" />
          <div className="h-2.5 w-16 rounded bg-white/25" />
        </div>
        <div className="mb-3 h-9 w-full rounded-lg bg-gradient-to-r from-violet-400/40 to-purple-400/25" />
        <div className="mb-2 text-[10px] font-semibold text-violet-100/80">{'Bienvenue {{prenom}} !'}</div>
        <div className="mb-1.5 h-2 w-full rounded bg-white/15" />
        <div className="mb-1.5 h-2 w-5/6 rounded bg-white/15" />
        <div className="mb-4 h-2 w-2/3 rounded bg-white/15" />
        <div className="flex justify-center">
          <div className="rounded-full bg-violet-500 px-4 py-1.5 text-[9px] font-bold text-white shadow-lg shadow-violet-500/30">
            Commencer →
          </div>
        </div>
      </>
    ),
  },
  // ── Invoice ────────────────────────────────────────────────────
  {
    id: 2,
    left: 52,
    top: 26,
    w: 216,
    h: 288,
    rot: 4,
    dur: 7,
    delay: 0.25,
    content: (
      <>
        <div className="mb-1 flex items-start justify-between">
          <div className="text-sm font-black tracking-tight text-white">FACTURE</div>
          <div className="text-[8px] text-white/40">F2026-001</div>
        </div>
        <div className="mb-2.5 h-px w-full bg-white/20" />
        <div className="mb-1.5 flex justify-between text-[8px] text-white/60">
          <span>Développement web</span><span>2 500 €</span>
        </div>
        <div className="mb-1.5 flex justify-between text-[8px] text-white/45">
          <span>Maintenance</span><span>400 €</span>
        </div>
        <div className="mb-3 flex justify-between text-[8px] text-white/45">
          <span>Hébergement</span><span>120 €</span>
        </div>
        <div className="rounded-md bg-white/5 p-2 text-[8px]">
          <div className="flex justify-between text-white/40"><span>HT</span><span>3 020 €</span></div>
          <div className="mb-1 flex justify-between text-white/40"><span>TVA 20%</span><span>604 €</span></div>
          <div className="flex justify-between rounded bg-violet-500/40 px-1.5 py-1 font-bold text-white">
            <span>TTC</span><span>3 624 €</span>
          </div>
        </div>
      </>
    ),
  },
  // ── Contract ───────────────────────────────────────────────────
  {
    id: 3,
    left: 8,
    top: 58,
    w: 204,
    h: 248,
    rot: -3,
    dur: 6.5,
    delay: 0.4,
    content: (
      <>
        <div className="mb-2 text-center text-[9px] font-black uppercase tracking-wide text-white/80">
          Contrat de prestation
        </div>
        <div className="mb-2 h-px w-full bg-white/15" />
        <div className="mb-1.5 text-[9px] font-bold text-violet-100/80">Article 1 — Objet</div>
        <div className="mb-1 h-2 w-full rounded bg-white/15" />
        <div className="mb-2 h-2 w-4/5 rounded bg-white/15" />
        <div className="mb-2.5 inline-block rounded bg-violet-400/20 px-1.5 py-0.5 text-[8px] text-violet-100/80">
          {'{{client_nom}}'}
        </div>
        <div className="mb-1.5 text-[9px] font-bold text-violet-100/80">Article 2 — Durée</div>
        <div className="mb-1 h-2 w-full rounded bg-white/15" />
        <div className="mb-4 h-2 w-3/5 rounded bg-white/15" />
        <div className="flex items-end justify-between">
          <div className="h-px w-14 bg-white/30" />
          <span className="text-[7px] text-white/40">Signature</span>
        </div>
      </>
    ),
  },
  // ── Analytics ──────────────────────────────────────────────────
  {
    id: 4,
    left: 55,
    top: 60,
    w: 212,
    h: 196,
    rot: 5,
    dur: 8,
    delay: 0.55,
    content: (
      <>
        <div className="mb-1 text-[9px] text-white/50">Taux d&apos;ouverture</div>
        <div className="mb-3 text-3xl font-black leading-none text-white">
          68<span className="text-lg text-violet-300">%</span>
        </div>
        <div className="flex h-16 items-end gap-1.5">
          <div className="h-1/3 w-full rounded-t bg-violet-400/30" />
          <div className="h-2/3 w-full rounded-t bg-violet-400/50" />
          <div className="h-1/2 w-full rounded-t bg-orange-400/40" />
          <div className="h-full w-full rounded-t bg-violet-400/70" />
          <div className="h-3/4 w-full rounded-t bg-orange-400/50" />
        </div>
      </>
    ),
  },
  // ── SMS ────────────────────────────────────────────────────────
  {
    id: 5,
    left: 33,
    top: 44,
    w: 188,
    h: 188,
    rot: -6,
    dur: 5.5,
    delay: 0.7,
    content: (
      <>
        <div className="mb-3 flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <div className="text-[8px] uppercase tracking-wide text-white/40">SMS</div>
        </div>
        <div className="mb-2 w-fit rounded-2xl rounded-bl-sm bg-white/10 px-2.5 py-1.5 text-[9px] text-white/70">
          {'Bonjour {{prenom}} 👋'}
        </div>
        <div className="mb-1 ml-auto w-fit rounded-2xl rounded-br-sm bg-violet-500/60 px-2.5 py-1.5 text-[9px] text-white">
          Code : 4829
        </div>
        <div className="ml-auto text-[7px] text-violet-200/50">Envoyé ✓✓</div>
      </>
    ),
  },
];

// ── "Self-building" template animation ─────────────────────────────────────
// Reveals a card's content line-by-line (like the template is being typed out),
// then remounts and replays on a loop so the panel always feels alive.
const buildContainer = {
  hidden: {},
  show: (delay = 0) => ({
    transition: { staggerChildren: 0.22, delayChildren: delay },
  }),
};
const buildItem = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

function BuildSequence({
  content,
  baseDelay,
}: {
  content: React.ReactNode;
  baseDelay: number;
}) {
  // The card content is authored as a fragment; each top-level child is one
  // "line" of the template that we reveal in sequence.
  const steps = Children.toArray(
    isValidElement(content)
      ? (content.props as { children?: React.ReactNode }).children
      : content,
  );

  const [cycle, setCycle] = useState(0);
  const stagger = 0.22;
  const buildMs = (baseDelay + steps.length * stagger + 0.5) * 1000;
  const holdMs = 2600; // pause on the finished template before rebuilding

  useEffect(() => {
    const period = buildMs + holdMs;
    const t = setInterval(() => setCycle((c) => c + 1), period);
    return () => clearInterval(t);
  }, [buildMs]);

  return (
    <motion.div
      key={cycle}
      custom={baseDelay}
      variants={buildContainer}
      initial="hidden"
      animate="show"
    >
      {steps.map((step, i) => (
        <motion.div key={i} variants={buildItem}>
          {step}
        </motion.div>
      ))}
    </motion.div>
  );
}

function RepelCard({
  cfg,
  mouseX,
  mouseY,
  size,
}: {
  cfg: CardConfig;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  size: { w: number; h: number };
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Springs give the snappy, bouncy "magnet" recoil when the cursor moves away.
  const sx = useSpring(x, { stiffness: 130, damping: 11, mass: 0.7 });
  const sy = useSpring(y, { stiffness: 130, damping: 11, mass: 0.7 });

  const update = () => {
    const { w: W, h: H } = size;
    if (!W || !H) return;
    // Repel from the card's *resting* center so the card position never feeds back into itself.
    const cx = (cfg.left / 100) * W + cfg.w / 2;
    const cy = (cfg.top / 100) * H + cfg.h / 2;
    const dx = cx - mouseX.get();
    const dy = cy - mouseY.get();
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < REPEL_RADIUS) {
      const force = (REPEL_RADIUS - dist) / REPEL_RADIUS; // 0..1, 1 at the cursor
      const eased = force * force; // sharper push as the cursor closes in
      x.set((dx / dist) * eased * REPEL_STRENGTH);
      y.set((dy / dist) * eased * REPEL_STRENGTH);
    } else {
      x.set(0);
      y.set(0);
    }
  };

  useMotionValueEvent(mouseX, 'change', update);
  useMotionValueEvent(mouseY, 'change', update);

  return (
    <motion.div
      className="absolute"
      style={{ left: `${cfg.left}%`, top: `${cfg.top}%`, width: cfg.w, height: cfg.h, x: sx, y: sy }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: cfg.delay }}
    >
      <motion.div
        className="h-full w-full rounded-xl border border-white/15 bg-white/10 p-4 shadow-2xl shadow-blue-950/50 backdrop-blur-md"
        animate={{ y: [0, -16, 0], rotate: [cfg.rot, cfg.rot + 2.5, cfg.rot] }}
        transition={{ duration: cfg.dur, repeat: Infinity, ease: 'easeInOut', delay: cfg.delay }}
      >
        <BuildSequence content={cfg.content} baseDelay={cfg.delay + 0.4} />
      </motion.div>
    </motion.div>
  );
}

export default function AuthImage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  // Park the cursor far away so every card springs back to rest.
  const handleLeave = () => {
    mouseX.set(-9999);
    mouseY.set(-9999);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative h-full w-full overflow-hidden bg-[#1a0230]"
    >
      {/* Violet-amethyst gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#3b0764] via-[#4c1d95] to-[#1a0230]" />

      {/* Soft violet/tangerine glows for depth */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-violet-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />

      {/* Big white title above the floating cards */}
      <motion.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="pointer-events-none absolute left-10 right-10 top-10 z-20 select-none font-black uppercase leading-[0.9] tracking-tight text-white text-[clamp(2.25rem,6vw,4.5rem)]"
      >
        Template
        <br />
        Builder
      </motion.h1>

      {/* Magnetic, bouncing template cards */}
      {CARDS.map((cfg) => (
        <RepelCard key={cfg.id} cfg={cfg} mouseX={mouseX} mouseY={mouseY} size={size} />
      ))}

      {/* Glowing orbs */}
      <div className="pointer-events-none absolute right-[25%] top-[20%] h-4 w-4 rounded-full bg-violet-400 shadow-lg shadow-violet-400/60" />
      <div className="pointer-events-none absolute bottom-[30%] left-[12%] h-3 w-3 rounded-full bg-orange-400 shadow-lg shadow-orange-400/60" />
      <div className="pointer-events-none absolute right-[15%] top-[62%] h-2 w-2 rounded-full bg-violet-300 shadow-lg shadow-violet-300/60" />

      {/* Bottom text */}
      <div className="pointer-events-none absolute bottom-10 left-10 right-10 z-20">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mb-2 text-2xl font-semibold text-white"
        >
          Créez. Envoyez. Grandissez.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="text-base text-white/60"
        >
          Créez de superbes modèles d&apos;e-mails, factures et contrats par simple glisser-déposer.
        </motion.p>
      </div>
    </div>
  );
}
