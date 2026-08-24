/**
 * LE RENDU DE LA GRILLE DE FEUX.
 *
 * LOT 1 du 21/08/2026. La grille doit tenir en un ecran et se comprendre SANS
 * LIRE, au seul jeu des couleurs. Tout ce qui s'ajoute a une ligne doit donc
 * meriter sa place : un feu, un nom, une definition d'une ligne, la raison si
 * le feu n'est pas vert, et les produits qui traduisent la technique.
 *
 * Fonction PURE : elle prend des donnees, elle rend une chaine.
 */

import { CAUSES } from './feux.js';
import { CONTACT_OPERATIONNEL } from './rendu_grille.js';

const echapper = (t) => String(t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ETIQUETTE_FEU = Object.freeze({
  vert: 'envoyez tel quel',
  orange: 'un obstacle, surmontable',
  rouge: 'le logo doit être retravaillé',
});

/**
 * LES SIX TEXTES DE ROUGE, dont trois se taisent encore.
 *
 * « Il faut une version adaptée » ne sert a rien : la personne va devoir
 * briefer un prestataire, et elle ne sait pas quoi demander. Le site ecrit donc
 * LE BRIEF DU GRAPHISTE a sa place. Ce service est utile meme chez celui qui
 * ira voir son propre designer.
 *
 * Chaque texte a la meme forme : ce qui se passe, pourquoi, et CE QU'IL FAUT
 * DEMANDER. Le troisieme paragraphe est celui qui se copie.
 */
function texteRouge(ligne, contexte) {
  if (ligne.cause === CAUSES.couleurs) {
    const { couleurs, plafond } = ligne.chiffres;
    return {
      titre: `En ${ligne.nom.toLowerCase()}, votre logo a trop de couleurs.`,
      explication: `Il en compte ${couleurs}. Les ateliers en acceptent ${plafond} : `
        + 'chaque couleur demande son propre outil et son propre passage de machine.',
      demande: `Une version à ${plafond} couleur${plafond > 1 ? 's' : ''} maximum. `
        + 'C\'est un arbitrage graphique, il faut décider lesquelles fusionner : '
        + 'ce n\'est pas une conversion automatique.',
    };
  }
  if (ligne.cause === CAUSES.monochrome) {
    const quoi = ligne.confusion
      ? `${teinte(ligne.confusion.absorbee)} et ${teinte(ligne.confusion.absorbante)} se confondent`
      : 'deux formes se confondent';
    return {
      titre: 'En une seule couleur, votre logo perd son dessin.',
      explication: `Cette technique ne pose qu'une matière : ${quoi}, et il ne resterait `
        + 'qu\'une forme pleine.',
      demande: 'Une version monochrome, obtenue en général en ajoutant un contour aux '
        + 'zones claires pour qu\'elles restent distinctes.',
    };
  }
  if (ligne.cause === CAUSES.degrade) {
    return {
      titre: 'Votre logo contient un dégradé.',
      explication: 'Cette technique pose l\'encre ou ne la pose pas : il n\'y a pas de '
        + 'demi-teinte. Le dégradé se rendrait par une trame de points, visible à l\'œil '
        + 'sur un petit marquage.',
      demande: 'Une version en aplats francs, sans dégradé ni ombre portée.',
    };
  }
  return null;
}

/** « le clair » / « le foncé », pour nommer ce qui se confond sans jargon. */
function teinte(rvb) {
  if (!Array.isArray(rvb)) return 'une forme';
  const l = luminance(rvb);
  if (l > 0.75) return 'la partie claire';
  if (l < 0.25) return 'la partie foncée';
  return 'une des deux teintes';
}

/** Luminance relative, formule de contraste standard. */
export function luminance([r, v, b]) {
  const c = [r, v, b].map((x) => {
    const n = x / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** La raison du feu, une phrase, et seulement si le feu n'est pas vert. */
function raison(ligne) {
  if (ligne.feu === 'vert') return '';
  if (ligne.feu === 'orange' && ligne.nuance === 'format') {
    return 'Cette technique fabrique un outil à partir de votre dessin : elle réclame '
      + 'des courbes, pas une image. Nous les fabriquons ici, gratuitement.';
  }
  if (ligne.feu === 'orange' && ligne.nuance === 'definition') {
    return `Votre image est trop petite pour un marquage de ${ligne.chiffres.tailleMm} mm, `
      + 'la taille courante sur cette technique : elle sortirait floue.';
  }
  const t = texteRouge(ligne);
  return t ? t.titre : '';
}

/**
 * L'ACTION d'une ligne. Trois cas, trois actions differentes, et c'est tout
 * l'interet de distinguer les deux oranges : ce n'est pas la meme personne qui
 * regle le probleme.
 */
function action(ligne) {
  if (ligne.feu === 'orange' && ligne.nuance === 'format') {
    return `<a class="feu-action" href="#telechargements">Obtenir mon fichier vectoriel</a>`;
  }
  if (ligne.feu === 'orange' && ligne.nuance === 'definition') {
    return `<p class="feu-sortie">Cherchez la plus grande version dont vous disposez, un PDF
    de plaquette ou un export d'origine :
    <a href="/questions/comment-vectoriser-un-jpeg">pourquoi la taille de départ décide de
    tout</a>. Si vous ne trouvez vraiment aucune version plus grande, il faudra redessiner
    le logo, et nous pouvons vous aider.</p>`;
  }
  return '';
}

/**
 * LE BRIEF DU GRAPHISTE, sous un rouge. Le paragraphe « ce qu'il faut
 * demander » porte un bouton de copie : la personne le colle dans son mail. Le
 * texte emporte notre raisonnement chez un professionnel qui decouvre le site
 * au passage.
 */
function brief(ligne) {
  const t = texteRouge(ligne);
  if (!t) return '';
  // LE REFLEXE GRATUIT PASSE AVANT L'OFFRE. C'est la signature du site, et
  // c'est ce qui rend la suite credible.
  const offre = CONTACT_OPERATIONNEL
    ? `<p>Si elle n'existe pas, on peut la faire. C'est un travail de graphiste, et il
      resservira à toutes vos commandes. Laissez-nous votre email avec votre logo : on vous
      dit ce qu'on ferait et ce que ça coûte.</p>
      <div class="suite-champs">
        <label for="brief_email">Votre email</label>
        <input type="email" id="brief_email" placeholder="vous@votre-entreprise.fr">
        <button id="brief_envoyer" type="button">Demander cette version</button>
      </div>`
    : '';
  return `<div class="feu-brief">
  <p>${echapper(t.explication)}</p>
  <p class="feu-demande"><b>Ce qu'il faut demander :</b>
  <span class="feu-copiable">${echapper(t.demande)}</span>
  <button class="feu-copier" type="button" data-copier="${echapper(t.titre + ' ' + t.explication + ' Ce qu\'il faut demander : ' + t.demande)}">Copier ce brief</button></p>
  <p class="note">Cette version existe peut-être déjà : demandez-la à qui a fait votre
  logo, elle vous appartient.</p>
  ${offre}
</div>`;
}

function rendreLigne(ligne) {
  const r = raison(ligne);
  return `<article class="feu feu-${ligne.feu}">
  <div class="feu-pastille" aria-hidden="true"></div>
  <div class="feu-corps">
    <h3>${echapper(ligne.nom)} <span class="feu-etat">${ETIQUETTE_FEU[ligne.feu]}</span></h3>
    <p class="feu-definition">${echapper(ligne.definition)}</p>
    ${r ? `<p class="feu-raison">${echapper(r)}</p>` : ''}
    ${action(ligne)}
    ${brief(ligne)}
    <p class="feu-produits">${echapper(ligne.produits)}</p>
  </div>
</article>`;
}

/**
 * L'EN-TETE : la vignette est posee par l'application, ici vient LE FAIT LE
 * PLUS ACTIONNABLE. Le nombre de couleurs decide de la technique et du devis,
 * et c'est la premiere question d'un marqueur.
 */
export function rendreFaitPrincipal(nCouleurs) {
  if (!Number.isInteger(nCouleurs) || nCouleurs < 1) return '';
  return `<div class="verdict-tete"><p><b>Votre logo a ${nCouleurs} couleur${
    nCouleurs > 1 ? 's' : ''} réelle${nCouleurs > 1 ? 's' : ''}.</b></p></div>`;
}

export function rendreFeux(feux) {
  if (!feux?.length) return '';
  return `<div class="grille-feux">${feux.map(rendreLigne).join('\n')}</div>`;
}

/**
 * LES POINTS D'ATTENTION, §5 du lot 1.
 *
 * Trois a cinq puces, jamais plus, JUSTE APRES la grille. Ce sont les conseils
 * transversaux, ceux qui changent la lecture de toutes les techniques a la
 * fois, et qui n'appartiennent donc a aucune ligne.
 *
 * Le premier est le plus utile et il n'existe nulle part ailleurs : LA COULEUR
 * DU SUPPORT. Une couleur tres claire disparait sur un objet blanc ou naturel,
 * et le blanc est le cas par defaut du coton, de la ceramique et de beaucoup de
 * plastiques. Personne ne le dit au client avant la livraison.
 */
const CLAIR = 0.72;

export function pointsAttention(mesures) {
  const points = [];
  const palette = mesures?.m2Couleurs?.palette ?? [];
  const n = mesures?.m2Couleurs?.couleursReelles ?? 0;

  // 1. LE SUPPORT CLAIR. On ne signale que les couleurs qui portent vraiment du
  // dessin : une teinte claire sur un pour cent de l'encre est un liseré, pas
  // une forme, et l'avertir ferait du bruit.
  const claires = palette.filter((c) => luminance(c.rvb) > CLAIR && (c.part ?? 0) > 0.05);
  if (claires.length) {
    points.push({
      cle: 'support',
      titre: 'Attention au support clair',
      texte: `${claires.length > 1 ? 'Deux de vos couleurs sont' : 'Une de vos couleurs est'} `
        + 'presque blanche. Sur un t-shirt blanc, un tote bag écru ou un mug blanc, '
        + `${claires.length > 1 ? 'elles disparaissent' : 'elle disparaît'}. Prévoyez une `
        + 'version au contour, ou choisissez des objets colorés.',
    });
  }

  // 2. LE COUT DES COULEURS. Ce n'est pas un refus, c'est une facture : en
  // serigraphie et en tampographie, chaque couleur est un ecran ou un cliche,
  // et un passage de machine de plus.
  if (n >= 4) {
    points.push({
      cle: 'couleurs',
      titre: 'Chaque couleur se paie',
      texte: `Votre logo en compte ${n}. En sérigraphie et en tampographie, chacune demande `
        + 'son propre outil et son propre passage : une version en une ou deux couleurs est '
        + 'l\'économie la plus simple de votre marquage.',
    });
  }

  // 3. LA PROPORTION, qui exclut des familles entieres. Un logo deux fois plus
  // large que haut est inexploitable sur un stylo, dont les zones font sept
  // millimetres de haut : ce n'est pas un defaut du logo, c'est un fait de
  // geometrie, et il vaut mieux le savoir avant de commander mille stylos.
  const rapport = mesures?.boiteEncre?.rapport ?? null;
  if (Number.isFinite(rapport) && rapport >= 3) {
    points.push({
      cle: 'proportion',
      titre: 'Votre logo est très allongé',
      texte: `Il est ${arrondi(rapport)} fois plus large que haut. Sur les objets à zone `
        + 'basse, un stylo, un briquet, une sangle, il devra être réduit au point de ne '
        + 'plus se lire. Une version compacte, symbole au-dessus du texte, ouvre ces objets.',
    });
  } else if (Number.isFinite(rapport) && rapport > 0 && rapport <= 0.4) {
    points.push({
      cle: 'proportion',
      titre: 'Votre logo est très haut',
      texte: 'Il est plus haut que large. Sur les zones larges et basses, une sangle, un '
        + 'stylo, il sera réduit à presque rien : une version horizontale les ouvre.',
    });
  }
  return points;
}

const arrondi = (x) => String(Math.round(x * 10) / 10).replace('.', ',');

export function rendrePointsAttention(points) {
  if (!points?.length) return '';
  return `<section class="points-attention">
  <h2>À savoir avant de commander</h2>
  <ul>${points.map((p) => `<li><b>${echapper(p.titre)}.</b> ${echapper(p.texte)}</li>`).join('')}</ul>
</section>`;
}
