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
  // entre un marquage possible et un marquage lisible.
  if (p.etat === 'oui' && p.reserveLisibilite) return 'techniquement, oui';
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

/** Le meme plafond, dit du cote du refus : « qui n'accepte qu'une seule couleur ». */
function ditRefus(offre) {
  return offre.couleursMax === 1
    ? 'qui n\'accepte qu\'une seule couleur'
    : `qui s'arrête à ${offre.couleursMax} couleurs`;
}

/** « 35 × 14 mm ». */
const taille = (o) => `${o.taille.largeurMm} × ${o.taille.hauteurMm} mm`;

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
  // « PAS LA, MAIS LA ». C'est le moment ou le site cesse d'etre un juge et
  // devient un conseiller, et il ne vaut que parce qu'on a essaye toutes les
  // zones avant de le dire.
  if (p.refusee) {
    const refus = p.refusee.zone;
    return `Pas sur ${refus}, ${ditRefus(p.refusee)}. `
      + `Mais oui sur ${m.zone} : en ${m.technique.toLowerCase()}, `
      + `votre logo ferait ${taille(m)}.`;
  }
  return `${ou} : en ${m.technique.toLowerCase()}, votre logo ferait ${taille(m)}, `
    + `${ditPlafond(m)}.`;
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
  const classe = `produit-${p.etat}${p.etat === 'oui' && p.reserveLisibilite ? ' produit-reserve' : ''}`;
  return `<article class="produit ${classe}">
  <div class="produit-image">${silhouette(p.silhouette)}</div>
  <div class="produit-corps">
    <span class="produit-verdict">${etiquette(p, vectorielPret)}</span>
    <h3>${echapper(p.libelle)}</h3>
    <p class="produit-phrase">${echapper(direProduit(p))}</p>
    ${nuance ? `<p class="produit-gain">${echapper(nuance)}</p>` : ''}
    ${autres ? `<p class="produit-autres">${autres}</p>` : ''}
  </div>
</article>`;
}

/**
 * LE BANDEAU DE TETE : ce que le fichier depose ouvre deja, et ce qui manque.
 *
 * Reecrit apres le §1 du brief du 20/08. Il annoncait « votre logo passe sur 8
 * de ces 8 produits, une fois vectorise » a quelqu'un dont l'image ouvrait
 * deja la moitie des techniques. Il compte maintenant ce qui passe TEL QUEL, et
 * le vectoriel devient un gain chiffre, jamais une condition d'entree.
 *
 * L'appel a l'action vit ICI, une seule fois, et c'est le seul bouton orange
 * de l'ecran : regle de charte, un appel a l'action par ecran. Quand le fichier
 * vectoriel est deja pret en bas de page, il n'y a plus rien a demander : le
 * bandeau se tait et laisse les boutons de telechargement faire l'action.
 */
export function rendreEnteteGrille(produits, vectorielPret = false, contraste = null) {
  const oui = produits.filter((p) => p.etat === 'oui').length;
  const si = produits.filter((p) => p.etat === 'si').length;
  const gains = produits.filter((p) => p.etat === 'oui' && p.gain).length;
  const total = produits.length;
  const bouton = vectorielPret ? ''
    : `<p class="appel-grille"><a class="cta-entete" href="/vectoriser">Vectoriser mon logo, gratuitement</a></p>`;
  const ouvre = vectorielPret ? 'Votre fichier vectoriel' : 'Une fois vectorisé, votre logo';

  // §4 DU BRIEF : quand toutes les cartes repondent la meme chose, la grille
  // ne discrimine rien et il faut le DIRE, pas aligner huit cartes identiques.
  const uniforme = contraste && contraste.signatures <= 1 && total > 1;
  const monotone = uniforme
    ? ' Ces matières répondent toutes la même chose pour ce logo : la même technique, '
      + 'le même ordre de taille.'
    : '';

  if (si && !oui) {
    return `<div class="encadre"><p><b>Votre logo passe sur ${si} de ces ${total} matières,
    ${vectorielPret ? 'avec le fichier vectoriel préparé plus bas' : 'une fois vectorisé'}.</b>
    Ces marquages fabriquent un outil à partir de votre dessin, un cliché, un écran,
    un tracé, et un outil se fabrique à partir de courbes.${monotone}</p>${bouton}</div>`;
  }
  if (!oui && !si) {
    return `<div class="encadre"><p><b>Votre logo ne passe en l'état sur aucune de ces
    ${total} matières.</b> Chaque carte dit ce qui bloque, et à combien de couleurs
    le marquage redevient possible.</p></div>`;
  }
  let suite = '';
  if (si) {
    suite = ` ${ouvre} en ouvre ${si} de plus.`;
  } else if (gains) {
    suite = ` ${ouvre} ouvre des emplacements supplémentaires sur ${gains} d'entre elles.`;
  }
  return `<div class="encadre"><p><b>Votre logo passe déjà sur ${oui} de ces ${total}
  matières, avec le fichier que vous avez déposé.</b>${suite}${monotone}
  Chaque carte dit où le marquer, avec quelle technique, et à quelle taille.</p>${bouton}</div>`;
}

/**
 * `options.vectorielPret` : le .eps est deja fabrique et attend en bas de page.
 * `options.contraste` : ce que la selection a retenu, §4 du brief. Il sert a
 * dire « ces matieres repondent toutes la meme chose » au lieu de le laisser
 * decouvrir apres huit cartes.
 */
export function rendreGrille(produits, options = {}) {
  if (!produits?.length) return '';
  const pret = Boolean(options.vectorielPret);
  const surLesquels = produits.filter((p) => p.produits).length === produits.length;
  return `<h2>Sur quelles matières votre logo passe-t-il ?</h2>
${rendreEnteteGrille(produits, pret, options.contraste ?? null)}
<div class="grille-produits">
${produits.map((p) => rendreCarte(p, pret)).join('\n')}
</div>
<p class="note">Ce ne sont pas des références de catalogue, ce sont des ${surLesquels
  ? 'matières'
  : 'produits'} : la contrainte de marquage tient d'abord à la matière, pas au
modèle. ${surLesquels
  ? 'Chaque carte agrège les emplacements réels de plusieurs dizaines de produits de '
    + 'cette matière, et donne leur taille médiane. Votre modèle exact peut différer.'
  : 'Le verdict croise le nombre de couleurs de votre logo avec ce que chaque '
    + 'emplacement accepte.'}</p>`;
}
