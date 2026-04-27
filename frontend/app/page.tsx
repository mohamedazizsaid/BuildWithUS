'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import Link from 'next/link';
import {
  Mail, FileText, ScrollText, Zap, Shield, Globe, ArrowRight,
  Check, Star, ChevronDown, Play, Sparkles,
} from 'lucide-react';

// ─── Easing ──────────────────────────────────────────────────────────────────
const EASE = [0.25, 0.1, 0.25, 1] as const;
const EASE_OUT = [0, 0, 0.2, 1] as const;

// ─── Reusable reveal ─────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 50 }: { children: React.ReactNode; delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
      }`}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <span className="text-black font-black text-sm">W</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">WinTemplate</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {['Fonctionnalités', 'Tarifs', 'À propos'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-white/70 text-sm hover:text-white transition-colors">
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-white/80 text-sm hover:text-white transition-colors">
            Se connecter
          </Link>
          <Link
            href="/register"
            className="bg-white text-black text-sm font-medium px-4 py-2 rounded-full hover:bg-white/90 transition-all hover:scale-105 active:scale-95"
          >
            Essai gratuit
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  return (
    <section ref={ref} className="relative h-screen flex flex-col items-center justify-center overflow-hidden bg-black">
      {/* Animated gradient background */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ scale }}>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-radial from-indigo-600/30 via-purple-600/10 to-transparent blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] rounded-full bg-gradient-radial from-blue-500/20 to-transparent blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] rounded-full bg-gradient-radial from-violet-500/15 to-transparent blur-3xl" />
      </motion.div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px] pointer-events-none" />

      <motion.div style={{ y, opacity }} className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Pill badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8"
        >
          <Sparkles size={13} className="text-indigo-400" />
          <span className="text-white/80 text-xs font-medium">Génération de documents propulsée par IA</span>
        </motion.div>

        {/* Main headline */}
        <div className="overflow-hidden mb-4">
          <motion.h1
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: EASE, delay: 0.1 }}
            className="text-6xl md:text-8xl font-black text-white leading-[0.9] tracking-tight"
          >
            Templates qui
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              font la différence.
            </span>
          </motion.h1>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}
          className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Emails responsifs, contrats légaux, factures professionnelles.
          <br />Un seul outil. Zéro friction.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/register"
            className="group flex items-center gap-2 bg-white text-black font-semibold px-7 py-3.5 rounded-full hover:bg-white/90 transition-all hover:scale-105 active:scale-95 text-sm"
          >
            Commencer gratuitement
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <button className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium">
            <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
              <Play size={13} fill="currentColor" />
            </div>
            Voir la démo
          </button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <span className="text-white/30 text-xs">Découvrir</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <ChevronDown size={18} className="text-white/30" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Hero mockup */}
      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.6 }}
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, 120]) }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] max-w-[90vw]"
      >
        <DashboardMockup />
      </motion.div>
    </section>
  );
}

// ─── Dashboard mockup ─────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="bg-[#0f0f13] border border-white/10 rounded-t-2xl overflow-hidden shadow-2xl shadow-indigo-500/10">
      {/* Window bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#1a1a22]">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <div className="flex-1 mx-4 bg-white/5 rounded-md h-5 text-white/20 text-[9px] flex items-center px-2">
          app.wintemplate.com/dashboard
        </div>
      </div>
      {/* Content */}
      <div className="flex h-48">
        {/* Sidebar */}
        <div className="w-44 border-r border-white/5 p-3 flex flex-col gap-1">
          {['Tableau de bord', 'Modèles', 'Contrats', 'Factures', 'Équipe'].map((item, i) => (
            <div key={item} className={`px-2 py-1.5 rounded-md text-[10px] font-medium ${i === 1 ? 'bg-indigo-600/30 text-indigo-300' : 'text-white/30'}`}>
              {item}
            </div>
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 p-4">
          <div className="text-white/60 text-[10px] font-semibold mb-3">Modèles récents</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Email Bienvenue', color: 'from-blue-500/20 to-indigo-500/20', dot: 'bg-blue-400' },
              { label: 'Contrat B2C', color: 'from-amber-500/20 to-orange-500/20', dot: 'bg-amber-400' },
              { label: 'Facture Pro', color: 'from-emerald-500/20 to-teal-500/20', dot: 'bg-emerald-400' },
            ].map((item) => (
              <div key={item.label} className={`bg-gradient-to-br ${item.color} border border-white/5 rounded-lg p-2.5`}>
                <div className={`w-1.5 h-1.5 rounded-full ${item.dot} mb-2`} />
                <div className="text-white/50 text-[9px]">{item.label}</div>
                <div className="h-1 bg-white/10 rounded-full mt-1.5 w-3/4" />
                <div className="h-1 bg-white/5 rounded-full mt-1 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function StatsSection() {
  const stats = [
    { value: '50K+', label: 'Templates créés' },
    { value: '2K+', label: 'Entreprises actives' },
    { value: '99.9%', label: 'Disponibilité' },
    { value: '4.9★', label: 'Note moyenne' },
  ];
  return (
    <section className="bg-black border-t border-white/5 py-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="text-center">
                <div className="text-4xl font-black text-white mb-1">{s.value}</div>
                <div className="text-white/40 text-sm">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FEATURE SECTION (alternating) ───────────────────────────────────────────
function FeatureSection({
  tag, headline, sub, items, mockup, dark, reverse,
}: {
  tag: string; headline: React.ReactNode; sub: string;
  items: string[]; mockup: React.ReactNode; dark?: boolean; reverse?: boolean;
}) {
  return (
    <section className={`py-32 ${dark ? 'bg-[#080810]' : 'bg-white'}`} id="fonctionnalités">
      <div className="max-w-7xl mx-auto px-6">
        <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16 lg:gap-24`}>
          {/* Text */}
          <div className="flex-1">
            <Reveal>
              <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-6 ${
                dark ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-500'
              }`}>
                {tag}
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className={`text-4xl md:text-5xl font-black leading-[1.05] tracking-tight mb-5 ${dark ? 'text-white' : 'text-slate-900'}`}>
                {headline}
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className={`text-lg leading-relaxed mb-8 ${dark ? 'text-white/50' : 'text-slate-500'}`}>{sub}</p>
            </Reveal>
            <div className="flex flex-col gap-3">
              {items.map((item, i) => (
                <Reveal key={item} delay={0.15 + i * 0.06}>
                  <div className={`flex items-center gap-3 text-sm ${dark ? 'text-white/70' : 'text-slate-600'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${dark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                      <Check size={11} className="text-indigo-500" />
                    </div>
                    {item}
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.4}>
              <Link
                href="/register"
                className={`inline-flex items-center gap-2 mt-10 text-sm font-semibold group ${dark ? 'text-white' : 'text-slate-900'}`}
              >
                Essayer maintenant
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </Reveal>
          </div>

          {/* Mockup */}
          <motion.div
            className="flex-1 w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.94, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1, ease: EASE }}
          >
            {mockup}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Email mockup ──────────────────────────────────────────────────────────────
function EmailMockup() {
  return (
    <div className="bg-[#0f0f18] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-2 text-white/20 text-[10px]">Éditeur Email</span>
      </div>
      <div className="flex">
        {/* blocks panel */}
        <div className="w-32 border-r border-white/5 p-2 flex flex-col gap-1.5">
          {['Texte', 'Image', 'Bouton', 'Séparateur', 'Tableau'].map((b) => (
            <div key={b} className="bg-white/5 rounded-md px-2 py-1.5 text-[9px] text-white/30 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors cursor-pointer">{b}</div>
          ))}
        </div>
        {/* canvas */}
        <div className="flex-1 p-3 flex flex-col gap-2">
          <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-lg p-3">
            <div className="text-indigo-300 text-[11px] font-bold mb-1">{'Bienvenue chez {{company}} !'}</div>
            <div className="h-1.5 bg-white/10 rounded w-full mb-1" />
            <div className="h-1.5 bg-white/10 rounded w-3/4" />
          </div>
          <div className="bg-white/5 border border-white/5 rounded-lg p-2 flex justify-center">
            <div className="bg-indigo-500 text-white text-[9px] font-bold px-3 py-1 rounded-md">
              Commencer →
            </div>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-lg p-2">
            <div className="h-1 bg-white/10 rounded w-full mb-1" />
            <div className="h-1 bg-white/5 rounded w-2/3" />
          </div>
        </div>
        {/* preview */}
        <div className="w-36 border-l border-white/5 p-2 bg-white/[0.02]">
          <div className="text-white/20 text-[9px] mb-2 text-center">Aperçu</div>
          <div className="bg-white rounded-md p-2 scale-90 origin-top">
            <div className="bg-indigo-500 rounded p-1.5 mb-1">
              <div className="text-white text-[8px] font-bold">Bienvenue !</div>
            </div>
            <div className="h-1 bg-gray-200 rounded mb-0.5" />
            <div className="h-1 bg-gray-100 rounded w-3/4 mb-1.5" />
            <div className="bg-indigo-500 rounded text-center py-0.5">
              <div className="text-white text-[7px] font-bold">Commencer</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Contract mockup ──────────────────────────────────────────────────────────
function ContractMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden border border-slate-200">
      {/* header bar */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-white/40 text-[10px]">Éditeur de Contrat B2C</span>
        <div className="bg-white/10 text-white/50 text-[9px] px-2 py-0.5 rounded">v1</div>
      </div>
      <div className="flex h-64">
        {/* Left panel */}
        <div className="w-40 border-r border-slate-100 p-3 bg-slate-50">
          <div className="text-[9px] font-semibold text-slate-400 mb-2">BLOCS</div>
          {['En-tête', 'Parties', 'Art. 1 Objet', 'Art. 3 Prix', 'Signatures', 'SEPA'].map((b, i) => (
            <div key={b} className={`px-2 py-1.5 rounded-md text-[9px] mb-0.5 ${i === 2 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:bg-slate-100'}`}>
              {b}
            </div>
          ))}
        </div>
        {/* A4 preview */}
        <div className="flex-1 p-4 overflow-hidden bg-slate-100">
          <div className="bg-white rounded-lg shadow-sm p-4 text-[8px] text-slate-700 h-full overflow-hidden">
            <div className="font-black text-slate-900 text-[10px] text-center mb-2 uppercase tracking-wide">
              Contrat de Prestation de Services
            </div>
            <div className="border-b border-slate-900 pb-2 mb-3 flex justify-between">
              <div>
                <div className="font-bold text-[8px]">Ma Société SAS</div>
                <div className="text-slate-400 text-[7px]">SIRET 123 456 789</div>
              </div>
              <div className="text-right">
                <div className="bg-slate-100 text-slate-600 text-[7px] px-1.5 py-0.5 rounded">N° CTR-2026-001</div>
              </div>
            </div>
            <div className="font-bold mb-1">Article 1 — Objet</div>
            <div className="text-slate-400 leading-relaxed mb-2">
              Le Prestataire s&apos;engage à réaliser la prestation :{' '}
              <span className="bg-yellow-100 text-yellow-800 px-0.5 rounded">Développement web</span>
            </div>
            <div className="font-bold mb-1">Article 3 — Prix</div>
            <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5 text-[7px]">
              <div className="flex justify-between"><span>HT</span><span>2 500,00 €</span></div>
              <div className="flex justify-between text-slate-400"><span>TVA 20%</span><span>500,00 €</span></div>
              <div className="flex justify-between font-bold text-emerald-700 border-t border-emerald-200 mt-0.5 pt-0.5"><span>TTC</span><span>3 000,00 €</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice mockup ───────────────────────────────────────────────────────────
function InvoiceMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 overflow-hidden border border-slate-200">
      {/* A4 invoice */}
      <div className="p-6 text-[9px] text-slate-700">
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">FACTURE</div>
            <div className="text-slate-400 text-[9px] mt-0.5">Standard</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-slate-900">F2026-001</div>
            <div className="text-slate-400">Date : 01/05/2026</div>
            <div className="text-slate-400">Échéance : 30/05/2026</div>
          </div>
        </div>
        <div className="h-0.5 bg-slate-900 mb-4" />
        <div className="mb-4">
          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1">Facturé à</div>
          <div className="font-bold">Jean Dupont</div>
          <div className="text-slate-400">12 rue de Paris, 75001 Paris</div>
        </div>
        {/* Lines table */}
        <table className="w-full mb-3">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="text-left px-2 py-1.5 text-[8px] font-semibold rounded-l-md">Description</th>
              <th className="text-center px-2 py-1.5 text-[8px] font-semibold w-10">Qté</th>
              <th className="text-right px-2 py-1.5 text-[8px] font-semibold rounded-r-md w-16">Total HT</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50">
              <td className="px-2 py-1.5">Développement web</td>
              <td className="px-2 py-1.5 text-center">1</td>
              <td className="px-2 py-1.5 text-right font-medium">2 500,00 €</td>
            </tr>
          </tbody>
        </table>
        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-36 text-[9px]">
            <div className="flex justify-between py-0.5 text-slate-500"><span>HT</span><span>2 500,00 €</span></div>
            <div className="flex justify-between py-0.5 text-slate-500"><span>TVA 20%</span><span>500,00 €</span></div>
            <div className="flex justify-between py-1.5 px-2 bg-slate-900 text-white rounded-md mt-1 font-bold">
              <span>TTC</span><span>3 000,00 €</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    { n: '01', icon: <Sparkles size={22} />, title: 'Choisissez un type', desc: 'Email, Contrat B2C, Facture, Abonnement télécom... Chaque type a son éditeur dédié.' },
    { n: '02', icon: <Zap size={22} />, title: 'Personnalisez', desc: 'Ajoutez vos blocs, insérez vos variables {{client_nom}}, uploadez votre logo.' },
    { n: '03', icon: <Globe size={22} />, title: 'Exportez ou intégrez', desc: 'Téléchargez en PDF ou appelez notre API pour générer des documents depuis votre CRM.' },
  ];
  return (
    <section className="py-32 bg-[#080810]" id="comment-ça-marche">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white/60 mb-5">
              Simple comme bonjour
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
              En 3 étapes,<br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">c&apos;est fait.</span>
            </h2>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.12}>
              <div className="relative">
                <div className="text-[80px] font-black text-white/[0.04] absolute -top-8 -left-2 leading-none select-none">
                  {step.n}
                </div>
                <div className="relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                    {step.icon}
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── PRICING ──────────────────────────────────────────────────────────────────
function PricingSection() {
  const plans = [
    {
      name: 'Gratuit', price: '0€', period: '/mois',
      desc: 'Pour découvrir la plateforme.',
      features: ['3 templates', 'Export PDF', 'Éditeur email', 'Support communauté'],
      cta: 'Commencer', highlight: false,
    },
    {
      name: 'Pro', price: '29€', period: '/mois',
      desc: 'Pour les professionnels et TPE.',
      features: ['Templates illimités', 'Contrats & Factures', 'Accès API', 'Variables dynamiques', 'Support prioritaire'],
      cta: 'Essayer 14 jours', highlight: true,
    },
    {
      name: 'Entreprise', price: 'Sur devis', period: '',
      desc: 'Pour les équipes et grandes structures.',
      features: ['Multi-tenant', 'Whitelabel', 'SSO / OAuth 2.1', 'SLA garanti', 'Intégration CRM'],
      cta: 'Nous contacter', highlight: false,
    },
  ];
  return (
    <section className="py-32 bg-white" id="tarifs">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight">
              Simple.<br />
              <span className="text-slate-400">Transparent.</span>
            </h2>
            <p className="text-slate-500 mt-4 text-lg">Pas de surprises. Pas de frais cachés.</p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.1}>
              <div className={`relative rounded-2xl p-7 flex flex-col h-full ${
                plan.highlight
                  ? 'bg-slate-900 text-white border-0 shadow-2xl shadow-slate-900/30 scale-[1.03]'
                  : 'bg-slate-50 text-slate-900 border border-slate-200'
              }`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    Populaire
                  </div>
                )}
                <div className={`text-xs font-semibold mb-3 ${plan.highlight ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? 'text-white/50' : 'text-slate-400'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-white/50' : 'text-slate-500'}`}>{plan.desc}</p>
                <div className="flex flex-col gap-2.5 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${plan.highlight ? 'bg-indigo-500/30' : 'bg-slate-200'}`}>
                        <Check size={10} className={plan.highlight ? 'text-indigo-300' : 'text-slate-500'} />
                      </div>
                      <span className={plan.highlight ? 'text-white/80' : 'text-slate-600'}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/register"
                  className={`w-full py-3 rounded-xl text-sm font-semibold text-center transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    plan.highlight
                      ? 'bg-white text-slate-900 hover:bg-white/90'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA FINAL ────────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-40 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-indigo-600/20 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          <h2 className="text-5xl md:text-7xl font-black text-white leading-[0.95] tracking-tight mb-6">
            Prêt à créer{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              quelque chose
            </span>
            <br />d&apos;exceptionnel ?
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="text-white/40 text-lg mb-10">Pas de carte bancaire. Pas d&apos;engagement.</p>
        </Reveal>
        <Reveal delay={0.25}>
          <Link
            href="/register"
            className="inline-flex items-center gap-2.5 bg-white text-black font-bold px-8 py-4 rounded-full text-base hover:bg-white/90 transition-all hover:scale-105 active:scale-95 group"
          >
            Créer mon compte gratuitement
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-black border-t border-white/5 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black font-black text-xs">W</span>
            </div>
            <span className="text-white/60 text-sm">WinTemplate Builder</span>
          </div>
          <div className="flex items-center gap-8">
            {['Mentions légales', 'CGV', 'Confidentialité', 'Contact'].map((item) => (
              <a key={item} href="#" className="text-white/30 text-sm hover:text-white/60 transition-colors">{item}</a>
            ))}
          </div>
          <div className="text-white/20 text-sm">© 2026 WinTemplate</div>
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main className="bg-black">
      <Navbar />
      <HeroSection />
      <StatsSection />

      <FeatureSection
        tag="✦ Templates Email"
        headline={<>Emails qui<br /><span className="text-indigo-400">convertissent.</span></>}
        sub="Créez des templates email responsive avec notre éditeur drag & drop. Blocs, variables, aperçu multi-device — tout y est."
        items={[
          'Éditeur drag & drop visuel avec MJML',
          'Aperçu Desktop, Tablette, Mobile',
          'Variables dynamiques {{prenom}}, {{entreprise}}',
          'Envoi de test en un clic',
          'Export HTML ou intégration API',
        ]}
        mockup={<EmailMockup />}
        dark
      />

      <FeatureSection
        tag="✦ Contrats Légaux"
        headline={<>Contrats 100%<br /><span className="text-amber-500">conformes.</span></>}
        sub="5 types de contrats prêts à l'emploi — B2C, B2B, CGV, AOP, Abonnement. 14 articles légaux pré-remplis, conformes au droit français."
        items={[
          'B2C, B2B, Web/E-commerce, AOP, Télécom',
          '14 articles légaux (Code civil + Code conso)',
          'Droit de rétractation, RGPD, Médiation inclus',
          'Mandat SEPA et formulaire rétractation intégrés',
          'Export PDF multi-pages instantané',
        ]}
        mockup={<ContractMockup />}
        reverse
      />

      <FeatureSection
        tag="✦ Factures Professionnelles"
        headline={<>Factures en<br /><span className="text-emerald-500">30 secondes.</span></>}
        sub="Remplissez le formulaire, le calcul HT/TVA/TTC se fait automatiquement. 6 types de factures disponibles avec toutes les mentions légales."
        items={[
          '6 types : Standard, Pro-forma, Acompte, Avoir...',
          'Calcul automatique HT → TVA → TTC',
          'Mention légale TVA 0% automatique (art. 293B CGI)',
          'Aperçu A4 en temps réel',
          'Export PDF direct',
        ]}
        mockup={<InvoiceMockup />}
        dark
      />

      <HowItWorksSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}
