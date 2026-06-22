'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import Link from 'next/link';
import {
  Mail, FileText, ScrollText, Zap, Shield, Globe, ArrowRight, ArrowLeft,
  Check, Star, ChevronDown, ChevronUp, Play, Sparkles,
  LayoutGrid, Plus, Users, UserPlus, Search, Moon, PanelLeft, TrendingUp,
  Clock, ChevronsUpDown, Save, Eye, Send, Monitor, Tablet, Smartphone,
  Type, AlignLeft, Image as ImageIcon, Video, MousePointerClick, Minus,
  Table, PenLine, Share2, ListChecks, Menu as MenuIcon, Undo2, Redo2,
  Square, Circle, Upload, Download,
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
          <Link href="/developers" className="text-white/70 text-sm hover:text-white transition-colors">
            Developers
          </Link>
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
    <section ref={ref} className="relative h-screen flex flex-col items-center justify-start overflow-hidden bg-black pt-16 md:pt-20">
      {/* Animated gradient background */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ scale }}>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-radial from-sky-600/30 via-blue-600/10 to-transparent blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] rounded-full bg-gradient-radial from-blue-500/20 to-transparent blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] rounded-full bg-gradient-radial from-blue-500/15 to-transparent blur-3xl" />
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
          <Sparkles size={13} className="text-sky-400" />
          <span className="text-white/80 text-xs font-medium">Génération des propulsée par IA</span>
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
            <span className="bg-gradient-to-r from-sky-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">
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
      </motion.div>

      {/* Hero mockup — flows below the headline; its top is fully visible, bottom runs off the fold */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: EASE, delay: 0.5 }}
        className="relative z-10 mt-8 md:mt-10 w-[1000px] max-w-[92vw]"
      >
        <DashboardMockup />
      </motion.div>

      {/* Bottom fade so the mockup dissolves into the black hero at the fold */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-black to-transparent z-20" />
    </section>
  );
}

// ─── Dashboard mockup ─────────────────────────────────────────────────────────
// Mirrors the real app dashboard (light theme): sidebar + topbar + stat cards + recent list.
function DashboardMockup() {
  const nav = [
    { icon: LayoutGrid, label: 'Tableau de bord', active: true },
    { icon: FileText, label: 'Modèles' },
    { icon: Plus, label: 'Créer un modèle' },
    { icon: Star, label: 'Favoris' },
  ];
  const admin = [
    { icon: Users, label: "Membres de l'équipe" },
    { icon: UserPlus, label: 'Inviter un membre' },
  ];
  const stats = [
    { icon: FileText, value: '11', label: 'Modèles', tint: 'bg-blue-50 text-blue-600' },
    { icon: Star, value: '1', label: 'Favoris', tint: 'bg-amber-50 text-amber-500' },
    { icon: Users, value: '2', label: "Membres de l'équipe", tint: 'bg-emerald-50 text-emerald-600' },
    { icon: TrendingUp, value: '0', label: 'Utilisation ce mois', tint: 'bg-rose-50 text-rose-500' },
  ];
  const recent = [
    { icon: Mail, title: 'lol', sub: 'lol', tint: 'bg-blue-50 text-blue-500' },
    { icon: Mail, title: 'text', sub: 'text', tint: 'bg-blue-50 text-blue-500' },
    { icon: ScrollText, title: 'cv', sub: 'cv', tint: 'bg-amber-50 text-amber-500' },
    { icon: Mail, title: 'test', sub: 'test', tint: 'bg-blue-50 text-blue-500' },
  ];
  return (
    <div className="rounded-t-2xl border border-b-0 border-slate-200 bg-white overflow-hidden shadow-2xl shadow-sky-500/20 text-left">
      <div className="flex h-[420px]">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-slate-200 flex flex-col px-3 py-4">
          <div className="flex items-center gap-2 px-1 mb-6">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[11px]">WTB</span>
            </div>
            <div className="leading-tight">
              <div className="text-slate-900 font-bold text-sm">Winaity</div>
              <div className="text-slate-400 text-[11px]">Espace pro</div>
            </div>
          </div>
          <div className="text-slate-400 text-[11px] font-semibold px-2 mb-1.5">Plateforme</div>
          <div className="flex flex-col gap-0.5 mb-5">
            {nav.map(({ icon: Icon, label, active }) => (
              <div key={label} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] ${active ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600'}`}>
                <Icon size={15} className={active ? 'text-slate-700' : 'text-slate-400'} />
                {label}
              </div>
            ))}
          </div>
          <div className="text-slate-400 text-[11px] font-semibold px-2 mb-1.5">Administration</div>
          <div className="flex flex-col gap-0.5">
            {admin.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-slate-600">
                <Icon size={15} className="text-slate-400" />
                {label}
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center gap-2 px-1 pt-4">
            <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-semibold shrink-0">MD</div>
            <div className="leading-tight flex-1 min-w-0">
              <div className="text-slate-900 text-[12px] font-semibold truncate">Marie Dubois</div>
              <div className="text-slate-400 text-[11px] truncate">marie@winaity.com</div>
            </div>
            <ChevronsUpDown size={14} className="text-slate-400 shrink-0" />
          </div>
        </aside>
        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <div className="flex items-center gap-3 px-5 h-14 border-b border-slate-200">
            <PanelLeft size={18} className="text-slate-400 shrink-0" />
            <div className="flex-1 flex items-center gap-2 h-9 rounded-lg border border-slate-200 px-3 max-w-md">
              <Search size={14} className="text-slate-400" />
              <span className="text-slate-400 text-[13px]">Rechercher...</span>
            </div>
            <div className="ml-auto w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
              <Moon size={15} className="text-slate-500" />
            </div>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-hidden px-6 py-5">
            <div className="text-slate-900 text-xl font-black">Bon retour, Maria</div>
            <div className="text-slate-400 text-[13px] mb-5">Voici ce qui se passe avec vos modèles.</div>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {stats.map(({ icon: Icon, value, label, tint }) => (
                <div key={label} className="rounded-xl border border-slate-200 p-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${tint}`}>
                    <Icon size={16} />
                  </div>
                  <div className="text-slate-900 text-xl font-black leading-none mb-1">{value}</div>
                  <div className="text-slate-400 text-[11px] truncate">{label}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-slate-900 font-bold text-sm">Modèles récents</div>
                <div className="text-sky-600 text-[12px] font-medium">Voir tout</div>
              </div>
              <div className="flex flex-col">
                {recent.map(({ icon: Icon, title, sub, tint }, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-t border-slate-100 first:border-t-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tint}`}>
                      <Icon size={15} />
                    </div>
                    <div className="leading-tight flex-1">
                      <div className="text-slate-900 text-[13px] font-semibold">{title}</div>
                      <div className="text-slate-400 text-[12px]">{sub}</div>
                    </div>
                    <Clock size={14} className="text-slate-300 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function StatsSection() {
  const stats = [
    { value: 'Bêta', label: 'Version actuelle' },
{ value: '10+ types', label: 'Blocs de contrats disponibles' },
{ value: 'API', label: 'Intégration OAuth 2.1' },
{ value: 'Multi-tenant', label: 'Architecture supportée' },
  ];
  return (
    <section className="bg-black border-t border-white/5 py-16">
      <div className="max-w-5xl mx-auto px-2">
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
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${dark ? 'bg-sky-500/20' : 'bg-sky-50'}`}>
                      <Check size={11} className="text-sky-500" />
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
// Mirrors the real email editor: top bar + icon rail + CONTENU blocks + canvas + properties.
function EmailMockup() {
  const blocks = [
    { icon: Type, label: 'Titre' }, { icon: AlignLeft, label: 'Paragraphe' },
    { icon: ImageIcon, label: 'Image' }, { icon: Video, label: 'Vidéo' },
    { icon: MousePointerClick, label: 'Bouton' }, { icon: Minus, label: 'Séparateur' },
    { icon: Table, label: 'Tableau' }, { icon: PenLine, label: 'Signature' },
    { icon: Share2, label: 'Réseaux' }, { icon: MenuIcon, label: 'Menu' },
    { icon: ListChecks, label: 'Liste à icônes' },
  ];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl shadow-black/30 text-left">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 h-11 border-b border-slate-200">
        <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium"><ArrowLeft size={13} /> Retour</div>
        <div className="flex items-center gap-1.5 ml-1 text-slate-300"><Undo2 size={13} /><Redo2 size={13} /></div>
        <div className="flex items-center gap-1 text-slate-500 text-[11px] ml-1"><Save size={12} /> Enregistrer</div>
        <div className="flex-1 flex items-center justify-center gap-2">
          <span className="text-slate-900 text-[12px] font-semibold">B2B (copie)</span>
          <div className="flex rounded-md bg-slate-100 p-0.5 text-[10px] font-medium">
            <span className="px-2 py-0.5 rounded bg-white text-slate-900 shadow-sm">Canevas</span>
            <span className="px-2 py-0.5 text-slate-400">Code</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300"><Monitor size={13} /><Tablet size={12} /><Smartphone size={11} /></div>
        <div className="flex items-center gap-1.5 ml-1">
          <Eye size={13} className="text-slate-400" />
          <span className="flex items-center gap-1 border border-slate-200 rounded-md px-1.5 py-1 text-[10px] text-slate-600"><Send size={10} />Tester</span>
          <span className="bg-slate-900 text-white rounded-md px-2 py-1 text-[10px] font-medium">Enregistrer</span>
        </div>
      </div>
      <div className="flex h-[330px]">
        {/* Icon rail */}
        <div className="w-9 shrink-0 border-r border-slate-200 flex flex-col items-center gap-3 py-3 text-slate-400">
          <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center"><Type size={14} /></div>
          <LayoutGrid size={15} /><ImageIcon size={15} /><Table size={15} /><Sparkles size={15} />
        </div>
        {/* CONTENU */}
        <div className="w-[124px] shrink-0 border-r border-slate-200 p-2 overflow-hidden">
          <div className="text-slate-400 text-[9px] font-semibold tracking-wide mb-2">CONTENU</div>
          <div className="grid grid-cols-2 gap-1.5">
            {blocks.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center justify-center gap-1 border border-slate-200 rounded-lg py-2 text-slate-500">
                <Icon size={13} />
                <span className="text-[7px] text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Canvas */}
        <div className="flex-1 bg-slate-100 p-4 overflow-hidden">
          <div className="mx-auto max-w-[200px] bg-[#efece6] rounded-sm shadow-md overflow-hidden">
            <div className="bg-[#1a1714] text-[#cdbfa6] text-[6px] tracking-wide text-center py-1.5">
              N° 23 · Vendredi 5 juin 2026 · 4 min de lecture
            </div>
            <div className="px-4 py-4 text-center">
              <div className="text-[#1a1714] font-black text-base leading-none mb-1.5">Votre Marque</div>
              <div className="text-[#8a7f6d] text-[6px] tracking-[0.2em] uppercase mb-2">La lettre hebdomadaire</div>
              <div className="w-5 h-px bg-[#1a1714] mx-auto mb-2" />
              <div className="text-[#5c5346] text-[7px] leading-relaxed italic mb-1.5">« Chaque semaine, nous trions le bruit pour ne garder que l&apos;essentiel. »</div>
              <div className="text-[#8a7f6d] text-[6px] mb-2">— La rédaction</div>
              <div className="h-12 bg-[#cfc6b6] rounded-sm" />
            </div>
          </div>
        </div>
        {/* Properties */}
        <div className="w-[112px] shrink-0 border-l border-slate-200 p-2.5 overflow-hidden">
          <div className="text-slate-400 text-[8px] font-semibold tracking-wide mb-2">CORPS DU MODÈLE</div>
          <div className="text-slate-700 text-[9px] font-medium mb-1.5">Mise en page</div>
          <div className="text-slate-400 text-[8px] mb-0.5">Largeur du corps</div>
          <div className="flex items-center justify-between border border-slate-200 rounded px-1.5 py-1 mb-2 text-[8px] text-slate-700">640 <span className="text-slate-300">px</span></div>
          <div className="text-slate-400 text-[8px] mb-0.5">Couleur du corps</div>
          <div className="flex items-center gap-1 border border-slate-200 rounded px-1.5 py-1 mb-2">
            <div className="w-3 h-3 rounded-sm bg-[#efece6] border border-slate-200" />
            <span className="text-[8px] text-slate-700">#efece6</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-[8px]">Grouper les côtés</span>
            <div className="w-6 h-3.5 rounded-full bg-sky-500 flex items-center px-0.5 justify-end"><div className="w-2.5 h-2.5 rounded-full bg-white" /></div>
          </div>
          {['Fond', 'En-tête', 'Styles de texte', 'Boutons'].map((s) => (
            <div key={s} className="flex items-center justify-between border-t border-slate-100 py-1.5 text-[8px] text-slate-600">
              {s}<ChevronDown size={10} className="text-slate-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Contract mockup ──────────────────────────────────────────────────────────
// Mirrors the real PDF/contract editor: top bar + variable panel + A4 page + PDF source panel.
function ContractMockup() {
  const prestataire = ['Nom / Raison sociale', 'Adresse', 'SIRET', 'N° TVA', 'Qualité du signataire'];
  const groups = ['Client', 'Contrat', 'Financier', 'Abonnement', 'Marché public', 'Web', 'Signature', 'Bancaire / SEPA'];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl shadow-black/15 text-left">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 h-11 border-b border-slate-200 text-[10px]">
        <div className="flex items-center gap-1 text-slate-500 font-medium"><ArrowLeft size={13} /> Retour</div>
        <div className="flex items-center gap-1 text-sky-600 font-medium border border-slate-200 rounded px-1.5 py-1">B2C — Particulier <ChevronDown size={10} /></div>
        <span className="text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">v1</span>
        <span className="hidden sm:flex items-center gap-1 text-emerald-600"><Check size={11} />Enregistré</span>
        <div className="flex rounded-md bg-slate-100 p-0.5 ml-1">
          <span className="px-2 py-0.5 rounded text-slate-400">Build</span>
          <span className="px-2 py-0.5 rounded bg-white text-slate-900 shadow-sm flex items-center gap-1"><FileText size={9} />PDF</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="hidden sm:inline border border-slate-200 rounded-md px-2 py-1 text-slate-600">Enregistrer template</span>
          <span className="bg-slate-900 text-white rounded-md px-2 py-1 flex items-center gap-1"><Download size={10} />Télécharger PDF</span>
        </div>
      </div>
      <div className="flex h-[340px]">
        {/* Variables panel */}
        <div className="w-[132px] shrink-0 border-r border-slate-200 p-2.5 overflow-hidden">
          <div className="flex items-center gap-2 text-[9px] mb-2 border-b border-slate-200 pb-1.5">
            <span className="text-slate-900 font-semibold border-b-2 border-sky-500 pb-1">Variables</span>
            <span className="text-slate-400">Blocs</span>
            <span className="text-slate-400 flex items-center gap-0.5">CSV<span className="bg-emerald-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-[7px]">1</span></span>
          </div>
          <div className="text-slate-300 text-[8px] italic mb-2">Glissez ou cliquez pour insérer</div>
          <div className="flex items-center justify-between text-[9px] text-slate-700 font-medium mb-1.5">
            <span className="flex items-center gap-1"><ChevronUp size={10} />Prestataire</span><Plus size={10} className="text-slate-400" />
          </div>
          <div className="flex flex-col gap-1 mb-2">
            {prestataire.map((c) => (
              <span key={c} className="bg-sky-50 text-sky-700 border border-sky-100 rounded px-1.5 py-1 text-[8px] font-medium w-fit">{c}</span>
            ))}
          </div>
          {groups.map((g) => (
            <div key={g} className="flex items-center justify-between text-[9px] text-slate-600 border-t border-slate-100 py-1.5">
              <span className="flex items-center gap-1"><ChevronDown size={10} className="text-slate-300" />{g}</span><Plus size={10} className="text-slate-400" />
            </div>
          ))}
        </div>
        {/* A4 page */}
        <div className="flex-1 bg-slate-100 p-4 overflow-hidden">
          <div className="text-slate-400 text-[7px] mb-1">p.1</div>
          <div className="bg-white rounded-sm shadow-md p-4 text-[6.5px] leading-relaxed text-slate-600 h-full overflow-hidden">
            <div className="text-center font-bold text-slate-900 text-[9px] mb-3">CONDITIONS GÉNÉRALES DE VENTE</div>
            <p className="mb-2">Le magazine Télécâble Sat hebdo, édité par BAUER MEDIA France SCS, vous propose un abonnement trimestriel à durée indéterminée, incluant quatre semaines d&apos;essai gratuit.</p>
            <p className="mb-2">L&apos;abonnement vous est proposé au prix préférentiel de 24.50€ TTC soit 1.88€ TTC par numéro frais de port inclus. TVA à 2,10%.</p>
            <p className="font-semibold text-slate-800 mb-1">Droit de rétractation</p>
            <p className="mb-2">En signant ce contrat d&apos;abonnement, vous avez le droit de vous rétracter, sans donner de motif, dans un délai de quatorze jours calendaires commençant à courir à compter du jour de réception du premier exemplaire.</p>
            <p className="font-semibold text-slate-800 mb-1">Garanties légales</p>
            <p>Indépendamment de la garantie commerciale gérée par notre service client abonnements, vous bénéficiez d&apos;une garantie légale de conformité.</p>
          </div>
        </div>
        {/* PDF source panel */}
        <div className="w-[124px] shrink-0 border-l border-slate-200 p-2.5 overflow-hidden">
          <div className="text-slate-400 text-[8px] font-semibold tracking-wide mb-1.5">PDF SOURCE</div>
          <div className="text-slate-600 text-[8px] mb-2 break-all">to-sign-1774…contrat-2854.pdf</div>
          <div className="flex items-center justify-center gap-1 border border-slate-200 rounded-md py-1.5 text-[8px] text-slate-600 mb-3"><Upload size={10} />Remplacer le PDF</div>
          <div className="text-slate-400 text-[8px] font-semibold tracking-wide mb-1.5">PLACEMENTS (0)</div>
          <div className="flex items-center justify-center gap-1 border border-slate-200 rounded-md py-1.5 text-[8px] text-slate-600 mb-1.5"><Type size={9} />Ajouter une zone de texte</div>
          <div className="grid grid-cols-3 gap-1 mb-2">
            <div className="flex items-center justify-center gap-0.5 border border-slate-200 rounded py-1 text-[7px] text-slate-600"><Square size={8} />Rect</div>
            <div className="flex items-center justify-center gap-0.5 border border-slate-200 rounded py-1 text-[7px] text-slate-600"><Circle size={8} />Ellipse</div>
            <div className="flex items-center justify-center gap-0.5 border border-slate-200 rounded py-1 text-[7px] text-slate-600"><Minus size={8} />Ligne</div>
          </div>
          <div className="text-slate-300 text-[7px] italic leading-relaxed">Glissez une variable depuis le panneau de gauche, ou ajoutez une zone de texte / forme.</div>
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
              Simple comme Bonjour
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
              En 3 étapes,<br />
              <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">c&apos;est fait.</span>
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
                  <div className="w-11 h-11 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4">
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
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    Populaire
                  </div>
                )}
                <div className={`text-xs font-semibold mb-3 ${plan.highlight ? 'text-sky-400' : 'text-slate-500'}`}>
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
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${plan.highlight ? 'bg-sky-500/30' : 'bg-slate-200'}`}>
                        <Check size={10} className={plan.highlight ? 'text-sky-300' : 'text-slate-500'} />
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
      <div className="absolute inset-0 bg-gradient-radial from-sky-600/20 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          <h2 className="text-5xl md:text-7xl font-black text-white leading-[0.95] tracking-tight mb-6">
            Prêt à créer{' '}
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-blue-500 bg-clip-text text-transparent">
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
        headline={<>Emails qui<br /><span className="text-sky-400">convertissent.</span></>}
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
