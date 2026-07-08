'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Check,
  Copy,
  Key,
  Layers,
  Lock,
  Shield,
  Terminal,
  Zap,
} from 'lucide-react';
import toast from '@/lib/toast';

const EASE = [0.25, 0.1, 0.25, 1] as const;

const TOC = [
  { id: 'concepts', label: 'Concepts clés' },
  { id: 'flow', label: 'Le flux' },
  { id: 'keys', label: 'Récupérer tes clés' },
  { id: 'reference', label: 'Référence API' },
  { id: 'example', label: 'Exemple complet' },
  { id: 'security', label: 'Sécurité' },
];

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black font-black text-sm">W</span>
            </div>
            <span className="text-white font-semibold text-sm">WinTemplate Developers</span>
          </Link>
          <div className="hidden md:flex items-center gap-5 text-sm">
            {TOC.map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-white/50 hover:text-white transition-colors">
                {t.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="bg-white text-black text-sm font-medium px-4 py-2 rounded-full hover:bg-white/90 transition-all"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-gradient-radial from-indigo-600/20 to-transparent blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-white/70 mb-6">
              <Zap className="w-3 h-3" /> Documentation d&apos;intégration · v1
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
              Intègre le builder WinTemplate dans ton produit
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Laisse tes utilisateurs créer et gérer des templates depuis ton app — sans second
              compte, sans mot de passe à gérer. Une paire de clés, un appel serveur, un redirect.
            </p>
            <div className="flex items-center justify-center gap-3 mt-8">
              <a
                href="#keys"
                className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded-full hover:bg-white/90 transition-all flex items-center gap-2"
              >
                Récupérer mes clés <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#reference"
                className="border border-white/15 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-white/5 transition-all"
              >
                Référence API
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Core concepts ────────────────────────────────────────────────── */}
      <Section id="concepts" eyebrow="Concepts" title="Trois objets à comprendre">
        <p className="text-white/60 text-sm mb-8 max-w-2xl">
          Tout le modèle d&apos;intégration tient en trois objets. Une fois compris, le reste de
          cette doc est juste de la plomberie.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <ConceptCard
            icon={<Key className="w-5 h-5" />}
            title="API client"
            badge="1 par produit"
          >
            Une paire <Mono>client_id</Mono> + <Mono>client_secret</Mono> représente{' '}
            <strong>tout ton produit</strong>. Tu la génères une fois. Le secret reste sur ton
            serveur — jamais dans le navigateur.
          </ConceptCard>
          <ConceptCard
            icon={<Building2 className="w-5 h-5" />}
            title="external_org_ref"
            badge="ta clé d'isolation"
          >
            Si ton produit a plusieurs organisations / espaces / clients, tu envoies{' '}
            <Mono>custom_champ.external_org_ref</Mono> à chaque appel. C&apos;est l&apos;identifiant
            <em> de ton côté</em> qui sépare les templates.
          </ConceptCard>
          <ConceptCard
            icon={<Layers className="w-5 h-5" />}
            title="Template"
            badge="la ressource"
          >
            Email, facture ou contrat créé dans le builder. Chaque template est stocké avec son{' '}
            <Mono>external_org_ref</Mono>, et toutes les lectures sont filtrées par lui.
          </ConceptCard>
        </div>

        <div className="mt-8 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-2 text-sm">
                Pourquoi <Mono>external_org_ref</Mono> ? Une clé, plusieurs organisations.
              </h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                Tu n&apos;as qu&apos;<strong>une seule</strong> paire de clés, même si ton produit
                sert des centaines d&apos;organisations. À chaque requête, tu indiques pour quelle
                organisation tu agis via <Mono>custom_champ.external_org_ref</Mono>. WinTemplate
                tague chaque template avec cette valeur et filtre automatiquement les lectures.
                Résultat : l&apos;org <Mono>acme</Mono> ne voit jamais les templates de l&apos;org{' '}
                <Mono>globex</Mono>, alors qu&apos;elles partagent le même secret.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                  <span className="text-emerald-400 font-medium">À retenir</span>
                  <ul className="text-white/60 mt-1.5 space-y-1 list-disc list-inside">
                    <li>C&apos;est <strong>ton</strong> identifiant (slug, UUID interne…), opaque pour nous.</li>
                    <li>Stable : utilise toujours la même valeur pour la même org.</li>
                    <li>
                      <strong>Requis</strong> sur <Mono>/api/builder-sessions</Mono> et{' '}
                      <Mono>/oauth/token</Mono>.
                    </li>
                  </ul>
                </div>
                <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                  <span className="text-amber-400 font-medium">Attention</span>
                  <ul className="text-white/60 mt-1.5 space-y-1 list-disc list-inside">
                    <li>
                      Une requête <strong>sans</strong> <Mono>external_org_ref</Mono> est rejetée en{' '}
                      <Mono>400</Mono>.
                    </li>
                    <li>Si tu changes la valeur d&apos;une org, elle « perd » ses anciens templates.</li>
                    <li>Mono-organisation ? Envoie une constante (ex. <Mono>&quot;default&quot;</Mono>).</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Flow ─────────────────────────────────────────────────────────── */}
      <Section id="flow" eyebrow="Vue d'ensemble" title="Comment ça marche">
        <p className="text-white/60 text-sm mb-8 max-w-2xl">
          Deux parcours partent du même couple de clés. Le <strong>builder embarqué</strong> pour
          que tes users créent/éditent visuellement, et l&apos;<strong>API M2M</strong> pour lire le
          contenu côté serveur.
        </p>
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <FlowCard
            tag="Parcours A · navigateur"
            title="Builder embarqué"
            steps={[
              ['Mint', 'Ton serveur appelle /api/builder-sessions avec external_org_ref → reçoit une URL à usage unique.'],
              ['Redirect', 'Tu envoies ton user vers builder.com/s/<token>. Il édite sans mot de passe.'],
              ['Callback', 'Au save, il revient sur ton return_url avec ?template_id=…'],
            ]}
          />
          <FlowCard
            tag="Parcours B · serveur à serveur"
            title="API M2M"
            steps={[
              ['Token', 'Ton serveur appelle /oauth/token avec external_org_ref → reçoit un access_token.'],
              ['Read', 'GET /templates (Bearer) → liste filtrée automatiquement à cette org.'],
              ['Render', 'GET /templates/:id/render → HTML compilé (email) ; POST /templates/:id/render-sms → texte + segments (SMS). Prêt à afficher/envoyer.'],
            ]}
          />
        </div>
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-5">
          <p className="text-xs text-white/40 mb-3 font-mono">Parcours A — séquence détaillée</p>
          <pre className="text-[11px] sm:text-xs overflow-x-auto text-white/70 leading-relaxed">
{`  TON APP (serveur)                WINTEMPLATE                  TON USER (navigateur)
       │                                │                               │
       │  POST /api/builder-sessions    │                               │
       │  { client_id, client_secret,   │                               │
       │    mode, return_url,           │                               │
       │    custom_champ:{external_org_ref} }                           │
       │───────────────────────────────►│                               │
       │                                │── vérifie secret (argon2)     │
       │                                │── vérifie return_url (allowlist)
       │                                │── crée une session 1-shot     │
       │  { url: ".../s/<token>" }      │                               │
       │◄───────────────────────────────│                               │
       │                                                                │
       │  302 redirect ────────────────────────────────────────────────►│
       │                                │  GET /s/<token> + POST /s/exchange
       │                                │◄──────────────────────────────│
       │                                │── brûle le token, signe un JWT 24h
       │                                │── builder ouvert, user édite & save
       │                                │                               │
       │  GET return_url?template_id=…  ◄───────────────────────────────│
       │  (tu stockes l'id chez toi)    │                               │`}
          </pre>
        </div>
      </Section>

      {/* ── Get keys ─────────────────────────────────────────────────────── */}
      <section id="keys" className="max-w-3xl mx-auto px-6 py-16 scroll-mt-20">
        <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <Key className="w-6 h-6" />
            <h2 className="text-2xl font-semibold">Récupère tes clés</h2>
          </div>
          <p className="text-white/60 text-sm mb-6 max-w-xl">
            Les clés API se génèrent depuis ton compte WinTemplate. Connecte-toi (ou crée un
            compte), puis ouvre <Mono>Paramètres → Intégrations</Mono> pour générer une paire{' '}
            <Mono>client_id</Mono> / <Mono>client_secret</Mono>. Le secret ne s&apos;affiche
            qu&apos;une seule fois.
          </p>
          <ol className="text-white/60 text-sm space-y-2 mb-6 list-decimal list-inside">
            <li>Connecte-toi à ton compte (administrateur de l&apos;organisation).</li>
            <li>Ouvre <Mono>Paramètres → Intégrations</Mono> depuis la barre latérale.</li>
            <li>Génère une clé, déclare tes <Mono>return_url</Mono>, et copie le secret.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded-full hover:bg-white/90 transition-all flex items-center gap-2"
            >
              Se connecter <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register"
              className="border border-white/15 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-white/5 transition-all"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </section>

      {/* ── API reference ────────────────────────────────────────────────── */}
      <Section id="reference" eyebrow="Référence" title="Endpoints">
        <p className="text-white/60 text-sm mb-8 max-w-2xl">
          Base URL : <Mono>https://api-template-builder.winaity.com</Mono>. Les endpoints
          d&apos;intégration s&apos;authentifient par <Mono>client_id</Mono> +{' '}
          <Mono>client_secret</Mono> (jamais de cookie). Les lectures de templates utilisent un{' '}
          <Mono>Bearer</Mono> token.
        </p>

        <div className="space-y-5">
          <Endpoint
            method="POST"
            path="/developers/register"
            auth="Public"
            summary="Crée un API client (tenant) et renvoie une paire de clés. Le secret n'est montré qu'une fois."
            request={`{
  "name":  "Acme CRM",
  "email": "dev@acme.com"
}`}
            response={`{
  "client_id":     "5e02f209-4d44-4eb7-aad7-f0c01353d70f",
  "client_secret": "KUjFgrEgKWT6ZJcjfTNpT5U51T9EgqzVaJn0erVfFKM",
  "scopes":        "templates:read templates:write"
}`}
          />

          <Endpoint
            method="POST"
            path="/developers/return-urls"
            auth="client_id + secret"
            summary="Déclare les return_url autorisés (allowlist). Obligatoire avant de minter une session. Comparaison stricte, pas de joker."
            request={`{
  "client_id":     "5e02f209-...",
  "client_secret": "KUjFgrEgKWT6...",
  "urls": [
    "https://acme.com/builder/callback",
    "http://localhost:5555/callback"
  ]
}`}
            response={`{ "allowed_return_urls": ["https://acme.com/builder/callback", "..."] }`}
          />

          <Endpoint
            method="POST"
            path="/api/builder-sessions"
            auth="client_id + secret"
            summary="Génère une URL de builder à usage unique pour une organisation. Le return_url doit être dans l'allowlist."
            highlight="custom_champ.external_org_ref"
            request={`{
  "client_id":     "5e02f209-...",
  "client_secret": "KUjFgrEgKWT6...",
  "mode":          "new",                       // "new" | "edit" | "list"
  "return_url":    "https://acme.com/builder/callback",
  "template_id":   "tpl_123",                   // requis seulement si mode = "edit"
  "custom_champ": {
    "external_org_ref": "org-alpha"             // ← REQUIS : ton org
  }
}`}
            response={`{
  "url":        "https://app.winaity.com/s/8f3c...e1",
  "expires_at": "2026-06-11T12:00:00.000Z"
}`}
          />

          <Endpoint
            method="POST"
            path="/oauth/token"
            auth="client_id + secret"
            summary="Renvoie un access_token M2M (1h) scopé à une organisation. Utilisé pour lire les templates côté serveur."
            highlight="custom_champ.external_org_ref"
            request={`{
  "client_id":     "5e02f209-...",
  "client_secret": "KUjFgrEgKWT6...",
  "custom_champ": {
    "external_org_ref": "org-alpha"             // ← REQUIS : scope le token à cette org
  }
}`}
            response={`{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "token_type":   "Bearer",
  "expires_in":   3600
}`}
          />

          <Endpoint
            method="GET"
            path="/templates"
            auth="Bearer (M2M)"
            summary="Liste les templates. Le résultat est AUTOMATIQUEMENT filtré sur l'external_org_ref encodé dans le token — tu n'as rien à passer."
            request={`Authorization: Bearer <access_token>

# Query params optionnels :
#   ?page=1&limit=10&type=email&search=facture`}
            response={`{
  "templates": [
    { "id": "tpl_123", "name": "Relance facture", "type": "email", "external_org_ref": "org-alpha" }
  ],
  "total": 1, "page": 1, "limit": 10
}`}
          />

          <Endpoint
            method="GET"
            path="/templates/:id"
            auth="Bearer (M2M)"
            summary="Renvoie un template tel que stocké — pour les emails, le contenu BRUT est du MJML (pas du HTML prêt à afficher). 404 si l'id n'appartient pas à l'org du token."
            request={`Authorization: Bearer <access_token>`}
            response={`{
  "id":        "tpl_123",
  "name":      "Relance facture",
  "type":      "email",
  "content":   "<mjml>…</mjml>",         // ← MJML brut, à compiler
  "variables": ["client_name", "amount", "due_date"]
}`}
          />

          <Endpoint
            method="GET"
            path="/templates/:id/render"
            auth="Bearer (M2M)"
            summary="Compile le template en HTML prêt à l'emploi (moteur MJML officiel) — c'est l'endpoint à utiliser après le callback pour afficher ou envoyer l'email. C'est exactement le HTML que prévisualise le builder."
            request={`Authorization: Bearer <access_token>`}
            response={`{
  "id":      "tpl_123",
  "name":    "Relance facture",
  "type":    "email",
  "subject": "Votre relance",
  "html":    "<!doctype html>…"       // ← prêt à afficher / envoyer
}`}
          />

          <Endpoint
            method="POST"
            path="/templates/:id/render-sms"
            auth="Bearer (M2M)"
            summary="Rend un template SMS en texte brut, variables injectées — l'endpoint à utiliser pour obtenir un SMS prêt à envoyer. Renvoie aussi l'encodage (GSM-7 / UCS-2) et le nombre de segments, pour ta passerelle SMS. 404 si l'id n'appartient pas à l'org du token."
            request={`Authorization: Bearer <access_token>
Content-Type: application/json

{
  "variables": { "firstName": "Sarah", "code": "4821" }
}

# variables est optionnel — sans valeur, les {{placeholders}} restent intacts`}
            response={`{
  "id":             "tpl_123",
  "name":           "Code de connexion",
  "type":           "sms",
  "text":           "Bonjour Sarah, votre code est 4821",
  "encoding":       "GSM-7",        // ou "UCS-2" (hors alphabet GSM)
  "characters":     34,
  "segments":       1,              // nb de SMS réellement envoyés
  "variables_used": ["firstName", "code"]
}`}
          />
        </div>
      </Section>

      {/* ── Full example ─────────────────────────────────────────────────── */}
      <Section id="example" eyebrow="Bout en bout" title="Exemple — backend Node.js">
        <p className="text-white/60 text-sm mb-8 max-w-2xl flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          Côté serveur uniquement. Ne mets jamais ton <Mono>client_secret</Mono> dans le navigateur.
        </p>

        <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4" /> 1 · Ouvrir le builder pour une organisation
        </h3>
        <CodeBlock
          code={`const ORG_REF = req.user.orgId; // l'org de TON côté (ton DB / ta session)

app.get('/create-template', async (req, res) => {
  const r = await fetch('https://api-template-builder.winaity.com/api/builder-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.BUILDER_CLIENT_ID,
      client_secret: process.env.BUILDER_CLIENT_SECRET,
      mode:          'new',
      return_url:    'https://acme.com/builder/callback',  // doit être dans l'allowlist
      custom_champ:  { external_org_ref: ORG_REF },        // ← isole les templates par org
    }),
  });
  const { url } = await r.json();
  res.redirect(url); // → l'utilisateur va sur builder.com/s/<token>
});

// Au save, WinTemplate renvoie l'utilisateur ici :
app.get('/builder/callback', (req, res) => {
  const templateId = req.query.template_id; // "tpl_123"
  saveTemplateForOrg(ORG_REF, templateId);  // stocke chez toi
  res.redirect('/dashboard?created=' + templateId);
});`}
        />

        <h3 className="text-sm font-semibold text-white/80 mb-3 mt-8 flex items-center gap-2">
          <Terminal className="w-4 h-4" /> 2 · Lister les templates d&apos;une organisation (M2M)
        </h3>
        <CodeBlock
          code={`async function listTemplates(orgRef) {
  // a) token M2M scopé à l'org
  const t = await fetch('https://api-template-builder.winaity.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.BUILDER_CLIENT_ID,
      client_secret: process.env.BUILDER_CLIENT_SECRET,
      custom_champ:  { external_org_ref: orgRef },   // ← même valeur que ci-dessus
    }),
  });
  const { access_token } = await t.json();

  // b) la liste est déjà filtrée à orgRef — rien à passer
  const list = await fetch('https://api-template-builder.winaity.com/templates', {
    headers: { Authorization: 'Bearer ' + access_token },
  });
  return (await list.json()).templates;
}`}
        />

        <h3 className="text-sm font-semibold text-white/80 mb-3 mt-8 flex items-center gap-2">
          <Terminal className="w-4 h-4" /> 3 · Récupérer le HTML prêt à l&apos;emploi (après le callback)
        </h3>
        <p className="text-white/60 text-sm mb-3 max-w-2xl">
          Le template est stocké en <strong>MJML</strong>. Plutôt que de le compiler toi-même,
          appelle <Mono>/render</Mono> : tu reçois le <strong>HTML compatible clients mail</strong> —
          exactement ce que prévisualise le builder. Tu n&apos;as plus qu&apos;à l&apos;afficher
          (ex. dans une <Mono>iframe</Mono>) ou l&apos;envoyer.
        </p>
        <CodeBlock
          code={`async function renderTemplate(orgRef, templateId) {
  // token M2M scopé à l'org (comme ci-dessus)
  const t = await fetch('https://api-template-builder.winaity.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.BUILDER_CLIENT_ID,
      client_secret: process.env.BUILDER_CLIENT_SECRET,
      custom_champ:  { external_org_ref: orgRef },
    }),
  });
  const { access_token } = await t.json();

  // compile le MJML → HTML (simple GET)
  const r = await fetch(\`https://api-template-builder.winaity.com/templates/\${templateId}/render\`, {
    headers: { Authorization: 'Bearer ' + access_token },
  });

  const { subject, html } = await r.json();
  return { subject, html }; // → affiche le html, ou envoie-le par email depuis ta plateforme
}`}
        />

        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-5 text-sm text-white/60">
          <p className="flex items-center gap-2 mb-1.5 text-white/80 font-medium">
            <Check className="w-4 h-4 text-emerald-400" /> Démo de référence
          </p>
          Un exemple complet et fonctionnel (CRM à 2 organisations qui partagent une clé et restent
          isolées par <Mono>external_org_ref</Mono>) est fourni dans le dossier{' '}
          <Mono>crm-demo/</Mono> du dépôt.
        </div>
      </Section>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <Section id="security" eyebrow="Sécurité" title="Les garanties">
        <div className="grid md:grid-cols-2 gap-4">
          <SecurityCard icon={<Shield className="w-5 h-5 text-emerald-400" />} title="Le secret ne touche jamais le navigateur">
            Il ne circule que de serveur à serveur. Aucune route front n&apos;accepte un{' '}
            <Mono>client_secret</Mono> en entrée. En base, on ne stocke qu&apos;un hash argon2.
          </SecurityCard>
          <SecurityCard icon={<Shield className="w-5 h-5 text-emerald-400" />} title="Allowlist obligatoire">
            Chaque tenant déclare ses <Mono>return_url</Mono> autorisés avant de pouvoir minter une
            session. Comparaison stricte — empêche un secret volé de rediriger vers du phishing.
          </SecurityCard>
          <SecurityCard icon={<Check className="w-5 h-5 text-emerald-400" />} title="Token one-shot, 24h">
            Le token d&apos;URL est brûlé au premier <Mono>/s/exchange</Mono>. La session JWT
            qui en sort dure 24h max et ne survit jamais plus longtemps que la session.
          </SecurityCard>
          <SecurityCard icon={<Building2 className="w-5 h-5 text-emerald-400" />} title="Isolation par organisation">
            Toutes les lectures sont filtrées par l&apos;<Mono>external_org_ref</Mono> encodé dans le
            token. Une org ne peut techniquement pas lire les templates d&apos;une autre.
          </SecurityCard>
        </div>
      </Section>

      <footer className="border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-10 text-center text-white/40 text-sm">
          WinTemplate Developers · scopes : <Mono>templates:read</Mono> ·{' '}
          <Mono>templates:write</Mono>
        </div>
      </footer>
    </div>
  );
}

/* ── Layout helpers ───────────────────────────────────────────────────────── */

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-white/10 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-8">
          <span className="text-xs uppercase tracking-widest text-indigo-300/70 font-medium">{eyebrow}</span>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function Mono({ children }: { readonly children: React.ReactNode }) {
  return <code className="bg-white/10 text-white/90 px-1.5 py-0.5 rounded text-[0.85em] font-mono">{children}</code>;
}

function ConceptCard({
  icon,
  title,
  badge,
  children,
}: {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly badge: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">{icon}</div>
        <span className="text-[10px] uppercase tracking-wider text-white/40 border border-white/10 rounded-full px-2 py-0.5">
          {badge}
        </span>
      </div>
      <h3 className="font-semibold mb-2 font-mono text-sm">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function FlowCard({
  tag,
  title,
  steps,
}: {
  readonly tag: string;
  readonly title: string;
  readonly steps: readonly (readonly [string, string])[];
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <span className="text-[10px] uppercase tracking-wider text-indigo-300/70">{tag}</span>
      <h3 className="font-semibold mt-1 mb-4">{title}</h3>
      <ol className="space-y-3">
        {steps.map(([label, desc], i) => (
          <li key={label} className="flex gap-3">
            <span className="w-5 h-5 shrink-0 rounded-full bg-white/10 text-white/80 text-[11px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-white/60 leading-relaxed">
              <strong className="text-white/85">{label}.</strong> {desc}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SecurityCard({
  icon,
  title,
  children,
}: {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold mb-2 text-sm">{title}</h3>
      <p className="text-white/60 text-xs leading-relaxed">{children}</p>
    </div>
  );
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  POST: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
};

function Endpoint({
  method,
  path,
  auth,
  summary,
  request,
  response,
  highlight,
}: {
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly auth: string;
  readonly summary: string;
  readonly request: string;
  readonly response: string;
  readonly highlight?: string;
}) {
  return (
    <div className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/10">
        <span className={`text-[11px] font-bold font-mono px-2 py-1 rounded border ${METHOD_COLORS[method]}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-white/90">{path}</code>
        <span className="text-[10px] uppercase tracking-wider text-white/40 border border-white/10 rounded-full px-2 py-0.5 ml-auto">
          auth · {auth}
        </span>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-white/60 leading-relaxed mb-4">
          {summary}
          {highlight && (
            <span className="block mt-2 text-xs text-amber-300/90">
              ⚑ Nécessite <code className="bg-amber-500/10 px-1 rounded">{highlight}</code>.
            </span>
          )}
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Requête</p>
            <pre className="bg-black/50 border border-white/10 rounded-lg p-3 text-[11px] overflow-x-auto text-white/75 leading-relaxed">
{request}
            </pre>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Réponse</p>
            <pre className="bg-black/50 border border-white/10 rounded-lg p-3 text-[11px] overflow-x-auto text-white/75 leading-relaxed">
{response}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ code }: { readonly code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => toast.error('Échec de la copie'),
    );
  };
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={copy}
        className="absolute top-3 right-3 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copier"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
      <pre className="bg-zinc-950 border border-white/10 rounded-xl p-5 text-xs overflow-x-auto text-white/80 leading-relaxed">
{code}
      </pre>
    </div>
  );
}
