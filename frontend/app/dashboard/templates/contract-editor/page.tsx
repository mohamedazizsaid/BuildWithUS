'use client';

import { useEffect,Suspense, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Save, Download, Plus, Trash2, ChevronDown, ChevronUp,
  Type, AlignLeft, Users, PenLine, Minus, Copy,
  Table, CheckSquare, CreditCard, FileText, LayoutList, AlignCenter,
  Building2, Calculator, BookMarked,
} from 'lucide-react';
import { templates } from '@/lib/api';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType =
  | 'contract_header'
  | 'definitions'
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
      { key: 'client_prenom', sample: 'Ahmed' },
      { key: 'client_nom', sample: 'Boughdiri' },
      { key: 'client_adresse', sample: '5 allee de la haute place' },
      { key: 'client_code_postal', sample: '93160' },
      { key: 'client_ville', sample: 'Noisy le Grand' },
      { key: 'client_email', sample: 'ahmed.boughdiri.it@gmail.com' },
      { key: 'client_telephone', sample: '06 12 34 56 78' },
      { key: 'description_prestation', sample: 'Développement de site web' },
      { key: 'montant_ht', sample: '2 500,00' },
      { key: 'montant_tva', sample: '500,00' },
      { key: 'montant_ttc', sample: '3 000,00' },
      { key: 'date_signature', sample: '01/05/2026' },
      { key: 'date_debut', sample: '15/05/2026' },
      { key: 'date_fin', sample: '15/07/2026' },
      { key: 'prestataire_nom', sample: 'Mondial TV' },
      { key: 'prestataire_siret', sample: '123 456 789 00012' },
      { key: 'prestataire_adresse', sample: '14 av. Louison Bobet, 94120 Fontenay-sous-Bois' },
      { key: 'prestataire_tva', sample: 'FR00123456789' },
      { key: 'nom_conseiller', sample: 'Test Test' },
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
  abonnement: {
    label: 'Abonnement / Télécom',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    variables: [
      { key: 'prestataire_nom', sample: 'France Téléphone' },
      { key: 'prestataire_siret', sample: '841 047 905 00012' },
      { key: 'prestataire_adresse', sample: '14 Avenue Louison Bobet, 94120 Fontenay-sous-Bois' },
      { key: 'prestataire_tva', sample: 'FR00841047905' },
      { key: 'nom_offre', sample: 'Forfait Illimité 200 Go' },
      { key: 'description_offre', sample: 'Voix / SMS / MMS illimités + 200 Go de données mobiles' },
      { key: 'operateur_reseau', sample: 'Orange et Bouygues' },
      { key: 'montant_mensuel', sample: '29,90' },
      { key: 'frais_activation', sample: '49,00' },
      { key: 'frais_resiliation', sample: '49,00' },
      { key: 'frais_non_restitution', sample: '199,00' },
      { key: 'duree_engagement', sample: 'sans engagement' },
      { key: 'seuil_usage', sample: '500 Go/mois' },
      { key: 'delai_activation', sample: '48 heures' },
      { key: 'delai_resiliation', sample: '10 jours calendaires' },
      { key: 'mediateur_nom', sample: 'Médiateur des communications électroniques' },
      { key: 'mediateur_url', sample: 'www.mediation-telecom.org' },
      { key: 'ics_sepa', sample: 'FR24ZZZ870ADF' },
      { key: 'client_prenom', sample: 'Jean' },
      { key: 'client_nom', sample: 'Dupont' },
      { key: 'client_adresse', sample: '12 rue de Paris' },
      { key: 'client_code_postal', sample: '75001' },
      { key: 'client_ville', sample: 'Paris' },
      { key: 'client_email', sample: 'jean.dupont@email.com' },
      { key: 'client_telephone', sample: '06 12 34 56 78' },
      { key: 'date_signature', sample: '01/05/2026' },
      { key: 'numero_contrat', sample: 'CTR-2026-001' },
      { key: 'version_contrat', sample: 'v2.0 – 01/05/2026' },
      { key: 'nom_conseiller', sample: 'Pierre Dupont' },
    ],
  },
} as const;

// ─── Block config ─────────────────────────────────────────────────────────────

const BLOCK_CONFIG: Record<BlockType, { label: string; icon: React.ElementType; placeholder: string; color: string }> = {
  contract_header:  { label: 'En-tête contrat',  icon: Building2,    placeholder: 'entreprise: {{prestataire_nom}}\nadresse: {{prestataire_adresse}}\nsiret: {{prestataire_siret}}\ntva: {{prestataire_tva}}\ntitre: CONTRAT DE PRESTATION DE SERVICES\nnumero: {{numero_contrat}}\nversion: {{version_contrat}}', color: 'bg-slate-900 text-white' },
  definitions:      { label: 'Définitions',       icon: BookMarked,   placeholder: 'Service: L\'ensemble des fonctionnalités accessibles sur {{url_site}}\nClient: {{client_nom}}, personne physique ayant souscrit à l\'offre\nPlateforme: L\'interface accessible à l\'adresse {{url_site}}\nAbonnement: Période mensuelle au tarif de {{montant_mensuel}} € TTC', color: 'bg-indigo-50 text-indigo-800' },
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
        label: 'Définitions — B2C / Services',
        type: 'definitions' as BlockType,
        content: 'Service: {{description_prestation}} telle que décrite au présent contrat\nPrestataire: {{prestataire_nom}}, société immatriculée sous le N° SIRET {{prestataire_siret}}\nClient: M./Mme {{client_prenom}} {{client_nom}}, consommateur au sens du Code de la consommation\nContrat: le présent document et ses annexes\nLivrables: les résultats et productions remis au Client à l\'issue de la prestation',
      },
      {
        label: 'Définitions — B2B / SaaS',
        type: 'definitions' as BlockType,
        content: 'Service: l\'ensemble des fonctionnalités de la plateforme {{prestataire_nom}}\nClient: la société {{client_entreprise}}, représentée par {{client_representant}}\nUtilisateur: toute personne autorisée par le Client à accéder au Service\nDonnées: informations traitées dans le cadre de l\'utilisation du Service\nSLA: engagement de niveau de service tel que défini à l\'Article 4\nContrat: le présent accord et ses annexes',
      },
      {
        label: 'Définitions — Abonnement / Télécom',
        type: 'definitions' as BlockType,
        content: 'Service: l\'accès au réseau {{operateur_reseau}} fourni dans le cadre de l\'offre {{nom_offre}}\nAbonné: M./Mme {{client_prenom}} {{client_nom}}, titulaire du présent contrat d\'abonnement\nOpérateur: {{prestataire_nom}}, fournisseur du Service\nÉquipement: le matériel mis à disposition (SIM, routeur, câbles)\nAbonnement: la période mensuelle de facturation au tarif de {{montant_mensuel}} € TTC\nUsage raisonnable: consommation inférieure à {{seuil_usage}} par période',
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

    case 'definitions': {
      const lines = block.content.split('\n').filter(Boolean);
      const rows = lines.map((l) => {
        const idx = l.indexOf(':');
        if (idx < 0) return null;
        const term = l.substring(0, idx).trim();
        const def  = v(l.substring(idx + 1).trim());
        return { term, def };
      }).filter(Boolean) as { term: string; def: string }[];
      return `<div style="${sel}margin:14px 0;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
        <div style="background:#0f172a;color:white;padding:8px 14px;font-size:9pt;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;">Définitions</div>
        <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
          ${rows.map((r, i) => `
          <tr style="background:${i % 2 === 0 ? '#f8fafc' : 'white'};">
            <td style="padding:8px 14px;font-weight:700;color:#0f172a;width:28%;border-bottom:1px solid #f1f5f9;vertical-align:top;border-right:2px solid #e2e8f0;">« ${r.term} »</td>
            <td style="padding:8px 14px;color:#475569;border-bottom:1px solid #f1f5f9;line-height:1.6;">${r.def}</td>
          </tr>`).join('')}
        </table>
        <div style="padding:6px 14px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:8pt;color:#94a3b8;font-style:italic;">
          Ces définitions s'appliquent à l'ensemble du présent contrat, au singulier comme au pluriel.
        </div>
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

// ─── Field input helper ───────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, multiline, suffix }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; suffix?: string;
}) {
  const cls = 'w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 focus:border-indigo-400 focus:outline-none transition-colors';
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] text-slate-400 font-medium w-24 shrink-0 pt-2 text-right">{label}</span>
      <div className="flex-1 flex items-center gap-1">
        {multiline ? (
          <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            rows={3} className={`${cls} py-1.5 resize-none leading-relaxed`} />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            className={`${cls} h-7`} />
        )}
        {suffix && <span className="text-[10px] text-slate-400 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

// ─── Parse key:value content helper ──────────────────────────────────────────

function parseKV(content: string): Record<string, string> {
  const f: Record<string, string> = {};
  content.split('\n').forEach((l) => {
    const idx = l.indexOf(':');
    if (idx > 0) f[l.substring(0, idx).trim()] = l.substring(idx + 1).trim();
  });
  return f;
}

function serializeKV(keys: string[], fields: Record<string, string>): string {
  return keys.filter((k) => fields[k] !== undefined).map((k) => `${k}: ${fields[k]}`).join('\n');
}

// ─── Header block editor ──────────────────────────────────────────────────────

function HeaderBlockEditor({ content, onChange }: { content: string; onChange: (c: string) => void }) {
  const fields = parseKV(content);
  const logo = fields['logo'] || '';

  const update = (key: string, val: string) => {
    const next = { ...fields, [key]: val };
    onChange(serializeKV(['logo', 'entreprise', 'adresse', 'siret', 'tva', 'titre', 'numero', 'version'], next));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => update('logo', ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const headerFields = [
    { key: 'entreprise', label: 'Entreprise' },
    { key: 'adresse',    label: 'Adresse' },
    { key: 'siret',      label: 'SIRET' },
    { key: 'tva',        label: 'N° TVA' },
    { key: 'titre',      label: 'Titre document' },
    { key: 'numero',     label: 'N° Contrat' },
    { key: 'version',    label: 'Version' },
  ];

  return (
    <div className="space-y-2.5">
      {/* Logo */}
      <div className="flex items-start gap-2">
        <span className="text-[10px] text-slate-400 font-medium w-24 shrink-0 pt-2 text-right">Logo</span>
        <div className="flex-1">
          {logo ? (
            <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
              <img src={logo} alt="Logo" className="h-10 max-w-30 object-contain" />
              <button onClick={() => update('logo', '')} className="text-[11px] text-red-500 hover:text-red-700">Supprimer</button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 h-10 w-full border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
              <Building2 size={13} className="text-slate-400" />
              <span className="text-[11px] text-slate-400">Uploader le logo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          )}
        </div>
      </div>
      {headerFields.map(({ key, label }) => (
        <Field key={key} label={label} value={fields[key] || ''} onChange={(v) => update(key, v)} placeholder={`{{${key}}}`} />
      ))}
    </div>
  );
}

// ─── Definitions block editor ─────────────────────────────────────────────────

function DefinitionsBlockEditor({ content, onChange }: { content: string; onChange: (c: string) => void }) {
  const parseRows = (c: string) =>
    c.split('\n').filter((l) => l.trim() && l.includes(':')).map((l) => {
      const idx = l.indexOf(':');
      return { id: Math.random().toString(36).slice(2), term: l.substring(0, idx).trim(), def: l.substring(idx + 1).trim() };
    });

  const rows = parseRows(content);

  const serialize = (r: { term: string; def: string }[]) =>
    onChange(r.map((row) => `${row.term}: ${row.def}`).join('\n'));

  const updateRow = (id: string, field: 'term' | 'def', val: string) => {
    serialize(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };
  const removeRow = (id: string) => serialize(rows.filter((r) => r.id !== id));
  const addRow = () => serialize([...rows, { term: '', def: '' }]);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_2fr_20px] gap-1.5 mb-1">
        <span className="text-[10px] font-semibold text-slate-400 pl-1">TERME</span>
        <span className="text-[10px] font-semibold text-slate-400 pl-1">DÉFINITION</span>
        <span />
      </div>
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[1fr_2fr_20px] gap-1.5 items-center">
          <input
            value={row.term}
            onChange={(e) => updateRow(row.id, 'term', e.target.value)}
            placeholder="Terme..."
            className="h-7 px-2 text-xs border border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none bg-white"
          />
          <input
            value={row.def}
            onChange={(e) => updateRow(row.id, 'def', e.target.value)}
            placeholder="Définition ou {{variable}}..."
            className="h-7 px-2 text-xs border border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none bg-white"
          />
          <button onClick={() => removeRow(row.id)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-red-400 transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      ))}
      <button onClick={addRow} className="flex items-center gap-1.5 text-[11px] text-indigo-600 hover:text-indigo-700 font-medium mt-1 transition-colors">
        <Plus size={12} /> Ajouter une définition
      </button>
    </div>
  );
}

// ─── Pricing block editor ─────────────────────────────────────────────────────

function PricingBlockEditor({ content, onChange }: { content: string; onChange: (c: string) => void }) {
  const fields = parseKV(content);
  const update = (key: string, val: string) => {
    const next = { ...fields, [key]: val };
    onChange(serializeKV(['description', 'montant_ht', 'tva_rate', 'montant_tva', 'montant_ttc'], next));
  };

  return (
    <div className="space-y-2">
      <Field label="Description"  value={fields['description'] || ''}  onChange={(v) => update('description', v)}  placeholder="{{description_prestation}}" />
      <Field label="Montant HT"   value={fields['montant_ht'] || ''}   onChange={(v) => update('montant_ht', v)}   placeholder="{{montant_ht}}" suffix="€" />
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400 font-medium w-24 shrink-0 text-right">Taux TVA</span>
        <select
          value={fields['tva_rate'] || '20'}
          onChange={(e) => update('tva_rate', e.target.value)}
          className="h-7 px-2 text-xs border border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none bg-white"
        >
          {['0', '5.5', '10', '20'].map((r) => <option key={r} value={r}>{r} %</option>)}
        </select>
      </div>
      <Field label="Montant TVA"  value={fields['montant_tva'] || ''}  onChange={(v) => update('montant_tva', v)}  placeholder="{{montant_tva}}" suffix="€" />
      <Field label="Total TTC"    value={fields['montant_ttc'] || ''}  onChange={(v) => update('montant_ttc', v)}  placeholder="{{montant_ttc}}" suffix="€" />
    </div>
  );
}

// ─── Checkbox block editor ────────────────────────────────────────────────────

function CheckboxBlockEditor({ content, onChange }: { content: string; onChange: (c: string) => void }) {
  const lines = content.split('\n');
  const title = lines[0] || '';
  const options = lines.filter((l) => l.startsWith('☐'));

  const serialize = (t: string, opts: string[]) =>
    onChange([t, '', ...opts].join('\n'));

  const updateOption = (i: number, val: string) => {
    const next = options.map((o, idx) => (idx === i ? `☐ ${val}` : o));
    serialize(title, next);
  };
  const removeOption = (i: number) => serialize(title, options.filter((_, idx) => idx !== i));
  const addOption = () => serialize(title, [...options, '☐ Nouvelle option']);

  return (
    <div className="space-y-2">
      <Field label="Titre groupe" value={title} onChange={(v) => serialize(v, options)} placeholder="MODE DE PAIEMENT" />
      <div className="border-t border-slate-100 pt-2 space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-300 rounded shrink-0" />
            <input
              value={opt.replace(/^☐\s?/, '')}
              onChange={(e) => updateOption(i, e.target.value)}
              className="flex-1 h-7 px-2 text-xs border border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none bg-white"
            />
            <button onClick={() => removeOption(i)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-red-400 transition-colors shrink-0">
              <Trash2 size={11} />
            </button>
          </div>
        ))}
        <button onClick={addOption} className="flex items-center gap-1.5 text-[11px] text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
          <Plus size={12} /> Ajouter une option
        </button>
      </div>
    </div>
  );
}

// ─── SEPA block editor ────────────────────────────────────────────────────────

function SepaBlockEditor({ content, onChange }: { content: string; onChange: (c: string) => void }) {
  const fields = parseKV(content);
  const update = (key: string, val: string) => {
    const next = { ...fields, [key]: val };
    onChange(serializeKV(['Nom créancier', 'ICS (Identifiant Créancier SEPA)', 'Adresse créancier'], next));
  };
  return (
    <div className="space-y-2">
      <Field label="Nom créancier"  value={fields['Nom créancier'] || ''}                    onChange={(v) => update('Nom créancier', v)}                    placeholder="{{prestataire_nom}}" />
      <Field label="ICS (SEPA)"     value={fields['ICS (Identifiant Créancier SEPA)'] || ''} onChange={(v) => update('ICS (Identifiant Créancier SEPA)', v)} placeholder="FR24ZZZ..." />
      <Field label="Adresse"        value={fields['Adresse créancier'] || ''}                onChange={(v) => update('Adresse créancier', v)}                placeholder="{{prestataire_adresse}}" />
    </div>
  );
}

// ─── Pricing table editor ─────────────────────────────────────────────────────

function PricingTableEditor({ content, onChange }: { content: string; onChange: (c: string) => void }) {
  const lines = content.split('\n').filter(Boolean);
  const headers = lines[0]?.split('|') ?? [];
  const rows = lines.slice(1).map((l) => l.split('|'));

  const serialize = (h: string[], r: string[][]) =>
    onChange([h.join('|'), ...r.map((row) => row.join('|'))].join('\n'));

  const updateCell = (rowIdx: number, colIdx: number, val: string) => {
    const next = rows.map((r, ri) => r.map((c, ci) => (ri === rowIdx && ci === colIdx ? val : c)));
    serialize(headers, next);
  };
  const addRow = () => serialize(headers, [...rows, Array(headers.length).fill('')]);
  const removeRow = (i: number) => serialize(headers, rows.filter((_, ri) => ri !== i));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left p-1 bg-slate-900 text-white text-[10px] font-semibold first:rounded-tl-lg last:rounded-tr-lg">
                {h.trim()}
              </th>
            ))}
            <th className="w-6 bg-slate-900 rounded-tr-lg" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
              {row.map((cell, ci) => (
                <td key={ci} className="p-0.5">
                  <input
                    value={cell.trim()}
                    onChange={(e) => updateCell(ri, ci, e.target.value)}
                    className="w-full h-6 px-1.5 text-[11px] border-0 bg-transparent focus:bg-white focus:border focus:border-indigo-300 rounded focus:outline-none"
                  />
                </td>
              ))}
              <td className="p-0.5">
                <button onClick={() => removeRow(ri)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-red-400">
                  <Trash2 size={10} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} className="flex items-center gap-1.5 text-[11px] text-indigo-600 hover:text-indigo-700 font-medium mt-2 transition-colors">
        <Plus size={12} /> Ajouter une ligne
      </button>
    </div>
  );
}

// ─── Text block editor (textarea + variable chips) ────────────────────────────

function TextBlockEditor({ block, onChange, variables, rows = 4 }: {
  block: ContractBlock; onChange: (c: string) => void;
  variables: { key: string; sample: string }[]; rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const insertVar = (key: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const token = `{{${key}}}`;
    onChange(block.content.substring(0, start) + token + block.content.substring(ta.selectionEnd));
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + token.length; ta.focus(); }, 0);
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={ref}
        value={block.content}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        autoFocus
        className="w-full text-xs leading-relaxed resize-none outline-none bg-white rounded-lg p-3 border border-slate-200 focus:border-indigo-400 transition-colors font-sans"
      />
      {variables.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {variables.slice(0, 12).map((v) => (
            <button
              key={v.key}
              onClick={() => insertVar(v.key)}
              title={`Exemple : ${v.sample}`}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded-md hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-slate-500"
            >
              {`{{${v.key}}}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Block editor dispatcher ──────────────────────────────────────────────────

function BlockEditorContent({ block, onChange, variables }: {
  block: ContractBlock; onChange: (c: string) => void;
  variables: { key: string; sample: string }[];
}) {
  switch (block.type) {
    case 'contract_header':
      return <HeaderBlockEditor content={block.content} onChange={onChange} />;
    case 'definitions':
      return <DefinitionsBlockEditor content={block.content} onChange={onChange} />;
    case 'pricing_ttc':
      return <PricingBlockEditor content={block.content} onChange={onChange} />;
    case 'checkbox_group':
      return <CheckboxBlockEditor content={block.content} onChange={onChange} />;
    case 'sepa_mandate':
      return <SepaBlockEditor content={block.content} onChange={onChange} />;
    case 'pricing_table':
      return <PricingTableEditor content={block.content} onChange={onChange} />;
    case 'legal_article':
      return <TextBlockEditor block={block} onChange={onChange} variables={variables} rows={7} />;
    case 'form_fields':
      return <TextBlockEditor block={block} onChange={onChange} variables={variables} rows={6} />;
    case 'parties':
      return <TextBlockEditor block={block} onChange={onChange} variables={variables} rows={5} />;
    case 'retraction_form':
      return <TextBlockEditor block={block} onChange={onChange} variables={variables} rows={4} />;
    default:
      return <TextBlockEditor block={block} onChange={onChange} variables={variables} rows={3} />;
  }
}

// ─── Block row ────────────────────────────────────────────────────────────────

function BlockRow({
  block, isSelected, isFirst, isLast,
  onSelect, onChange, onDelete, onMoveUp, onMoveDown, onDuplicate,
  variables,
}: {
  block: ContractBlock; isSelected: boolean; isFirst: boolean; isLast: boolean;
  onSelect: () => void; onChange: (content: string) => void;
  onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void; onDuplicate: () => void;
  variables: { key: string; sample: string }[];
}) {
  const cfg = BLOCK_CONFIG[block.type];
  const Icon = cfg.icon;

  // Preview text shown in collapsed state
  const preview = block.content
    .replaceAll(/\{\{[\w]+\}\}/g, '…')
    .replaceAll('\n', ' ')
    .substring(0, 48);

  return (
    <div className={`border rounded-xl transition-all ${isSelected ? 'border-indigo-400 shadow-md shadow-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}>
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2.5 cursor-pointer" onClick={onSelect}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${cfg.color}`}>
            <Icon size={10} />
            {cfg.label}
          </span>
          {!isSelected && block.type !== 'divider' && preview && (
            <span className="text-[11px] text-slate-400 truncate">{preview}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={onMoveUp} disabled={isFirst} title="Monter"
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-20 transition-colors text-slate-400">
            <ChevronUp size={13} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} title="Descendre"
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-20 transition-colors text-slate-400">
            <ChevronDown size={13} />
          </button>
          <button onClick={onDuplicate} title="Dupliquer"
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors text-slate-400">
            <Copy size={11} />
          </button>
          <button onClick={onDelete} title="Supprimer"
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 transition-colors text-red-400">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {isSelected && block.type !== 'divider' && (
        <div className="px-3 pb-3 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
          <BlockEditorContent block={block} onChange={onChange} variables={variables} />
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
        // ── En-tête ──
        b('contract_header',
          'entreprise: {{prestataire_nom}}\nadresse: {{prestataire_adresse}}\nsiret: {{prestataire_siret}}\ntva: {{prestataire_tva}}\ntitre: CONTRAT DE PRESTATION DE SERVICES\nnumero: {{numero_contrat}}\nversion: {{version_contrat}}'
        ),

        // ── Identification des parties ──
        b('parties',
          '{{prestataire_nom}}, société immatriculée au Registre du Commerce et des Sociétés sous le numéro SIRET {{prestataire_siret}}, N° TVA intracommunautaire {{prestataire_tva}}, dont le siège social est situé au {{prestataire_adresse}}, représentée par son représentant légal dûment habilité, ci-après désignée « le Prestataire »,\n\nD\'une part,\n\nEt :\n\nM./Mme {{client_prenom}} {{client_nom}}, né(e) le ____________, demeurant au {{client_adresse}}, {{client_code_postal}} {{client_ville}}, joignable à l\'adresse e-mail {{client_email}} et au {{client_telephone}}, agissant en qualité de consommateur au sens de l\'article liminaire du Code de la consommation, ci-après désigné(e) « le Client »,\n\nD\'autre part,\n\nCi-après désignés ensemble « les Parties ».'
        ),

        // ── Formulaire client ──
        b('form_fields',
          'COORDONNÉES DU CLIENT\n\nCivilité: ☐ M.  ☐ Mme\nNom: _____________________________ Prénom: _____________________________\nDate de naissance: _____________________\nAdresse: _________________________________________________________________\nCode postal: _____________ Ville: _____________________________________________\nE-mail: ____________________________ Tél mobile: ______________________________\nPréférence de contact: ☐ Mail  ☐ Courrier\nNom du conseiller: {{nom_conseiller}}'
        ),

        // ── Préambule ──
        b('info_box',
          'PRÉAMBULE\n\nLe présent contrat est conclu entre un professionnel et un consommateur. Il est soumis aux dispositions du Code civil et du Code de la consommation français, notamment aux articles L.221-1 et suivants relatifs aux contrats conclus à distance et hors établissement. Les présentes conditions ont été portées à la connaissance du Client préalablement à la conclusion du contrat, conformément aux exigences légales d\'information précontractuelle.'
        ),

        // ── Article 1 ──
        b('legal_article',
          'ARTICLE 1 — OBJET DU CONTRAT\n\n1.1 Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire s\'engage à fournir au Client la prestation suivante : {{description_prestation}}.\n\n1.2 Le Prestataire s\'engage à exécuter la prestation avec tout le soin et la diligence requis, conformément aux règles de l\'art et aux bonnes pratiques professionnelles en vigueur.\n\n1.3 La prestation sera réalisée selon les modalités techniques, fonctionnelles et organisationnelles convenues entre les Parties, telles que décrites dans le présent contrat. Toute modification substantielle de l\'objet devra faire l\'objet d\'un avenant écrit signé par les deux Parties.'
        ),

        // ── Article 2 ──
        b('legal_article',
          'ARTICLE 2 — DURÉE DU CONTRAT\n\n2.1 Le présent contrat prend effet à compter de la date de signature par les deux Parties.\n\n2.2 La prestation débutera le {{date_debut}} et prendra fin le {{date_fin}}, sauf résiliation anticipée dans les conditions prévues à l\'Article 7.\n\n2.3 Toute prolongation devra faire l\'objet d\'un accord écrit entre les Parties au moins 15 jours avant l\'échéance prévue.\n\n2.4 Le Client reconnaît avoir été informé de la durée de la prestation préalablement à la conclusion du contrat, conformément à l\'article L.221-5 du Code de la consommation.'
        ),

        // ── Article 3 ──
        b('article', 'ARTICLE 3 — PRIX ET MODALITÉS DE PAIEMENT'),
        b('pricing_ttc',
          'description: {{description_prestation}}\nmontant_ht: {{montant_ht}}\ntva_rate: 20\nmontant_tva: {{montant_tva}}\nmontant_ttc: {{montant_ttc}}'
        ),
        b('legal_article',
          '3.1 Le prix de la prestation est fixé à {{montant_ht}} € hors taxes (HT), auquel s\'ajoute la TVA au taux légal en vigueur de 20 %, soit un montant total toutes taxes comprises (TTC) de {{montant_ttc}} €. Conformément à l\'article L.112-1 du Code de la consommation, le prix TTC est celui opposable au Client consommateur.\n\n3.2 Un acompte de _______ € TTC sera versé à la signature du présent contrat. Le solde, soit _______ € TTC, sera réglé à la livraison ou à la fin de la prestation.\n\n3.3 Le paiement s\'effectuera selon le mode suivant :'
        ),
        b('checkbox_group',
          'MODE DE PAIEMENT\n\n☐ Prélèvement automatique SEPA (voir mandat joint)\n☐ Virement bancaire — RIB communiqué par le Prestataire\n☐ Chèque à l\'ordre de {{prestataire_nom}}\n☐ Carte bancaire\n\nPériodicité: ☐ Paiement unique  ☐ Mensuelle  ☐ Trimestrielle  ☐ Annuelle'
        ),
        b('legal_article',
          '3.4 Tout retard de paiement au-delà de la date d\'échéance entraîne de plein droit et sans mise en demeure préalable l\'application de pénalités de retard calculées sur la base du taux directeur de la Banque Centrale Européenne majoré de 10 points de pourcentage, conformément à l\'article L.441-10 du Code de commerce.\n\n3.5 En cas de non-paiement, le Prestataire se réserve le droit de suspendre l\'exécution de la prestation après mise en demeure restée sans effet pendant 8 jours.'
        ),

        // ── Article 4 ──
        b('legal_article',
          'ARTICLE 4 — OBLIGATIONS DU PRESTATAIRE\n\n4.1 Le Prestataire s\'engage à exécuter la prestation avec soin, diligence et professionnalisme, dans le respect des délais convenus.\n\n4.2 Le Prestataire s\'engage à informer le Client de tout événement susceptible d\'affecter le bon déroulement de la prestation dans les meilleurs délais.\n\n4.3 Le Prestataire s\'engage à respecter la confidentialité des informations qui lui sont transmises par le Client dans le cadre de l\'exécution du présent contrat.\n\n4.4 Le Prestataire s\'engage à souscrire et maintenir en vigueur une assurance responsabilité civile professionnelle couvrant les risques liés à son activité.'
        ),

        // ── Article 5 ──
        b('legal_article',
          'ARTICLE 5 — OBLIGATIONS DU CLIENT\n\n5.1 Le Client s\'engage à fournir au Prestataire, en temps utile, toutes les informations et documents nécessaires à la bonne exécution de la prestation.\n\n5.2 Le Client s\'engage à collaborer activement avec le Prestataire et à désigner un interlocuteur disponible et habilité à prendre les décisions nécessaires.\n\n5.3 Le Client s\'engage à régler les sommes dues aux échéances prévues au présent contrat.\n\n5.4 Le Client s\'engage à ne pas utiliser les livrables fournis par le Prestataire à des fins illicites ou contraires à l\'ordre public.'
        ),

        // ── Article 6 ──
        b('legal_article',
          'ARTICLE 6 — DROIT DE RÉTRACTATION (OBLIGATOIRE — Contrat consommateur)\n\n6.1 Conformément aux articles L.221-18 à L.221-28 du Code de la consommation, le Client consommateur dispose d\'un délai de QUATORZE (14) JOURS CALENDAIRES à compter de la date de signature du présent contrat pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.\n\n6.2 Pour exercer ce droit, le Client doit notifier sa décision de rétractation au Prestataire, avant l\'expiration du délai susmentionné, au moyen d\'une déclaration dénuée d\'ambiguïté (par exemple, lettre recommandée avec accusé de réception, e-mail) à l\'adresse suivante : {{prestataire_adresse}} / {{client_email}}.\n\n6.3 En cas d\'exercice du droit de rétractation, le Prestataire remboursera au Client tous les paiements reçus, au plus tard dans les 14 jours à compter de la date à laquelle le Prestataire est informé de la décision de rétractation, en utilisant le même moyen de paiement que celui utilisé pour la transaction initiale.\n\n6.4 Si le Client a expressément demandé que l\'exécution de la prestation commence avant l\'expiration du délai de rétractation (case à cocher ci-dessous), il sera redevable d\'un montant proportionnel aux services fournis jusqu\'à la date de notification de la rétractation.\n\n☐ Je demande expressément que l\'exécution commence avant l\'expiration du délai de rétractation et je reconnais perdre mon droit de rétractation une fois la prestation entièrement exécutée.'
        ),

        // ── Article 7 ──
        b('legal_article',
          'ARTICLE 7 — RÉSILIATION\n\n7.1 En cas de manquement grave de l\'une ou l\'autre des Parties à ses obligations contractuelles, la Partie lésée pourra résilier de plein droit le présent contrat, après mise en demeure adressée par lettre recommandée avec accusé de réception restée sans effet pendant quinze (15) jours calendaires.\n\n7.2 En cas de résiliation aux torts du Prestataire, celui-ci remboursera au Client les sommes perçues au titre des prestations non réalisées dans un délai de 14 jours.\n\n7.3 En cas de résiliation aux torts du Client sans motif légitime, les sommes déjà versées resteront acquises au Prestataire à titre d\'indemnité forfaitaire, sans préjudice de tout dommage et intérêt supplémentaire.\n\n7.4 La résiliation prend effet à la date de réception de la lettre recommandée ou à l\'expiration du délai de 15 jours mentionné au 7.1.'
        ),

        // ── Article 8 ──
        b('legal_article',
          'ARTICLE 8 — RESPONSABILITÉ ET GARANTIES\n\n8.1 Le Prestataire est tenu à une obligation de moyens dans l\'exécution de sa prestation. Il ne saurait être tenu responsable des dommages indirects, immatériels ou consécutifs subis par le Client, tels que perte de chiffre d\'affaires, perte de données ou préjudice commercial.\n\n8.2 La responsabilité totale du Prestataire au titre du présent contrat est expressément limitée au montant hors taxes effectivement perçu par le Prestataire au titre de la prestation concernée.\n\n8.3 Le Prestataire ne saurait être tenu responsable des défaillances causées par le Client, notamment en cas de fourniture d\'informations inexactes, incomplètes ou tardives.\n\n8.4 La garantie légale de conformité s\'applique aux prestations de services numériques conformément aux articles L.217-1 et suivants du Code de la consommation.'
        ),

        // ── Article 9 ──
        b('legal_article',
          'ARTICLE 9 — PROPRIÉTÉ INTELLECTUELLE\n\n9.1 Sous réserve du règlement intégral des sommes dues, le Client acquiert la pleine propriété des livrables produits spécifiquement pour lui dans le cadre de la présente prestation.\n\n9.2 Le Prestataire conserve la propriété exclusive de l\'ensemble de ses outils, méthodes, savoir-faire, logiciels, frameworks et technologies préexistants utilisés pour réaliser la prestation. Ces éléments ne font pas partie des livrables transférés au Client.\n\n9.3 Le Prestataire est autorisé à mentionner la réalisation de la prestation dans ses références commerciales, son site internet et ses supports de communication, sauf opposition expresse écrite du Client dans les 30 jours suivant la livraison.\n\n9.4 Le Client garantit au Prestataire qu\'il détient tous les droits nécessaires sur les éléments (textes, images, logos, etc.) qu\'il lui fournit dans le cadre de la prestation.'
        ),

        // ── Article 10 ──
        b('legal_article',
          'ARTICLE 10 — CONFIDENTIALITÉ\n\n10.1 Chacune des Parties s\'engage à considérer comme strictement confidentielles toutes les informations, documents, données techniques, financières ou commerciales échangés dans le cadre du présent contrat et à ne pas les divulguer à des tiers sans l\'accord écrit préalable de l\'autre Partie.\n\n10.2 Cette obligation de confidentialité demeurera en vigueur pendant toute la durée du contrat et pour une période de deux (2) ans après son expiration ou sa résiliation.\n\n10.3 Elle ne s\'applique pas aux informations déjà connues du public, à celles que l\'une des Parties était légalement tenue de divulguer, ou à celles reçues légitimement d\'un tiers non soumis à une obligation de confidentialité.'
        ),

        // ── Article 11 ──
        b('legal_article',
          'ARTICLE 11 — FORCE MAJEURE\n\n11.1 Aucune des Parties ne pourra être tenue responsable de l\'inexécution de ses obligations contractuelles si cette inexécution résulte d\'un événement de force majeure au sens de l\'article 1218 du Code civil, à savoir un événement extérieur, imprévisible et irrésistible.\n\n11.2 Constituent notamment des cas de force majeure : les catastrophes naturelles, les actes de guerre ou de terrorisme, les épidémies officiellement déclarées, les grèves générales, les défaillances massives d\'infrastructure Internet ou d\'électricité.\n\n11.3 La Partie empêchée devra notifier l\'autre Partie dans les 48 heures suivant la survenance de l\'événement. Les obligations des deux Parties seront suspendues pendant la durée de l\'événement. Si celui-ci dure plus de 30 jours, chaque Partie pourra résilier le contrat sans indemnité.'
        ),

        // ── Article 12 ──
        b('legal_article',
          'ARTICLE 12 — DONNÉES PERSONNELLES (RGPD)\n\n12.1 Dans le cadre de l\'exécution du présent contrat, le Prestataire est amené à collecter et traiter des données personnelles relatives au Client (nom, prénom, adresse, e-mail, téléphone). Ces données sont traitées conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679) et à la loi Informatique et Libertés du 6 janvier 1978 modifiée.\n\n12.2 Les données sont collectées pour les finalités suivantes : exécution du contrat, gestion de la relation client, facturation et obligations légales. Elles sont conservées pendant la durée du contrat et pour une période de 5 ans à compter de sa fin, conformément aux obligations légales de conservation.\n\n12.3 Le Client dispose des droits suivants sur ses données personnelles : droit d\'accès, de rectification, d\'effacement (« droit à l\'oubli »), de limitation du traitement, d\'opposition et de portabilité. Ces droits peuvent être exercés en contactant le Prestataire à l\'adresse : {{client_email}} ou par courrier au {{prestataire_adresse}}.\n\n12.4 En cas de réclamation, le Client peut également saisir la Commission Nationale de l\'Informatique et des Libertés (CNIL) à l\'adresse : www.cnil.fr.'
        ),

        // ── Article 13 ──
        b('legal_article',
          'ARTICLE 13 — MÉDIATION ET RÈGLEMENT DES LITIGES\n\n13.1 En cas de litige entre les Parties, celles-ci s\'engagent à rechercher une solution amiable avant tout recours judiciaire.\n\n13.2 Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, le Prestataire propose un dispositif de médiation de la consommation. Le Client peut recourir gratuitement au médiateur compétent. Les coordonnées du médiateur sont disponibles sur demande auprès du Prestataire.\n\n13.3 Le Client peut également recourir à la plateforme européenne de règlement en ligne des litiges (RLL) accessible à l\'adresse : https://ec.europa.eu/consumers/odr.\n\n13.4 À défaut de résolution amiable, tout litige relatif à la conclusion, l\'interprétation ou l\'exécution du présent contrat sera soumis à la compétence des juridictions françaises selon les règles de droit commun applicables.'
        ),

        // ── Article 14 ──
        b('legal_article',
          'ARTICLE 14 — LOI APPLICABLE ET JURIDICTION\n\n14.1 Le présent contrat est régi et interprété conformément au droit français, et notamment aux dispositions du Code civil et du Code de la consommation.\n\n14.2 En cas de litige non résolu par voie amiable ou de médiation, compétence exclusive est attribuée aux tribunaux du ressort du domicile du Client, conformément à l\'article R.631-3 du Code de la consommation qui protège le consommateur.\n\n14.3 Toute clause contraire aux dispositions d\'ordre public protégeant les consommateurs est réputée non écrite, sans affecter la validité du reste du contrat.'
        ),

        // ── Séparateur ──
        b('divider', ''),

        // ── Signatures ──
        b('signature_block',
          'Fait à {{client_ville}}, le {{date_signature}}, en deux (2) exemplaires originaux, dont un remis à chaque Partie.\n\nJe soussigné(e), {{client_prenom}} {{client_nom}}, reconnais avoir reçu l\'ensemble des documents contractuels, les avoir lus et en accepter les conditions sans réserve.\n\nLe Client reconnaît également avoir été informé de son droit de rétractation de 14 jours.'
        ),

        // ── Mandat SEPA ──
        b('sepa_mandate',
          'Nom créancier: {{prestataire_nom}}\nICS (Identifiant Créancier SEPA): ___________________\nAdresse créancier: {{prestataire_adresse}}'
        ),

        // ── Formulaire de rétractation ──
        b('retraction_form',
          'Je soussigné(e), {{client_prenom}} {{client_nom}}, déclare renoncer au contrat N° {{numero_contrat}} conclu avec {{prestataire_nom}} le {{date_signature}}.\n\nCe formulaire est à renvoyer au plus tard 14 jours calendaires après la date de conclusion du contrat, par lettre recommandée avec accusé de réception à :\n{{prestataire_nom}} — Service Rétractation — {{prestataire_adresse}}'
        ),

        // ── Mentions légales ──
        b('info_box',
          '{{prestataire_nom}} — SIRET {{prestataire_siret}} — N° TVA {{prestataire_tva}}\n{{prestataire_adresse}}\nContrat soumis au droit français — Version {{version_contrat}}\nDocument conforme aux dispositions du Code civil et du Code de la consommation français'
        ),
      ];

    case 'b2b':
      return [
        b('contract_header','entreprise: {{prestataire_nom}}\nadresse: {{prestataire_adresse}}\nsiret: {{prestataire_siret}}\ntva: {{prestataire_tva}}\ntitre: CONTRAT DE PRESTATION DE SERVICES B2B\nnumero: {{numero_contrat}}\nversion: {{version_contrat}}'),
        b('parties',       '{{prestataire_nom}}, immatriculée au RCS sous le N° {{prestataire_siret}}, N° TVA {{prestataire_tva}}, dont le siège est situé {{prestataire_adresse}}, ci-après désignée « le Prestataire »,\n\nEt :\n\nLa société {{client_entreprise}}, représentée par {{client_representant}}, immatriculée au RCS sous le N° {{client_siret}}, N° TVA intracommunautaire {{client_tva}}, dont le siège social est situé au {{client_adresse}}, ci-après désignée « le Client ».'),
        b('form_fields',   'COORDONNÉES DE L\'ENTREPRISE CLIENT\n\nRaison sociale: ______________________________________________________________\nReprésentant légal: ___________________________________________________________\nSIRET: _________________________________ N° TVA: ____________________________\nAdresse siège: _______________________________________________________________\nCode postal: _____________ Ville: _____________________________________________\nE-mail: ____________________________ Tél: _____________________________________'),
        b('definitions',   'Service: {{description_prestation}} telle que décrite à l\'Article 1\nPrestataire: {{prestataire_nom}}, société immatriculée sous le N° SIRET {{prestataire_siret}}\nClient: la société {{client_entreprise}}, représentée par {{client_representant}}\nUtilisateur: toute personne autorisée par le Client à utiliser le Service\nLivrables: les résultats produits dans le cadre de la prestation\nContrat: le présent accord et l\'ensemble de ses annexes'),
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
      // Web Legal Pack — 3 documents distincts selon subType
      if ((window as any).__webSubType === 'cgu') return [
        b('contract_header','entreprise: {{nom_site}}\nadresse: {{adresse_vendeur}}\nsiret: {{siret_vendeur}}\ntva: \ntitre: CONDITIONS GÉNÉRALES D\'UTILISATION (CGU)\nnumero: {{url_site}}\nversion: {{version_contrat}}'),
        b('info_box',       'Plateforme : {{nom_site}} | URL : {{url_site}} | Contact : {{email_contact}}'),
        b('legal_article',  '1. OBJET DES CGU\n\n1.1 Les présentes Conditions Générales d\'Utilisation définissent les règles d\'accès et d\'usage de la plateforme {{nom_site}} accessible à l\'adresse {{url_site}}.\n\n1.2 Tout accès à la plateforme implique l\'acceptation pleine et sans réserve des présentes CGU.'),
        b('legal_article',  '2. ACCÈS À LA PLATEFORME\n\n2.1 L\'accès à {{nom_site}} est disponible 24h/24 et 7j/7, sauf interruption technique pour maintenance.\n\n2.2 L\'éditeur se réserve le droit de suspendre temporairement l\'accès pour des opérations de maintenance, sans préavis ni indemnité.'),
        b('legal_article',  '3. CRÉATION ET GESTION DE COMPTE\n\n3.1 L\'accès à certaines fonctionnalités requiert la création d\'un compte. L\'Utilisateur s\'engage à fournir des informations exactes et à jour.\n\n3.2 L\'Utilisateur est seul responsable de la confidentialité de ses identifiants. Toute utilisation depuis son compte est réputée faite par lui.\n\n3.3 {{nom_site}} se réserve le droit de supprimer tout compte inactif depuis plus de 12 mois, après notification préalable.'),
        b('legal_article',  '4. OBLIGATIONS DE L\'UTILISATEUR\n\n4.1 L\'Utilisateur s\'engage à utiliser la plateforme conformément à sa destination et aux présentes CGU.\n\n4.2 L\'Utilisateur s\'interdit notamment de :\n- Tenter de pirater, perturber ou saturer les serveurs\n- Publier des contenus illicites, offensants ou portant atteinte aux droits de tiers\n- Utiliser la plateforme à des fins commerciales non autorisées\n- Extraire des données par scraping ou tout procédé automatisé'),
        b('legal_article',  '5. PROPRIÉTÉ INTELLECTUELLE\n\n5.1 L\'ensemble des éléments de la plateforme (logo, textes, design, code source) est protégé par le droit d\'auteur et appartient à {{nom_site}} ou à ses partenaires.\n\n5.2 Toute reproduction, représentation ou exploitation non autorisée est strictement interdite et constitue une contrefaçon sanctionnée pénalement.'),
        b('legal_article',  '6. RESPONSABILITÉ DE LA PLATEFORME\n\n6.1 {{nom_site}} ne garantit pas l\'absence d\'erreurs, d\'interruptions ou de virus. L\'Utilisateur utilise la plateforme sous sa propre responsabilité.\n\n6.2 La responsabilité de {{nom_site}} ne saurait être engagée pour les dommages indirects résultant de l\'utilisation de la plateforme.'),
        b('legal_article',  '7. MODIFICATIONS DES CGU\n\n7.1 {{nom_site}} se réserve le droit de modifier les présentes CGU à tout moment.\n\n7.2 L\'Utilisateur sera informé des modifications par e-mail ou par une notification sur la plateforme. La poursuite de l\'utilisation vaut acceptation des nouvelles CGU.'),
        b('legal_article',  '8. LOI APPLICABLE\n\nLes présentes CGU sont régies par le droit français. Tout litige est soumis aux tribunaux compétents du ressort du siège social de {{nom_site}}.'),
        b('divider',        ''),
        b('info_box',       '{{nom_site}} — SIRET {{siret_vendeur}} — {{adresse_vendeur}}\nVersion des CGU : {{version_contrat}}'),
      ];

      if ((window as any).__webSubType === 'privacy') return [
        b('contract_header','entreprise: {{nom_site}}\nadresse: {{adresse_vendeur}}\nsiret: {{siret_vendeur}}\ntva: \ntitre: POLITIQUE DE CONFIDENTIALITÉ & PROTECTION DES DONNÉES\nnumero: {{url_site}}\nversion: {{version_contrat}}'),
        b('definitions',    'Données personnelles: toute information permettant d\'identifier une personne physique\nResponsable de traitement: {{nom_site}}, SIRET {{siret_vendeur}}\nDPO: délégué à la protection des données — {{email_contact}}\nRGPD: Règlement Général sur la Protection des Données (UE) 2016/679\nConsentement: accord libre, éclairé et non équivoque de la personne concernée'),
        b('legal_article',  '1. RESPONSABLE DU TRAITEMENT\n\n1.1 Le responsable du traitement des données personnelles collectées via {{url_site}} est :\n{{nom_site}}, {{adresse_vendeur}}, SIRET {{siret_vendeur}}.\n\n1.2 Contact DPO : {{email_contact}}'),
        b('legal_article',  '2. DONNÉES COLLECTÉES\n\n2.1 Nous collectons les catégories de données suivantes :\n• Données d\'identification : nom, prénom, adresse e-mail, téléphone\n• Données de connexion : adresse IP, cookies, logs\n• Données transactionnelles : commandes, paiements, historique\n• Données de navigation : pages visitées, durée de session\n\n2.2 Ces données sont collectées directement auprès de vous lors de votre inscription, commande, ou navigation sur {{url_site}}.'),
        b('legal_article',  '3. FINALITÉS ET BASES LÉGALES\n\n3.1 Vos données sont traitées pour les finalités suivantes :\n• Exécution du contrat : traitement des commandes et livraisons\n• Obligation légale : facturation, comptabilité (5 ans)\n• Intérêt légitime : amélioration du service, sécurité\n• Consentement : newsletters et communications marketing (révocable à tout moment)'),
        b('legal_article',  '4. DURÉE DE CONSERVATION\n\n4.1 Les données sont conservées pour les durées suivantes :\n• Données client actif : durée de la relation commerciale + 3 ans\n• Données comptables et factures : 10 ans (obligation légale)\n• Données de connexion et logs : 12 mois\n• Données marketing (avec consentement) : 3 ans à compter du dernier contact\n\n4.2 À l\'issue de ces délais, vos données sont supprimées ou anonymisées.'),
        b('legal_article',  '5. DESTINATAIRES DES DONNÉES\n\n5.1 Vos données sont susceptibles d\'être transmises aux catégories de destinataires suivantes :\n• Prestataires techniques (hébergement, paiement, e-mailing)\n• Partenaires logistiques (transport et livraison)\n• Autorités légales sur demande judiciaire\n\n5.2 Aucune donnée n\'est vendue à des tiers à des fins commerciales.'),
        b('legal_article',  '6. VOS DROITS (RGPD)\n\n6.1 Conformément au RGPD, vous disposez des droits suivants :\n• Droit d\'accès : obtenir une copie de vos données\n• Droit de rectification : corriger des données inexactes\n• Droit à l\'effacement (« droit à l\'oubli »)\n• Droit à la limitation du traitement\n• Droit à la portabilité de vos données\n• Droit d\'opposition au traitement à des fins de prospection\n\n6.2 Pour exercer vos droits, contactez : {{email_contact}} ou par courrier au {{adresse_vendeur}}.\n\n6.3 En cas de réponse insatisfaisante, vous pouvez saisir la CNIL : www.cnil.fr'),
        b('legal_article',  '7. COOKIES\n\n7.1 {{url_site}} utilise des cookies pour le bon fonctionnement du site, l\'analyse d\'audience et la personnalisation.\n\n7.2 Les cookies non essentiels nécessitent votre consentement préalable. Vous pouvez gérer vos préférences via notre bandeau de cookies ou dans les paramètres de votre navigateur.\n\n7.3 Types de cookies utilisés :\n• Cookies essentiels (session, sécurité) — durée : session\n• Cookies analytiques (Google Analytics) — durée : 13 mois\n• Cookies marketing (si consentement) — durée : 13 mois'),
        b('legal_article',  '8. SÉCURITÉ\n\n8.1 {{nom_site}} met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, divulgation, altération ou destruction (chiffrement SSL/TLS, accès restreint, sauvegardes régulières).\n\n8.2 En cas de violation de données susceptible d\'engendrer un risque pour vos droits, vous serez notifié dans les 72 heures conformément à l\'article 34 du RGPD.'),
        b('divider',        ''),
        b('info_box',       '{{nom_site}} — SIRET {{siret_vendeur}} — DPO : {{email_contact}}\nPolitique de confidentialité — {{version_contrat}}\nConforme au RGPD (Règlement UE 2016/679) et à la loi Informatique et Libertés'),
      ];

      // default: CGV
      return [
        b('contract_header','entreprise: {{nom_site}}\nadresse: {{adresse_vendeur}}\nsiret: {{siret_vendeur}}\ntva: \ntitre: CONDITIONS GÉNÉRALES DE VENTE (CGV)\nnumero: {{url_site}}\nversion: {{version_contrat}}'),
        b('info_box',       'Vendeur : {{nom_site}} | Site : {{url_site}} | SIRET : {{siret_vendeur}} | Adresse : {{adresse_vendeur}} | Contact : {{email_contact}}'),
        b('legal_article',  '1. OBJET ET CHAMP D\'APPLICATION\n\n1.1 Les présentes Conditions Générales de Vente régissent toutes les ventes conclues par {{nom_site}} avec ses clients consommateurs via le site {{url_site}}.\n\n1.2 La validation d\'une commande implique l\'acceptation pleine et entière des présentes CGV, qui prévalent sur tout autre document publicitaire ou informatif.'),
        b('legal_article',  '2. PRODUITS ET SERVICES\n\n2.1 {{nom_site}} présente ses produits et services avec le maximum de précision. Toutefois, des erreurs ou omissions peuvent survenir.\n\n2.2 Les offres sont valables dans la limite des stocks disponibles. {{nom_site}} se réserve le droit de modifier son catalogue sans préavis.'),
        b('legal_article',  '3. PRIX\n\n3.1 Les prix sont indiqués en euros, toutes taxes comprises (TTC), hors frais de livraison éventuels.\n\n3.2 {{nom_site}} se réserve le droit de modifier ses prix à tout moment. Le prix applicable est celui affiché au moment de la validation de la commande.\n\n3.3 En cas d\'erreur manifeste de prix, {{nom_site}} se réserve le droit d\'annuler la commande avec remboursement intégral.'),
        b('legal_article',  '4. COMMANDE ET VALIDATION\n\n4.1 Toute commande vaut acceptation des présentes CGV et des prix en vigueur.\n\n4.2 {{nom_site}} adresse une confirmation de commande par e-mail dans les 24 heures suivant la validation.\n\n4.3 {{nom_site}} se réserve le droit de refuser toute commande pour motif légitime.'),
        b('legal_article',  '5. PAIEMENT\n\n5.1 Le paiement s\'effectue comptant à la commande, par les moyens acceptés sur le site.\n\n5.2 Le paiement en ligne est sécurisé par chiffrement SSL. {{nom_site}} ne conserve aucune donnée bancaire.\n\n5.3 En cas de défaut de paiement, {{nom_site}} se réserve le droit de suspendre ou annuler la commande.'),
        b('legal_article',  '6. LIVRAISON\n\n6.1 Les commandes sont expédiées sous {{delai_livraison}} à compter de la validation du paiement.\n\n6.2 Les délais de livraison sont donnés à titre indicatif. Tout retard supérieur à 7 jours ouvrés ouvre droit à l\'annulation et au remboursement intégral.\n\n6.3 Les risques liés au transport sont transférés à l\'acheteur dès la remise au transporteur.'),
        b('legal_article',  '7. DROIT DE RÉTRACTATION\n\n7.1 Conformément aux articles L.221-18 et suivants du Code de la consommation, le Client dispose d\'un délai de 14 jours calendaires à compter de la réception pour exercer son droit de rétractation, sans justification.\n\n7.2 Les retours s\'effectuent selon la politique de retour : {{politique_retour}}.\n\n7.3 Le remboursement intervient dans les 14 jours suivant la réception du retour, via le même moyen de paiement.'),
        b('legal_article',  '8. GARANTIES\n\n8.1 Garantie légale de conformité : 2 ans à compter de la délivrance (art. L.217-4 et s. C. conso.).\n\n8.2 Garantie légale contre les vices cachés : art. 1641 et s. Code civil.\n\n8.3 Ces garanties légales ne préjugent pas des garanties commerciales éventuelles.'),
        b('legal_article',  '9. MÉDIATION ET LITIGES\n\n9.1 En cas de litige non résolu amiablement, le Client peut recourir gratuitement au médiateur : {{mediateur_nom}}.\n\n9.2 Plateforme européenne de résolution en ligne des litiges : https://ec.europa.eu/consumers/odr\n\n9.3 À défaut de résolution amiable, les tribunaux français sont compétents.'),
        b('legal_article',  '10. LOI APPLICABLE\n\nLes présentes CGV sont soumises au droit français. Compétence est attribuée aux tribunaux du domicile du consommateur.'),
        b('divider',        ''),
        b('info_box',       '{{nom_site}} — SIRET {{siret_vendeur}} — {{adresse_vendeur}}\nCGV — {{version_contrat}} — Conformes au Code de la consommation français'),
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

    case 'abonnement':
      return [
        // ── En-tête ──
        b('contract_header',
          'entreprise: {{prestataire_nom}}\nadresse: {{prestataire_adresse}}\nsiret: {{prestataire_siret}}\ntva: {{prestataire_tva}}\ntitre: CONTRAT D\'ABONNEMENT — {{nom_offre}}\nnumero: {{numero_contrat}}\nversion: {{version_contrat}}'
        ),

        // ── Demande d'inscription ──
        b('heading', 'DEMANDE D\'INSCRIPTION — {{nom_offre}}'),
        b('form_fields',
          'COORDONNÉES DU CLIENT\n\nCivilité: ☐ M.  ☐ Mme\nNom: _____________________________ Prénom: _____________________________\nAdresse: _________________________________________________________________\nCode postal: _____________ Ville: _____________________________________________\nE-mail: ____________________________ Tél mobile: ______________________________\nPréférence de contact: ☐ Mail  ☐ Courrier\n\nNom du conseiller: {{nom_conseiller}}'
        ),

        // ── Offre choisie ──
        b('checkbox_group',
          'CHOIX DU FORFAIT\n\n☐ {{nom_offre}} — {{montant_mensuel}} € TTC/mois\n☐ Option Carte eSIM (+5,00 € / mois)\n\nPériodicité de paiement: ☐ Mensuelle  ☐ Trimestrielle  ☐ Semestrielle  ☐ Annuelle'
        ),

        // ── Parties ──
        b('parties',
          '{{prestataire_nom}}, société immatriculée au RCS sous le N° SIRET {{prestataire_siret}}, N° TVA {{prestataire_tva}}, dont le siège est situé au {{prestataire_adresse}}, ci-après désignée « l\'Opérateur »,\n\nEt :\n\nM./Mme {{client_prenom}} {{client_nom}}, demeurant au {{client_adresse}}, {{client_code_postal}} {{client_ville}}, joignable à {{client_email}} / {{client_telephone}}, agissant en qualité de consommateur, ci-après désigné(e) « l\'Abonné ».'
        ),

        // ── Préambule ──
        b('info_box',
          'PRÉAMBULE\n\nLes présentes Conditions Générales d\'Abonnement régissent l\'offre {{nom_offre}} proposée par {{prestataire_nom}}. Elles s\'appliquent conjointement au bon de commande et à la Fiche d\'Information Standardisée (FIS) remis à l\'Abonné au moment de la souscription.\n\nLa souscription implique l\'acceptation pleine et entière des présentes conditions, qui prévalent sur tout autre document publicitaire ou informatif.'
        ),

        // ── Article 1 ──
        b('legal_article',
          'ARTICLE 1 — OBJET ET DESCRIPTION DE L\'OFFRE\n\n1.1 Le présent contrat a pour objet la fourniture par l\'Opérateur du service d\'abonnement suivant : {{description_offre}}.\n\n1.2 Le service est fourni sur les réseaux de {{operateur_reseau}} en France métropolitaine. Les débits et performances peuvent varier selon la couverture réseau, la charge des cellules et les conditions d\'utilisation. Ces performances ne peuvent faire l\'objet d\'une garantie contractuelle de résultat.\n\n1.3 L\'Abonné reconnaît avoir reçu et pris connaissance de la Fiche d\'Information Standardisée (FIS) préalablement à la conclusion du présent contrat, conformément aux exigences du Code des postes et communications électroniques.'
        ),

        // ── Article 2 ──
        b('legal_article',
          'ARTICLE 2 — DURÉE ET CONDITIONS D\'ENGAGEMENT\n\n2.1 Le présent contrat est conclu pour une durée {{duree_engagement}}, à compter de la date d\'activation effective du service.\n\n2.2 L\'activation intervient dans un délai de {{delai_activation}} à compter de la validation de la commande, de la réception du paiement des frais de mise en service et de la livraison complète de l\'équipement, le cas échéant.\n\n2.3 En cas de contrat avec engagement minimum, toute résiliation anticipée en dehors des motifs légitimes prévus à l\'Article 7 entraîne la facturation de frais de clôture administrative de {{frais_resiliation}} € TTC.'
        ),

        // ── Article 3 ──
        b('article', 'ARTICLE 3 — TARIFS ET FACTURATION'),
        b('pricing_ttc',
          'description: Abonnement mensuel {{nom_offre}}\nmontant_ht: ____\ntva_rate: 20\nmontant_tva: ____\nmontant_ttc: {{montant_mensuel}}'
        ),
        b('legal_article',
          '3.1 Le prix de l\'abonnement est de {{montant_mensuel}} € TTC par mois, payable d\'avance.\n\n3.2 Des frais complémentaires sont susceptibles de s\'appliquer :\n• Frais de mise en service : {{frais_activation}} € TTC (prélevés à l\'activation)\n• Frais de clôture administrative : {{frais_resiliation}} € TTC (hors motif légitime)\n• Frais de rejet de prélèvement : 15,00 € TTC\n• Frais de non-restitution du matériel : {{frais_non_restitution}} € TTC\n\n3.3 Les factures sont adressées mensuellement à l\'Abonné par voie électronique dans son espace client. Sur demande, elles peuvent être envoyées par courrier postal (délai de 10 jours ouvrés).\n\n3.4 En cas d\'impayé, une mise en demeure est adressée à l\'Abonné. À défaut de régularisation dans les 15 jours, l\'Opérateur peut suspendre puis résilier le service. Des intérêts de retard au taux légal majoré seront appliqués.'
        ),

        // ── Mode de paiement ──
        b('checkbox_group',
          'MODE DE PAIEMENT\n\n☐ Prélèvement automatique SEPA (voir mandat joint)\n☐ Autre moyen de paiement\n\n⚠️ Aucun prélèvement ne pourra être effectué avant l\'expiration du délai de 7 jours à compter de la signature, conformément à l\'article L-121-18-2 du Code de la Consommation.'
        ),

        // ── Article 4 ──
        b('legal_article',
          'ARTICLE 4 — USAGE RAISONNABLE ET CONDITIONS D\'UTILISATION\n\n4.1 L\'abonnement est destiné à un usage strictement personnel, résidentiel et non commercial. Tout usage professionnel, commercial ou associatif est exclu.\n\n4.2 Un usage est réputé abusif lorsqu\'il entraîne une consommation régulière et systématique supérieure à {{seuil_usage}} ou lorsqu\'il implique des téléversements automatisés, des services d\'hébergement public ou le partage massif de connexion.\n\n4.3 En cas d\'usage anormal, l\'Opérateur se réserve le droit, après notification, de limiter temporairement le débit ou de suspendre le service jusqu\'à régularisation.\n\n4.4 L\'Abonné s\'engage à utiliser le service conformément à la législation en vigueur et s\'interdit expressément tout usage illicite, frauduleux ou portant atteinte aux droits de tiers.'
        ),

        // ── Article 5 ──
        b('legal_article',
          'ARTICLE 5 — ÉQUIPEMENTS ET MATÉRIEL\n\n5.1 L\'équipement fourni par l\'Opérateur (carte SIM, routeur, câbles et accessoires, le cas échéant) demeure sa propriété exclusive et est mis à disposition de l\'Abonné à titre de prêt d\'usage pour la durée du contrat.\n\n5.2 Toute cession, location, transfert, modification, déverrouillage ou utilisation de la carte SIM dans un autre terminal est strictement interdit.\n\n5.3 L\'Abonné s\'engage à restituer l\'intégralité de l\'équipement dans un délai de 21 jours calendaires suivant la résiliation effective. À défaut de restitution complète dans ce délai, des frais de {{frais_non_restitution}} € TTC seront facturés.\n\n5.4 En cas de dysfonctionnement non imputable à l\'Abonné, un échange standard sera expédié sous 7 à 10 jours ouvrés après validation du diagnostic.'
        ),

        // ── Article 6 ──
        b('legal_article',
          'ARTICLE 6 — DROIT DE RÉTRACTATION (OBLIGATOIRE B2C)\n\n6.1 Conformément à l\'article L.221-18 du Code de la consommation, l\'Abonné dispose d\'un délai de QUATORZE (14) JOURS CALENDAIRES à compter de la réception de l\'équipement pour exercer son droit de rétractation, sans justification ni pénalité.\n\n6.2 L\'exercice de ce droit implique le retour complet de l\'équipement dans son état d\'origine. Les frais de retour sont à la charge de l\'Abonné, sauf défaut avéré du service imputable à l\'Opérateur.\n\n6.3 Si l\'Abonné a expressément demandé que l\'exécution du service commence avant l\'expiration du délai de rétractation, il demeure redevable du paiement au prorata temporis des prestations effectivement fournies jusqu\'à la date de notification de la rétractation (Art. L.221-25 C. conso.).\n\n☐ Je demande expressément l\'exécution immédiate du service avant l\'expiration du délai de rétractation et j\'accepte d\'en être redevable au prorata en cas d\'exercice de ce droit.'
        ),

        // ── Article 7 ──
        b('legal_article',
          'ARTICLE 7 — RÉSILIATION\n\n7.1 L\'Abonné peut résilier son contrat à tout moment, sans frais ni motif, en adressant sa demande à l\'Opérateur par tout moyen (courrier recommandé, espace client en ligne, e-mail avec accusé de réception). La résiliation prend effet au plus tard dans un délai de {{delai_resiliation}} à compter de la réception de la demande.\n\n7.2 Motifs légitimes de résiliation sans frais : modification unilatérale défavorable des conditions, déménagement en zone non couverte, surendettement, hospitalisation longue durée, décès, incapacité, force majeure.\n\n7.3 En dehors de ces motifs légitimes, une résiliation anticipée entraîne la facturation de frais de clôture administrative de {{frais_resiliation}} € TTC.\n\n7.4 L\'Opérateur peut suspendre ou résilier le contrat en cas de non-paiement, d\'usage illicite, de fraude ou d\'utilisation hors conditions contractuelles, après notification préalable.\n\n7.5 Toute modification substantielle des conditions contractuelles ou tarifaires sera portée à la connaissance de l\'Abonné au moins un (1) mois avant sa date d\'entrée en vigueur, lui ouvrant le droit de résilier sans frais.'
        ),

        // ── Article 8 ──
        b('legal_article',
          'ARTICLE 8 — QUALITÉ DE SERVICE ET RESPONSABILITÉ\n\n8.1 L\'Opérateur s\'engage à fournir le service conformément aux présentes conditions et aux règles de l\'art. Toutefois, les performances du réseau dépendent de facteurs externes (couverture, charge des cellules, équipements de l\'Abonné) et ne peuvent faire l\'objet d\'une garantie de résultat.\n\n8.2 La responsabilité totale de l\'Opérateur est expressément limitée à l\'équivalent de trois (3) mois d\'abonnement effectivement payé par l\'Abonné, sauf en cas de faute lourde ou dolosive.\n\n8.3 L\'Opérateur ne saurait être tenu responsable des dommages indirects, immatériels ou consécutifs subis par l\'Abonné.\n\n8.4 L\'Abonné est responsable de la sécurisation de son réseau local (mot de passe Wi-Fi, mises à jour du matériel). L\'Opérateur ne pourra être tenu responsable des dommages résultant d\'une mauvaise configuration ou d\'une négligence de l\'Abonné.'
        ),

        // ── Article 9 ──
        b('legal_article',
          'ARTICLE 9 — DONNÉES PERSONNELLES (RGPD)\n\n9.1 Les données personnelles collectées dans le cadre du présent contrat font l\'objet d\'un traitement par {{prestataire_nom}} en qualité de responsable de traitement, conformément au RGPD (Règlement UE 2016/679) et à la loi Informatique et Libertés.\n\n9.2 Ces données sont utilisées pour : l\'exécution du contrat, la gestion de la relation client, la facturation, les obligations légales et, avec le consentement de l\'Abonné, la prospection commerciale.\n\n9.3 L\'Abonné dispose des droits suivants : accès, rectification, effacement, limitation, opposition et portabilité, exercisables à l\'adresse : {{client_email}} ou par courrier au {{prestataire_adresse}}.\n\n9.4 En cas de réclamation relative à ses données personnelles, l\'Abonné peut saisir la CNIL (www.cnil.fr). Opposition au démarchage téléphonique : www.bloctel.gouv.fr.'
        ),

        // ── Article 10 ──
        b('legal_article',
          'ARTICLE 10 — MÉDIATION ET LOI APPLICABLE\n\n10.1 En cas de litige non résolu amiablement, l\'Abonné peut saisir gratuitement le Médiateur des communications électroniques : {{mediateur_nom}} — {{mediateur_url}} — CS 30342 – 94257 Gentilly Cedex.\n\n10.2 L\'Abonné peut également recourir à la plateforme européenne de résolution en ligne des litiges : https://ec.europa.eu/consumers/odr\n\n10.3 Le présent contrat est régi par le droit français. Compétence expresse est attribuée aux tribunaux du ressort du domicile de l\'Abonné, conformément aux dispositions protectrices du Code de la consommation.'
        ),

        // ── Séparateur ──
        b('divider', ''),

        // ── Signatures ──
        b('signature_block',
          'Fait à {{client_ville}}, le {{date_signature}}\n\nJe soussigné(e), {{client_prenom}} {{client_nom}}, reconnais avoir reçu l\'ensemble des documents contractuels (présentes CGV, Fiche d\'Information Standardisée, Récapitulatif contractuel), les avoir lus et en accepter les conditions sans réserve.\nJe déclare exactes toutes les informations fournies dans le présent document.'
        ),

        // ── Mandat SEPA ──
        b('sepa_mandate',
          'Nom créancier: {{prestataire_nom}}\nICS (Identifiant Créancier SEPA): {{ics_sepa}}\nAdresse créancier: {{prestataire_adresse}}'
        ),

        // ── Formulaire de rétractation ──
        b('retraction_form',
          'Je soussigné(e), {{client_prenom}} {{client_nom}}, déclare renoncer à l\'offre {{nom_offre}} souscrite auprès de {{prestataire_nom}} le {{date_signature}} (N° contrat : {{numero_contrat}}).\n\nCe formulaire est à renvoyer au plus tard 14 jours après la réception de l\'équipement par lettre recommandée avec AR à :\n{{prestataire_nom}} — Service Rétractation — {{prestataire_adresse}}'
        ),

        // ── Mentions légales ──
        b('info_box',
          '{{prestataire_nom}} — SIRET {{prestataire_siret}} — N° TVA {{prestataire_tva}}\n{{prestataire_adresse}}\nService client : {{client_email}} — Réseau : {{operateur_reseau}}\nContrat soumis au droit français — {{version_contrat}}\nOpposez-vous au démarchage téléphonique sur www.bloctel.gouv.fr'
        ),
      ];
  }
}

// ─── Main editor ──────────────────────────────────────────────────────────────

function ContractEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const templateId = searchParams.get('id') || null;
  const name = searchParams.get('name') || 'Nouveau contrat';
  const description = searchParams.get('description') || '';
  const isEditMode = !!templateId;

  const [contractType, setContractType] = useState<ContractType>('b2c');
  const [webSubType, setWebSubType] = useState<'cgv' | 'cgu' | 'privacy'>('cgv');
  const [blocks, setBlocks] = useState<ContractBlock[]>(() => createDefaultBlocks('b2c'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>('blocs');
  const [openCategory, setOpenCategory] = useState<string | null>('Identification & Préambule');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [version, setVersion] = useState(1);

  // Load existing template when editing
  useEffect(() => {
    if (!templateId) return;
    templates.get(templateId)
      .then((data: { content: string }) => {
        try {
          const parsed = JSON.parse(data.content);
          if (parsed.contractType && CONTRACT_TYPES[parsed.contractType as ContractType]) {
            setContractType(parsed.contractType as ContractType);
          }
          if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) setBlocks(parsed.blocks);
          if (parsed.version) setVersion(parsed.version);
        } catch { /* not JSON — keep defaults */ }
      })
      .catch(() => { /* template not found */ });
  }, [templateId]);

  const typeConfig = CONTRACT_TYPES[contractType];

  const handleExportPDF = useCallback(async () => {
    const vars = typeConfig.variables as { key: string; sample: string }[];
    const contractHtml = blocks
      .map((block) => `<div style="page-break-inside:avoid;">${renderBlockHTML(block, vars, false)}</div>`)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>${name}</title>
  <style>
    @page { size: A4; margin: 18mm 20mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a1a; margin: 0; padding: 0; line-height: 1.6; }
    mark { background: transparent !important; color: #0f172a !important; font-weight: 600; }
    span[style*="fee2e2"] { background: transparent !important; color: #64748b !important; font-style: italic; }
    table { border-collapse: collapse; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
  </style>
</head>
<body>${contractHtml}</body>
</html>`;

    const toastId = toast.loading('Génération du PDF...');
    try {
      const res = await fetch('http://localhost:3000/templates/render-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ html, name }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF téléchargé', { id: toastId });
    } catch {
      toast.error('Erreur lors de la génération du PDF', { id: toastId });
    }
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
    const newVersion = version + 1;
    const content = JSON.stringify({ contractType, version: newVersion, blocks });
    try {
      if (isEditMode && templateId) {
        await templates.update(templateId, { name, description, type: 3, content });
      } else {
        await templates.create({ name, description, type: 3, content });
      }
      setVersion(newVersion);
      toast.success(isEditMode ? 'Contrat mis à jour' : `Contrat enregistré — v${newVersion}`);
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
                        if (t === 'web') { (window as any).__webSubType = 'cgv'; setWebSubType('cgv'); }
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

          {/* Web Legal Pack sub-type selector */}
          {contractType === 'web' && (
            <div className="flex items-center gap-0.5 ml-1 bg-slate-100 rounded-lg p-0.5">
              {(['cgv', 'cgu', 'privacy'] as const).map((sub) => {
                const labels = { cgv: 'CGV', cgu: 'CGU', privacy: 'Privacy' };
                return (
                  <button
                    key={sub}
                    onClick={() => {
                      (window as any).__webSubType = sub;
                      setWebSubType(sub);
                      setBlocks(createDefaultBlocks('web'));
                      setSelectedId(null);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      webSubType === sub ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {labels[sub]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <span className="text-sm font-medium text-foreground/80 truncate max-w-xs">{name}</span>

        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors">
            <Download size={13} /> Exporter PDF
          </button>
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50">
            <Save size={13} /> {isSaving ? 'Enregistrement...' : isEditMode ? 'Mettre à jour' : 'Enregistrer'}
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
