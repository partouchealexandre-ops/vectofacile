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

function silhouette(nom) {
  const dessin = SILHOUETTES[nom];
  if (!dessin) return '';
  return `<svg class="silhouette" viewBox="0 0 64 64" aria-hidden="true" fill="none"
  stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">${dessin}</svg>`;
}

/**
 * L'ETIQUETTE D'UNE CARTE.
 *
 * « si » se dit de deux facons, et la difference n'est pas cosmetique : quand
 * le fichier vectoriel est deja pret en bas de page, le visiteur n'a rien a
 * faire faire, il a juste a le prendre. Lui dire « apres vectorisation »
 * laisserait croire a une etape qui n'existe plus.
 */
function etiquette(p, vectorielPret) {
  // §5 du brief du 20/08 : sous le plancher de lisibilite, on ne dit pas oui.
  // « Techniquement, oui » n'est pas une nuance de style : c'est la difference
  // entre un marquage possible et un marquage lisible. La reserve prime sur
  // l'etat, sinon une carte classee « là, ça coince » porte l'etiquette
  // « oui, avec votre fichier vectoriel » et se contredit elle-meme.
  if (p.etat !== 'non' && p.reserveLisibilite) return 'techniquement, oui';
  if (p.etat === 'oui') return 'oui';
  if (p.etat === 'non') return 'non';
  return vectorielPret ? 'oui, avec votre fichier vectoriel' : 'oui, après vectorisation';
}

/**
 * Ce qu'un emplacement accepte, dit comme un vendeur le dirait.
 * `couleursMax` a null veut dire quadrichromie : « toutes vos couleurs », et
 * surtout jamais « 0 couleur », qui est la facon dont la source l'ecrit.
 */
function ditPlafond(offre) {
  if (offre.quadri) return 'toutes vos couleurs';
  if (offre.couleursMax === 1) return 'une seule couleur';
  return `${offre.couleursMax} couleurs au maximum`;
}

const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * POURQUOI PAS LA ZONE EVIDENTE. B3 du brief du 20/08.
 *
 * Sans cette phrase, la casquette proposait « le côté droit » sans un mot sur
 * le devant, et la carte paraissait absurde alors qu'elle avait raison. Deux
 * raisons, deux phrases : ce que le logo demande, ou ce que la technique
 * demande au fichier.
 */
function ditEcart(o) {
  if (!o.accepte) return `pas sur ${o.zone}, ${ditRefus(o)}.`;
  if (o.bloquePar === 'vectoriel') {
    return `sur ${o.zone}, le marquage standard est ${avecArticle(o.technique)}, `
      + 'qui réclame un fichier vectoriel.';
  }
  if (o.bloquePar === 'definition') {
    return `sur ${o.zone}, votre image manquerait de pixels.`;
  }
  return `pas sur ${o.zone}.`;
}

/** Le meme plafond, dit du cote du refus : « qui n'accepte qu'une seule couleur ». */
function ditRefus(offre) {
  return offre.couleursMax === 1
    ? 'qui n\'accepte qu\'une seule couleur'
    : `qui s'arrête à ${offre.couleursMax} couleurs`;
}

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
 * La phrase d'un produit. Une seule, et elle dit toujours ce que le visiteur
 * fait ensuite : ou il marque, ou ce qui lui manque.
 *
 * L'emplacement ouvre la phrase et la technique la suit, separes par deux
 * points. Ecrit d'abord en enfilade, « sur la face avant, en haut, en
 * tampographie », ca donnait trois virgules et plus aucune structure.
 */
export function direProduit(p) {
  if (p.etat === 'non') {
    const combien = p.plafond === null ? ''
      : ` : le plus généreux accepte ${p.plafond === 1 ? 'une seule couleur' : p.plafond + ' couleurs'}`;
    let phrase = `Aucun de ses ${p.zonesTotal} emplacements ne prend votre logo tel quel${combien}.`;
    if (p.palier) {
      phrase += ` En ${p.palier.couleurs} couleur${p.palier.couleurs > 1 ? 's' : ''},`
        + ` ${p.palier.zones} emplacement${p.palier.zones > 1 ? 's' : ''} s'ouvre`
        + `${p.palier.zones > 1 ? 'nt' : ''}.`;
    }
    return phrase;
  }
  const m = p.meilleure;
  const ou = m.zone.charAt(0).toUpperCase() + m.zone.slice(1);
  // « PAS LA, MAIS LA », et B3 du brief du 20/08 : la carte DIT l'arbitrage
  // quand elle ne propose pas la zone evidente du produit. Deux raisons
  // possibles, et elles ne se disent pas pareil : les couleurs du logo, ou ce
  // que la technique de cette zone reclame au fichier.
  if (p.refusee) {
    return `${majuscule(ditEcart(p.refusee))} `
      + `Sur ${m.zone}, en ${m.technique.toLowerCase()}${condition(m)}. `
      + `Taille maximale de la zone : ${taille(m)}.`;
  }
  // UNE INFO PAR PHRASE, regle d'ecriture du brief du 20/08 : ou, comment,
  // quelle taille, combien de couleurs. Ecrit d'abord en une seule phrase a
  // rallonge, ca se lisait comme une notice.
  return `${ou}, en ${m.technique.toLowerCase()}${condition(m)}. `
    + `Taille maximale de la zone : ${taille(m)}.`;
}

/**
 * CE QUE LE VECTORIEL AJOUTERAIT SUR UN PRODUIT QUI DIT DEJA OUI.
 *
 * Cette phrase remplace exactement le peage supprime au §1 du brief du 20/08.
 * Avant, une image nette se voyait barrer la route partout. Maintenant elle
 * passe la ou elle passe, et on lui chiffre ce qu'elle gagnerait a devenir des
 * courbes : des emplacements de plus, et lesquels.
 */
/**
 * POURQUOI CE PRODUIT ATTEND LE FICHIER VECTORIEL.
 *
 * Deux raisons, et elles ne se disent pas pareil. Confondre les deux produit
 * la carte absurde qu'on a vue le 20/08 : « oui, avec votre fichier vectoriel »
 * juste au-dessus de « en transfert numérique », une technique qui accepte
 * pourtant les images. Ce n'etait pas le type du fichier qui bloquait, c'etait
 * sa definition, et la carte ne le disait pas.
 */
/**
 * LA RESERVE DE LISIBILITE, §5 du brief du 20/08.
 *
 * « Le clip : en tampographie, votre logo ferait 12 × 7 mm » est
 * arithmetiquement juste et commercialement absurde. Un refus serait faux, le
 * marquage est possible ; un oui sec serait pire, il vendrait un logo que
 * personne ne lit. On dit donc la reserve, et on donne la sortie.
 */
function ditReserve(p) {
  if (!p.reserveLisibilite || !p.meilleure?.taille) return '';
  return `À ${p.meilleure.taille.largeurMm} mm de large, c'est techniquement possible `
    + 'mais votre logo n\'y serait plus lisible : il faudrait une version simplifiée, '
    + 'sans texte fin.';
}

function ditRaisonSi(p) {
  if (p.etat !== 'si') return '';
  if (p.raison === 'definition') {
    // Avec la taille : « pour cette taille » ne dit rien, « à 280 mm de large »
    // se verifie d'un coup d'oeil sur la ligne juste au-dessus.
    const offre = p.offreFloue ?? p.meilleure;
    const large = offre?.taille ? `À ${offre.taille.largeurMm} mm de large` : 'À cette taille';
    return `${large}, votre image sortirait floue : elle n'a pas assez de pixels. `
      + 'Le fichier vectoriel, lui, ne perd jamais en netteté.';
  }
  return 'Ce marquage fabrique un outil à partir de votre dessin, et un outil se '
    + 'fabrique à partir de courbes.';
}

function ditGain(p, vectorielPret) {
  if (!p.gain) return '';
  const ou = vectorielPret ? 'Avec votre fichier vectoriel' : 'Une fois vectorisé';
  const n = p.gain.zones;
  if (n > 0) {
    const technique = p.gain.meilleure ? `, en ${p.gain.meilleure.technique.toLowerCase()}` : '';
    return `${ou}, ${n} emplacement${n > 1 ? 's' : ''} de plus s'ouvre${n > 1 ? 'nt' : ''}${technique}.`;
  }
  // Meme nombre d'emplacements, mais d'autres techniques y deviennent
  // possibles. On en nomme deux au plus : la liste complete n'apprend rien.
  const noms = p.gain.techniques.slice(0, 2).map(avecArticle);
  const liste = noms.length > 1 ? `${noms[0]} et ${noms[1]}` : noms[0];
  return `${ou}, ${liste} s'ouvre${noms.length > 1 ? 'nt' : ''} aussi sur ces emplacements.`;
}

/**
 * Combien d'emplacements restent ouverts. Ecrit d'abord « 2 emplacements
 * possibles sur ce produit, sur 2 », ce qui est exact et ridicule : quand tout
 * passe, le denominateur n'apprend rien.
 */
function ditEmplacements(p) {
  if (p.etat === 'non' || p.zonesQuiPassent < 1) return '';
  if (p.zonesQuiPassent === p.zonesTotal) {
    return p.zonesTotal > 1 ? `Ses ${p.zonesTotal} emplacements l'acceptent.` : '';
  }
  // Accord : « 1 de ses 4 emplacements l'accepte », jamais « l'acceptent ».
  return `${p.zonesQuiPassent} de ses ${p.zonesTotal} emplacements `
    + `${p.zonesQuiPassent > 1 ? 'l\'acceptent' : 'l\'accepte'}.`;
}

function rendreCarte(p, vectorielPret) {
  const autres = ditEmplacements(p);
  // Une seule phrase de nuance par carte, et dans cet ordre : la lisibilite
  // prime, parce qu'elle survit a la vectorisation ; puis ce qui bloque le
  // fichier ; puis le gain. Trois phrases empilees ne se lisent pas.
  const nuance = ditReserve(p) || ditRaisonSi(p) || ditGain(p, vectorielPret);
  // Pas de lien de vectorisation sur CHAQUE carte : sept fois la meme phrase
  // sur un ecran, c'est du bruit, et la charte ne veut qu'un seul appel a
  // l'action par ecran. Il est dans le bandeau, une fois, en bouton.
  // La carte est DEUX colonnes, pas une grille de lignes : la silhouette a
  // gauche, tout le texte dans un seul bloc a droite. Ecrit d'abord en lignes
  // de grille, chaque paragraphe ajoute retombait sous le picto, dans une
  // colonne de six caracteres de large.
  // La reserve de lisibilite a sa propre teinte : un « techniquement, oui » en
  // vert franc mentirait sur ce qu'il dit.
  const classe = `produit-${p.etat}${p.reserveLisibilite && p.etat !== 'non' ? ' produit-reserve' : ''}`;
  return `<article class="produit ${classe}">
  <div class="produit-image">${silhouette(p.silhouette)}</div>
  <div class="produit-corps">
    <span class="produit-verdict">${etiquette(p, vectorielPret)}</span>
    <h3>${echapper(p.libelle)}</h3>
    <p class="produit-phrase">${echapper(direProduit(p))}</p>
    ${nuance ? `<p class="produit-gain">${echapper(nuance)}</p>` : ''}
  
  </div>
</article>`;
}

/**
 * LES TROIS GROUPES, C3 du brief du 20/08.
 *
 * « Mélangées, les cartes sont un inventaire. Groupées, elles racontent : voilà
 * ce qui marche, voilà ce que le vectoriel débloque, voilà les vraies
 * limites. »
 *
 * La reserve de lisibilite tombe dans le troisieme groupe et pas le premier :
 * un marquage de dix millimetres est techniquement possible et commercialement
 * bloque. Le classer avec ce qui marche serait le meme mensonge poli que le
 * « oui » sec qu'on vient de retirer.
 */
const GROUPES = [
  { cle: 'passe', titre: 'Ça passe avec votre fichier actuel' },
  { cle: 'vectoriel', titre: 'Le fichier vectoriel ouvre aussi' },
  { cle: 'coince', titre: 'Là, ça coince, et voici pourquoi' },
];

function groupeDe(p) {
  if (p.etat === 'non' || p.reserveLisibilite) return 'coince';
  if (p.etat === 'si') return 'vectoriel';
  return 'passe';
}

/**
 * C1 DU BRIEF : LE VERDICT, SEUL, EN PREMIER.
 *
 * La phrase existait deja, elle etait au quatrieme bloc, noyee entre les
 * couleurs et les mesures. Elle passe en tete, en gros, et rien ne
 * l'accompagne : ni codes hexadecimaux, ni explication de procede. Le test du
 * couloir, c'est elle : dix secondes, sans vocabulaire du metier.
 */
export function rendreVerdictCourt(produits, vectorielPret = false, contraste = null) {
  if (!produits?.length) return '';
  const passe = produits.filter((p) => groupeDe(p) === 'passe').length;
  const parVectoriel = produits.filter((p) => groupeDe(p) === 'vectoriel').length;
  const total = produits.length;
  const uniforme = contraste && contraste.signatures <= 1 && total > 1;

  let phrase;
  if (!passe && !parVectoriel) {
    phrase = `<b>Votre logo ne passe en l'état sur aucune de ces ${total} matières.</b>`;
  } else if (!passe) {
    phrase = `<b>Votre logo passe sur ${parVectoriel} de ces ${total} matières, `
      + `avec le fichier vectoriel.</b> Il est gratuit, et il est prêt plus bas.`;
  } else {
    const suite = parVectoriel
      ? ` ${vectorielPret ? 'Le fichier vectoriel, gratuit,' : 'Une fois vectorisé, il'}`
        + ` ouvre ${parVectoriel === 1 ? 'la dernière' : `les ${parVectoriel} dernières`}.`
      : '';
    phrase = `<b>Votre logo passe sur ${passe} matière${passe > 1 ? 's' : ''} `
      + `sur ${total}, avec le fichier que vous avez déposé.</b>${suite}`;
  }
  const monotone = uniforme
    ? `<p class="note">Ces matières répondent toutes la même chose pour ce logo : la même
    technique, le même ordre de taille.</p>`
    : '';
  return `<div class="verdict-tete"><p>${phrase}</p>${monotone}</div>`;
}

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
  // LE FAUX VECTORIEL a sa propre sortie, et elle ne depend pas d'une tentative
  // de vectorisation : on ne retrace pas l'image ecrasee dans un PDF, on
  // reclame l'originale. Ce cas se traite AVANT les autres, sinon un faux
  // vectoriel sans drapeau tombe dans « nous préparons votre fichier », ce qui
  // est faux et le laisse attendre.
  if (fichier.origine === 'faux_vectoriel') {
    return `<div class="verdict-action"><p>`
      + `<b>Ce fichier porte l'extension d'un vectoriel mais n'en est pas un.</b> `
      + `<a href="/vectoriser">Déposez l'image d'origine de votre logo</a>, ou réclamez `
      + `le fichier source à votre graphiste.</p></div>`;
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
    const appel = ctaDejaPorte ? '' :
      `<a class="cta-large" href="#telechargements">Obtenir mon fichier vectoriel</a>`;
    return `<div class="verdict-action">
    ${appel}
    <p class="note">Le <b>.eps</b> pour votre marqueur, le <b>.pdf</b> pour vous. Gratuit,
    sans compte, sans envoi de votre fichier.</p>
    </div>`;
  }
  return `<div class="verdict-action"><p class="note">Nous préparons votre fichier
  vectoriel, il arrive en bas de page.</p></div>`;
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
export const CONTACT = 'contact@vectofacile.fr';

/**
 * ET L'ADRESSE NE RECOIT RIEN AUJOURD'HUI.
 *
 * Tour de site du 21/08 : le domaine vectofacile.fr n'est pas achete, donc
 * contact@vectofacile.fr ne peut pas recevoir de courrier. L'adresse est deja
 * publiee dans les mentions legales, ce qui est un probleme en soi, mais ce
 * n'est pas une raison pour en fabriquer un second : un formulaire qui ecrit
 * dans le vide est PIRE que pas de formulaire. Le visiteur croit avoir demande
 * un prix, personne ne repond, et c'est le contraire de la confiance qu'on
 * cherche a construire.
 *
 * Le bloc « et maintenant ? » ne s'affiche donc pas encore. Le jour ou le
 * domaine tourne, ce booleen passe a vrai, une ligne, et le harnais verifie
 * que l'affichage suit dans les deux sens.
 */
export const CONTACT_OPERATIONNEL = false;

export function rendreSuite() {
  if (!CONTACT_OPERATIONNEL) return '';
  return `<div class="encadre et-maintenant">
  <h2>Vous voulez ce marquage en vrai ?</h2>
  <p>Dites-nous sur quel objet, on vous dit combien ça coûte et en combien de temps.
  Réponse par un humain qui a vu votre diagnostic.</p>
  <div class="suite-champs">
    <label for="suite_email">Votre email</label>
    <input type="email" id="suite_email" placeholder="vous@votre-entreprise.fr">
    <label for="suite_mot">Sur quel objet ? (facultatif)</label>
    <input type="text" id="suite_mot" placeholder="500 tote bags pour un salon">
    <button id="suite_envoyer" type="button">Demander un prix</button>
  </div>
  <p class="note">Votre logo ne part pas : seul le diagnostic accompagne votre message,
  pour que la réponse soit utile dès le premier échange.</p>
</div>`;
}

/**
 * LA DECOUVERTE APRES LA REMISE DU FICHIER, partie D du brief du 21/08.
 *
 * `/vectoriser` fait une chose et une seule : deposer, convertir, telecharger,
 * trois clics, aucun diagnostic impose. C'est la page d'atterrissage du trafic
 * « vectoriser un JPEG », et lui imposer un verdict avant son fichier serait
 * lui faire payer sa visite.
 *
 * APRES la remise, c'est autre chose : le visiteur a ce qu'il venait chercher,
 * et deux cartes lui montrent ce que son fichier vient d'ouvrir. Deux, pas
 * huit : ce n'est pas le diagnostic, c'est une porte vers le diagnostic.
 */
export function rendreDecouverte(produits) {
  const passe = (produits ?? []).filter((p) => groupeDe(p) !== 'coince').slice(0, 2);
  if (passe.length < 2) return '';
  return `<h2>Votre logo passe aussi sur ces objets</h2>
<p class="note">Votre fichier vectoriel vient d'ouvrir ces marquages. Voici deux exemples,
sur des matières réelles.</p>
<div class="grille-produits">
${passe.map((p) => rendreCarte(p, true)).join('\n')}
</div>
<p><a class="cta-secondaire" href="/">Voir toutes les matières pour ce logo</a></p>`;
}

/**
 * `options.vectorielPret` : le .eps est deja fabrique et attend en bas de page.
 * `options.contraste` : ce que la selection a retenu, §4 du brief.
 */
export function rendreGrille(produits, options = {}) {
  if (!produits?.length) return '';
  const pret = Boolean(options.vectorielPret);
  const parGroupe = GROUPES.map((g) => ({
    ...g, cartes: produits.filter((p) => groupeDe(p) === g.cle),
  })).filter((g) => g.cartes.length);

  const blocs = parGroupe.map((g) => `<h3 class="groupe-titre groupe-${g.cle}">${g.titre}</h3>
<div class="grille-produits">
${g.cartes.map((p) => rendreCarte(p, pret)).join('\n')}
</div>`).join('\n');

  return `${blocs}
<p class="note">Ce ne sont pas des références de catalogue, ce sont des matières : la
contrainte de marquage tient d'abord à la matière, pas au modèle. Chaque carte agrège les
emplacements réels de plusieurs dizaines de produits de cette matière, et donne leur taille
médiane. Votre modèle exact peut différer.</p>`;
}
