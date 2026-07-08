'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, FileText, Plus, Zap } from 'lucide-react';
import { subscribeUpgradeModal, type UpgradeModalPayload } from '@/lib/upgrade-modal';

/**
 * Global plan-upgrade modal — the friendly "you've hit a limit, upgrade to
 * continue" moment (see design reference). Mounted once in the root layout;
 * opened imperatively via openUpgradeModal() from anywhere (incl. API errors).
 */
export default function UpgradeModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<UpgradeModalPayload>({});

  useEffect(() => {
    return subscribeUpgradeModal((p) => {
      setPayload(p);
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const title = payload.title || 'Passez à un plan supérieur pour continuer';
  const message =
    payload.message ||
    'Vous avez atteint les limites de votre plan Gratuit. Passez à un plan supérieur pour débloquer un usage illimité.';

  const goPricing = () => {
    setOpen(false);
    router.push('/pricing');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[440px] overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_40px_120px_-30px_rgba(30,41,59,0.6)]"
          >
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="absolute right-3.5 top-3.5 z-10 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-900/10 hover:text-slate-800"
            >
              <X size={18} />
            </button>

            {/* Futuristic gradient header with floating "file" cards */}
            <div className="relative h-44 overflow-hidden bg-gradient-to-br from-indigo-200 via-violet-200 to-fuchsia-200">
              {/* glow orbs */}
              <div className="absolute -left-10 -top-12 h-40 w-40 rounded-full bg-white/50 blur-2xl" />
              <div className="absolute right-0 bottom-0 h-32 w-32 rounded-full bg-fuchsia-300/50 blur-2xl" />
              <div className="absolute left-1/2 top-6 h-24 w-24 -translate-x-1/2 rounded-full bg-indigo-300/40 blur-2xl" />

              {/* floating cards */}
              <div className="absolute left-1/2 top-9 flex -translate-x-1/2 items-start gap-3">
                {[0, 1].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.08 + i * 0.08 }}
                    className="flex w-36 items-center gap-2 rounded-xl border border-white/80 bg-white/85 px-2.5 py-2.5 shadow-lg backdrop-blur-sm"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-fuchsia-500 text-white shadow-sm">
                      <FileText size={14} />
                    </span>
                    <div className="flex-1 space-y-1.5">
                      <div className="h-1.5 w-full rounded-full bg-slate-200" />
                      <div className="h-1.5 w-2/3 rounded-full bg-slate-200/80" />
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="absolute left-1/2 top-[92px] flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-lg border border-white/80 bg-white/70 text-slate-400 shadow-sm backdrop-blur-sm">
                <Plus size={15} />
              </div>
            </div>

            {/* Body */}
            <div className="px-7 pb-7 pt-6 text-center">
              <div className="mx-auto mb-3 flex w-fit items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-600">
                <Sparkles size={12} />
                Plan Gratuit
              </div>

              <h2 className="text-[21px] font-bold leading-tight tracking-tight text-slate-900">
                {title}
              </h2>
              <p className="mx-auto mt-2.5 max-w-[340px] text-sm leading-relaxed text-slate-500">
                {message}
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Peut-être plus tard
                </button>
                <button
                  onClick={goPricing}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:shadow-indigo-600/40 hover:brightness-110"
                >
                  <Zap size={15} className="transition-transform group-hover:scale-110" />
                  Voir les offres
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
