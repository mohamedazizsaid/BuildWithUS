'use client';

import { motion } from 'framer-motion';

export default function AuthImage() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950" />

      {/* Floating template cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="absolute top-[15%] left-[10%] w-48 h-64 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4"
      >
        <div className="w-full h-3 bg-indigo-400/40 rounded mb-2" />
        <div className="w-3/4 h-3 bg-white/20 rounded mb-4" />
        <div className="w-full h-20 bg-indigo-400/20 rounded mb-2" />
        <div className="w-full h-3 bg-white/15 rounded mb-1" />
        <div className="w-2/3 h-3 bg-white/15 rounded" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="absolute top-[25%] right-[10%] w-52 h-72 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 rotate-3"
      >
        <div className="w-full h-8 bg-amber-400/30 rounded mb-3" />
        <div className="w-full h-3 bg-white/20 rounded mb-1" />
        <div className="w-full h-3 bg-white/20 rounded mb-1" />
        <div className="w-1/2 h-3 bg-white/20 rounded mb-4" />
        <div className="w-full h-16 bg-white/10 rounded mb-2 border border-dashed border-white/20 flex items-center justify-center">
          <span className="text-white/30 text-xs">LOGO</span>
        </div>
        <div className="w-full h-3 bg-white/15 rounded mb-1" />
        <div className="w-3/4 h-3 bg-white/15 rounded" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="absolute bottom-[15%] left-[20%] w-44 h-56 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 -rotate-2"
      >
        <div className="w-12 h-12 bg-emerald-400/30 rounded-full mb-3" />
        <div className="w-full h-3 bg-white/20 rounded mb-1" />
        <div className="w-2/3 h-3 bg-white/20 rounded mb-4" />
        <div className="w-full h-3 bg-white/15 rounded mb-1" />
        <div className="w-full h-3 bg-white/15 rounded mb-1" />
        <div className="w-full h-3 bg-white/15 rounded mb-1" />
        <div className="w-1/2 h-3 bg-white/15 rounded" />
      </motion.div>

      {/* Glowing orbs */}
      <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-amber-400 rounded-full shadow-lg shadow-amber-400/50" />
      <div className="absolute bottom-[30%] left-[15%] w-3 h-3 bg-indigo-400 rounded-full shadow-lg shadow-indigo-400/50" />
      <div className="absolute top-[60%] right-[15%] w-2 h-2 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50" />

            {/* Bottom text */}
      <div className="absolute bottom-10 left-10 right-10">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-white text-2xl font-semibold mb-2"
        >
          Créez. Envoyez. Grandissez.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="text-white/60 text-base"
        >
          Créez de superbes modèles d&apos;e-mails, factures et contrats par simple glisser-déposer.
        </motion.p>
      </div>
    </div>
  );
}
