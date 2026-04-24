'use client';

import { Suspense, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Save, Download, Plus, Trash2, ChevronDown, ChevronUp,
  Type, AlignLeft, Users, PenLine, Minus, Copy,
  Table, CheckSquare, CreditCard, FileText, LayoutList, AlignCenter,
  Building2, Calculator,
} from 'lucide-react';
import { templates } from '@/lib/api';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType =
  | 'contract_header'
  | 'pricing_ttc'
  | 'heading'
  | 'article'
  | 'legal_article'
  | 'clause'
  | 'parties'
  | 'form_fields'
  | 'checkbox_group'
  | 'pricing_table'
  | 'signature_block'
  | 'sepa_mandate'
  | 'retraction_form'
  | 'info_box'
  | 'divider';

type ContractType = keyof typeof CONTRACT_TYPES;
type LeftTab = 'blocs' | 'library' | 'variables';

interface ContractBlock {
  id: string;
  type: BlockType;
  content: string;
}

// ─── Contract types ───────────────────────────────────────────────────────────

const CONTRACT_TYPES = {
  b2c: {
    label: 'B2C — Particulier',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    variables: [
      { key: 'client_prenom', sample: 'Jean' },
      { key: 'client_nom', sample: 'Dupont' },
      { key: 'client_adresse', sample: '12 rue de Paris' },
      { key: 'client_code_postal', sample: '75001' },
      { key: 'client_ville', sample: 'Paris' },
      { key: 'client_email', sample: 'jean.dupont@email.com' },
      { key: 'client_telephone', sample: '06 12 34 56 78' },
      { key: 'description_prestation', sample: 'Développement de site web' },
      { key: 'montant_ht', sample: '2 500,00' },
      { key: 'montant_tva', sample: '500,00' },
      { key: 'montant_ttc', sample: '3 000,00' },
      { key: 'date_signature', sample: '01/05/2026' },
      { key: 'date_debut', sample: '15/05/2026' },
      { key: 'date_fin', sample: '15/07/2026' },
      { key: 'prestataire_nom', sample: 'Ma Société SAS' },
      { key: 'prestataire_siret', sample: '123 456 789 00012' },
      { key: 'prestataire_adresse', sample: '14 av. Louison Bobet, 94120 Fontenay-sous-Bois' },
      { key: 'prestataire_tva', sample: 'FR00123456789' },
      { key: 'nom_conseiller', sample: 'Pierre Dupont' },
      { key: 'version_contrat', sample: 'v1.0 – 01/05/2026' },
      { key: 'numero_contrat', sample: 'CTR-2026-001' },
    ],
  },
  b2b: {
    label: 'B2B — Entreprise',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    variables: [
      { key: 'client_entreprise', sample: 'Acme Corp SAS' },
      { key: 'client_representant', sample: 'Marie Martin' },
      { key: 'client_siret', sample: '987 654 321 00012' },
      { key: 'client_tva', sample: 'FR12987654321' },
      { key: 'client_adresse', sample: '5 av. des Champs, 75008 Paris' },
      { key: 'description_prestation', sample: 'Conseil informatique' },
      { key: 'montant_ht', sample: '10 000,00' },
      { key: 'montant_ttc', sample: '12 000,00' },
      { key: 'delai_paiement', sample: '30 jours' },
      { key: 'penalites_retard', sample: '3× taux légal' },
      { key: 'date_signature', sample: '01/05/2026' },
      { key: 'prestataire_nom', sample: 'Ma Société SAS' },
      { key: 'prestataire_siret', sample: '123 456 789 00012' },
      { key: 'version_contrat', sample: 'v2.0 – 01/05/2026' },
    ],
  },
  web: {
    label: 'Web / E-commerce',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    variables: [
      { key: 'nom_site', sample: 'MonShop.fr' },
      { key: 'url_site', sample: 'https://monshop.fr' },
      { key: 'email_contact', sample: 'contact@monshop.fr' },
      { key: 'siret_vendeur', sample: '123 456 789 00012' },
      { key: 'adresse_vendeur', sample: '14 av. Louison Bobet, 94120 Fontenay-sous-Bois' },
      { key: 'politique_retour', sample: '30 jours après réception' },
      { key: 'delai_livraison', sample: '3 à 5 jours ouvrés' },
      { key: 'mediateur_nom', sample: 'CM2C' },
      { key: 'version_contrat', sample: 'v1.0 – 01/05/2026' },
    ],
  },
  aop: {
    label: "Appel d'Offre Public",
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    variables: [
      { key: 'nom_marche', sample: 'Fourniture services IT' },
      { key: 'reference_marche', sample: 'AO-2026-001' },
      { key: 'pouvoir_adjudicateur', sample: 'Commune de Paris' },
      { key: 'montant_ht', sample: '50 000,00' },
      { key: 'montant_ttc', sample: '60 000,00' },
      { key: 'date_remise_offre', sample: '30/06/2026' },
      { key: 'duree_marche', sample: '12 mois' },
      { key: 'prestataire_nom', sample: 'Ma Société SAS' },
      { key: 'prestataire_siret', sample: '123 456 789 00012' },
      { key: 'version_contrat', sample: 'v1.0 – 30/06/2026' },
    ],
  },
} as const;

// ─── Block config ─────────────────────────────────────────────────────────────

const BLOCK_CONFIG: Record<BlockType, { label: string; icon: React.ElementType; placeholder: string; color: string }> = {
  contract_header:  { label: 'En-tête contrat',  icon: Building2,    placeholder: 'entreprise: {{prestataire_nom}}\nadresse: {{prestataire_adresse}}\nsiret: {{prestataire_siret}}\ntva: {{prestataire_tva}}\ntitre: CONTRAT DE PRESTATION DE SERVICES\nnumero: {{numero_contrat}}\nversion: {{version_contrat}}', color: 'bg-slate-900 text-white' },
  pricing_ttc:      { label: 'Prix HT/TVA/TTC',  icon: Calculator,   placeholder: 'description: {{description_prestation}}\nmontant_ht: {{montant_ht}}\ntva_rate: 20\nmontant_tva: {{montant_tva}}\nmontant_ttc: {{montant_ttc}}', color: 'bg-emerald-50 text-emerald-800' },
  heading:          { label: 'Titre doc',        icon: Type,         placeholder: 'Titre principal du document...', color: 'bg-slate-100 text-slate-700' },
  article:          { label: 'Article',           icon: AlignCenter,  placeholder: 'Article X — Intitulé...', color: 'bg-indigo-50 text-indigo-700' },
  legal_article:    { label: 'Article légal',     icon: LayoutList,   placeholder: 'X.X Titre du sous-article\n\nContenu légal...', color: 'bg-blue-50 text-blue-700' },
  clause:           { label: 'Clause',            icon: AlignLeft,    placeholder: 'Rédigez la clause ici...', color: 'bg-sky-50 text-sky-700' },
  parties:          { label: 'Parties',           icon: Users,        placeholder: 'Identification des parties...', color: 'bg-amber-50 text-amber-700' },
  form_fields:      { label: 'Formulaire',        icon: FileText,     placeholder: 'Nom: ___\nPrénom: ___\nAdresse: ___\nCode postal: ___  Ville: ___\nE-mail: ___\nTél: ___', color: 'bg-orange-50 text-orange-700' },
  checkbox_group:   { label: 'Cases à cocher',    icon: CheckSquare,  placeholder: '☐ Option 1 – Description\n☐ Option 2 – Description\n☐ Option 3 – Description', color: 'bg-green-50 text-green-700' },
  pricing_table:    { label: 'Tableau tarifs',    icon: Table,        placeholder: 'Formule|Prix TTC/mois|Inclus\n10 Go|9,90€|Voix/SMS/MMS illimités\n50 Go|14,90€|Voix/SMS/MMS illimités', color: 'bg-teal-50 text-teal-700' },
  signature_block:  { label: 'Signatures',        icon: PenLine,      placeholder: 'Fait à {{client_ville}}, le {{date_signature}}', color: 'bg-emerald-50 text-emerald-700' },
  sepa_mandate:     { label: 'Mandat SEPA',       icon: CreditCard,   placeholder: 'Nom créancier: {{prestataire_nom}}\nICS: ___\nAdresse: {{prestataire_adresse}}', color: 'bg-violet-50 text-violet-700' },
  retraction_form:  { label: 'Rétractation',      icon: FileText,     placeholder: 'Je soussigné(e), {{client_prenom}} {{client_nom}}, déclare renoncer...', color: 'bg-red-50 text-red-700' },
  info_box:         { label: 'Encadré info',      icon: FileText,     placeholder: 'Information importante à mettre en évidence...', color: 'bg-yellow-50 text-yellow-700' },
  divider:          { label: 'Séparateur',        icon: Minus,        placeholder: '', color: 'bg-slate-50 text-slate-400' },
};

// ─── Clause library ───────────────────────────────────────────────────────────

const CLAUSE_LIBRARY = [
  {
    category: 'Identification & Préambule',
    clauses: [
      {
        label: 'En-tête professionnel',
        type: 'contract_header' as BlockType,
        content: 'entreprise: {{prestataire_nom}}\nadresse: {{prestataire_adresse}}\nsiret: {{prestataire_siret}}\ntva: {{prestataire_tva}}\ntitre: CONTRAT DE PRESTATION DE SERVICES\nnumero: {{numero_contrat}}\nversion: {{version_contrat}}',
      },
      {
        label: 'Parties B2C',
        type: 'parties' as BlockType,
        content: '{{prestataire_nom}}, SAS au capital de ___ €, dont le siège social est situé {{prestataire_adresse}}, immatriculée au RCS sous le N° {{prestataire_siret}}, N° TVA intracommunautaire {{prestataire_tva}}, ci-après désignée « le Prestataire »,\n\nEt :\n\nM./Mme {{client_prenom}} {{client_nom}}, demeurant au {{client_adresse}}, {{client_code_postal}} {{client_ville}}, joignable à {{client_email}} / {{client_telephone}}, ci-après désigné(e) « le Client ».',
      },
      {
        label: 'Parties B2B',
        type: 'parties' as BlockType,
        content: '{{prestataire_nom}}, immatriculée au RCS sous le N° {{prestataire_siret}}, N° TVA {{prestataire_tva}}, dont le siège social est situé {{prestataire_adresse}}, ci-après désignée « le Prestataire »,\n\nEt :\n\nLa société {{client_entreprise}}, représentée par {{client_representant}}, SIRET {{client_siret}}, N° TVA : {{client_tva}}, dont le siège est situé au {{client_adresse}}, ci-après désignée « le Client ».',
      },
    ],
  },
  {
    category: 'Articles légaux',
    clauses: [
      {
        label: 'Article — Objet',
        type: 'legal_article' as BlockType,
        content: '1. OBJET\n\n1.1 Les présentes conditions générales ont pour objet de définir les conditions de souscription, d\'exécution, de suspension et de résiliation de la prestation.\n\n1.2 La souscription à la prestation implique l\'acceptation pleine, entière et sans réserve des présentes conditions.',
      },
      {
        label: 'Article — Durée',
        type: 'legal_article' as BlockType,
        content: '2. DURÉE\n\n2.1 Le contrat est conclu pour une durée de ___. Il prend effet à la date de signature par les deux parties.\n\n2.2 À l\'issue de cette période, le contrat pourra être renouvelé par accord mutuel des parties.',
      },
      {
        label: 'Article — Prix & Paiement',
        type: 'legal_article' as BlockType,
        content: '3. PRIX ET MODALITÉS DE PAIEMENT\n\n3.1 Le montant de la prestation est fixé à {{montant_ht}} € HT, soit {{montant_tva}} € de TVA (20%), pour un total de {{montant_ttc}} € TTC.\n\n3.2 Le règlement s\'effectue par prélèvement automatique mensuel.\n\n3.3 En cas de retard de paiement, des pénalités de {{penalites_retard}} seront appliquées de plein droit, sans mise en demeure préalable.',
      },
      {
        label: 'Article — Droit rétractation (B2C)',
        type: 'legal_article' as BlockType,
        content: '4. DROIT DE RÉTRACTATION\n\n4.1 Conformément à l\'article L.221-18 du Code de la consommation, le Client dispose d\'un délai de 14 jours calendaires à compter de la signature du présent contrat pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.\n\n4.2 Pour exercer ce droit, le Client doit adresser sa demande par lettre recommandée avec accusé de réception.',
      },
      {
        label: 'Article — Confidentialité',
        type: 'legal_article' as BlockType,
        content: '5. CONFIDENTIALITÉ\n\n5.1 Les parties s\'engagent mutuellement à garder confidentielles toutes informations échangées dans le cadre du présent contrat, pendant sa durée et pour une période de 2 ans après son expiration.\n\n5.2 Cette obligation de confidentialité ne s\'applique pas aux informations déjà publiques ou dont la divulgation est imposée par la loi.',
      },
      {
        label: 'Article — Propriété intellectuelle',
        type: 'legal_article' as BlockType,
        content: '6. PROPRIÉTÉ INTELLECTUELLE\n\n6.1 Les livrables produits dans le cadre de cette prestation seront la propriété exclusive du Client après règlement intégral des sommes dues.\n\n6.2 Le Prestataire conserve le droit de mentionner cette réalisation dans ses références commerciales, sauf accord contraire.',
      },
      {
        label: 'Article — Résiliation',
        type: 'legal_article' as BlockType,
        content: '7. RÉSILIATION\n\n7.1 Chaque partie peut résilier le présent contrat en cas de manquement grave de l\'autre partie à ses obligations, après mise en demeure restée sans effet pendant 15 jours.\n\n7.2 En cas de résiliation anticipée sans motif légitime, des frais de clôture administrative de ___ € TTC seront facturés.',
      },
      {
        label: 'Article — Force majeure',
        type: 'legal_article' as BlockType,
        content: '8. FORCE MAJEURE\n\nAucune Partie ne saurait être tenue responsable en cas d\'inexécution due à un événement de force majeure au sens de l\'article 1218 du Code civil (catastrophes naturelles, grèves, etc.). Les obligations sont suspendues pendant la durée de l\'événement.',
      },
      {
        label: 'Article — Loi applicable',
        type: 'legal_article' as BlockType,
        content: '9. LOI APPLICABLE ET JURIDICTION\n\nLe présent contrat est soumis au droit français. En cas de litige non résolu amiablement, compétence expresse est attribuée aux tribunaux du ressort du siège social du Prestataire. Pour les consommateurs, compétence est attribuée aux tribunaux du domicile du Client.',
      },
      {
        label: 'Article — Données personnelles',
        type: 'legal_article' as BlockType,
        content: '10. DONNÉES PERSONNELLES (RGPD)\n\n10.1 Les données personnelles collectées dans le cadre de ce contrat font l\'objet d\'un traitement dont le responsable est {{prestataire_nom}}.\n\n10.2 Conformément au RGPD, le Client dispose d\'un droit d\'accès, de rectification, de suppression et d\'opposition. Toute demande peut être adressée à : {{email_contact}}.',
      },
    ],
  },
  {
    category: 'Formulaires & Inscription',
    clauses: [
      {
        label: 'Formulaire client B2C',
        type: 'form_fields' as BlockType,
        content: 'COORDONNÉES DU CLIENT\n\nCivilité: ☐ M.  ☐ Mme\nNom: _____________________________ Prénom: _____________________________\nAdresse: _________________________________________________________________\nCode postal: _____________ Ville: _____________________________________________\nE-mail: ____________________________ Tél mobile: ______________________________\nPréférence de contact: ☐ Mail  ☐ Courrier',
      },
      {
        label: 'Formulaire client entreprise',
        type: 'form_fields' as BlockType,
        content: 'COORDONNÉES DE L\'ENTREPRISE\n\nRaison sociale: ______________________________________________________________\nReprésentant légal: ___________________________________________________________\nSIRET: _________________________________ N° TVA: ____________________________\nAdresse siège: _______________________________________________________________\nCode postal: _____________ Ville: _____________________________________________\nE-mail: ____________________________ Tél: _____________________________________',
      },
      {
        label: 'Conservation du numéro',
        type: 'form_fields' as BlockType,
        content: 'CONSERVATION DU NUMÉRO\n\nJe souhaite conserver mon numéro actuel: ☐ Oui  ☐ Non\n\nN° du RIO: _________________________ N° GSM porté: __________________________\nDate d\'engagement (si engagé): ________________________________________________',
      },
    ],
  },
  {
    category: 'Choix & Tarifs',
    clauses: [
      {
        label: 'Choix de forfait (cases)',
        type: 'checkbox_group' as BlockType,
        content: 'CHOIX DU FORFAIT\n\n☐ Formule 10 Go – 9,90 € TTC/mois\n☐ Formule 50 Go – 14,90 € TTC/mois\n☐ Formule 100 Go – 19,90 € TTC/mois\n☐ Formule 150 Go – 24,90 € TTC/mois\n☐ Formule 200 Go – 29,90 € TTC/mois',
      },
      {
        label: 'Mode de paiement',
        type: 'checkbox_group' as BlockType,
        content: 'MODE DE PAIEMENT\n\n☐ Prélèvement automatique (SEPA)\n☐ Virement bancaire\n☐ Chèque (règlement annuel uniquement)\n\nPériodicité: ☐ Mensuelle  ☐ Trimestrielle  ☐ Semestrielle  ☐ Annuelle',
      },
      {
        label: 'Tableau de tarifs',
        type: 'pricing_table' as BlockType,
        content: 'Formule|Données|Prix TTC/mois|Inclus\n10 Go|10 Go|9,90 €|Voix + SMS + MMS illimités\n50 Go|50 Go|14,90 €|Voix + SMS + MMS illimités\n100 Go|100 Go|19,90 €|Voix + SMS + MMS illimités\n150 Go|150 Go|24,90 €|Voix + SMS + MMS illimités\n200 Go|200 Go|29,90 €|Voix + SMS + MMS illimités',
      },
    ],
  },
  {
    category: 'Prix & Facturation',
    clauses: [
      {
        label: 'Bloc prix HT/TVA/TTC',
        type: 'pricing_ttc' as BlockType,
        content: 'description: {{description_prestation}}\nmontant_ht: {{montant_ht}}\ntva_rate: 20\nmontant_tva: {{montant_tva}}\nmontant_ttc: {{montant_ttc}}',
      },
      {
        label: 'Prix TVA 10%',
        type: 'pricing_ttc' as BlockType,
        content: 'description: {{description_prestation}}\nmontant_ht: {{montant_ht}}\ntva_rate: 10\nmontant_tva: {{montant_tva}}\nmontant_ttc: {{montant_ttc}}',
      },
      {
        label: 'Prix TVA 0% (exonéré)',
        type: 'pricing_ttc' as BlockType,
        content: 'description: {{description_prestation}}\nmontant_ht: {{montant_ht}}\ntva_rate: 0\nmontant_tva: 0,00\nmontant_ttc: {{montant_ht}}',
      },
    ],
  },
  {
    category: 'Paiement & SEPA',
    clauses: [
      {
        label: 'Mandat SEPA complet',
        type: 'sepa_mandate' as BlockType,
        content: 'Nom créancier: {{prestataire_nom}}\nICS (Identifiant Créancier SEPA): ___________________\nAdresse créancier: {{prestataire_adresse}}',
      },
      {
        label: 'Encadré sans engagement',
        type: 'info_box' as BlockType,
        content: 'SANS ENGAGEMENT — PRIX GARANTI SANS AUGMENTATION\nConformément aux dispositions légales, aucun moyen de paiement ne pourra être prélevé avant l\'expiration du délai de 7 jours à compter de la signature de la commande, conformément à l\'article L-121-18-2 du Code de la Consommation.',
      },
    ],
  },
  {
    category: 'Signatures & Rétractation',
    clauses: [
      {
        label: 'Bloc signatures complet',
        type: 'signature_block' as BlockType,
        content: 'Fait à {{client_ville}}, le {{date_signature}}',
      },
      {
        label: 'Formulaire de rétractation',
        type: 'retraction_form' as BlockType,
        content: 'Je soussigné(e), déclare renoncer à l\'offre {{prestataire_nom}}, formulaire à renvoyer au plus tard 14 jours calendaires révolus après la date de conclusion du contrat par lettre recommandée avec accusé de réception à : {{prestataire_nom}} — Service Rétractation — {{prestataire_adresse}}',
      },
      {
        label: 'Mentions légales pied de page',
        type: 'info_box' as BlockType,
        content: '{{prestataire_nom}} – SIRET {{prestataire_siret}} – N° TVA {{prestataire_tva}} – {{prestataire_adresse}}\nSociété régie par le droit français – RC Créteil – Service client : {{client_email}}',
      },
    ],
  },
];

// ─── Preview renderer ─────────────────────────────────────────────────────────

function applyVars(text: string, variables: { key: string; sample: string }[]): string {
  const map: Record<string, string> = {};
  variables.forEach((v) => { map[v.key] = v.sample; });
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return escaped.replaceAll(/\{\{(\w+)\}\}/g, (_m, key) => {
    const val = map[key];
    return val
      ? `<mark style="background:#fef9c3;color:#713f12;padding:0 2px;border-radius:2px;font-style:normal;">${val}</mark>`
      : `<span style="background:#fee2e2;color:#991b1b;padding:0 2px;border-radius:2px;font-size:9pt;">{{${key}}}</span>`;
  });
}

function renderBlockHTML(block: ContractBlock, variables: { key: string; sample: string }[], isSelected: boolean): string {
  const sel = isSelected ? 'outline:2px solid #6366f1;outline-offset:3px;border-radius:2px;' : '';
  const v = (text: string) => applyVars(text, variables);

  switch (block.type) {
    case 'contract_header': {
      const lines = block.content.split('\n');
      const fields: Record<string, string> = {};
      lines.forEach((l) => {
        const idx = l.indexOf(':');
        if (idx > 0) fields[l.substring(0, idx).trim()] = l.substring(idx + 1).trim();
      });
      const logo       = fields['logo'] || '';
      const entreprise = v(fields['entreprise'] || '');
      const adresse    = v(fields['adresse'] || '');
      const siret      = v(fields['siret'] || '');
      const tva        = v(fields['tva'] || '');
      const titre      = v(fields['titre'] || 'CONTRAT');
      const numero     = v(fields['numero'] || '');
      const version    = v(fields['version'] || '');
      const logoHtml   = logo
        ? `<img src="${logo}" alt="Logo" style="max-height:60px;max-width:180px;object-fit:contain;display:block;"/>`
        : `<div style="width:120px;height:50px;border:1.5px dashed #cbd5e1;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:8pt;">Logo</div>`;
      return `<div style="${sel}margin:0 0 24px;border-bottom:3px solid #0f172a;padding-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="display:flex;align-items:center;gap:14px;">
            ${logoHtml}
            <div>
              <div style="font-size:14pt;font-weight:900;color:#0f172a;letter-spacing:-0.5px;">${entreprise}</div>
              <div style="font-size:9pt;color:#475569;margin-top:2px;">${adresse}</div>
              <div style="font-size:8.5pt;color:#94a3b8;margin-top:1px;">SIRET ${siret} &nbsp;|&nbsp; TVA ${tva}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:8.5pt;font-weight:700;color:#0f172a;background:#f1f5f9;padding:4px 10px;border-radius:4px;margin-bottom:4px;">N° ${numero}</div>
            <div style="font-size:8pt;color:#94a3b8;">${version}</div>
          </div>
        </div>
        <div style="text-align:center;margin-top:14px;font-size:14pt;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#0f172a;">${titre}</div>
      </div>`;
    }

    case 'pricing_ttc': {
      const lines = block.content.split('\n');
      const fields: Record<string, string> = {};
      lines.forEach((l) => {
        const idx = l.indexOf(':');
        if (idx > 0) fields[l.substring(0, idx).trim()] = l.substring(idx + 1).trim();
      });
      const desc    = v(fields['description'] || '');
      const ht      = v(fields['montant_ht'] || '0');
      const rate    = fields['tva_rate'] || '20';
      const tvaAmt  = v(fields['montant_tva'] || '0');
      const ttc     = v(fields['montant_ttc'] || '0');
      return `<div style="${sel}margin:14px 0;border:1px solid #d1fae5;border-radius:6px;overflow:hidden;">
        <div style="background:#059669;color:white;padding:7px 14px;font-size:9pt;font-weight:700;letter-spacing:0.3px;">RÉCAPITULATIF FINANCIER</div>
        <div style="padding:12px 14px;background:#f0fdf4;">
          ${desc ? `<div style="font-size:9.5pt;color:#065f46;margin-bottom:10px;font-weight:500;">Prestation : ${desc}</div>` : ''}
          <table style="width:100%;border-collapse:collapse;font-size:10pt;">
            <tr style="border-bottom:1px solid #d1fae5;">
              <td style="padding:5px 0;color:#475569;">Montant HT</td>
              <td style="padding:5px 0;text-align:right;font-weight:500;">${ht} €</td>
            </tr>
            <tr style="border-bottom:1px solid #d1fae5;">
              <td style="padding:5px 0;color:#475569;">TVA (${rate}%)</td>
              <td style="padding:5px 0;text-align:right;font-weight:500;">${tvaAmt} €</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:11pt;font-weight:800;color:#0f172a;">Total TTC</td>
              <td style="padding:8px 0;text-align:right;font-size:11pt;font-weight:800;color:#059669;">${ttc} €</td>
            </tr>
          </table>
          <div style="margin-top:8px;font-size:8pt;color:#94a3b8;font-style:italic;">Prix TTC (Toutes Taxes Comprises) — TVA ${rate}% incluse — Conformément à l'article 289 du CGI</div>
        </div>
      </div>`;
    }

    case 'heading':
      return `<div style="${sel}text-align:center;margin:0 0 20px;">
        <div style="font-size:15pt;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#0f172a;">${v(block.content).replaceAll('\n', '<br/>')}</div>
      </div>`;

    case 'article':
      return `<div style="${sel}font-size:11pt;font-weight:700;margin:18px 0 6px;color:#0f172a;">${v(block.content).replaceAll('\n', '<br/>')}</div>`;

    case 'legal_article': {
      const lines = v(block.content).split('\n');
      const firstLine = lines[0] || '';
      const rest = lines.slice(1).join('<br/>');
      const isTitle = /^\d+\./.test(block.content.trim());
      return `<div style="${sel}margin:14px 0 10px;">
        ${isTitle ? `<div style="font-size:11pt;font-weight:700;color:#0f172a;margin-bottom:6px;">${firstLine}</div>` : `<div>${firstLine}</div>`}
        ${rest ? `<div style="font-size:10pt;line-height:1.75;color:#1e293b;text-align:justify;">${rest}</div>` : ''}
      </div>`;
    }

    case 'clause':
      return `<div style="${sel}font-size:10pt;line-height:1.75;margin:0 0 10px;text-align:justify;color:#1e293b;">${v(block.content).replaceAll('\n', '<br/>')}</div>`;

    case 'parties':
      return `<div style="${sel}font-size:10pt;line-height:1.75;margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-left:3px solid #0f172a;border-radius:0 4px 4px 0;">${v(block.content).replaceAll('\n', '<br/>')}</div>`;

    case 'form_fields': {
      const lines = v(block.content).split('\n');
      const title = lines[0];
      const fields = lines.slice(1).filter(Boolean);
      return `<div style="${sel}margin:12px 0;padding:14px;border:1px solid #cbd5e1;border-radius:6px;">
        ${title ? `<div style="font-size:10pt;font-weight:700;color:#0f172a;margin-bottom:10px;text-transform:uppercase;font-size:9pt;letter-spacing:0.5px;">${title}</div>` : ''}
        ${fields.map((f) => `<div style="font-size:10pt;line-height:2.2;border-bottom:1px solid #e2e8f0;margin-bottom:4px;">${f.replaceAll('___', '<span style="display:inline-block;min-width:120px;border-bottom:1px solid #94a3b8;"> </span>')}</div>`).join('')}
      </div>`;
    }

    case 'checkbox_group': {
      const lines = v(block.content).split('\n');
      const title = lines[0];
      const items = lines.slice(1).filter(Boolean);
      return `<div style="${sel}margin:12px 0;padding:12px;border:1px solid #e2e8f0;border-radius:6px;">
        ${title ? `<div style="font-size:10pt;font-weight:700;color:#0f172a;margin-bottom:8px;text-transform:uppercase;font-size:9pt;letter-spacing:0.5px;">${title}</div>` : ''}
        ${items.map((item) => `<div style="font-size:10pt;line-height:1.9;">${item.replaceAll('☐', '<span style="display:inline-block;width:12px;height:12px;border:1px solid #475569;vertical-align:middle;margin-right:4px;"></span>')}</div>`).join('')}
      </div>`;
    }

    case 'pricing_table': {
      const lines = block.content.split('\n').filter(Boolean);
      if (lines.length < 2) return `<div style="${sel}font-size:10pt;color:#94a3b8;font-style:italic;">[Tableau vide]</div>`;
      const headers = lines[0].split('|');
      const rows = lines.slice(1);
      return `<div style="${sel}margin:12px 0;overflow:hidden;border-radius:6px;border:1px solid #e2e8f0;">
        <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
          <thead>
            <tr style="background:#0f172a;color:white;">
              ${headers.map((h) => `<th style="padding:7px 10px;text-align:left;font-weight:600;">${h.trim()}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, i) => `<tr style="background:${i % 2 === 0 ? '#f8fafc' : 'white'};">
              ${row.split('|').map((cell) => `<td style="padding:7px 10px;border-top:1px solid #e2e8f0;">${applyVars(cell.trim(), variables)}</td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }

    case 'signature_block':
      return `<div style="${sel}margin-top:28px;">
        <div style="font-size:10pt;color:#475569;margin-bottom:20px;">${v(block.content).replaceAll('\n', '<br/>')}</div>
        <div style="display:flex;justify-content:space-between;gap:20px;margin-top:16px;">
          <div style="flex:1;text-align:center;">
            <div style="height:50px;border-bottom:1px solid #1e293b;margin-bottom:6px;"></div>
            <div style="font-size:8.5pt;color:#475569;">Signature du Prestataire</div>
            <div style="font-size:8pt;color:#94a3b8;margin-top:2px;">Nom : ________________</div>
          </div>
          <div style="flex:1;text-align:center;">
            <div style="height:50px;border-bottom:1px solid #1e293b;margin-bottom:6px;"></div>
            <div style="font-size:8.5pt;color:#475569;">Signature du Client</div>
            <div style="font-size:8pt;color:#94a3b8;margin-top:2px;">Nom : ________________</div>
          </div>
          <div style="flex:1;text-align:center;">
            <div style="height:50px;border-bottom:1px solid #1e293b;margin-bottom:6px;"></div>
            <div style="font-size:8.5pt;color:#475569;">Nom du Conseiller</div>
            <div style="font-size:8pt;color:#94a3b8;margin-top:2px;">Cachet : ________________</div>
          </div>
        </div>
      </div>`;

    case 'sepa_mandate': {
      const lines = v(block.content).split('\n');
      const fields: Record<string, string> = {};
      lines.forEach((l) => {
        const [k, ...v2] = l.split(':');
        if (k) fields[k.trim()] = v2.join(':').trim();
      });
      return `<div style="${sel}margin:14px 0;border:2px solid #0f172a;border-radius:4px;overflow:hidden;">
        <div style="background:#0f172a;color:white;text-align:center;padding:8px;font-size:11pt;font-weight:700;letter-spacing:0.5px;">MANDAT DE PRÉLÈVEMENT SEPA</div>
        <div style="padding:12px;font-size:9.5pt;">
          <p style="margin:0 0 8px;color:#475569;font-size:9pt;">En signant ce formulaire, vous autorisez <strong>${fields['Nom créancier'] || '___'}</strong> à envoyer des instructions à votre banque pour débiter votre compte.</p>
          <div style="display:flex;gap:16px;margin-bottom:8px;">
            <div style="flex:1;"><span style="font-weight:600;">Créancier :</span> ${fields['Nom créancier'] || '___'}</div>
            <div style="flex:1;"><span style="font-weight:600;">ICS :</span> ${fields['ICS (Identifiant Créancier SEPA)'] || '___'}</div>
          </div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;">Adresse :</span> ${fields['Adresse créancier'] || '___'}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
            <div style="border:1px solid #cbd5e1;padding:8px;border-radius:4px;">
              <div style="font-size:8.5pt;font-weight:600;color:#475569;margin-bottom:4px;">IBAN</div>
              <div style="letter-spacing:2px;color:#94a3b8;">__ __ __ __ __ __ __ __ __ __ __ __ __ __ __</div>
            </div>
            <div style="border:1px solid #cbd5e1;padding:8px;border-radius:4px;">
              <div style="font-size:8.5pt;font-weight:600;color:#475569;margin-bottom:4px;">BIC</div>
              <div style="letter-spacing:2px;color:#94a3b8;">__ __ __ __ __ __ __ __ __</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0;">
            <div style="font-size:9pt;"><span style="font-weight:600;">Type :</span> Récurrent / répétitif</div>
            <div style="font-size:9pt;border-top:1px solid #1e293b;width:140px;text-align:center;padding-top:4px;">Signature</div>
          </div>
        </div>
      </div>`;
    }

    case 'retraction_form':
      return `<div style="${sel}margin:14px 0;border:1px solid #e2e8f0;border-radius:4px;padding:14px;background:#fafafa;">
        <div style="font-size:9pt;font-weight:700;text-align:center;margin-bottom:8px;color:#0f172a;">FORMULAIRE DE RÉTRACTATION</div>
        <div style="font-size:9pt;line-height:1.7;color:#475569;margin-bottom:10px;">${v(block.content).replaceAll('\n', '<br/>')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:9pt;">
          <div>Nom du Client : <span style="border-bottom:1px solid #475569;display:inline-block;width:120px;"> </span></div>
          <div>Prénom : <span style="border-bottom:1px solid #475569;display:inline-block;width:120px;"> </span></div>
          <div>Adresse : <span style="border-bottom:1px solid #475569;display:inline-block;width:120px;"> </span></div>
          <div>Ville : <span style="border-bottom:1px solid #475569;display:inline-block;width:120px;"> </span></div>
          <div>Code contrat : <span style="border-bottom:1px solid #475569;display:inline-block;width:80px;"> </span></div>
          <div style="text-align:right;border-top:1px solid #1e293b;padding-top:4px;margin-top:12px;">Signature du client</div>
        </div>
      </div>`;

    case 'info_box':
      return `<div style="${sel}margin:12px 0;padding:12px 16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:4px;font-size:9.5pt;line-height:1.65;color:#1e293b;">${v(block.content).replaceAll('\n', '<br/>')}</div>`;

    case 'divider':
      return `<hr style="${sel}border:none;border-top:1px solid #e2e8f0;margin:18px 0;"/>`;

    default:
      return '';
  }
}

// ─── Block editor row ─────────────────────────────────────────────────────────

function BlockRow({
  block, isSelected, isFirst, isLast,
  onSelect, onChange, onDelete, onMoveUp, onMoveDown, onDuplicate,
  variables, onInsertVariable,
}: {
  block: ContractBlock; isSelected: boolean; isFirst: boolean; isLast: boolean;
  onSelect: () => void; onChange: (content: string) => void;
  onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void; onDuplicate: () => void;
  variables: { key: string; sample: string }[];
  onInsertVariable: (key: string, ref: React.RefObject<HTMLTextAreaElement | null>) => void;
}) {
  const cfg = BLOCK_CONFIG[block.type];
  const Icon = cfg.icon;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div
      className={`border rounded-xl transition-all ${isSelected ? 'border-indigo-400 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between px-3 py-2 cursor-pointer">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${cfg.color}`}>
            <Icon size={10} />
            {cfg.label}
          </span>
          {block.content && block.type !== 'divider' && (
            <span className="text-[11px] text-slate-400 truncate max-w-40">
              {block.content.replaceAll(/\{\{[\w]+\}\}/g, '…').substring(0, 45)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={onMoveUp} disabled={isFirst} className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-20 transition-colors"><ChevronUp size={12} /></button>
          <button onClick={onMoveDown} disabled={isLast} className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-20 transition-colors"><ChevronDown size={12} /></button>
          <button onClick={onDuplicate} className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 transition-colors"><Copy size={11} className="text-slate-400" /></button>
          <button onClick={onDelete} className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 transition-colors"><Trash2 size={11} className="text-red-400" /></button>
        </div>
      </div>

      {isSelected && block.type !== 'divider' && (
        <div className="px-3 pb-3 border-t border-slate-100 pt-2" onClick={(e) => e.stopPropagation()}>

          {/* Logo uploader — only for contract_header */}
          {block.type === 'contract_header' && (() => {
            const currentLogo = block.content.split('\n').find((l) => l.startsWith('logo:'))?.substring(5).trim() || '';
            const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                const base64 = ev.target?.result as string;
                const lines = block.content.split('\n');
                const logoIdx = lines.findIndex((l) => l.startsWith('logo:'));
                if (logoIdx >= 0) {
                  lines[logoIdx] = `logo: ${base64}`;
                } else {
                  lines.unshift(`logo: ${base64}`);
                }
                onChange(lines.join('\n'));
              };
              reader.readAsDataURL(file);
            };
            const removeLogo = () => {
              const lines = block.content.split('\n').filter((l) => !l.startsWith('logo:'));
              onChange(lines.join('\n'));
            };
            return (
              <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-[11px] font-semibold text-slate-600 mb-2">Logo de l&apos;entreprise</p>
                {currentLogo ? (
                  <div className="flex items-center gap-3">
                    <img src={currentLogo} alt="Logo" className="h-12 max-w-[140px] object-contain rounded border border-slate-200 bg-white p-1" />
                    <button onClick={removeLogo} className="text-[11px] text-red-500 hover:text-red-700 transition-colors">
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-14 w-full border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                    <Building2 size={16} className="text-slate-400" />
                    <span className="text-[11px] text-slate-500">Cliquer pour uploader le logo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                )}
              </div>
            );
          })()}

          <textarea
            ref={textareaRef}
            value={block.content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={cfg.placeholder}
            autoFocus
            rows={block.type === 'legal_article' || block.type === 'form_fields' || block.type === 'pricing_table' || block.type === 'sepa_mandate' || block.type === 'contract_header' ? 7 : 4}
            className="w-full text-xs font-mono leading-relaxed resize-none outline-none bg-slate-50 rounded-lg p-2.5 border border-slate-200 focus:border-indigo-400 transition-colors"
          />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {variables.slice(0, 10).map((v) => (
              <button
                key={v.key}
                onClick={() => onInsertVariable(v.key, textareaRef)}
                className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-slate-600"
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Default blocks per contract type ────────────────────────────────────────

function createDefaultBlocks(type: ContractType): ContractBlock[] {
  const b = (t: BlockType, content: string): ContractBlock => ({ id: uuid(), type: t, content });

  switch (type) {
    case 'b2c':
      return [
        b('contract_header','entreprise: {{prestataire_nom}}\nadresse: {{prestataire_adresse}}\nsiret: {{prestataire_siret}}\ntva: {{prestataire_tva}}\ntitre: CONTRAT DE PRESTATION DE SERVICES\nnumero: {{numero_contrat}}\nversion: {{version_contrat}}'),
        b('parties',       '{{prestataire_nom}}, immatriculée au RCS sous le N° {{prestataire_siret}}, N° TVA {{prestataire_tva}}, dont le siège est situé {{prestataire_adresse}}, ci-après désignée « le Prestataire »,\n\nEt :\n\nM./Mme {{client_prenom}} {{client_nom}}, demeurant au {{client_adresse}}, {{client_code_postal}} {{client_ville}}, joignable à {{client_email}} / {{client_telephone}}, ci-après désigné(e) « le Client ».'),
        b('form_fields',   'COORDONNÉES DU CLIENT\n\nCivilité: ☐ M.  ☐ Mme\nNom: _____________________________ Prénom: _____________________________\nAdresse: _________________________________________________________________\nCode postal: _____________ Ville: _____________________________________________\nE-mail: ____________________________ Tél mobile: ______________________________\nPréférence de contact: ☐ Mail  ☐ Courrier'),
        b('article',       'Article 1 — Objet du contrat'),
        b('clause',        'Le Prestataire s\'engage à réaliser la prestation suivante : {{description_prestation}}.'),
        b('article',       'Article 2 — Durée'),
        b('clause',        'La prestation débutera le {{date_debut}} et prendra fin le {{date_fin}}.'),
        b('article',       'Article 3 — Prix et modalités de paiement'),
        b('pricing_ttc',   'description: {{description_prestation}}\nmontant_ht: {{montant_ht}}\ntva_rate: 20\nmontant_tva: {{montant_tva}}\nmontant_ttc: {{montant_ttc}}'),
        b('checkbox_group','MODE DE PAIEMENT\n\n☐ Prélèvement automatique (SEPA)\n☐ Virement bancaire\n☐ Chèque (règlement annuel uniquement)'),
        b('legal_article', '4. DROIT DE RÉTRACTATION\n\n4.1 Conformément à l\'article L.221-18 du Code de la consommation, le Client dispose d\'un délai de 14 jours calendaires à compter de la signature pour exercer son droit de rétractation, sans justification ni pénalité.\n\n4.2 Pour exercer ce droit, le Client doit adresser sa demande par lettre recommandée avec accusé de réception.'),
        b('legal_article', '5. LOI APPLICABLE\n\nLe présent contrat est soumis au droit français. Tout litige non résolu amiablement sera soumis aux tribunaux compétents du ressort du domicile du Client.'),
        b('divider',       ''),
        b('signature_block','Fait à {{client_ville}}, le {{date_signature}}\n\nJe reconnais avoir reçu l\'ensemble des documents, en avoir pris connaissance et les accepter.'),
        b('sepa_mandate',  'Nom créancier: {{prestataire_nom}}\nICS (Identifiant Créancier SEPA): ___________________\nAdresse créancier: {{prestataire_adresse}}'),
        b('retraction_form','Je soussigné(e), déclare renoncer à l\'offre {{prestataire_nom}}, à renvoyer au plus tard 14 jours après signature par lettre recommandée AR à : {{prestataire_nom}} — Service Rétractation — {{prestataire_adresse}}'),
      ];

    case 'b2b':
      return [
        b('contract_header','entreprise: {{prestataire_nom}}\nadresse: {{prestataire_adresse}}\nsiret: {{prestataire_siret}}\ntva: {{prestataire_tva}}\ntitre: CONTRAT DE PRESTATION DE SERVICES B2B\nnumero: {{numero_contrat}}\nversion: {{version_contrat}}'),
        b('parties',       '{{prestataire_nom}}, immatriculée au RCS sous le N° {{prestataire_siret}}, N° TVA {{prestataire_tva}}, dont le siège est situé {{prestataire_adresse}}, ci-après désignée « le Prestataire »,\n\nEt :\n\nLa société {{client_entreprise}}, représentée par {{client_representant}}, immatriculée au RCS sous le N° {{client_siret}}, N° TVA intracommunautaire {{client_tva}}, dont le siège social est situé au {{client_adresse}}, ci-après désignée « le Client ».'),
        b('form_fields',   'COORDONNÉES DE L\'ENTREPRISE CLIENT\n\nRaison sociale: ______________________________________________________________\nReprésentant légal: ___________________________________________________________\nSIRET: _________________________________ N° TVA: ____________________________\nAdresse siège: _______________________________________________________________\nCode postal: _____________ Ville: _____________________________________________\nE-mail: ____________________________ Tél: _____________________________________'),
        b('article',       'Article 1 — Objet du contrat'),
        b('clause',        'Le Prestataire s\'engage à réaliser la prestation suivante : {{description_prestation}}.'),
        b('article',       'Article 2 — Durée et modalités d\'exécution'),
        b('clause',        'La prestation débutera le {{date_debut}} et prendra fin le {{date_fin}}. Le Prestataire s\'engage à respecter les délais convenus, sauf en cas de force majeure.'),
        b('article',       'Article 3 — Prix et paiement'),
        b('clause',        'Le montant est fixé à {{montant_ht}} € HT, soit {{montant_ttc}} € TTC. Délai de paiement : {{delai_paiement}}.\n\nEn cas de retard de paiement, des pénalités de {{penalites_retard}} seront appliquées de plein droit, sans mise en demeure préalable.'),
        b('legal_article', '4. CONFIDENTIALITÉ\n\n4.1 Les parties s\'engagent mutuellement à garder confidentielles toutes les informations échangées dans le cadre du présent contrat, pendant sa durée et pour une période de 2 ans après son expiration.\n\n4.2 Cette obligation ne s\'applique pas aux informations déjà publiques ou dont la divulgation est imposée par la loi.'),
        b('legal_article', '5. PROPRIÉTÉ INTELLECTUELLE\n\n5.1 Les livrables produits dans le cadre de cette prestation sont la propriété exclusive du Client après règlement intégral des sommes dues.\n\n5.2 Le Prestataire conserve le droit de mentionner cette réalisation dans ses références, sauf accord contraire.'),
        b('legal_article', '6. RESPONSABILITÉ\n\n6.1 La responsabilité du Prestataire est limitée au montant total du contrat.\n\n6.2 Le Prestataire ne saurait être tenu responsable des dommages indirects ou consécutifs.'),
        b('legal_article', '7. RÉSILIATION\n\n7.1 Chaque partie peut résilier le présent contrat en cas de manquement grave, après mise en demeure restée sans effet pendant 15 jours.\n\n7.2 En cas de résiliation anticipée sans motif légitime, les sommes dues jusqu\'à la date d\'effet restent exigibles.'),
        b('legal_article', '8. LOI APPLICABLE ET JURIDICTION\n\nLe présent contrat est soumis au droit français. Tout litige sera soumis aux tribunaux compétents du ressort du siège social du Prestataire.'),
        b('divider',       ''),
        b('signature_block','Fait à ____________, le {{date_signature}}, en deux exemplaires originaux.\n\nChaque partie reconnaît avoir reçu un exemplaire signé du présent contrat.'),
      ];

    case 'web':
      return [
        b('contract_header','entreprise: {{nom_site}}\nadresse: {{adresse_vendeur}}\nsiret: {{siret_vendeur}}\ntva: \ntitre: CONDITIONS GÉNÉRALES DE VENTE (CGV)\nnumero: {{url_site}}\nversion: {{version_contrat}}'),
        b('info_box',      'Vendeur : {{nom_site}} | Site : {{url_site}} | SIRET : {{siret_vendeur}} | Adresse : {{adresse_vendeur}} | Contact : {{email_contact}}'),
        b('legal_article', '1. OBJET ET CHAMP D\'APPLICATION\n\n1.1 Les présentes Conditions Générales de Vente s\'appliquent à toute commande passée sur le site {{nom_site}}.\n\n1.2 La souscription implique l\'acceptation pleine, entière et sans réserve des présentes CGV, qui prévalent sur tout autre document publicitaire ou informatif.'),
        b('legal_article', '2. COMMANDES ET VALIDATION\n\n2.1 Toute commande vaut acceptation des présentes CGV.\n\n2.2 Pour les ventes réalisées à distance, un email de confirmation est adressé à l\'acheteur à l\'issue de la commande.'),
        b('legal_article', '3. PRIX\n\n3.1 Les prix sont indiqués en euros, toutes taxes comprises.\n\n3.2 {{nom_site}} se réserve le droit de modifier ses prix à tout moment. Les prix applicables sont ceux en vigueur au moment de la commande.'),
        b('legal_article', '4. LIVRAISON\n\n4.1 Les commandes sont expédiées sous {{delai_livraison}} à compter de la validation du paiement.\n\n4.2 Les livraisons sont effectuées à l\'adresse indiquée lors de la commande.'),
        b('legal_article', '5. DROIT DE RÉTRACTATION\n\n5.1 Conformément à la loi, vous disposez de 14 jours à compter de la réception pour exercer votre droit de rétractation, sans justification.\n\n5.2 Les frais de retour sont à la charge du Client, sauf en cas de produit défectueux ou non conforme.'),
        b('legal_article', '6. RETOURS ET REMBOURSEMENTS\n\n6.1 Politique de retour : {{politique_retour}}.\n\n6.2 Le remboursement sera effectué dans un délai de 14 jours après réception du retour, via le même moyen de paiement utilisé lors de la commande.'),
        b('legal_article', '7. PROTECTION DES DONNÉES (RGPD)\n\n7.1 Les données personnelles collectées sont utilisées uniquement pour le traitement des commandes et l\'amélioration des services.\n\n7.2 Conformément au RGPD, vous disposez d\'un droit d\'accès, de rectification et de suppression de vos données personnelles en contactant : {{email_contact}}.'),
        b('legal_article', '8. MÉDIATION\n\n8.1 En cas de litige non résolu amiablement, vous pouvez recourir gratuitement au médiateur de la consommation : {{mediateur_nom}}.\n\n8.2 Plateforme européenne de résolution des litiges : https://ec.europa.eu/consumers/odr'),
        b('legal_article', '9. LOI APPLICABLE\n\nLes présentes CGV sont soumises au droit français. En cas de litige, compétence est attribuée aux tribunaux français compétents.'),
        b('divider',       ''),
        b('info_box',      '{{nom_site}} — SIRET {{siret_vendeur}} — {{adresse_vendeur}}\nVersion des CGV : {{version_contrat}}'),
      ];

    case 'aop':
      return [
        b('contract_header','entreprise: {{prestataire_nom}}\nadresse: {{prestataire_adresse}}\nsiret: {{prestataire_siret}}\ntva: {{prestataire_tva}}\ntitre: MÉMOIRE TECHNIQUE ET FINANCIER — RÉPONSE À APPEL D\'OFFRES PUBLIC\nnumero: {{reference_marche}}\nversion: {{version_contrat}}'),
        b('info_box',      'Référence du marché : {{reference_marche}}\nObjet : {{nom_marche}}\nPouvoir adjudicateur : {{pouvoir_adjudicateur}}\nDate limite de remise des offres : {{date_remise_offre}}'),
        b('form_fields',   'IDENTIFICATION DU CANDIDAT\n\nRaison sociale: {{prestataire_nom}}\nSIRET: {{prestataire_siret}}\nAdresse: {{prestataire_adresse}}\nReprésentant légal: ___________________________\nTéléphone: ___________________________\nE-mail: ___________________________'),
        b('article',       'Section 1 — Présentation du candidat'),
        b('clause',        'La société {{prestataire_nom}}, immatriculée sous le N° SIRET {{prestataire_siret}}, présente sa candidature en réponse à l\'appel d\'offres {{reference_marche}} portant sur {{nom_marche}}.'),
        b('article',       'Section 2 — Mémoire technique'),
        b('clause',        'Décrivez ici votre approche méthodologique, vos moyens humains et matériels, vos références similaires et votre organisation pour mener à bien ce marché.'),
        b('article',       'Section 3 — Offre financière'),
        b('pricing_table', 'Désignation|Unité|Quantité|PU HT|Total HT\nPrestation principale|Forfait|1|_____|_____\nOptions|Unité|___|_____|_____\nTotal HT||||| {{montant_ht}} €\nTVA (20%)|||||_____ €\nTotal TTC||||| {{montant_ttc}} €'),
        b('article',       'Section 4 — Durée et conditions d\'exécution'),
        b('clause',        'Durée du marché : {{duree_marche}}, à compter de la notification du marché. Le prestataire s\'engage à respecter les délais fixés par le calendrier d\'exécution.'),
        b('legal_article', '5. ENGAGEMENTS DU CANDIDAT\n\n5.1 Le candidat atteste sur l\'honneur qu\'il n\'entre dans aucun des cas d\'exclusion mentionnés aux articles L.2141-1 à L.2141-14 du Code de la commande publique.\n\n5.2 Le candidat certifie l\'exactitude de toutes les informations fournies dans ce dossier.'),
        b('divider',       ''),
        b('signature_block','Fait à ____________, le {{date_remise_offre}}\n\nDossier remis dans le cadre du marché {{reference_marche}}'),
        b('info_box',      '{{prestataire_nom}} — SIRET {{prestataire_siret}} — {{prestataire_adresse}}\nDossier soumis au pouvoir adjudicateur : {{pouvoir_adjudicateur}}'),
      ];
  }
}

// ─── Main editor ──────────────────────────────────────────────────────────────

function ContractEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const name = searchParams.get('name') || 'Nouveau contrat';
  const description = searchParams.get('description') || '';

  const [contractType, setContractType] = useState<ContractType>('b2c');
  const [blocks, setBlocks] = useState<ContractBlock[]>(() => createDefaultBlocks('b2c'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>('blocs');
  const [openCategory, setOpenCategory] = useState<string | null>('Identification & Préambule');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [version, setVersion] = useState(1);

  const typeConfig = CONTRACT_TYPES[contractType];

  const handleExportPDF = useCallback(() => {
    const vars = typeConfig.variables as { key: string; sample: string }[];
    const contractHtml = blocks
      .map((block) => `<div class="cb">${renderBlockHTML(block, vars, false)}</div>`)
      .join('');

    const printWindow = globalThis.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Autorisez les popups pour exporter en PDF');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>${name}</title>
  <style>
    @page { size: A4; margin: 18mm 20mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a1a; margin: 0; padding: 0; line-height: 1.6; }
    .cb { page-break-inside: avoid; }
    mark { background: transparent !important; color: #0f172a !important; font-weight: 600; }
    span[style*="fee2e2"] { background: transparent !important; color: #64748b !important; font-style: italic; }
    table { border-collapse: collapse; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
  </style>
</head>
<body>${contractHtml}</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  }, [blocks, typeConfig.variables, name]);

  const addBlock = useCallback((type: BlockType, content = '') => {
    const newBlock: ContractBlock = { id: uuid(), type, content };
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === selectedId);
      if (idx >= 0) {
        const next = [...prev];
        next.splice(idx + 1, 0, newBlock);
        return next;
      }
      return [...prev, newBlock];
    });
    setSelectedId(newBlock.id);
    setLeftTab('blocs');
  }, [selectedId]);

  const updateBlock = useCallback((id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId(null);
  }, []);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if ((dir === -1 && idx === 0) || (dir === 1 && idx === prev.length - 1)) return prev;
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next;
    });
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const copy = { ...prev[idx], id: uuid() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  const insertVariable = useCallback((key: string, ref: React.RefObject<HTMLTextAreaElement | null>) => {
    if (!selectedId) return;
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const token = `{{${key}}}`;
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== selectedId) return b;
        return { ...b, content: b.content.substring(0, start) + token + b.content.substring(end) };
      }),
    );
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + token.length;
      ta.focus();
    }, 0);
  }, [selectedId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await templates.create({
        name,
        description,
        type: 3,
        content: JSON.stringify({ contractType, version, blocks }),
      });
      setVersion((v) => v + 1);
      toast.success(`Contrat enregistré — v${version}`);
      router.push('/dashboard/templates');
    } catch {
      toast.error("Échec de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" onClick={() => setShowTypeMenu(false)}>

      {/* ── Toolbar ── */}
      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 shrink-0 print:hidden">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={15} /> Retour
          </button>
          <div className="w-px h-4 bg-border" />
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowTypeMenu((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${typeConfig.color}`}
            >
              {typeConfig.label} <ChevronDown size={11} />
            </button>
            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                {(Object.keys(CONTRACT_TYPES) as ContractType[]).map((t) => (
                  <button key={t} onClick={() => {
                    if (contractType !== t) {
                      if (globalThis.confirm(`Changer vers "${CONTRACT_TYPES[t].label}" réinitialisera le template. Continuer ?`)) {
                        setContractType(t);
                        setBlocks(createDefaultBlocks(t));
                        setSelectedId(null);
                      }
                    }
                    setShowTypeMenu(false);
                  }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-50 ${contractType === t ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {CONTRACT_TYPES[t].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">v{version}</span>
        </div>

        <span className="text-sm font-medium text-foreground/80 truncate max-w-xs">{name}</span>

        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors">
            <Download size={13} /> Exporter PDF
          </button>
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50">
            <Save size={13} /> {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* ── Add block toolbar ── */}
      <div className="border-b border-border bg-slate-50 px-4 py-2 flex items-center gap-1 flex-wrap shrink-0 print:hidden overflow-x-auto">
        <span className="text-[10px] text-muted-foreground font-medium mr-1 shrink-0">+ Ajouter :</span>
        {(Object.entries(BLOCK_CONFIG) as [BlockType, typeof BLOCK_CONFIG[BlockType]][]).map(([type, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button key={type} onClick={() => addBlock(type)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-white border border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-100 transition-colors shrink-0">
              <Icon size={10} /> {cfg.label}
            </button>
          );
        })}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left (40%) */}
        <div className="w-[40%] flex flex-col border-r border-border print:hidden">
          <div className="flex border-b border-border bg-slate-50">
            {([['blocs', 'Blocs'], ['library', 'Bibliothèque'], ['variables', 'Variables']] as [LeftTab, string][]).map(([tab, label]) => (
              <button key={tab} onClick={() => setLeftTab(tab)}
                className={`flex-1 py-2 text-[11px] font-medium transition-colors ${leftTab === tab ? 'border-b-2 border-slate-900 text-foreground bg-white' : 'text-muted-foreground hover:text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">

            {leftTab === 'blocs' && (
              <div className="space-y-2">
                {blocks.length === 0 && (
                  <div className="text-center py-10 text-sm text-muted-foreground">Utilisez la barre ci-dessus pour ajouter des blocs</div>
                )}
                {blocks.map((block, i) => (
                  <BlockRow key={block.id} block={block}
                    isSelected={selectedId === block.id} isFirst={i === 0} isLast={i === blocks.length - 1}
                    onSelect={() => setSelectedId(block.id)}
                    onChange={(content) => updateBlock(block.id, content)}
                    onDelete={() => deleteBlock(block.id)}
                    onMoveUp={() => moveBlock(block.id, -1)}
                    onMoveDown={() => moveBlock(block.id, 1)}
                    onDuplicate={() => duplicateBlock(block.id)}
                    variables={typeConfig.variables as { key: string; sample: string }[]}
                    onInsertVariable={insertVariable}
                  />
                ))}
              </div>
            )}

            {leftTab === 'library' && (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground mb-3">Cliquez pour ajouter après le bloc sélectionné.</p>
                {CLAUSE_LIBRARY.map((group) => (
                  <div key={group.category} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button onClick={() => setOpenCategory(openCategory === group.category ? null : group.category)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <span className="text-xs font-semibold text-slate-700">{group.category}</span>
                      <ChevronDown size={13} className={`text-slate-400 transition-transform ${openCategory === group.category ? 'rotate-180' : ''}`} />
                    </button>
                    {openCategory === group.category && (
                      <div className="divide-y divide-slate-100">
                        {group.clauses.map((clause) => {
                          const Icon = BLOCK_CONFIG[clause.type].icon;
                          return (
                            <button key={clause.label} onClick={() => addBlock(clause.type, clause.content)}
                              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Icon size={11} className="text-slate-400" />
                                  <span className="text-xs font-medium text-slate-700">{clause.label}</span>
                                </div>
                                <Plus size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 pl-4">
                                {clause.content.substring(0, 55)}...
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {leftTab === 'variables' && (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground">Sélectionnez un bloc, puis cliquez pour insérer.</p>
                <div className="flex flex-wrap gap-1.5">
                  {(typeConfig.variables as { key: string; sample: string }[]).map((v) => (
                    <div key={v.key} className="flex flex-col gap-0.5">
                      <button onClick={() => {
                        if (!selectedId) { toast('Sélectionnez d\'abord un bloc', { icon: '👆' }); return; }
                        setBlocks((prev) => prev.map((b) => b.id === selectedId ? { ...b, content: b.content + `{{${v.key}}}` } : b));
                      }} className="px-2 py-1 text-[10px] font-mono bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-slate-700">
                        {`{{${v.key}}}`}
                      </button>
                      <span className="text-[9px] text-slate-400 text-center">{v.sample}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — A4 preview (60%) */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6 print:w-full print:p-0 print:bg-white print:overflow-visible">
          <div className="flex items-center justify-between mb-4 print:hidden">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Aperçu A4 — variables en <mark className="bg-yellow-100 text-yellow-800 px-1 rounded">jaune</mark>
            </span>
            <span className="text-[11px] text-muted-foreground">{blocks.length} bloc{blocks.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="bg-white shadow-sm mx-auto print:shadow-none print:mx-0"
            style={{ width: '210mm', minHeight: '297mm', padding: '18mm 20mm', fontFamily: 'Arial, sans-serif', color: '#1a1a1a' }}>
            {blocks.map((block) => (
              <div key={block.id}
                onClick={() => { setSelectedId(block.id); setLeftTab('blocs'); }}
                className="cursor-pointer"
                dangerouslySetInnerHTML={{ __html: renderBlockHTML(block, typeConfig.variables as { key: string; sample: string }[], selectedId === block.id) }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:w-full { width: 100% !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:mx-0 { margin: 0 !important; }
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
