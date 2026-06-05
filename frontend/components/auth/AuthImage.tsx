'use client';

import { useEffect, useRef, useState } from 'react';
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
  {
    id: 1,
    left: 7,
    top: 11,
    w: 182,
    h: 244,
    rot: -4,
    dur: 6,
    delay: 0.1,
    content: (
      <>
        <div className="mb-2 h-3 w-full rounded bg-blue-400/50" />
        <div className="mb-4 h-3 w-3/4 rounded bg-white/25" />
        <div className="mb-2 h-20 w-full rounded bg-blue-400/20" />
        <div className="mb-1 h-3 w-full rounded bg-white/15" />
        <div className="h-3 w-2/3 rounded bg-white/15" />
      </>
    ),
  },
  {
    id: 2,
    left: 51,
    top: 7,
    w: 192,
    h: 272,
    rot: 4,
    dur: 7,
    delay: 0.25,
    content: (
      <>
        <div className="mb-3 h-8 w-full rounded bg-sky-400/30" />
        <div className="mb-1 h-3 w-full rounded bg-white/20" />
        <div className="mb-1 h-3 w-full rounded bg-white/20" />
        <div className="mb-4 h-3 w-1/2 rounded bg-white/20" />
        <div className="mb-2 flex h-16 w-full items-center justify-center rounded border border-dashed border-white/20 bg-white/5">
          <span className="text-xs text-white/30">LOGO</span>
        </div>
        <div className="mb-1 h-3 w-full rounded bg-white/15" />
        <div className="h-3 w-3/4 rounded bg-white/15" />
      </>
    ),
  },
  {
    id: 3,
    left: 15,
    top: 55,
    w: 172,
    h: 222,
    rot: -3,
    dur: 6.5,
    delay: 0.4,
    content: (
      <>
        <div className="mb-3 h-12 w-12 rounded-full bg-cyan-400/30" />
        <div className="mb-1 h-3 w-full rounded bg-white/20" />
        <div className="mb-4 h-3 w-2/3 rounded bg-white/20" />
        <div className="mb-1 h-3 w-full rounded bg-white/15" />
        <div className="mb-1 h-3 w-full rounded bg-white/15" />
        <div className="mb-1 h-3 w-full rounded bg-white/15" />
        <div className="h-3 w-1/2 rounded bg-white/15" />
      </>
    ),
  },
  {
    id: 4,
    left: 54,
    top: 53,
    w: 188,
    h: 204,
    rot: 5,
    dur: 8,
    delay: 0.55,
    content: (
      <>
        <div className="mb-3 h-3 w-1/2 rounded bg-indigo-400/50" />
        <div className="flex h-24 items-end gap-2">
          <div className="h-1/2 w-full rounded-t bg-blue-400/30" />
          <div className="h-3/4 w-full rounded-t bg-blue-400/40" />
          <div className="h-1/3 w-full rounded-t bg-blue-400/25" />
          <div className="h-full w-full rounded-t bg-blue-400/50" />
        </div>
        <div className="mt-3 h-3 w-2/3 rounded bg-white/15" />
      </>
    ),
  },
  {
    id: 5,
    left: 33,
    top: 33,
    w: 162,
    h: 184,
    rot: -6,
    dur: 5.5,
    delay: 0.7,
    content: (
      <>
        <div className="mb-2 h-3 w-3/4 rounded bg-sky-400/40" />
        <div className="mb-1 h-3 w-full rounded bg-white/15" />
        <div className="mb-3 h-3 w-5/6 rounded bg-white/15" />
        <div className="h-8 w-full rounded-full bg-blue-500/40" />
      </>
    ),
  },
];

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
        {cfg.content}
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
      className="relative h-full w-full overflow-hidden bg-[#040b22]"
    >
      {/* Deep dark-blue gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a2472] via-[#0a1538] to-[#02060f]" />

      {/* Soft blue glows for depth */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />

      {/* Magnetic, bouncing template cards */}
      {CARDS.map((cfg) => (
        <RepelCard key={cfg.id} cfg={cfg} mouseX={mouseX} mouseY={mouseY} size={size} />
      ))}

      {/* Glowing orbs */}
      <div className="pointer-events-none absolute right-[25%] top-[20%] h-4 w-4 rounded-full bg-sky-400 shadow-lg shadow-sky-400/60" />
      <div className="pointer-events-none absolute bottom-[30%] left-[12%] h-3 w-3 rounded-full bg-indigo-400 shadow-lg shadow-indigo-400/60" />
      <div className="pointer-events-none absolute right-[15%] top-[62%] h-2 w-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/60" />

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
