'use client';

import { Suspense, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Download, ChevronDown } from 'lucide-react';
import { templates } from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Contract types config ───────────────────────────────────────────────────

const CONTRACT_TYPES = {
  b2c: {
    label: 'B2C — Particulier',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    variables: [
      { key: 'client_prenom', label: 'Prénom client', sample: 'Jean' },
      { key: 'client_nom', label: 'Nom client', sample: 'Dupont' },
      { key: 'client_adresse', label: 'Adresse client', sample: '12 rue de Paris, 75001 Paris' },
      { key: 'client_email', label: 'Email client', sample: 'jean.dupont@email.com' },
      { key: 'client_telephone', label: 'Téléphone', sample: '06 12 34 56 78' },
      { key: 'description_prestation', label: 'Prestation', sample: 'Développement de site web' },
      { key: 'montant_ht', label: 'Montant HT (€)', sample: '2 500,00' },
      { key: 'montant_ttc', label: 'Montant TTC (€)', sample: '3 000,00' },
      { key: 'date_signature', label: 'Date signature', sample: '01/05/2026' },
      { key: 'date_debut', label: 'Date début', sample: '15/05/2026' },
      { key: 'date_fin', label: 'Date fin', sample: '15/07/2026' },
      { key: 'prestataire_nom', label: 'Prestataire', sample: 'Ma Société SAS' },
      { key: 'prestataire_siret', label: 'SIRET prestataire', sample: '123 456 789 00012' },
    ],
  },
  b2b: {
    label: 'B2B — Entreprise',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    variables: [
      { key: 'client_entreprise', label: 'Entreprise', sample: 'Acme Corp SAS' },
      { key: 'client_representant', label: 'Représentant', sample: 'Marie Martin' },
      { key: 'client_siret', label: 'SIRET client', sample: '987 654 321 00012' },
      { key: 'client_tva', label: 'N° TVA client', sample: 'FR12987654321' },
      { key: 'client_adresse', label: 'Adresse client', sample: '5 av. des Champs, 75008 Paris' },
      { key: 'description_prestation', label: 'Prestation', sample: 'Conseil informatique' },
      { key: 'montant_ht', label: 'Montant HT (€)', sample: '10 000,00' },
      { key: 'montant_ttc', label: 'Montant TTC (€)', sample: '12 000,00' },
      { key: 'delai_paiement', label: 'Délai paiement', sample: '30 jours' },
      { key: 'penalites_retard', label: 'Pénalités retard', sample: '3× taux légal' },
      { key: 'date_signature', label: 'Date signature', sample: '01/05/2026' },
      { key: 'prestataire_nom', label: 'Prestataire', sample: 'Ma Société SAS' },
      { key: 'prestataire_siret', label: 'SIRET prestataire', sample: '123 456 789 00012' },
    ],
  },
  web: {
    label: 'Web / E-commerce',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    variables: [
      { key: 'nom_site', label: 'Nom du site', sample: 'MonShop.fr' },
      { key: 'url_site', label: 'URL', sample: 'https://monshop.fr' },
      { key: 'email_contact', label: 'Email contact', sample: 'contact@monshop.fr' },
      { key: 'siret_vendeur', label: 'SIRET vendeur', sample: '123 456 789 00012' },
      { key: 'adresse_vendeur', label: 'Adresse vendeur', sample: '12 rue Commerce, 75001 Paris' },
      { key: 'politique_retour', label: 'Politique retour', sample: '30 jours après réception' },
      { key: 'delai_livraison', label: 'Délai livraison', sample: '3 à 5 jours ouvrés' },
      { key: 'mediateur_nom', label: 'Médiateur', sample: 'CM2C' },
    ],
  },
  aop: {
    label: "Appel d'Offre Public",
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    variables: [
      { key: 'nom_marche', label: 'Nom du marché', sample: 'Fourniture services IT' },
      { key: 'reference_marche', label: 'Référence', sample: 'AO-2026-001' },
      { key: 'pouvoir_adjudicateur', label: 'Pouvoir adjudicateur', sample: 'Commune de Paris' },
      { key: 'montant_ht', label: 'Montant HT (€)', sample: '50 000,00' },
      { key: 'montant_ttc', label: 'Montant TTC (€)', sample: '60 000,00' },
      { key: 'date_remise_offre', label: 'Date remise offre', sample: '30/06/2026' },
      { key: 'duree_marche', label: 'Durée marché', sample: '12 mois' },
      { key: 'criteres_selection', label: 'Critères sélection', sample: 'Prix 40%, Tech 60%' },
      { key: 'prestataire_nom', label: 'Prestataire', sample: 'Ma Société SAS' },
      { key: 'prestataire_siret', label: 'SIRET prestataire', sample: '123 456 789 00012' },
    ],
  },
} as const;

type ContractType = keyof typeof CONTRACT_TYPES;

const DEFAULT_CONTENT: Record<ContractType, string> = {
  b2c: `CONTRAT DE PRESTATION DE SERVICES

Entre :
{{prestataire_nom}}, immatriculé sous le numéro SIRET {{prestataire_siret}}, ci-après désigné « le Prestataire »,

Et :
M./Mme {{client_prenom}} {{client_nom}}, demeurant au {{client_adresse}}, joignable à {{client_email}} — {{client_telephone}}, ci-après désigné « le Client »,

Il a été convenu ce qui suit :

Article 1 — Objet du contrat
Le Prestataire s'engage à réaliser la prestation suivante : {{description_prestation}}.

Article 2 — Durée
La prestation débutera le {{date_debut}} et prendra fin le {{date_fin}}.

Article 3 — Prix et modalités de paiement
Le montant de la prestation est fixé à {{montant_ht}} € HT, soit {{montant_ttc}} € TTC.

Article 4 — Droit de rétractation
Conformément à l'article L.221-18 du Code de la consommation, le Client dispose d'un délai de 14 jours à compter de la signature du présent contrat pour exercer son droit de rétractation.

Article 5 — Loi applicable
Le présent contrat est soumis au droit français. Tout litige sera porté devant les tribunaux compétents.

Fait le {{date_signature}}, en deux exemplaires originaux.


____________________________          ____________________________
Signature du Prestataire               Signature du Client`,

  b2b: `CONTRAT DE PRESTATION DE SERVICES

Entre :
{{prestataire_nom}}, immatriculé sous le numéro SIRET {{prestataire_siret}}, ci-après désigné « le Prestataire »,

Et :
La société {{client_entreprise}}, représentée par {{client_representant}}, immatriculée sous le numéro SIRET {{client_siret}}, N° TVA intracommunautaire : {{client_tva}}, dont le siège social est situé au {{client_adresse}}, ci-après désignée « le Client »,

Il a été convenu ce qui suit :

Article 1 — Objet du contrat
Le Prestataire s'engage à réaliser la prestation suivante : {{description_prestation}}.

Article 2 — Montant et modalités de paiement
Le montant de la prestation est fixé à {{montant_ht}} € HT, soit {{montant_ttc}} € TTC.
Délai de paiement : {{delai_paiement}}.
En cas de retard de paiement, des pénalités de {{penalites_retard}} seront appliquées de plein droit.

Article 3 — Confidentialité
Les parties s'engagent mutuellement à garder confidentielles toutes informations échangées dans le cadre du présent contrat.

Article 4 — Propriété intellectuelle
Les livrables produits dans le cadre de cette prestation seront la propriété du Client après règlement intégral de la facture.

Article 5 — Loi applicable et juridiction
Le présent contrat est soumis au droit français. Tout litige sera soumis aux tribunaux compétents du ressort du siège social du Prestataire.

Fait le {{date_signature}}, en deux exemplaires originaux.


____________________________          ____________________________
Signature du Prestataire               Signature du Client`,

  web: `CONDITIONS GÉNÉRALES DE VENTE (CGV)

Vendeur : {{nom_site}}
Site internet : {{url_site}}
SIRET : {{siret_vendeur}}
Adresse : {{adresse_vendeur}}
Contact : {{email_contact}}

Article 1 — Objet et champ d'application
Les présentes Conditions Générales de Vente s'appliquent à toute commande passée sur le site {{nom_site}}.

Article 2 — Commandes
Toute commande implique l'acceptation pleine et entière des présentes CGV. Le Client reconnaît en avoir pris connaissance avant de valider sa commande.

Article 3 — Prix
Les prix sont indiqués en euros, toutes taxes comprises. {{nom_site}} se réserve le droit de modifier ses prix à tout moment.

Article 4 — Livraison
Les commandes sont expédiées sous {{delai_livraison}} à compter de la validation du paiement.

Article 5 — Droit de rétractation
Conformément à la loi, vous disposez de 14 jours à compter de la réception pour exercer votre droit de rétractation, sans justification.

Article 6 — Retours et remboursements
Politique de retour : {{politique_retour}}.

Article 7 — Médiation
En cas de litige non résolu, vous pouvez recourir gratuitement au médiateur de la consommation : {{mediateur_nom}}.

Article 8 — Protection des données personnelles
Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition concernant vos données personnelles.`,

  aop: `MÉMOIRE TECHNIQUE ET FINANCIER
RÉPONSE À UN APPEL D'OFFRES PUBLIC

Référence du marché : {{reference_marche}}
Objet : {{nom_marche}}
Pouvoir adjudicateur : {{pouvoir_adjudicateur}}
Date limite de remise des offres : {{date_remise_offre}}

─────────────────────────────────────────────

CANDIDAT :
{{prestataire_nom}}
SIRET : {{prestataire_siret}}

─────────────────────────────────────────────

OFFRE FINANCIÈRE :
Montant HT : {{montant_ht}} €
Montant TTC : {{montant_ttc}} €

DURÉE DU MARCHÉ :
{{duree_marche}}

CRITÈRES D'ÉVALUATION :
{{criteres_selection}}

─────────────────────────────────────────────

Je soussigné(e), représentant légal de {{prestataire_nom}}, certifie l'exactitude des informations fournies dans cette offre.

Fait le ________________


____________________________
Signature et cachet`,
};

// ─── Preview renderer ─────────────────────────────────────────────────────────

function renderPreview(text: string, variables: { key: string; sample: string }[]): string {
  const sampleMap: Record<string, string> = {};
  variables.forEach((v) => { sampleMap[v.key] = v.sample; });

  return text
    .split('\n')
    .map((line) => {
      const escapedLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const withVars = escapedLine.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
        const val = sampleMap[key];
        if (val) {
          return `<mark style="background:#fef9c3;color:#713f12;padding:0 2px;border-radius:2px;font-style:normal;">${val}</mark>`;
        }
        return `<span style="background:#fee2e2;color:#991b1b;padding:0 2px;border-radius:2px;">{{${key}}}</span>`;
      });
      if (line.trim() === '') return '<br/>';
      if (line.match(/^Article \d+/)) {
        return `<p style="font-weight:600;margin:12px 0 4px;">${withVars}</p>`;
      }
      if (line.match(/^(CONTRAT|CONDITIONS|MÉMOIRE|OFFRE|CANDIDAT|VENDEUR)/i) && line === line.toUpperCase()) {
        return `<p style="font-weight:700;font-size:15px;text-align:center;margin:8px 0;">${withVars}</p>`;
      }
      if (line.startsWith('─')) {
        return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0;"/>`;
      }
      return `<p style="margin:3px 0;">${withVars}</p>`;
    })
    .join('');
}

// ─── Editor content ───────────────────────────────────────────────────────────

function ContractEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const name = searchParams.get('name') || 'Nouveau contrat';
  const description = searchParams.get('description') || '';

  const [contractType, setContractType] = useState<ContractType>('b2c');
  const [content, setContent] = useState(() => DEFAULT_CONTENT['b2c']);
  const [isSaving, setIsSaving] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typeConfig = CONTRACT_TYPES[contractType];

  const handleTypeChange = useCallback((type: ContractType) => {
    setContractType(type);
    setContent(DEFAULT_CONTENT[type]);
    setShowTypeMenu(false);
  }, []);

  const insertVariable = useCallback((varKey: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const token = `{{${varKey}}}`;
    const newContent = content.substring(0, start) + token + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + token.length;
      textarea.focus();
    }, 0);
  }, [content]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await templates.create({
        name,
        description,
        type: 3,
        content: JSON.stringify({ contractType, body: content }),
      });
      toast.success('Contrat enregistré');
      router.push('/dashboard/templates');
    } catch {
      toast.error("Échec de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const previewHtml = renderPreview(content, typeConfig.variables);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 flex-shrink-0 print:hidden">
        {/* Left */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
            Retour
          </button>
          <div className="w-px h-4 bg-border" />
          {/* Contract type dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTypeMenu((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${typeConfig.color}`}
            >
              {typeConfig.label}
              <ChevronDown size={12} />
            </button>
            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                {(Object.keys(CONTRACT_TYPES) as ContractType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 transition-colors ${contractType === type ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
                  >
                    {CONTRACT_TYPES[type].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center */}
        <span className="text-sm font-medium text-foreground/80 truncate max-w-xs">{name}</span>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Download size={13} />
            Exporter PDF
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Save size={13} />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* ── Variables bar ── */}
      <div className="border-b border-border bg-slate-50 px-4 py-2 flex items-center gap-2 flex-wrap flex-shrink-0 print:hidden">
        <span className="text-[11px] text-muted-foreground font-medium mr-1">Variables :</span>
        {typeConfig.variables.map((v) => (
          <button
            key={v.key}
            onClick={() => insertVariable(v.key)}
            title={`Insérer {{${v.key}}}`}
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono bg-white border border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-100 transition-colors"
          >
            {`{{${v.key}}}`}
          </button>
        ))}
      </div>

      {/* ── Split editor / preview ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — textarea */}
        <div className="w-1/2 flex flex-col border-r border-border print:hidden">
          <div className="px-4 py-2 border-b border-border bg-slate-50 flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Éditeur</span>
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="flex-1 p-5 font-mono text-sm leading-relaxed resize-none outline-none bg-white text-slate-800"
            placeholder="Rédigez votre contrat ici... Utilisez {{variable}} pour insérer des variables."
          />
        </div>

        {/* Right — A4 preview */}
        <div className="w-1/2 overflow-y-auto bg-slate-100 p-6 print:w-full print:p-0 print:bg-white print:overflow-visible">
          <div className="flex items-center justify-between mb-4 print:hidden">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Aperçu — valeurs d&apos;exemple en <mark className="bg-yellow-100 text-yellow-800 px-1 rounded">jaune</mark>
            </span>
          </div>

          {/* A4 sheet */}
          <div
            className="bg-white shadow-sm mx-auto print:shadow-none print:mx-0"
            style={{ width: '210mm', minHeight: '297mm', padding: '25mm 20mm', fontFamily: 'Georgia, serif', fontSize: '11pt', lineHeight: '1.6', color: '#1a1a1a' }}
          >
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:w-full { width: 100% !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:mx-0 { margin-left: 0 !important; margin-right: 0 !important; }
          .print\\:overflow-visible { overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}

export default function ContractEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ContractEditorContent />
    </Suspense>
  );
}
