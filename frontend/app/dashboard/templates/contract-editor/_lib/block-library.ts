export const BLOCK_LIBRARY: { type: string; label: string; description: string; color: string; build: () => Record<string, unknown> }[] = [
  {
    type: 'contractHeader', label: 'En-tête contrat',
    description: 'Logo, société, référence, titre',
    color: 'bg-slate-800 text-slate-100 border-slate-600',
    build: () => ({
      type: 'contractHeader',
      attrs: {
        logoUrl: '', companyVar: 'prestataire_nom', addressVar: 'prestataire_adresse',
        siretVar: 'prestataire_siret', tvaVar: 'prestataire_tva',
        numberVar: 'numero_contrat', versionVar: 'version_contrat', dateVar: 'date_contrat',
      },
      content: [{ type: 'text', text: 'CONTRAT DE PRESTATION DE SERVICES' }],
    }),
  },
  {
    type: 'financialBlock', label: 'Récapitulatif financier',
    description: 'Tableau HT / TVA / TTC',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    build: () => ({ type: 'financialBlock' }),
  },
  {
    type: 'definitionsBlock', label: 'Définitions',
    description: 'Liste de termes contractuels',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    build: () => ({
      type: 'definitionsBlock',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Service : prestation décrite à l\'article 1.' }] }],
    }),
  },
  {
    type: 'partiesBlock', label: 'Parties',
    description: 'Bloc d\'introduction des parties',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    build: () => ({
      type: 'partiesBlock',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Entre les soussignés…' }] }],
    }),
  },
  {
    type: 'infoBox', label: 'Encadré info',
    description: 'Préambule, mention légale',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    build: () => ({
      type: 'infoBox',
      attrs: { variant: 'info', title: 'PRÉAMBULE' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texte d\'introduction…' }] }],
    }),
  },
  {
    type: 'infoBox', label: 'Avertissement',
    description: 'Encadré jaune (warning)',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    build: () => ({
      type: 'infoBox',
      attrs: { variant: 'warning', title: '' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '⚠️ Information importante…' }] }],
    }),
  },
  {
    type: 'formFieldsBlock', label: 'Formulaire',
    description: 'Champs à remplir manuellement',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    build: () => ({
      type: 'formFieldsBlock',
      content: [
        { type: 'paragraph', content: [
          { type: 'text', text: 'Nom : ' },
          { type: 'variable', attrs: { name: 'client_nom', label: null } },
        ] },
        { type: 'paragraph', content: [
          { type: 'text', text: 'Prénom : ' },
          { type: 'variable', attrs: { name: 'client_prenom', label: null } },
        ] },
        { type: 'paragraph', content: [
          { type: 'text', text: 'Email : ' },
          { type: 'variable', attrs: { name: 'client_email', label: null } },
        ] },
        { type: 'paragraph', content: [
          { type: 'text', text: 'Téléphone : ' },
          { type: 'variable', attrs: { name: 'client_telephone', label: null } },
        ] },
        { type: 'paragraph', content: [
          { type: 'text', text: 'Adresse : ' },
          { type: 'variable', attrs: { name: 'client_adresse', label: null } },
        ] },
      ],
    }),
  },
  {
    type: 'checkboxBlock', label: 'Cases à cocher',
    description: 'Liste d\'options sélectionnables',
    color: 'bg-green-50 text-green-700 border-green-200',
    build: () => ({
      type: 'checkboxBlock',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '☐ Option 1' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '☐ Option 2' }] },
      ],
    }),
  },
  {
    type: 'signatureBlock', label: 'Signatures',
    description: 'Lignes de signature',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    build: () => ({ type: 'signatureBlock' }),
  },
  {
    type: 'sepaBlock', label: 'Mandat SEPA',
    description: 'Autorisation de prélèvement',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    build: () => ({ type: 'sepaBlock' }),
  },
  {
    type: 'retractBlock', label: 'Rétractation',
    description: 'Formulaire 14 jours',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    build: () => ({ type: 'retractBlock' }),
  },
];
