/**
 * LA GRILLE DE PRODUITS, l'ecran de resultat depuis le pivot du 20/08/2026.
 *
 * Ce qu'elle remplace : sept cartes par technique, un menu deroulant, un
 * tableau de sources. Tout cela decrivait NOTRE travail. Le visiteur, lui,
 * regarde des objets et veut savoir lesquels acceptent son logo.
 *
 * Trois etats, jamais plus, et chacun se lit en une seconde :
 *   oui  ca passe, avec l'emplacement et la taille
 *   si   ca passe une fois le logo vectorise, et le bouton est la
 *   non  ca ne passe pas, avec LA raison et le palier qui l'ouvrirait
 *
 * Aucune source citee, aucun millimetre de referentiel : decision d'Alex du
 * 20/08. Ce que la page affiche vient des zones reelles des produits.
 */

import { avecArticle } from './techniques.js';

const echapper = (t) => String(t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * LES SILHOUETTES, et pourquoi ce ne sont pas des photos.
 *
 * Le brief demande la photo catalogue du produit. Les photos disponibles
 * viennent du serveur d'un grossiste, et la question des droits d'usage sur un
 * site public tiers n'est pas tranchee par Alex. Publier d'abord et demander
 * ensuite serait l'ordre inverse du bon. Le brief prevoit lui meme la parade :
 * des silhouettes aux couleurs de la charte, dessinees ici, qui ne doivent
 * rien a personne. Elles se remplacent par des photos le jour ou Alex tranche.
 */
const SILHOUETTES = Object.freeze({
  gobelet: '<path d="M18 14h22l-2 34a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4Z"/><path d="M40 22h5a5 5 0 0 1 0 12h-4"/>',
  bouteille: '<path d="M26 8h8v8l4 6v30a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4V22l4-6Z"/><path d="M22 30h16"/>',
  stylo: '<path d="M30 6h4a3 3 0 0 1 3 3v34l-5 12-5-12V9a3 3 0 0 1 3-3Z"/><path d="M37 14h4v14h-4"/>',
  sac: '<path d="M14 20h32l3 34H11Z"/><path d="M23 20a7 9 0 0 1 14 0"/>',
  't-shirt': '<path d="M22 12 12 18l4 9 6-3v22h24V24l6 3 4-9-10-6-6 3a6 6 0 0 1-12 0Z"/>',
  carnet: '<path d="M16 8h28a2 2 0 0 1 2 2v44a2 2 0 0 1-2 2H16Z"/><path d="M16 8v48"/><path d="M22 8v48"/>',
  casquette: '<path d="M12 40a18 18 0 0 1 36 0Z"/><path d="M48 40h8a4 4 0 0 1-4 4H12"/>',
  powerbank: '<path d="M18 12h24a3 3 0 0 1 3 3v34a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3Z"/><path d="M24 42h12"/>',
});

/**
 * La condition d'une offre, quand la matiere en pose une. B1 du brief : « en
 * sublimation » sur une bouteille inox ne se dit pas sans « sur les modeles a
 * revetement sublimable », sinon la carte affirme quelque chose de faux.
 */
const condition = (o) => (o?.condition ? `, ${o.condition}` : '');

/**
 * LA TAILLE, EN REFERENCE PHYSIQUE D'ABORD, LE CHIFFRE ENSUITE.
 *
 * Brief du 20/08, C3 : « personne ne visualise un nombre nu ». « Votre logo
 * ferait 150 × 150 mm » ne dit rien a un responsable com ; « grand comme une
 * carte postale » se voit tout de suite, et le chiffre suit pour qui en a
 * besoin.
 *
 * Les reperes sont choisis pour etre dans toutes les mains, et leurs vraies
 * dimensions : A4 210 mm, A5 148 mm, carte postale 148 mm, carte de visite
 * 85 mm, boite d'allumettes 50 mm, piece de deux euros 26 mm, timbre 20 mm.
 * On compare sur la LARGEUR du marquage, celle que le visiteur regarde.
 */
// UNE REFERENCE PHYSIQUE DOIT TENIR SUR LES DEUX DIMENSIONS, §8 du lot 1 du
// 21/08. La premiere version comparait la seule LARGEUR, et elle a produit
// « plus grand qu'une feuille A4, 300 × 169 mm » : une A4 fait 210 × 297, le
// marquage est plus large et bien plus court, la comparaison ne renseigne pas,
// elle egare. Et « plus petit qu'une piece de 2 euros, 12 × 7 mm » compare une
// surface au sixieme d'une autre.
//
// Chaque repere porte donc ses DEUX dimensions, et il n'est propose que si les
// deux collent, dans un sens ou dans l'autre. Sinon on donne le chiffre seul :
// un nombre nu renseigne mal, un repere faux renseigne a l'envers.
const REPERES = [
  ['une feuille A4', 210, 297],
  ['une carte postale', 148, 105],
  ['un boîtier de CD', 125, 125],
  ['une carte de visite', 85, 55],
  ['une boîte d\'allumettes', 55, 35],
  ['un timbre-poste', 32, 21],
  ['une pièce de 2 euros', 26, 26],
];

/** Tolerance de ressemblance : au-dela, le repere ne ressemble plus a rien. */
const ECART_REPERE = 0.30;

function repere(largeurMm, hauteurMm) {
  const colle = (a, b) => Math.abs(a - b) / b <= ECART_REPERE;
  for (const [nom, l, h] of REPERES) {
    if ((colle(largeurMm, l) && colle(hauteurMm, h))
        || (colle(largeurMm, h) && colle(hauteurMm, l))) return nom;
  }
  return null;
}

/** « une carte de visite, 90 × 64 mm », ou le chiffre seul. */
const taille = (o) => {
  const r = repere(o.taille.largeurMm, o.taille.hauteurMm);
  const chiffre = `${o.taille.largeurMm} × ${o.taille.hauteurMm} mm`;
  return r ? `${r}, ${chiffre}` : chiffre;
};

/**
 * C2 DU BRIEF : LE BOUTON, ET RIEN D'AUTRE.
 *
 * Le pave de six lignes sur les outils et les courbes disparait de cet ecran :
 * il expliquait un procede avant de donner un resultat. Sa substance vit dans
 * les questions frequentes, ou elle est mieux tournee. Ne reste que l'action,
 * et la ligne qui dit ce qu'on recoit.
 */
export function rendreActionFichier(fichier, ctaDejaPorte = false) {
  if (!fichier) return '';
  if (fichier.origine === 'vectoriel') {
    return `<div class="verdict-action verdict-action-ok"><p>`
      + `<b>Votre fichier est déjà vectoriel.</b> `
      + `C'est celui-là qu'il faut envoyer à votre marqueur.</p></div>`;
  }
  // LE FAUX VECTORIEL DIT DEUX CHOSES, ET DANS CET ORDRE, 01/09/2026.
  //
  // D'abord ce que le fichier est : une image dans un emballage de vectoriel.
  // Ensuite ce qu'on en fait. Jusqu'a aujourd'hui ce bloc s'arretait a la
  // premiere moitie et renvoyait vers /vectoriser, pendant que les cartes de
  // feu, elles, proposaient « Obtenir mon fichier vectoriel » vers un bloc que
  // ce chemin ne devoilait jamais. Deux voix sur le meme ecran, dont une
  // morte. Le reflexe gratuit passe toujours devant : le fichier source du
  // graphiste vaudra toujours mieux que notre trace.
  let preambule = '';
  if (fichier.origine === 'faux_vectoriel') {
    const constat = `<b>Ce fichier porte l'extension d'un vectoriel mais n'en est pas un.</b> `;
    if (fichier.vectorise === true) {
      // ON NE PROMET PAS UN FICHIER « EN BAS DE PAGE ». Depuis le 24/08/2026,
      // rien ne se telecharge sans avoir ete demande : le bloc reste cache
      // jusqu'au clic. Le constat et le reflexe se disent donc ici, et le
      // bouton reste celui des cartes, comme pour une image.
      preambule = `<p>${constat}Nous avons retracé l'image qu'il contenait. Si le fichier `
        + `source existe chez votre graphiste, réclamez-le : il sera meilleur que notre `
        + `tracé.</p>`;
    } else if (fichier.vectorise === false) {
      return `<div class="verdict-action"><p>${constat}`
        + `Nous n'avons pas pu retracer l'image qu'il contient. `
        + `<a href="/questions/comment-vectoriser-un-jpeg">Repartez de la plus grande version `
        + `disponible de votre logo</a>, ou réclamez le fichier source à votre graphiste.</p></div>`;
    } else {
      return `<div class="verdict-action"><p>${constat}`
        + `Nous retraçons l'image qu'il contient, elle sera prête dans un instant. `
        + `Le fichier source de votre graphiste, s'il existe, vaudra toujours mieux.</p></div>`;
    }
  }
  if (fichier.vectorise === false) {
    return `<div class="verdict-action"><p>`
      + `<b>Nous n'avons pas pu fabriquer votre fichier vectoriel.</b> `
      + `<a href="/questions/comment-vectoriser-un-jpeg">Repartez de la plus grande version `
      + `disponible de votre logo</a>, ou faites-le établir par un graphiste.</p></div>`;
  }
  if (fichier.vectorise === true) {
    // UN SEUL BLOC ORANGE PAR ECRAN, regle de charte. Depuis le 24/08/2026 les
    // cartes de feu orange portent elles memes le bouton, avec le meme libelle
    // et la meme ancre : garder ce bandeau ferait quatre appels identiques sur
    // le meme ecran, ce qui n'est plus un appel a l'action. La ligne qui dit ce
    // qu'on recoit reste, elle : c'est la seule qui l'ecrit.
    if (ctaDejaPorte) {
      return `<div class="verdict-action">${preambule}<p class="note">Le bouton des cartes vous donne
      le <b>.eps</b> pour votre marqueur et le <b>.pdf</b> pour vous. Gratuit, sans compte,
      sans envoi de votre fichier.</p></div>`;
    }
    return `<div class="verdict-action">${preambule}
    <a class="cta-large" href="#telechargements">Obtenir mon fichier vectoriel</a>
    <p class="note">Le <b>.eps</b> pour votre marqueur, le <b>.pdf</b> pour vous. Gratuit,
    sans compte, sans envoi de votre fichier.</p>
    </div>`;
  }
  // Il n'« arrive » plus en bas de page : depuis le 24/08/2026, rien ne se
  // telecharge sans avoir ete demande. On annonce donc une disponibilite, pas
  // une livraison.
  return `<div class="verdict-action"><p class="note">Nous préparons votre fichier
  vectoriel, il sera prêt dans un instant.</p></div>`;
}

/**
 * C4 DU BRIEF : LE BLOC QUI MANQUAIT.
 *
 * La page se terminait sur des mesures : le visiteur le plus chaud du parcours
 * n'avait AUCUNE suite proposee. Le diagnostic et le fichier restent gratuits,
 * c'est la mise en relation qui qualifie.
 *
 * L'adresse est la meme que celle des mentions legales, et le harnais verifie
 * qu'elles ne divergent pas : deux adresses de contact sur un site, c'est une
 * de trop et c'est toujours la mauvaise qui reste.
 */
export const CONTACT = 'contact@bonamarquer.fr';

/**
 * L'ADRESSE RECOIT, DEPUIS LE 01/09/2026.
 *
 * Le domaine est achete depuis le 25/08, la boite contact@bonamarquer.fr
 * existe depuis aujourd'hui et a ete eprouvee : un courrier envoye depuis une
 * adresse exterieure arrive. C'est cette preuve qui ouvre le drapeau, pas la
 * creation de la boite : une boite qui existe et qui ne recoit pas produit
 * exactement le defaut que ce drapeau existe pour empecher, un visiteur qui
 * croit avoir demande un prix et a qui personne ne repond.
 *
 * Ce que ce booleen commande, et rien d'autre : le bloc « et maintenant ? »
 * sous le diagnostic, l'offre de redessin quand une limite a ete nommee, et le
 * paragraphe d'offre sous un brief de graphiste. Les trois donnent l'adresse
 * ECRITE, aucun ne fabrique de formulaire.
 *
 * Il reste un drapeau et il garde son sens : si la boite tombe, il repasse a
 * faux en une ligne et les trois blocs disparaissent ensemble.
 */
export const CONTACT_OPERATIONNEL = true;

/**
 * LE REDESSIN, ET SON PRIX, arbitrage Alex du 26/08, precise le 30/08.
 *
 * CE QUI MANQUAIT. Les deux avertissements du moteur nomment deja la sortie du
 * metier : « un redessin, un travail de graphiste sur un logiciel vectoriel ».
 * Ils la nomment et ils s'arretent la. Le visiteur dont le fichier atteint la
 * limite de l'automatique repartait donc avec un fichier moyen et une phrase
 * qui lui disait d'aller voir ailleurs. Trois des huit logos du banc sont dans
 * ce cas, et ce sont exactement les trois qu'Alex trouve moyens : la limite
 * n'est pas une surprise, elle est diagnostiquee. Ce qui manquait, c'est la
 * sortie.
 *
 * HORS TAXES, ET LE NOM DE LA CONSTANTE LE DIT. On s'adresse a des
 * entreprises, qui raisonnent hors taxes ; porter le HT dans le NOM plutot que
 * dans le seul affichage evite la faute qui se paie deux fois, celle ou
 * quelqu'un reutilise la constante en croyant tenir un prix TTC.
 *
 * CE QUI RESTE HORS DU DEPOT. Ce prix ci est celui que paie le visiteur, et il
 * s'affichera sur le site : il n'a pas de raison d'etre cache. Ce qu'on paie,
 * nous, et a qui, ne se lit nulle part dans ce depot et ne doit jamais s'y
 * lire. Cet arbitrage vit dans briefs/arbitrages_vecto.md, et lui seul.
 */
export const PRIX_REDESSIN_HT_EUR = 45;

/**
 * L'OFFRE DE REDESSIN, posee sous l'avertissement qui la rend utile.
 *
 * ELLE NE S'AFFICHE QUE LA OU ELLE REPOND A QUELQUE CHOSE. Sans avertissement,
 * le fichier automatique convient, et proposer un redessin serait vendre un
 * remede a qui n'a rien. La condition n'est donc pas la page, c'est le FAIT :
 * le moteur a nomme une limite.
 *
 * ET ELLE NE S'AFFICHE PAS TANT QUE L'ADRESSE NE RECOIT PAS. Meme regle que le
 * bloc « et maintenant » : ecrire a quelqu'un qui ne repondra pas coute plus
 * cher que ne rien proposer, et davantage encore quand un prix est affiche.
 *
 * ON DEMANDE UN MAIL, ON NE FABRIQUE PAS UN FORMULAIRE. Premiere ecriture, le
 * 30/08 : un champ email et un bouton qui ouvrait la messagerie du visiteur
 * par une adresse `mailto:`. Alex : « est-ce qu'on n'est pas en train de se
 * compliquer ? ». Il avait raison, et le defaut etait plus grave que la
 * complication. Une adresse `mailto:` ne fait RIEN sur une machine sans
 * logiciel de courrier configure, ce qui est le cas courant chez qui lit son
 * courrier dans un navigateur : le bouton ne repondait pas, sans un mot, et
 * c'est exactement la panne muette que ce projet refuse ailleurs. Le champ
 * email, lui, redemandait une adresse que la messagerie du visiteur connait
 * deja.
 *
 * Reste ce qui marche partout : une PHRASE qui donne l'adresse, lisible et
 * recopiable meme si le lien ne s'ouvre pas, et le diagnostic a copier d'un
 * clic pour le coller dans le message. C'est le motif du brief de graphiste,
 * pose le 21/08 et deja eprouve : cout nul, valeur immediate.
 *
 * `options.adresseOuverte` n'existe que pour le harnais : un controle qui ne
 * peut eprouver qu'un seul des deux etats ne prouve pas grand chose, et
 * celui-ci doit tomber dans les deux sens.
 */
export function rendreReprise(avertissements = [], options = {}) {
  const ouverte = options.adresseOuverte ?? CONTACT_OPERATIONNEL;
  if (!ouverte) return '';
  if (!avertissements?.length) return '';
  const diagnostic = String(options.diagnostic ?? '').trim();
  return `<div class="reprise">
  <p class="reprise-titre">Faire redessiner ce logo</p>
  <p>Un redessin est un travail de graphiste sur un logiciel vectoriel : les petites
  lettres retrouvent leur dessin exact, les courbes sont retracées à la main, et le
  fichier ne dépend plus de la définition de votre image de départ. Nous le faisons
  faire et nous vous le livrons dans les mêmes formats que ci-dessus.</p>
  <p class="reprise-prix"><b>${PRIX_REDESSIN_HT_EUR} € HT</b>, une seule fois. Le fichier
  vous resservira sur toutes vos commandes, chez n'importe quel fournisseur.</p>
  <p class="reprise-reserve">Nous regardons votre fichier avant de nous engager. Si
  l'image ne porte pas assez d'information pour qu'un redessin soit fidèle à votre
  logo, nous vous le disons plutôt que de le faire.</p>
  <p class="reprise-envoi">Envoyez-nous votre logo en pièce jointe à
  <a href="mailto:${CONTACT}">${CONTACT}</a>, et nous vous répondons.</p>${diagnostic
    ? `
  <button class="feu-copier" type="button" data-copier="${echapper(diagnostic)}">Copier le diagnostic à coller dans votre message</button>`
    : ''}
  <p class="note">Votre logo ne part pas d'ici : c'est vous qui l'envoyez, depuis votre
  messagerie.</p>
</div>`;
}

/**
 * ON DEMANDE UN MAIL, ON NE FABRIQUE PAS UN FORMULAIRE, 31/08/2026.
 *
 * CE BLOC PORTAIT LE MEME DEFAUT QUE L'OFFRE DE REDESSIN, et il le portait
 * depuis plus longtemps. Deux champs et un bouton « Demander un prix » qui
 * ouvrait la messagerie du visiteur par une adresse `mailto:`. Or une adresse
 * `mailto:` ne fait RIEN sur une machine sans logiciel de courrier configure,
 * ce qui est le cas courant chez qui lit son courrier dans un navigateur : le
 * bouton ne repondait pas, sans un mot. Le champ email, lui, redemandait une
 * adresse que la messagerie connait deja.
 *
 * ET IL PORTAIT UNE BRANCHE MORTE, restee invisible parce que ce bloc l'est.
 * Le message pre-rempli listait les objets qui passent, en parcourant
 * `etat.juges` : ce champ n'a JAMAIS ete rempli nulle part dans le programme.
 * La boucle ne s'executait pas une seule fois. Personne ne l'a vu, et personne
 * ne pouvait le voir : un code qu'aucun ecran n'affiche est un code que
 * personne ne relit. C'est l'argument le plus net en faveur du drapeau qui
 * ferme ce bloc, et le plus net aussi contre le fait de l'y laisser dormir.
 *
 * Reste ce qui marche partout : l'adresse ECRITE, lisible et recopiable meme
 * si le lien ne s'ouvre pas, et le diagnostic a copier d'un clic. C'est le
 * meme moyen que l'offre de redessin, et c'est voulu : deux blocs qui
 * demandent la meme chose au visiteur ne doivent pas la demander de deux
 * facons differentes.
 */
export function rendreSuite(diagnostic = '', options = {}) {
  const ouverte = options.adresseOuverte ?? CONTACT_OPERATIONNEL;
  if (!ouverte) return '';
  const resume = String(diagnostic).trim();
  // LE BLOC PARLE DE CE QUE LA PAGE A, 01/09/2026. Il vit desormais sur le
  // simulateur, ou il n'y a pas de diagnostic a joindre : deux de ses phrases
  // en promettaient un, et un texte qui cite un document absent est une
  // promesse en l'air. Le diagnostic decide donc du texte, comme il decidait
  // deja du bouton de copie.
  return `<div class="encadre et-maintenant">
  <h2>Vous voulez ce marquage en vrai ?</h2>
  <p>Dites-nous sur quel objet et en quelle quantité. On vous dit combien ça coûte et en
  combien de temps, avec une réponse par un humain${resume ? ' qui a vu votre diagnostic' : ''}.</p>
  <p class="reprise-envoi">Écrivez-nous à <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>${resume
    ? `
  <button class="feu-copier" type="button" data-copier="${echapper(resume)}">Copier mon diagnostic à coller dans le message</button>`
    : ''}
  <p class="note">${resume
    ? 'Votre logo ne part pas : seul le diagnostic accompagne votre message, pour que la '
      + 'réponse soit utile dès le premier échange.'
    : 'Votre logo ne part pas d\'ici : c\'est vous qui l\'envoyez, depuis votre messagerie.'}</p>
</div>`;
}

/**
 * LA DECOUVERTE APRES LA REMISE DU FICHIER, partie D du brief du 21/08,
 * REECRITE LE 26/08/2026 (arbitrage Alex).
 *
 * `/vectoriser` fait une chose et une seule : deposer, convertir, telecharger,
 * trois clics, aucun diagnostic impose. C'est la page d'atterrissage du trafic
 * « vectoriser un JPEG », et lui imposer un verdict avant son fichier serait
 * lui faire payer sa visite. APRES la remise, c'est autre chose : le visiteur
 * a ce qu'il venait chercher, et on peut lui montrer la suite.
 *
 * CE QUI ETAIT PROPOSE, ET POURQUOI CA NE TENAIT PLUS. Deux cartes de
 * matieres, « sac shopping en coton », « textile en coton », avec un badge
 * OUI, et un bouton « voir toutes les matieres pour ce logo » qui pointait
 * vers la page d'accueil. Le bouton ne menait donc pas au diagnostic de CE
 * logo : il menait a une page ou il fallait tout redeposer. Alex l'a dit le
 * 26/08 en regardant l'ecran : ca ne correspond plus a ce qu'on propose.
 *
 * CE QU'ON PROPOSE VRAIMENT. Le site porte un simulateur qui pose un logo sur
 * la photo d'un objet reel, dans la zone que le fabricant autorise, et qui
 * annonce la taille obtenue en millimetres. Apres avoir donne le fichier,
 * c'est LA la suite naturelle, et elle est concrete : on ne montre plus deux
 * vignettes de matiere, on montre son logo sur un objet.
 *
 * ET LE LOGO SUIT. Le fichier qu'on vient de fabriquer part avec le visiteur
 * (voir `simulation/passage.js`), sans quitter son navigateur. La phrase le
 * dit, mais seulement quand c'est vrai : `logoSuit` vient du depot, pas d'une
 * intention. Un ecran qui promet un transport qui n'a pas eu lieu vaut moins
 * qu'un ecran qui demande un fichier.
 *
 * LE POIDS VISUEL, ARBITRAGE D'ALEX DU 27/08/2026 : « le CTA voir ce logo sur
 * un objet est trop trop discret, ca devrait etre le plus gros et flashy CTA
 * du site ». Il portait `cta-secondaire`, c'est a dire le style le plus faible
 * de la feuille, celui des liens de service de l'entete. On ecrivait que la
 * suite du parcours passait par la, et on l'ecrivait dans le style reserve a
 * ce qui ne compte pas. Le bloc devient un panneau orange pleine largeur avec
 * un bouton blanc dessus (`passage-objet`, `cta-geant`).
 *
 * ET LE RAPPEL DES FICHIERS EST LA CONTREPARTIE DE CE BRUIT. Un appel a
 * l'action de cette taille, place SOUS les boutons de telechargement, peut
 * faire partir quelqu'un avant qu'il ait pris son .eps ; cette page ne les
 * garde pas, il faudrait redeposer l'image et tout refaire. Le rappel s'ecrit
 * donc tant que rien n'a ete telecharge, et il s'efface des que le premier
 * fichier est pris : le rappel vient du clic, pas d'une intention, comme
 * `logoSuit` vient du depot.
 *
 * ELLE SERT LES DEUX PAGES DEPUIS LE 27/08/2026, et c'est ce qui a fait
 * disparaitre sa premiere phrase. Elle disait « votre fichier est fait », ce
 * qui n'est vrai que sur /vectoriser : sur l'accueil, un PDF est mesure sans
 * etre retrace, et une image refusee ne produit aucun fichier. Le sur-titre
 * « etape suivante » et le titre disent deja d'ou l'on vient ; une phrase de
 * moins vaut mieux qu'une phrase fausse chez la moitie des visiteurs.
 *
 * ET LE RAPPEL NE SE DEVINE PAS ICI. C'est l'appelant qui sait si les boutons
 * de telechargement sont a l'ecran : sur l'accueil, ils n'apparaissent que si
 * le visiteur a demande son fichier. Un rappel qui pointe « juste au-dessus »
 * vers un bloc cache serait pire que pas de rappel du tout.
 */
export function rendreDecouverte({ logoSuit = false, rappelFichiers = false } = {}) {
  return `<div class="passage-objet">
<p class="passage-etape">Étape suivante</p>
<h2>Voyez ce logo sur un objet</h2>
<p class="passage-note">La zone de marquage et ses dimensions sont celles du fabricant,
et la taille obtenue s'affiche en millimètres.
${logoSuit
  ? 'Votre logo vous suit, vous n\'avez rien à redéposer.'
  : 'Vous y déposerez votre logo.'}</p>
<p><a class="cta-geant" href="/voir-mon-logo">Voir ce logo sur un objet<span
class="fleche" aria-hidden="true">→</span></a></p>${rappelFichiers
  ? `
<p class="passage-rappel">Prenez d'abord vos fichiers, juste au-dessus :
cette page ne les garde pas.</p>`
  : ''}
</div>`;
}
