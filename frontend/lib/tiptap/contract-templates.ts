import type { JSONContent } from '@tiptap/react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function v(name: string): JSONContent {
  return { type: 'variable', attrs: { name } }
}
function t(text: string, bold?: boolean): JSONContent {
  return bold
    ? { type: 'text', text, marks: [{ type: 'bold' }] }
    : { type: 'text', text }
}
function h1(content: JSONContent[], center?: boolean): JSONContent {
  return { type: 'heading', attrs: { level: 1, textAlign: center ? 'center' : 'left' }, content }
}
function h2(content: JSONContent[]): JSONContent {
  return { type: 'heading', attrs: { level: 2, textAlign: 'left' }, content }
}
function h3(content: JSONContent[]): JSONContent {
  return { type: 'heading', attrs: { level: 3, textAlign: 'left' }, content }
}
// Justified paragraph — standard for contract body text
function p(...content: JSONContent[]): JSONContent {
  return { type: 'paragraph', attrs: { textAlign: 'justify' }, content }
}
// Centered paragraph
function pc(...content: JSONContent[]): JSONContent {
  return { type: 'paragraph', attrs: { textAlign: 'center' }, content }
}
function br(): JSONContent { return { type: 'hardBreak' } }
function hr(): JSONContent { return { type: 'horizontalRule' } }
function li(...content: JSONContent[]): JSONContent {
  return { type: 'listItem', content: [p(...content)] }
}
function ul(...items: JSONContent[]): JSONContent {
  return { type: 'bulletList', content: items }
}

// Professional contract header — 3-column layout with logo, company info,
// contract number/version/date, and the document title below.
function header(title: string, opts: Partial<{
  companyVar: string; addressVar: string; siretVar: string; tvaVar: string;
  numberVar: string; versionVar: string; dateVar: string; logoUrl: string;
}> = {}): JSONContent {
  return {
    type: 'contractHeader',
    attrs: {
      logoUrl:    opts.logoUrl    ?? '',
      companyVar: opts.companyVar ?? 'prestataire_nom',
      addressVar: opts.addressVar ?? 'prestataire_adresse',
      siretVar:   opts.siretVar   ?? 'prestataire_siret',
      tvaVar:     opts.tvaVar     ?? 'prestataire_tva',
      numberVar:  opts.numberVar  ?? 'numero_contrat',
      versionVar: opts.versionVar ?? 'version_contrat',
      dateVar:    opts.dateVar    ?? 'date_contrat',
    },
    content: [{ type: 'text', text: title }],
  }
}

// ─── Contract block helpers ──────────────────────────────────────────────────

function financialBlock(): JSONContent {
  return {
    type: 'financialBlock',
    attrs: {
      title: 'RÉCAPITULATIF FINANCIER',
      descriptionVar: 'description_prestation',
      htVar: 'montant_ht', rateVar: 'taux_tva',
      tvaVar: 'montant_tva', ttcVar: 'montant_ttc',
    },
  }
}

function definitions(...items: { term: string; def: string }[]): JSONContent {
  return {
    type: 'definitionsBlock',
    attrs: { title: 'DÉFINITIONS' },
    content: items.map(({ term, def }) => p(t(term + ' : ', true), t(def))),
  }
}

function infoBox(variant: 'info' | 'warning' | 'success' | 'note', title: string, ...content: JSONContent[]): JSONContent {
  return {
    type: 'infoBox',
    attrs: { variant, title },
    content: content.length > 0 ? content : [p()],
  }
}

function partiesBox(...content: JSONContent[]): JSONContent {
  return { type: 'partiesBlock', content }
}

function signatureBlock(columns = 'Prestataire,Client'): JSONContent {
  return {
    type: 'signatureBlock',
    attrs: { cityVar: 'ville_signature', dateVar: 'date_signature', columns },
  }
}

function sepaBlock(ics = ''): JSONContent {
  return {
    type: 'sepaBlock',
    attrs: { creditorVar: 'prestataire_nom', addressVar: 'prestataire_adresse', ics },
  }
}

function retractBlock(): JSONContent {
  return {
    type: 'retractBlock',
    attrs: {
      firstNameVar: 'client_prenom', lastNameVar: 'client_nom',
      creditorVar: 'prestataire_nom', addressVar: 'prestataire_adresse',
      dateVar: 'date_contrat', numberVar: 'numero_contrat',
    },
  }
}

// ─── Shared party blocks ──────────────────────────────────────────────────────

const PRESTATAIRE_BLOCK: JSONContent = p(
  v('prestataire_nom'),
  t(", societe immatriculee au Registre du Commerce et des Societes sous le N° SIRET "),
  v('prestataire_siret'),
  t(", N° de TVA intracommunautaire "),
  v('prestataire_tva'),
  t(", ayant son siege social au "),
  v('prestataire_adresse'),
  t(", ci-apres designee « le Prestataire »,"),
)

const CLIENT_PARTICULIER_BLOCK: JSONContent = p(
  t("M./Mme "),
  v('client_prenom'), t(" "), v('client_nom'),
  t(", demeurant au "), v('client_adresse'),
  t(", "), v('client_code_postal'), t(" "), v('client_ville'),
  t(", joignable a l'adresse "), v('client_email'),
  t(" et au "), v('client_telephone'),
  t(", ci-apres designe(e) « le Client »,"),
)

const CLIENT_PROFESSIONNEL_BLOCK: JSONContent = p(
  v('client_raison_sociale'),
  t(", societe immatriculee au RCS sous le N° SIRET "),
  v('client_siret'),
  t(", ayant son siege social au "), v('client_adresse'),
  t(", "), v('client_code_postal'), t(" "), v('client_ville'),
  t(", representee par "), v('client_representant'),
  t(" en qualite de "), v('client_qualite'),
  t(", ci-apres designee « le Client »,"),
)

const SIGNATAIRES_BLOCK: JSONContent[] = [
  h2([t("SIGNATURES")]),
  p(
    t("Fait en deux exemplaires originaux a "), v('ville_signature'),
    t(", le "), v('date_signature'), t("."),
  ),
  p(t("Chaque partie reconnait avoir pris connaissance de l'integralite du present contrat et en accepte les termes sans reserve.")),
  p(br()),
  p(
    t("Pour le Prestataire", true), br(),
    t("Nom et qualite du signataire : ___________________________"), br(),
    t("Signature et cachet :"),
  ),
  p(br()),
  p(
    t("Pour le Client", true), br(),
    t("Nom et qualite du signataire : ___________________________"), br(),
    t("Signature : (preceder de la mention « Lu et approuve »)"),
  ),
]

// ─── B2C — Prestation de services a un particulier ────────────────────────────

export const TEMPLATE_B2C: JSONContent = {
  type: 'doc',
  content: [
    header("CONTRAT DE PRESTATION DE SERVICES"),
    pc(t("Contrat conclu entre un professionnel et un consommateur (B2C)", true)),
    hr(),

    h2([t("ENTRE LES SOUSSIGNES")]),
    PRESTATAIRE_BLOCK,
    p(t("D'une part,")),
    p(t("ET")),
    CLIENT_PARTICULIER_BLOCK,
    p(t("D'autre part,")),
    p(t("Il a ete convenu et arrete ce qui suit :")),
    hr(),

    h2([t("ARTICLE 1 — OBJET DU CONTRAT")]),
    p(t("1.1 Le present contrat a pour objet de definir les conditions dans lesquelles le Prestataire s'engage a realiser, pour le compte du Client, la prestation suivante (ci-apres designee « la Prestation ») :")),
    p(v('description_prestation')),
    p(t("1.2 Toute prestation complementaire non expressement visee au present article fera l'objet d'un avenant ecrit, date et signe par les deux parties avant tout commencement d'execution. Le refus du Client de signer un tel avenant ne saurait etre considere comme une inexecution contractuelle du Prestataire.")),
    hr(),

    h2([t("ARTICLE 2 — DUREE DU CONTRAT")]),
    p(
      t("2.1 Le present contrat entre en vigueur a compter du "), v('date_debut'),
      t(" pour une duree de "), v('duree_contrat'),
      t(", soit jusqu'au "), v('date_fin'), t("."),
    ),
    p(t("2.2 A l'issue de la periode contractuelle, le contrat prendra fin de plein droit, sans qu'il soit necessaire de proceder a une formalite quelconque. Il ne se renouvellera que par accord expres et ecrit des deux parties.")),
    hr(),

    h2([t("ARTICLE 3 — REMUNERATION ET MODALITES DE PAIEMENT")]),
    p(
      t("3.1 En contrepartie de la realisation de la Prestation, le Client versera au Prestataire la somme de "),
      v('montant_ht'), t(" € hors taxes, soit "),
      v('montant_ttc'), t(" € toutes taxes comprises (TVA "),
      v('taux_tva'), t(" % — "), v('montant_tva'), t(" €). Le prix est stipule en TTC conformement a la reglementation applicable aux contrats conclus avec des consommateurs."),
    ),
    p(
      t("3.2 Le reglement interviendra selon les modalites suivantes : "),
      v('modalites_paiement'), t("."),
    ),
    p(t("3.3 Tout retard de paiement entrainera l'application de penalites de retard au taux de trois (3) fois le taux d'interet legal en vigueur, ainsi qu'une indemnite forfaitaire de quarante (40) € pour frais de recouvrement, exigibles de plein droit et sans mise en demeure prealable.")),
    p(t("3.4 Le Prestataire se reserve le droit de suspendre l'execution des prestations en cours en cas de non-paiement d'une facture a son echeance, apres mise en demeure restee infructueuse pendant quarante-huit (48) heures.")),
    hr(),

    h2([t("ARTICLE 4 — OBLIGATIONS DU PRESTATAIRE")]),
    p(t("Le Prestataire s'engage a :")),
    ul(
      li(t("Executer la Prestation avec diligence, soin et professionnalisme, dans le strict respect des regles de l'art applicables a son domaine d'activite ;")),
      li(t("Respecter les delais convenus, sauf cas de force majeure ou retard directement imputable au Client ;")),
      li(t("Informer le Client, sans delai, de toute difficulte technique ou pratique susceptible d'affecter la bonne execution ou la qualite attendue de la Prestation ;")),
      li(t("Maintenir la confidentialite de l'ensemble des informations et documents communiques par le Client dans le cadre de l'execution du present contrat ;")),
      li(t("Souscrire et maintenir, pendant toute la duree du contrat, une assurance de responsabilite civile professionnelle aupres d'une compagnie notoirement solvable.")),
    ),
    p(t("Le Prestataire est soumis a une obligation de moyens, sauf stipulation contraire expresse et ecrite convenue entre les parties.")),
    hr(),

    h2([t("ARTICLE 5 — OBLIGATIONS DU CLIENT")]),
    p(t("Le Client s'engage a :")),
    ul(
      li(t("Fournir au Prestataire, en temps utile et dans des formats utilisables, l'ensemble des documents, informations, acces et ressources necessaires a la bonne execution de la Prestation ;")),
      li(t("Regler les factures aux echeances convenues ;")),
      li(t("Nommer un interlocuteur unique, disponible et habilite a prendre les decisions necessaires a l'avancement de la mission ;")),
      li(t("Ne pas diffuser, publier, ni exploiter commercialement les livrables tant que le prix n'a pas ete integralement acquitte ;")),
      li(t("Signaler au Prestataire, dans les plus brefs delais, tout evenement susceptible d'avoir une incidence sur l'execution du contrat.")),
    ),
    hr(),

    h2([t("ARTICLE 6 — PROPRIETE INTELLECTUELLE")]),
    p(t("6.1 L'ensemble des creations, œuvres, livrables et travaux produits par le Prestataire dans le cadre du present contrat demeure sa propriete exclusive jusqu'au paiement integral du prix convenu.")),
    p(t("6.2 Des reception du paiement integral, le Prestataire cede au Client, a titre definitif et exclusif, les droits patrimoniaux d'auteur sur les livrables, pour toute utilisation, sur tout support, pour le monde entier et pour toute la duree legale de protection des droits d'auteur.")),
    p(t("6.3 Le Prestataire conserve le droit de mentionner la realisation de cette Prestation dans ses references commerciales et supports de communication, sauf opposition ecrite du Client motivee par un interet legitime.")),
    p(t("6.4 Le Client garantit qu'il dispose de l'ensemble des droits necessaires sur les elements (textes, images, logos, donnees) qu'il confie au Prestataire. En cas de reclamation d'un tiers, le Client s'engage a garantir le Prestataire de toutes les consequences qui en resulteraient.")),
    hr(),

    h2([t("ARTICLE 7 — CONFIDENTIALITE")]),
    p(t("7.1 Chaque partie s'engage a garder strictement confidentiels et a ne pas divulguer a des tiers les informations qualifiees de confidentielles ou dont la nature implique la confidentialite, obtenues de l'autre partie dans le cadre du present contrat.")),
    p(t("7.2 Cette obligation de confidentialite survivra a l'expiration ou a la resiliation du present contrat pour une duree de cinq (5) ans. Elle cesse de s'appliquer aux informations qui tombent dans le domaine public sans faute de la partie concernee, ou qui lui etaient deja connues anterieurement.")),
    hr(),

    h2([t("ARTICLE 8 — DROIT DE RETRACTATION (CODE DE LA CONSOMMATION)")]),
    p(t("8.1 Conformement aux articles L. 221-18 et suivants du Code de la consommation, le Client particulier dispose d'un delai de quatorze (14) jours calendaires a compter de la conclusion du present contrat pour exercer son droit de retractation, sans avoir a motiver sa decision ni a supporter de penalites.")),
    p(t("8.2 Le Client exercera ce droit en adressant au Prestataire, avant l'expiration du delai susmentionné, le formulaire de retractation disponible en annexe ou toute autre declaration non ambigue exprimant sa volonte de se retracter.")),
    p(t("8.3 Le Client reconnait expressement que, s'il demande expressement l'execution de la Prestation avant l'expiration du delai de retractation, il perd son droit de retractation des lors que la Prestation a ete pleinement executee.")),
    hr(),

    h2([t("ARTICLE 9 — RESPONSABILITE")]),
    p(t("9.1 La responsabilite du Prestataire ne pourra etre engagee qu'en cas de faute prouvee. Elle sera en tout etat de cause limitee au montant total des sommes effectivement percues au titre du present contrat.")),
    p(t("9.2 Le Prestataire ne saurait etre tenu responsable des dommages indirects, immateriels, consecutifs ou punitifs, ni des pertes d'exploitation, de donnees, de chiffre d'affaires ou de benefices du Client, meme s'il a ete informe de leur eventualite.")),
    p(t("9.3 La responsabilite du Prestataire est totalement exclue en cas d'evenement constitutif de force majeure au sens de l'article 1218 du Code civil.")),
    hr(),

    h2([t("ARTICLE 10 — RESILIATION")]),
    p(t("10.1 En cas de manquement grave de l'une des parties a ses obligations contractuelles, la partie leseee pourra, de plein droit, resillier le present contrat huit (8) jours apres une mise en demeure par lettre recommandee avec accuse de reception, restee sans effet.")),
    p(t("10.2 En cas de resiliation aux torts exclusifs du Client, le Prestataire conservera les acomptes deja verses a titre d'indemnite forfaitaire irreductible, sans prejudice de tout dommage-interet complementaire.")),
    p(t("10.3 En cas de resiliation aux torts exclusifs du Prestataire, celui-ci restituera au Client les sommes percues au titre des prestations non executees, deduction faite des travaux realises et justifiables.")),
    hr(),

    h2([t("ARTICLE 11 — PROTECTION DES DONNEES PERSONNELLES (RGPD)")]),
    p(t("11.1 Les donnees a caractere personnel collectees dans le cadre du present contrat sont traitees par le Prestataire en sa qualite de responsable de traitement, conformement au Reglement (UE) 2016/679 (RGPD) et a la loi n° 78-17 du 6 janvier 1978 modifiee.")),
    p(t("11.2 Le Client dispose d'un droit d'acces, de rectification, d'effacement, de limitation, de portabilite et d'opposition concernant ses donnees personnelles. Il peut exercer ces droits en contactant le Prestataire a l'adresse figurant dans les mentions legales.")),
    hr(),

    h2([t("ARTICLE 12 — LOI APPLICABLE ET ATTRIBUTION DE JURIDICTION")]),
    p(t("12.1 Le present contrat est regi exclusivement par le droit francais.")),
    p(t("12.2 En cas de litige relatif a la validite, l'interpretation ou l'execution du present contrat, les parties s'engagent a rechercher une solution amiable dans un delai de trente (30) jours a compter de la notification du differend. A defaut d'accord amiable, le differend sera soumis a la juridiction competente du lieu de residence du Client consommateur, conformement aux regles du Code de la consommation.")),
    hr(),

    ...SIGNATAIRES_BLOCK,

    financialBlock(),
    signatureBlock('Prestataire,Client'),
    retractBlock(),
  ],
}

// ─── B2B — Prestation de services entre professionnels ────────────────────────

export const TEMPLATE_B2B: JSONContent = {
  type: 'doc',
  content: [
    header("CONTRAT DE PRESTATION DE SERVICES"),
    pc(t("Contrat conclu entre professionnels (B2B)", true)),
    hr(),

    h2([t("ENTRE LES SOUSSIGNES")]),
    PRESTATAIRE_BLOCK,
    p(t("D'une part,")),
    p(t("ET")),
    CLIENT_PROFESSIONNEL_BLOCK,
    p(t("D'autre part,")),
    p(t("Il a ete convenu et arrete ce qui suit :")),
    hr(),

    h2([t("ARTICLE 1 — OBJET DU CONTRAT")]),
    p(t("1.1 Le present contrat a pour objet de definir les conditions generales et particulieres dans lesquelles le Prestataire s'engage a fournir au Client les prestations de services suivantes :")),
    p(v('description_prestation')),
    p(t("1.2 Les caracteristiques techniques, les livrables attendus et les indicateurs de performance sont detailles dans le Cahier des Charges annexe au present contrat, lequel en fait partie integrante.")),
    p(t("1.3 Toute prestation hors perimetre fera l'objet d'un avenant ecrit chiffre et valide par les deux parties.")),
    hr(),

    h2([t("ARTICLE 2 — DUREE ET PLANNING")]),
    p(
      t("2.1 Le present contrat entre en vigueur a compter du "),
      v('date_debut'), t(" pour une duree ferme de "), v('duree_contrat'),
      t(", soit jusqu'au "), v('date_fin'), t("."),
    ),
    p(t("2.2 Un calendrier previsionnel d'execution sera etabli contradictoirement et constitue une annexe au present contrat. Tout retard dans la fourniture des elements attendus du Client reportera d'autant les delais de livraison du Prestataire.")),
    hr(),

    h2([t("ARTICLE 3 — REMUNERATION ET CONDITIONS DE PAIEMENT")]),
    p(
      t("3.1 Le montant total des prestations est fixe a "),
      v('montant_ht'), t(" € HT ("), v('montant_ttc'),
      t(" € TTC, TVA "), v('taux_tva'), t(" %)."),
    ),
    p(
      t("3.2 Modalites de reglement : "), v('modalites_paiement'), t("."),
    ),
    p(t("3.3 Conformement aux articles L. 441-10 et suivants du Code de commerce, tout retard de paiement entrainera l'application de penalites de retard calculees au taux de trois (3) fois le taux d'interet legal en vigueur, exigibles de plein droit et sans mise en demeure prealable. Une indemnite forfaitaire de quarante (40) € pour frais de recouvrement sera egalement due.")),
    p(t("3.4 En cas de contestation partielle d'une facture, le Client est tenu de regler la partie non contestee dans les delais et de notifier sa contestation par ecrit dans les cinq (5) jours suivant la reception de la facture.")),
    hr(),

    h2([t("ARTICLE 4 — OBLIGATIONS DU PRESTATAIRE")]),
    p(t("Le Prestataire s'engage a :")),
    ul(
      li(t("Executer les prestations avec le soin, la diligence et le professionnalisme attendus d'un prestataire qualifie dans son domaine ;")),
      li(t("Affecter a la mission un personnel competent, disposant des qualifications requises, et maintenir la continuite de l'equipe affectee sauf necessité imperieuse ;")),
      li(t("Informer le Client de tout evenement pouvant impacter les delais, le cout ou la qualite des prestations ;")),
      li(t("Remettre periodiquement au Client un rapport d'avancement selon les modalites convenues en annexe ;")),
      li(t("Respecter les normes, reglementations et standards applicables a son domaine d'activite ;")),
      li(t("Garantir la confidentialite des informations et donnees transmises par le Client.")),
    ),
    hr(),

    h2([t("ARTICLE 5 — OBLIGATIONS DU CLIENT")]),
    p(t("Le Client s'engage a :")),
    ul(
      li(t("Fournir en temps utile tous les elements, acces, donnees et autorisations indispensables a l'execution des prestations ;")),
      li(t("Nommer un chef de projet disposant des pouvoirs de decision necessaires a l'avancement des travaux ;")),
      li(t("Valider les livrables dans les delais convenus ; toute absence de retour dans le delai imparti vaudra validation tacite ;")),
      li(t("Regler les factures dans les delais contractuels ;")),
      li(t("Ne pas solliciter directement les collaborateurs du Prestataire affectes a la mission (clause de non-sollicitation).")),
    ),
    hr(),

    h2([t("ARTICLE 6 — PROPRIETE INTELLECTUELLE")]),
    p(t("6.1 Les droits de propriete intellectuelle portant sur les livrables produits par le Prestataire dans le cadre de la mission restent sa propriete exclusive jusqu'au paiement integral du prix convenu.")),
    p(t("6.2 Des reception du solde, le Prestataire cede au Client, a titre definitif et exclusif, les droits patrimoniaux d'auteur sur les livrables, pour toute exploitation, sur tout support, dans le monde entier, pour toute la duree legale de protection.")),
    p(t("6.3 Les outils, methodologies, savoir-faire et creations preexistants du Prestataire, ainsi que les elements open-source utilises, restent la propriete exclusive du Prestataire. Une licence d'utilisation est concedee au Client dans la limite de l'usage prevu au contrat.")),
    hr(),

    h2([t("ARTICLE 7 — CONFIDENTIALITE ET NON-SOLLICITATION")]),
    p(t("7.1 Les parties s'engagent mutuellement a considerer comme strictement confidentiels tous documents, informations techniques, commerciales, financieres ou strategiques que l'une d'elles communiquerait a l'autre dans le cadre du present contrat, que ces informations soient designees ou non comme telles.")),
    p(t("7.2 Cette obligation de confidentialite s'etend aux collaborateurs, sous-traitants et partenaires des parties et survivra a l'expiration du contrat pendant une duree de cinq (5) ans.")),
    p(t("7.3 Le Client s'interdit de solliciter, directement ou indirectement, tout collaborateur du Prestataire ayant participe a l'execution du present contrat, pendant toute la duree du contrat et les deux (2) annees suivant son expiration, sous peine d'une indemnite forfaitaire egale a douze (12) mois de remuneration brute du collaborateur concerne.")),
    hr(),

    h2([t("ARTICLE 8 — SOUS-TRAITANCE")]),
    p(t("8.1 Le Prestataire peut recourir a des sous-traitants pour l'execution de tout ou partie de la mission, sous reserve d'en informer prealablement le Client.")),
    p(t("8.2 Le Prestataire demeure le seul responsable de la bonne execution des prestations confiees a ses sous-traitants, vis-a-vis du Client, et s'assure que ces derniers respectent des obligations de confidentialite equivalentes a celles du present contrat.")),
    hr(),

    h2([t("ARTICLE 9 — FORCE MAJEURE")]),
    p(t("9.1 Aucune des parties ne sera tenue responsable de l'inexecution partielle ou totale de ses obligations contractuelles causee par un evenement de force majeure au sens de l'article 1218 du Code civil, c'est-a-dire un evenement imprévisible, irresistible et exterieur a la volonte de la partie concernee (pandemie, catastrophe naturelle, cyberattaque d'etat, etc.).")),
    p(t("9.2 La partie concernee devra notifier l'autre partie dans les quarante-huit (48) heures suivant la survenance de l'evenement. Si celui-ci perdure au-dela de trente (30) jours, chaque partie pourra resilier le contrat de plein droit sans indemnite.")),
    hr(),

    h2([t("ARTICLE 10 — LIMITATION DE RESPONSABILITE")]),
    p(t("10.1 La responsabilite du Prestataire est limitee aux seuls dommages directs et previsibles, a l'exclusion de tout dommage indirect, immateriel ou consecutif.")),
    p(t("10.2 En tout etat de cause, la responsabilite du Prestataire est plafonnee au montant total hors taxes des sommes effectivement percues au titre du present contrat au cours des douze (12) derniers mois precedant la mise en cause.")),
    hr(),

    h2([t("ARTICLE 11 — RESILIATION")]),
    p(t("11.1 En cas de manquement grave d'une partie a ses obligations, la partie leseee pourra resilier le contrat de plein droit apres une mise en demeure par lettre recommandee avec avis de reception restee sans effet pendant quinze (15) jours.")),
    p(t("11.2 Toute resiliation a l'initiative du Client, en dehors d'un manquement du Prestataire, donnera lieu au paiement de l'integralite des prestations deja realisees et d'une indemnite forfaitaire equivalente a 30 % du montant HT restant a facturer.")),
    hr(),

    h2([t("ARTICLE 12 — LOI APPLICABLE ET ATTRIBUTION DE JURIDICTION")]),
    p(t("12.1 Le present contrat est regi par le droit francais.")),
    p(t("12.2 En cas de litige ne pouvant etre resolu amiablement dans un delai de trente (30) jours, les parties attribuent competence exclusive au Tribunal de Commerce competent dans le ressort du siege social du Prestataire.")),
    hr(),

    ...SIGNATAIRES_BLOCK,

    financialBlock(),
    signatureBlock('Prestataire,Client'),
  ],
}

// ─── Web — Contrat de creation de site web ────────────────────────────────────

export const TEMPLATE_WEB: JSONContent = {
  type: 'doc',
  content: [
    header("CONTRAT DE CREATION DE SITE WEB"),
    pc(t("Prestation de services numeriques — Creation et developpement web", true)),
    hr(),

    h2([t("ENTRE LES SOUSSIGNES")]),
    PRESTATAIRE_BLOCK,
    p(t("D'une part,")),
    p(t("ET")),
    CLIENT_PROFESSIONNEL_BLOCK,
    p(t("D'autre part,")),
    p(t("Il a ete convenu ce qui suit :")),
    hr(),

    h2([t("ARTICLE 1 — OBJET ET PERIMETRE DE LA MISSION")]),
    p(
      t("1.1 Le Prestataire s'engage a realiser la creation du site web "),
      v('nom_site'), t(" (URL cible : "), v('url_site'),
      t("), ci-apres designe « le Site », conformement aux specifications techniques detaillees dans le Cahier des Charges valide annexe au present contrat."),
    ),
    p(t("1.2 La Prestation comprend : "), v('description_prestation')),
    p(t("1.3 Toute fonctionnalite absente du Cahier des Charges initial sera consideree comme hors perimetre et fera l'objet d'un devis complementaire avant realisation. L'approbation par le Client d'une demande de modification vaut accord sur le surcout correspondant.")),
    hr(),

    h2([t("ARTICLE 2 — PHASES DE REALISATION ET DELAIS")]),
    p(t("2.1 La realisation du Site s'effectuera selon les phases suivantes :")),
    ul(
      li(t("Phase 1 — Cadrage et conception (wireframes, arborescence, charte graphique) ;")),
      li(t("Phase 2 — Developpement front-end et back-end ;")),
      li(t("Phase 3 — Integration des contenus fournis par le Client ;")),
      li(t("Phase 4 — Tests, recette et corrections ;")),
      li(t("Phase 5 — Mise en production et formation.")),
    ),
    p(
      t("2.2 La date de livraison previsionnelle est fixee au "), v('date_fin'),
      t(". Les delais sont conditionnes a la transmission par le Client de l'integralite des contenus (textes, images, logos, videos) et a la validation rapide de chaque phase (dans un delai maximal de cinq (5) jours ouvrables). Tout retard imputable au Client decale d'autant la date de livraison."),
    ),
    hr(),

    h2([t("ARTICLE 3 — REMUNERATION ET MODALITES DE PAIEMENT")]),
    p(
      t("3.1 Le montant global de la Prestation est fixe a "),
      v('montant_ht'), t(" € HT ("),
      v('montant_ttc'), t(" € TTC, TVA "), v('taux_tva'), t(" %)."),
    ),
    p(
      t("3.2 Echeancier de paiement : "), v('modalites_paiement'), t("."),
    ),
    p(t("3.3 Aucune livraison ne sera effectuee et aucun acces a l'hebergement ne sera fourni tant que l'integralite du prix n'aura pas ete regle. Les penalites de retard s'appliquent selon les conditions de l'article L. 441-10 du Code de commerce.")),
    hr(),

    h2([t("ARTICLE 4 — RECETTE ET LIVRAISON")]),
    p(t("4.1 A l'issue de chaque phase de realisation, le Client disposera d'un delai de cinq (5) jours ouvrables pour valider la phase par ecrit ou formuler des reserves motivees et documentees.")),
    p(t("4.2 Passe ce delai sans retour du Client, la phase sera reputee validee tacitement. La mise en production vaut reception definitive du Site.")),
    p(t("4.3 Apres reception definitive, le Prestataire assurera la correction des defauts de conformite signales pendant une periode de garantie de trente (30) jours, sans frais supplementaires.")),
    hr(),

    h2([t("ARTICLE 5 — DROITS D'AUTEUR ET PROPRIETE INTELLECTUELLE")]),
    p(t("5.1 A compter du paiement integral du prix, le Prestataire cede au Client l'ensemble des droits de propriete intellectuelle portant sur le Site (codes sources specifiques, maquettes graphiques originales, contenus rediges), pour toute exploitation commerciale, sur tout support, dans le monde entier, pour toute la duree legale de protection.")),
    p(t("5.2 Les composants open-source (frameworks, librairies, CMS, plugins tiers) utilises pour le developpement restent regis par leurs licences respectives. Il appartient au Client de respecter ces licences dans le cadre de son exploitation.")),
    p(t("5.3 Le Client garantit disposer de tous les droits necessaires sur les elements fournis au Prestataire (logos, images, textes, polices). En cas de reclamation d'un tiers relative a ces elements, le Client garantit et indemnise le Prestataire de toutes les consequences.")),
    hr(),

    h2([t("ARTICLE 6 — HEBERGEMENT ET NOM DE DOMAINE")]),
    p(t("6.1 L'hebergement et le nom de domaine ne sont pas inclus dans le perimetre du present contrat, sauf mention contraire dans les conditions particulieres.")),
    p(t("6.2 Si le Prestataire assure la gestion de l'hebergement, les conditions tarifaires et techniques seront specifiees dans un contrat distinct ou un avenant au present contrat.")),
    p(t("6.3 Le Client assume l'entiere responsabilite des contenus publies sur le Site et s'engage a respecter la legislation applicable (RGPD, mentions legales obligatoires, droit de la presse, etc.).")),
    hr(),

    h2([t("ARTICLE 7 — MAINTENANCE ET EVOLUTIONS")]),
    p(t("7.1 Le present contrat ne comprend pas la maintenance evolutive ou corrective posterieure a la periode de garantie de trente (30) jours. Toute intervention ulterieure fera l'objet d'un contrat de maintenance distinct ou d'un devis.")),
    p(t("7.2 Le Client est seul responsable de la mise a jour de son Site, de ses plugins et de son environnement d'hebergement apres la fin de la periode de garantie.")),
    hr(),

    h2([t("ARTICLE 8 — RESPONSABILITE")]),
    p(t("8.1 Le Prestataire garantit que le Site livré est conforme au Cahier des Charges valide. Sa responsabilite est limitee au cout de la remise en conformite.")),
    p(t("8.2 Le Prestataire ne peut etre tenu responsable de toute perte de donnees, interruption de service, attaque informatique ou incompatibilite survenant apres la mise en production et imputable a l'environnement technique du Client ou a des evolutions de tiers (navigateurs, OS, CMS).")),
    hr(),

    h2([t("ARTICLE 9 — LOI APPLICABLE ET JURIDICTION")]),
    p(t("Le present contrat est regi par le droit francais. En cas de litige non resolu amiablement, les parties conviennent de la competence exclusive du Tribunal de Commerce competent dans le ressort du siege social du Prestataire.")),
    hr(),

    ...SIGNATAIRES_BLOCK,

    financialBlock(),
    signatureBlock('Prestataire,Client'),
  ],
}

// ─── Abonnement — Contrat d'abonnement / Telecom ─────────────────────────────

export const TEMPLATE_ABONNEMENT: JSONContent = {
  type: 'doc',
  content: [
    header("CONTRAT D'ABONNEMENT — FORFAIT ILLIMITE"),
    pc(t("Contrat d'abonnement a duree determinee avec tacite reconduction", true)),
    hr(),

    h2([t("ENTRE LES SOUSSIGNES")]),
    PRESTATAIRE_BLOCK,
    p(t("Ci-apres designe(e) « l'Operateur »,")),
    p(t("ET")),
    CLIENT_PARTICULIER_BLOCK,
    p(t("Ci-apres designe(e) « l'Abonne »,")),
    hr(),

    h2([t("ARTICLE 1 — OBJET ET OFFRE SOUSCRITE")]),
    p(
      t("1.1 Le present contrat a pour objet de definir les conditions de l'abonnement souscrit par l'Abonne a l'offre « "),
      v('nom_offre'),
      t(" », dont les caracteristiques sont les suivantes : "),
      v('description_offre'),
    ),
    p(t("1.2 L'Abonne reconnait avoir pris connaissance, avant la signature du present contrat, de l'ensemble des conditions generales de vente et d'utilisation de l'Operateur, disponibles sur simple demande et sur le site de l'Operateur.")),
    hr(),

    h2([t("ARTICLE 2 — DUREE ET RENOUVELLEMENT")]),
    p(
      t("2.1 Le present contrat est souscrit pour une duree minimale d'engagement de "),
      v('duree_engagement'),
      t(", a compter de la date d'activation du service."),
    ),
    p(t("2.2 A l'issue de la periode d'engagement, le contrat se renouvelle automatiquement par periodes successives d'un mois, par tacite reconduction, sauf resiliation notifiee par l'une ou l'autre des parties dans les conditions de l'article 8.")),
    p(t("2.3 L'Operateur s'engage a informer l'Abonne, au plus tard trente (30) jours avant l'echeance de la duree initiale, des conditions du renouvellement tacite, par tout moyen permettant d'en accuser reception.")),
    hr(),

    h2([t("ARTICLE 3 — PRIX ET FACTURATION")]),
    p(
      t("3.1 Le montant de l'abonnement est fixe a "),
      v('montant_mensuel'),
      t(" € TTC par mois."),
    ),
    p(t("3.2 La facturation est mensuelle, a terme a echoir. Les factures sont emises le premier jour de chaque mois et payables a leur date d'emission.")),
    p(t("3.3 L'Operateur se reserve le droit de modifier le tarif de l'abonnement, sous reserve d'en informer l'Abonne par ecrit trente (30) jours au moins avant la prise d'effet. En cas de refus, l'Abonne peut resilier le contrat sans frais.")),
    hr(),

    h2([t("ARTICLE 4 — MODALITES DE PAIEMENT — PRELEVEMENT AUTOMATIQUE SEPA")]),
    p(t("4.1 L'Abonne autorise l'Operateur a prelever chaque echeance mensuelle par prelevement automatique SEPA sur le compte bancaire communique lors de la souscription.")),
    p(t("4.2 Tout retard ou rejet de paiement entrainera la facturation de frais bancaires repercutes a l'Abonne, ainsi que l'application d'interets de retard au taux legal en vigueur. L'Operateur pourra suspendre l'acces aux services apres mise en demeure restee infructueuse pendant quarante-huit (48) heures.")),
    hr(),

    h2([t("ARTICLE 5 — NIVEAU DE SERVICE (SLA)")]),
    p(t("5.1 L'Operateur s'engage a fournir le service avec un taux de disponibilite minimum de 99 % mesure sur une base mensuelle, hors maintenance programmee, cas de force majeure et pannes imputables au reseau public.")),
    p(t("5.2 Les plages de maintenance programmee seront communiquees a l'Abonne avec un preavis minimum de quarante-huit (48) heures. Elles n'entrent pas dans le calcul du taux de disponibilite.")),
    p(t("5.3 En cas d'indisponibilite avere superieure a la garantie ci-dessus, l'Abonne pourra demander un avoir proportionnel au temps d'indisponibilite excedentaire. Cet avoir constitue le seul recours disponible au titre du niveau de service.")),
    hr(),

    h2([t("ARTICLE 6 — OBLIGATIONS DE L'OPERATEUR")]),
    ul(
      li(t("Fournir le service souscrit de maniere continue et conforme aux caracteristiques annoncees ;")),
      li(t("Assurer la securite et la confidentialite des donnees de l'Abonne ;")),
      li(t("Notifier l'Abonne de toute modification substantielle de l'offre avec un preavis d'au moins trente (30) jours ;")),
      li(t("Mettre a disposition un service client joignable aux coordonnees figurant sur les factures.")),
    ),
    hr(),

    h2([t("ARTICLE 7 — OBLIGATIONS DE L'ABONNE")]),
    ul(
      li(t("Utiliser le service conformement aux conditions generales d'utilisation et a la legislation en vigueur ;")),
      li(t("Ne pas utiliser le service a des fins illicites, frauduleuses ou contraires aux bonnes mœurs ;")),
      li(t("Maintenir a jour ses coordonnees bancaires et informations personnelles ;")),
      li(t("Ne pas tenter de contourner les mesures de securite du service.")),
    ),
    hr(),

    h2([t("ARTICLE 8 — SUSPENSION ET RESILIATION")]),
    p(
      t("8.1 L'Abonne peut resilier le present contrat a tout moment apres la periode d'engagement, sous reserve d'un preavis de "),
      v('delai_resiliation'),
      t(", notifie par lettre recommandee ou email avec accuse de reception."),
    ),
    p(t("8.2 En cas de resiliation anticipee durant la periode d'engagement, les mensualites restantes jusqu'au terme de l'engagement initial seront dues en integralite, a titre d'indemnite de resiliation.")),
    p(t("8.3 L'Operateur peut suspendre ou resilier le service en cas de non-paiement, d'utilisation frauduleuse ou de manquement grave de l'Abonne a ses obligations, apres mise en demeure.")),
    hr(),

    h2([t("ARTICLE 9 — MEDIATION")]),
    p(t("9.1 Conformement aux dispositions du Code de la consommation, l'Abonne consommateur peut recourir gratuitement a un mediateur de la consommation en vue de la resolution amiable d'un litige l'opposant a l'Operateur. Le nom et les coordonnees du mediateur competent sont disponibles sur simple demande aupres de l'Operateur et sur son site internet.")),
    hr(),

    h2([t("ARTICLE 10 — PROTECTION DES DONNEES (RGPD)")]),
    p(t("Les donnees personnelles de l'Abonne sont traitees conformement au RGPD et a la politique de confidentialite de l'Operateur. L'Abonne dispose d'un droit d'acces, de rectification, d'effacement et de portabilite exercable par email ou courrier aupres de l'Operateur.")),
    hr(),

    h2([t("ARTICLE 11 — LOI APPLICABLE ET JURIDICTION")]),
    p(t("Le present contrat est soumis au droit francais. En cas de litige, l'Abonne consommateur peut saisir la juridiction de son lieu de domicile. L'Abonne professionnel devra saisir le Tribunal de Commerce competent dans le ressort du siege social de l'Operateur.")),
    hr(),

    financialBlock(),

    signatureBlock('Operateur,Abonne,Conseiller'),

    sepaBlock('FR24ZZZ870ADF'),

    retractBlock(),

    infoBox('warning', '',
      p(t("Opposez-vous au demarchage telephonique sur "), t("www.bloctel.gouv.fr", true)),
    ),
  ],
}

// ─── AOP — Marche public ──────────────────────────────────────────────────────

export const TEMPLATE_AOP: JSONContent = {
  type: 'doc',
  content: [
    header("MARCHE PUBLIC DE PRESTATIONS INTELLECTUELLES", { numberVar: 'reference_marche' }),
    pc(t("Marche a procedure adaptee (MAPA) — Code de la Commande Publique", true)),
    hr(),

    h2([t("POUVOIR ADJUDICATEUR")]),
    p(v('pouvoir_adjudicateur')),
    hr(),

    h2([t("TITULAIRE DU MARCHE")]),
    p(
      v('prestataire_nom'),
      t(", N° SIRET "), v('prestataire_siret'),
      t(", N° TVA "), v('prestataire_tva'),
      t(", siege social au "), v('prestataire_adresse'), t("."),
    ),
    hr(),

    h2([t("ARTICLE 1 — OBJET DU MARCHE")]),
    p(
      t("1.1 Le present marche a pour objet : "), v('nom_marche'), t("."),
      br(), v('description_prestation'),
    ),
    p(t("1.2 Le titulaire executera les prestations dans le strict respect du Cahier des Clauses Administratives Particulieres (CCAP) et du Cahier des Clauses Techniques Particulieres (CCTP) qui constituent des documents contractuels du present marche, ainsi que de son offre technique et financiere.")),
    hr(),

    h2([t("ARTICLE 2 — DOCUMENTS CONTRACTUELS")]),
    p(t("Les documents contractuels sont classes par ordre de priorite decroissante :")),
    ul(
      li(t("1. L'acte d'engagement (present document) ;")),
      li(t("2. Le Cahier des Clauses Administratives Particulieres (CCAP) ;")),
      li(t("3. Le Cahier des Clauses Techniques Particulieres (CCTP) ;")),
      li(t("4. L'offre technique du titulaire ;")),
      li(t("5. Le Bordereau des Prix Unitaires (BPU) / Detail Quantitatif Estimatif (DQE).")),
    ),
    p(t("En cas de contradiction entre ces documents, celui de rang superieur prevaut.")),
    hr(),

    h2([t("ARTICLE 3 — DUREE ET DELAIS D'EXECUTION")]),
    p(
      t("3.1 Le present marche est conclu pour une duree de "), v('duree_marche'),
      t(", prenant effet a compter de la date de notification soit le "),
      v('date_debut'), t(", pour un terme prevu au "), v('date_fin'), t("."),
    ),
    p(t("3.2 Un calendrier previsionnel d'execution sera etabli contradictoirement dans les dix (10) jours suivant la notification du marche et soumis a l'approbation du pouvoir adjudicateur.")),
    p(t("3.3 Tout depassement des delais contractuels notifie au titulaire par ordre de service donnera lieu a l'application des penalites prevues a l'article 6.")),
    hr(),

    h2([t("ARTICLE 4 — PRIX ET REVISION")]),
    p(
      t("4.1 Le montant du marche est fixe a "),
      v('montant_ht'), t(" € HT ("), v('montant_ttc'),
      t(" € TTC, TVA "), v('taux_tva'), t(" %)."),
    ),
    p(t("4.2 Les prix sont fermes et definitis pendant toute la duree du marche, sauf clause de revision expresse prevue au CCAP.")),
    p(t("4.3 Le reglement s'effectuera par mandat administratif dans un delai de trente (30) jours suivant la reception de la demande de paiement conforme. Tout depassement de ce delai global de paiement entraine de plein droit le versement d'interets moratoires au taux prevu par decret.")),
    hr(),

    h2([t("ARTICLE 5 — MODALITES D'EXECUTION ET CONTROLE")]),
    p(t("5.1 Le titulaire assigne un responsable de contrat, interlocuteur unique du pouvoir adjudicateur, charge de coordonner l'execution des prestations et de transmettre les rapports d'avancement selon les modalites du CCTP.")),
    p(t("5.2 Le pouvoir adjudicateur designe un representant du maitre d'ouvrage (RAMO) habilite a donner les ordres de service, a valider les livrables et a formuler toute observation sur l'execution.")),
    p(t("5.3 Tout livrable sera soumis a une procedure de recette. A defaut de reserve motivee dans un delai de dix (10) jours ouvrables, le livrable sera repute accepte.")),
    hr(),

    h2([t("ARTICLE 6 — PENALITES DE RETARD ET MANQUEMENTS")]),
    p(t("6.1 Conformement aux stipulations du CCAP, des penalites de retard sont applicables de plein droit, sans mise en demeure prealable, a raison d'un pour mille (1/1 000) du montant du marche par jour calendaire de retard constate.")),
    p(t("6.2 Le montant total des penalites de retard est plafonne a dix pour cent (10 %) du montant TTC du marche. Au-dela de ce seuil, le pouvoir adjudicateur peut, apres mise en demeure, proceder a la resiliation aux torts du titulaire.")),
    p(t("6.3 Les manquements graves aux obligations de confidentialite, de qualite ou de securite peuvent donner lieu a des penalites specifiques definies au CCAP.")),
    hr(),

    h2([t("ARTICLE 7 — SOUS-TRAITANCE")]),
    p(t("7.1 La cession ou la delegation totale des obligations contractuelles est interdite. Toute sous-traitance est soumise a l'accord prealable et ecrit du pouvoir adjudicateur, conformement a la loi n° 75-1334 du 31 decembre 1975 relative a la sous-traitance.")),
    p(t("7.2 Le titulaire reste entierement responsable de la bonne execution des prestations confiees a ses sous-traitants et s'assure que ceux-ci respectent les obligations de confidentialite et de qualite prevues au present marche.")),
    hr(),

    h2([t("ARTICLE 8 — RESILIATION")]),
    p(t("8.1 Le pouvoir adjudicateur peut resilier le marche pour motif d'interet general, sous reserve d'une indemnite calculee sur la base des prestations realisees et des charges validees non amorties.")),
    p(t("8.2 En cas de manquement grave du titulaire, le pouvoir adjudicateur peut resilier le marche aux torts de ce dernier apres mise en demeure restee sans effet pendant quinze (15) jours, sans indemnite.")),
    hr(),

    h2([t("ARTICLE 9 — REGLEMENT DES LITIGES")]),
    p(t("9.1 Les litiges relatifs a l'execution du present marche seront soumis, prealablement a toute instance contentieuse, a une tentative de reglement amiable.")),
    p(t("9.2 A defaut d'accord amiable, les litiges seront portes devant le tribunal administratif territorialement competent.")),
    hr(),

    h2([t("ARTICLE 10 — LOI APPLICABLE")]),
    p(t("Le present marche est regi par le droit francais et notamment par le Code de la Commande Publique, le Cahier des Clauses Administratives Generales (CCAG) applicable, ainsi que par les textes pris pour leur application.")),
    hr(),

    h2([t("SIGNATURES")]),
    p(
      t("Fait a "), v('ville_signature'),
      t(", le "), v('date_signature'), t("."),
    ),
    p(t("En deux exemplaires originaux.")),
    p(br()),
    p(
      t("Pour le Pouvoir Adjudicateur", true), br(),
      t("Nom et qualite : ___________________________"), br(),
      t("Cachet et signature :"),
    ),
    p(br()),
    p(
      t("Pour le Titulaire", true), br(),
      t("Nom et qualite : ___________________________"), br(),
      t("Cachet et signature :"),
    ),
  ],
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const CONTRACT_TEMPLATES: Record<string, JSONContent> = {
  b2c: TEMPLATE_B2C,
  b2b: TEMPLATE_B2B,
  web: TEMPLATE_WEB,
  abonnement: TEMPLATE_ABONNEMENT,
  aop: TEMPLATE_AOP,
}

// ─── Variable palette ─────────────────────────────────────────────────────────

export const VARIABLE_PALETTE = [
  {
    label: 'Prestataire',
    bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe',
    vars: [
      { name: 'prestataire_nom', label: 'Nom / Raison sociale' },
      { name: 'prestataire_adresse', label: 'Adresse' },
      { name: 'prestataire_siret', label: 'SIRET' },
      { name: 'prestataire_tva', label: 'N° TVA' },
    ],
  },
  {
    label: 'Client',
    bg: '#fef3c7', color: '#92400e', border: '#fde68a',
    vars: [
      { name: 'client_prenom', label: 'Prénom' },
      { name: 'client_nom', label: 'Nom' },
      { name: 'client_raison_sociale', label: 'Raison sociale (B2B)' },
      { name: 'client_siret', label: 'SIRET (B2B)' },
      { name: 'client_representant', label: 'Représentant (B2B)' },
      { name: 'client_qualite', label: 'Qualité représentant' },
      { name: 'client_adresse', label: 'Adresse' },
      { name: 'client_code_postal', label: 'Code postal' },
      { name: 'client_ville', label: 'Ville' },
      { name: 'client_email', label: 'Email' },
      { name: 'client_telephone', label: 'Téléphone' },
    ],
  },
  {
    label: 'Contrat',
    bg: '#f1f5f9', color: '#334155', border: '#e2e8f0',
    vars: [
      { name: 'numero_contrat', label: 'N° Contrat' },
      { name: 'version_contrat', label: 'Version' },
      { name: 'date_contrat', label: 'Date du contrat' },
      { name: 'date_debut', label: 'Date de début' },
      { name: 'date_fin', label: 'Date de fin' },
      { name: 'duree_contrat', label: 'Durée' },
    ],
  },
  {
    label: 'Financier',
    bg: '#dcfce7', color: '#166534', border: '#bbf7d0',
    vars: [
      { name: 'montant_ht', label: 'Montant HT (€)' },
      { name: 'montant_tva', label: 'Montant TVA (€)' },
      { name: 'montant_ttc', label: 'Montant TTC (€)' },
      { name: 'taux_tva', label: 'Taux TVA (%)' },
      { name: 'modalites_paiement', label: 'Modalités paiement' },
      { name: 'description_prestation', label: 'Description prestation' },
    ],
  },
  {
    label: 'Abonnement',
    bg: '#e0f2fe', color: '#0c4a6e', border: '#bae6fd',
    vars: [
      { name: 'nom_offre', label: "Nom de l'offre" },
      { name: 'description_offre', label: "Description offre" },
      { name: 'montant_mensuel', label: 'Montant mensuel (€)' },
      { name: 'duree_engagement', label: "Durée d'engagement" },
      { name: 'delai_resiliation', label: 'Délai résiliation' },
    ],
  },
  {
    label: 'Marché public',
    bg: '#fef9c3', color: '#713f12', border: '#fde68a',
    vars: [
      { name: 'reference_marche', label: 'Référence marché' },
      { name: 'nom_marche', label: 'Objet du marché' },
      { name: 'pouvoir_adjudicateur', label: 'Pouvoir adjudicateur' },
      { name: 'duree_marche', label: 'Durée du marché' },
    ],
  },
  {
    label: 'Web',
    bg: '#f0fdf4', color: '#14532d', border: '#bbf7d0',
    vars: [
      { name: 'nom_site', label: 'Nom du site' },
      { name: 'url_site', label: 'URL cible' },
    ],
  },
  {
    label: 'Signature',
    bg: '#fae8ff', color: '#7e22ce', border: '#e9d5ff',
    vars: [
      { name: 'ville_signature', label: 'Ville de signature' },
      { name: 'date_signature', label: 'Date de signature' },
    ],
  },
]
