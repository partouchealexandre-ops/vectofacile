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

const ETIQUETTE = Object.freeze({
  oui: 'oui',
  si: 'oui, après vectorisation',
  non: 'non',
});

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
 * Combien d'emplacements restent ouverts. Ecrit d'abord « 2 emplacements
 * possibles sur ce produit, sur 2 », ce qui est exact et ridicule : quand tout
 * passe, le denominateur n'apprend rien.
 */
function ditEmplacements(p) {
  if (p.etat === 'non' || p.zonesQuiPassent < 1) return '';
  if (p.zonesQuiPassent === p.zonesTotal) {
    return p.zonesTotal > 1 ? `Ses ${p.zonesTotal} emplacements l'acceptent.` : '';
  }
  return `${p.zonesQuiPassent} de ses ${p.zonesTotal} emplacements l'acceptent.`;
}

function rendreCarte(p) {
  const autres = ditEmplacements(p);
  // Pas de lien de vectorisation sur CHAQUE carte : sept fois la meme phrase
  // sur un ecran, c'est du bruit, et la charte ne veut qu'un seul appel a
  // l'action par ecran. Il est dans le bandeau, une fois, en bouton.
  return `<article class="produit produit-${p.etat}">
  <div class="produit-image">${silhouette(p.silhouette)}</div>
  <div class="produit-tete">
    <span class="produit-verdict">${ETIQUETTE[p.etat]}</span>
    <h3>${echapper(p.libelle)}</h3>
  </div>
  <p class="produit-phrase">${echapper(direProduit(p))}</p>
  ${autres ? `<p class="produit-autres">${autres}</p>` : ''}
</article>`;
}

/** Le bandeau de tete : combien de produits acceptent ce logo, et rien d'autre. */
export function rendreEnteteGrille(produits) {
  const oui = produits.filter((p) => p.etat === 'oui').length;
  const si = produits.filter((p) => p.etat === 'si').length;
  const total = produits.length;
  // L'appel a l'action vit ICI, une seule fois, et c'est le seul bouton orange
  // de l'ecran : regle de charte, un appel a l'action par ecran.
  const bouton = `<p class="appel-grille"><a class="cta-entete" href="/vectoriser">Vectoriser mon logo, gratuitement</a></p>`;
  if (si && !oui) {
    return `<div class="encadre"><p><b>Votre logo passe sur ${si} de ces ${total} produits,
    une fois vectorisé.</b> Les fabricants demandent un fichier vectoriel ; nous le
    fabriquons ici, gratuitement, en quelques secondes.</p>${bouton}</div>`;
  }
  if (!oui && !si) {
    return `<div class="encadre"><p><b>Votre logo ne passe en l'état sur aucun de ces
    ${total} produits.</b> Chaque carte dit ce qui bloque, et à combien de couleurs
    le marquage redevient possible.</p></div>`;
  }
  const suite = si ? ` ${si} de plus une fois le logo vectorisé, ce qui est gratuit et se fait ici.` : '';
  return `<div class="encadre"><p><b>Votre logo passe sur ${oui} de ces ${total} produits.</b>${suite}
  Chaque carte dit où le marquer, avec quelle technique, et à quelle taille.</p>${si ? bouton : ''}</div>`;
}

export function rendreGrille(produits) {
  if (!produits?.length) return '';
  return `<h2>Sur quels objets votre logo passe-t-il ?</h2>
${rendreEnteteGrille(produits)}
<div class="grille-produits">
${produits.map(rendreCarte).join('\n')}
</div>
<p class="note">Ces huit produits sont des objets publicitaires réels, avec leurs
emplacements de marquage réels. Le verdict croise le nombre de couleurs de votre
logo avec ce que chaque emplacement accepte.</p>`;
}
