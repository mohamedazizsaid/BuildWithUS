import type { DriveStep } from 'driver.js';

// Live editor state the interactive email tour reads to decide when a gated step
// is satisfied (i.e. the user actually performed the action).
export interface EmailTourCtx {
  textCount: number;
  imageCount: number;
  buttonCount: number;
}

// A tour step; when `waitFor` is set the step is "gated" — the Next button is
// hidden and the tour only advances once the predicate becomes true (the user
// did the thing). Steps without `waitFor` advance with the Suivant button.
export interface EmailTourStep extends DriveStep {
  waitFor?: (ctx: EmailTourCtx) => boolean;
}

// ── Interactive email builder tour ──
// Walks a first-timer through building a real welcome email: add a text block,
// an image and a button — each gated on the action actually happening — then
// styling, preview and save. Anchors:
//   left-panel        → the content/layouts panel
//   block-text / block-image / block-button → the block tiles (Contenu tab)
//   canvas            → the editing canvas
//   properties-panel  → the right-hand properties panel
//   btn-preview / btn-save → toolbar actions
export const EMAIL_TOUR_STEPS: EmailTourStep[] = [
  {
    popover: {
      title: '👋 Créons votre premier email',
      description:
        'Suivez le guide : nous allons construire un email de bienvenue ensemble, étape par étape. Vous pourrez le relancer à tout moment via le bouton 🎓 en haut.',
    },
  },
  {
    element: '[data-tour="left-panel"]',
    popover: {
      title: 'Vos blocs de contenu',
      description:
        'Tout part d’ici. Cliquez sur un bloc pour l’ajouter à la page, ou glissez-le où vous voulez.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="block-text"]',
    waitFor: (c) => c.textCount > 0,
    popover: {
      title: '① Ajoutez un texte',
      description:
        'Cliquez sur le bloc <b>Titre</b> ou <b>Paragraphe</b> pour l’ajouter. J’attends que vous le fassiez…',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="canvas"]',
    popover: {
      title: 'Écrivez votre message',
      description:
        'Cliquez sur le texte sur la page et tapez votre message de bienvenue. Puis cliquez sur <b>Suivant</b>.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="block-image"]',
    waitFor: (c) => c.imageCount > 0,
    popover: {
      title: '② Ajoutez une image',
      description:
        'Cliquez sur le bloc <b>Image</b>. Vous pourrez ensuite en importer une depuis le panneau de droite.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="block-button"]',
    waitFor: (c) => c.buttonCount > 0,
    popover: {
      title: '③ Ajoutez un bouton',
      description:
        'Cliquez sur le bloc <b>Bouton</b> — c’est l’appel à l’action de votre email (« Découvrir », « S’inscrire »…).',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="properties-panel"]',
    popover: {
      title: 'Personnalisez le style',
      description:
        'Sélectionnez un bloc, une <b>colonne</b> ou une <b>section</b> pour régler couleurs, polices, bordures, angles arrondis et espacement.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="btn-preview"]',
    popover: {
      title: 'Prévisualisez',
      description: 'Cliquez sur l’œil pour voir le rendu final (bureau, tablette, mobile).',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="btn-save"]',
    popover: {
      title: 'Enregistrez 🎉',
      description:
        'Cliquez sur <b>Enregistrer</b>. Bravo — vous venez de créer votre premier email de bienvenue !',
      side: 'bottom',
      align: 'start',
    },
  },
];

// ── AI assistant tour (informational, advances with Suivant) ──
export const AI_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="ai-input"]',
    popover: {
      title: '🤖 Votre assistant IA',
      description:
        'Décrivez ce que vous voulez en langage naturel — par exemple : « Crée un email de soldes d’été avec un titre en gras et un bouton ».',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="properties-panel"]',
    popover: {
      title: 'Ciblez une partie (optionnel)',
      description:
        'Sélectionnez d’abord un bloc ou une section si vous voulez que l’IA se concentre dessus. Sinon, elle travaille sur tout l’email.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="ai-image"]',
    popover: {
      title: 'À partir d’une affiche',
      description:
        'Importez une affiche ou une image : l’IA la lit et en génère un email éditable.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="ai-send"]',
    popover: {
      title: 'Envoyez et affinez',
      description:
        'Envoyez votre demande et regardez l’IA construire vos blocs. Continuez la conversation pour affiner : « rends le bouton vert », « ajoute un pied de page »…',
      side: 'top',
      align: 'end',
    },
  },
  {
    popover: {
      title: '✨ À vous de jouer !',
      description: 'Votre co-designer IA est prêt — décrivez, il construit. Relancez ce tutoriel quand vous voulez depuis le bouton 🎓.',
    },
  },
];
