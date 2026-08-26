/**
 * LE RENDU DE LA GRILLE DE FEUX.
 *
 * LOT 1 du 21/08/2026. La grille doit tenir en un ecran et se comprendre SANS
 * LIRE, au seul jeu des couleurs. Tout ce qui s'ajoute a une ligne doit donc
 * meriter sa place : un feu, un nom, une definition d'une ligne, la raison si
 * le feu n'est pas vert, et les produits qui traduisent la technique.
 *
 * DIRECTION VISUELLE DU 24/08/2026, « piste 3 compacte », validee par Alex.
 * Le premier rendu tenait la doctrine et ratait sa promesse : « c'est tres
 * texte, puis texte, puis texte, c'est peu visuel ». Sept lignes pleine largeur
 * empilees, une pastille de 16 px chacune, la page se LISAIT.
 *
 * Ce qui change, et rien d'autre : deux cartes par ligne, un boitier de feu a
 * trois lampes qui se lit de loin, un picto de technique dans le titre, les
 * objets frequents en puces illustrees, et le bouton de conversion redevenu
 * plein. Les DONNEES ne bougent pas : meme ordre, memes definitions, memes
 * etats, memes briefs.
 *
 * Fonction PURE : elle prend des donnees, elle rend une chaine.
 */

import { CAUSES } from './feux.js';
import { CONTACT_OPERATIONNEL } from './rendu_grille.js';
import { spritePictos, usePicto, pictoProduit, objets } from './pictos.js';

const echapper = (t) => String(t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * L'ETIQUETTE D'ETAT. Elle etait une micro-capitale de 11,5 px collee au titre :
 * c'etait la charte des ETIQUETTES, appliquee a ce qui n'en est pas une. Cette
 * ligne EST le verdict de la carte, elle se lit. Les vraies etiquettes de la
 * carte, le rang et « objets frequents », gardent les capitales.
 */
const ETIQUETTE_FEU = Object.freeze({
  vert: 'Envoyez tel quel',
  orange: 'Un obstacle, surmontable',
  rouge: 'Le logo doit être retravaillé',
});

/** Les trois lampes du boitier, de haut en bas, comme un feu de carrefour. */
const LAMPES = Object.freeze(['rouge', 'orange', 'vert']);

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
      // DEUX CORRECTIONS DU 26/08/2026, signalees par Alex sur un logo a sept
      // couleurs. La phrase ne disait pas de QUOI elle comptait sept, alors
      // qu'elle part telle quelle dans le presse papier et se lit sans son
      // titre. Et elle posait le plafond comme une regle du metier, sans
      // reserve, alors que la valeur qui la nourrit est un ARBITRÉ ALEX du
      // 20/08 et non une valeur SOURCÉE : elle se dit donc au conditionnel de
      // l'usage, « generalement », « au maximum », jamais comme une borne.
      explication: `Votre logo compte ${couleurs} couleurs. Les ateliers en acceptent `
        + `généralement ${plafond} au maximum : chaque couleur demande son propre outil `
        + 'et son propre passage de machine.',
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
      // « NE POSE QU'UNE MATIERE » ETAIT FAUX POUR LA MOITIE DES TECHNIQUES
      // CONCERNEES, signale par Alex le 26/08/2026. La gravure laser ne pose
      // rien : elle RETIRE de la matiere, et la teinte obtenue est celle du
      // support mis a nu. La definition de la ligne le disait deja
      // correctement, deux ecrans plus haut, et ce texte la contredisait.
      // Ce qui est vrai des deux techniques monochromes, celle qui creuse
      // comme celle qui presse une feuille, c'est le RESULTAT : une teinte.
      explication: `Cette technique ne rend qu'une seule teinte : ${quoi}, et il ne `
        + 'resterait qu\'une forme pleine.',
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
    // LE MOT MANQUAIT, arbitrage Alex du 24/08/2026. La phrase disait « des
    // courbes », le bouton juste dessous disait « fichier vectoriel », et
    // personne ne faisait le lien entre les deux. C'est pourtant LE mot que le
    // marqueur emploie au telephone : il faut donc l'apprendre au visiteur, pas
    // le contourner. Le site vulgarise, il ne remplace pas le vocabulaire.
    return 'Cette technique fabrique un outil à partir de votre dessin : elle réclame '
      + 'des courbes, pas une image. Cela s\'appelle un fichier vectoriel, et nous '
      + 'vous le fabriquons ici, gratuitement.';
  }
  // LE TROISIEME ORANGE, 26/08/2026. Il ne se compose pas d'une phrase toute
  // faite mais de DEUX FAITS COMPTES, parce qu'un seul mot ne sait pas decrire
  // un partage. Aucun seuil n'y est publie : ce qui est dit, c'est le nombre
  // d'emplacements, lu dans archetypes.json, et la mecanique qui l'explique.
  // Le mot « impossible » n'y figure jamais, arbitrage P0.5.
  if (ligne.feu === 'orange' && ligne.nuance === 'couleurs') {
    const { couleurs, accepte, confortable, total } = ligne.chiffres;
    const en = (n) => `${n} emplacement${n > 1 ? 's' : ''}`;
    const debut = `Sur les ${total} emplacements que nous connaissons pour cette technique, `
      + `${accepte} acceptent ${couleurs} couleurs.`;
    if (confortable === 0) {
      return `${debut} Aucun ne le fait sans un écran, un passage et un calage par `
        + 'couleur : le marquage pèsera lourd dans le devis.';
    }
    if (confortable < accepte) {
      return `${debut} ${en(confortable)} le font sans surcoût notable ; sur les autres, `
        + 'chaque couleur demande son propre écran, son propre passage et son propre calage.';
    }
    return `${debut} Les autres n'en acceptent pas autant : c'est l'emplacement qui décide, `
      + 'pas la technique.';
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
    // BOUTON PLEIN, arbitrage Alex du 24/08/2026. Il etait en contour, par
    // crainte du sapin de boutons oranges. Le contour le rendait secondaire
    // alors que c'est LA conversion du site, et c'est la meme action sur les
    // trois cartes, pas trois actions qui se disputent l'ecran. La regle de la
    // charte est tenue autrement : le bloc orange du bas s'efface quand les
    // cartes portent deja le bouton, voir `rendreActionFichier`.
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
  <p class="feu-brief-titre">Ce qu'il faut demander à votre graphiste</p>
  <p>${echapper(t.explication)}</p>
  <p class="feu-demande"><b>À demander :</b>
  <span class="feu-copiable">${echapper(t.demande)}</span></p>
  <p class="note">Cette version existe peut-être déjà : demandez-la à qui a fait votre
  logo, elle vous appartient.</p>
  <button class="feu-copier" type="button" data-copier="${echapper(t.titre + ' ' + t.explication + ' Ce qu\'il faut demander : ' + t.demande)}">Copier ce brief</button>
  ${offre}
</div>`;
}

/**
 * LE BOITIER DE FEU, a gauche de la carte.
 *
 * Trois lampes, une seule allumee : c'est ce qui se comprend SANS LIRE, et
 * c'est la raison d'etre de la carte. Les deux lampes eteintes ne sont pas
 * grises, elles gardent leur teinte a tres faible opacite : un feu dont les
 * lampes eteintes seraient neutres ne se lit plus comme un feu.
 *
 * Le boitier porte le libelle en `aria-label` : sans lui, un lecteur d'ecran
 * ne recoit que trois `span` vides. L'etat est ecrit juste a cote en toutes
 * lettres, donc les lampes elles memes restent muettes.
 */
function boitier(feu) {
  const lampes = LAMPES
    .map((l) => `<span class="feu-lampe lampe-${l}${l === feu ? ' allumee' : ''}"></span>`)
    .join('');
  return `<div class="feu-rail">
    <div class="feu-boitier" role="img" aria-label="Feu ${feu}">${lampes}</div>
  </div>`;
}

/**
 * LES OBJETS POSSIBLES, en puces.
 *
 * C'est la traduction de la technique : personne ne sait ce qu'est la
 * tampographie, tout le monde reconnait un stylo et une cle USB. Le picto reste
 * PETIT et discret, 15 px : sa fonction est de rendre la liste balayable, pas
 * de faire grossir la carte.
 *
 * « POSSIBLES », PAS « FREQUENTS », arbitrage Alex du 24/08/2026. Nous ne
 * mesurons aucune frequence : ecrire « frequents » serait une statistique
 * inventee, exactement ce que le reste du site refuse. Et la liste n'engage
 * aucun atelier : la reserve est ecrite une fois sous la grille, pas sept fois
 * dans les cartes, ou elle deviendrait du bruit qu'on saute.
 */
function produits(ligne) {
  const liste = objets(ligne.produits);
  if (!liste.length) return '';
  const puces = liste.map((nom) =>
    `<li class="feu-objet">${usePicto(`po-${pictoProduit(nom)}`, 'picto-objet')}`
    + `<span>${echapper(nom)}</span></li>`).join('');
  return `<div class="feu-produits">
    <p class="feu-produits-titre">Objets possibles</p>
    <ul class="feu-objets">${puces}</ul>
  </div>`;
}

/**
 * UNE CARTE DE TECHNIQUE.
 *
 * Deux colonnes : le feu a gauche, tout le reste a droite. La hauteur suit le
 * contenu, elle n'est jamais egalisee : une carte verte n'a rien a dire de plus
 * qu'une ligne, et l'etirer a la hauteur d'une carte rouge fabriquerait du vide
 * qui se lit comme un manque.
 *
 * LE RANG N'EST PAS UN CLASSEMENT. « Technique 01 » dit que la carte fait
 * partie d'un ensemble ferme de sept, et c'est ce qui rend le « sur 7 » non
 * arbitraire. L'ordre est celui de la frequence d'usage reelle, jamais une
 * preference.
 */
function rendreLigne(ligne, index) {
  const r = raison(ligne);
  const rang = String(index + 1).padStart(2, '0');
  return `<article class="feu feu-${ligne.feu}">
  ${boitier(ligne.feu)}
  <div class="feu-corps">
    <div class="feu-titre">
      <span class="feu-picto">${usePicto(`pt-${ligne.cle}`, 'picto-technique')}</span>
      <span>
        <span class="feu-rang">Technique ${rang}</span>
        <h3>${echapper(ligne.nom)}</h3>
      </span>
    </div>
    <p class="feu-etat">${ETIQUETTE_FEU[ligne.feu]}</p>
    <p class="feu-definition">${echapper(ligne.definition)}</p>
    ${ligne.reserve ? `<p class="feu-reserve">${echapper(ligne.reserve)}</p>` : ''}
    ${r ? `<p class="feu-raison">${echapper(r)}</p>` : ''}
    ${produits(ligne)}
    ${action(ligne)}
    ${brief(ligne)}
  </div>
</article>`;
}

/**
 * LE FAIT PRINCIPAL, REECRIT LE 24/08/2026.
 *
 * IL DISAIT LE MAUVAIS FAIT. « Votre logo a 3 couleurs réelles » est vrai,
 * utile, et ce n'est pas la reponse a la question que le visiteur vient de
 * poser. Il a depose son logo apres avoir lu « Votre logo est-il bon a
 * marquer ? » : la premiere ligne doit REPONDRE, pas mesurer.
 *
 * La reponse se compte sur les feux, et elle ne se force jamais. « Bonne
 * nouvelle » ne s'ecrit QUE s'il existe au moins un vert, c'est a dire au
 * moins une technique qui prend le fichier tel quel. Un orange n'est pas une
 * bonne nouvelle, c'est un travail a faire, meme quand c'est nous qui le
 * faisons.
 *
 * Le compte de couleurs reste, en seconde ligne : c'est le fait le plus
 * actionnable APRES la reponse, celui qu'un marqueur demande en premier.
 */
export function rendreFaitPrincipal(nCouleurs, feux = [], mesures = null) {
  const blanc = logoClair(mesures);
  const verts = feux.filter((f) => f.feu === 'vert').length;
  const formats = feux.filter((f) => f.feu === 'orange' && f.nuance === 'format').length;
  const definitions = feux.filter((f) => f.feu === 'orange' && f.nuance === 'definition').length;
  const total = feux.length;

  let titre = '';
  let classe = '';
  if (verts > 0) {
    classe = 'reponse-oui';
    // « PART TEL QUEL » PROMETTAIT PLUS QUE CE QU'ON SAIT, arbitrage Alex du
    // 26/08/2026.
    //
    // La phrase disait que le logo PART, au present, ce qui se lit comme une
    // acceptation acquise chez le marqueur. Or ce que nous savons s'arrete au
    // fichier : rien dedans ne bloque cette technique. La suite appartient a
    // l'atelier, a ses presses et a ses encres, et le site le repete partout
    // ailleurs, « nous lisons un fichier, pas une machine ». La tete de page
    // etait le seul endroit qui l'oubliait.
    //
    // « pourrait partir en fabrication » dit exactement ce qui est mesure, et
    // « etudiees » dit ce que nous avons fait : les sept techniques ont ete
    // regardees, pas seulement celles qui passent. L'etiquette de la carte
    // verte, elle, garde son imperatif « Envoyez tel quel » : elle porte une
    // action sur UNE technique, la tete de page porte un bilan sur les sept.
    titre = verts === total
      ? `Bonne nouvelle : votre logo pourrait partir en fabrication sur les ${total} `
        + 'techniques étudiées.'
      : `Bonne nouvelle : votre logo pourrait partir en fabrication sur ${verts} des `
        + `${total} techniques étudiées.`;
  } else if (formats > 0) {
    // PAS DE « BONNE NOUVELLE » ICI, et c'est delibere : aucune technique ne
    // prend le fichier en l'etat. Mais l'obstacle est le notre, pas le sien,
    // et la phrase doit le dire dans cet ordre.
    classe = 'reponse-format';
    titre = `Votre dessin convient. C'est le format du fichier qui bloque, et nous le `
      + `réglons : ${formats} technique${formats > 1 ? 's' : ''} s'ouvre${
        formats > 1 ? 'nt' : ''} avec le fichier vectoriel.`;
  } else if (definitions > 0) {
    classe = 'reponse-definition';
    titre = 'Votre image est trop peu définie pour être marquée en l\'état. '
      + 'Cherchez une version plus grande de votre logo.';
  } else if (total > 0) {
    classe = 'reponse-retouche';
    titre = `Votre logo demande une retouche avant d'être marqué. Chaque technique ci-dessous `
      + `dit laquelle, et vous pouvez copier le brief.`;
  }
  if (!titre) return '';

  // LE BLANC SE DIT ICI, pas seulement dans les points d'attention. Ceux ci
  // arrivent SOUS la grille : un visiteur qui voit sept feux verts s'arrete
  // avant, et repart sans savoir que son logo ne se marque que sur du fonce.
  // La ligne ne s'ajoute pas au compte de couleurs, elle le complete.
  const couleurs = Number.isInteger(nCouleurs) && nCouleurs >= 1
    ? `<p class="fait-couleurs">Votre logo a <b>${nCouleurs} couleur${
      nCouleurs > 1 ? 's' : ''} réelle${nCouleurs > 1 ? 's' : ''}</b>${
      blanc ? ', et elle est blanche : il ne se marque que sur un support foncé'
            : ''}.</p>`
    : '';

  // LES CONSEILS REMONTENT DANS LA REPONSE, arbitrage Alex du 25/08/2026.
  //
  // Ils vivaient sous la grille, dans « À savoir avant de commander ». Celui
  // qui lit « bonne nouvelle, votre logo pourrait partir » s'arrete la : il ne
  // descendra pas sous sept cartes pour apprendre que sa couleur unique
  // meriterait un ton direct, ou que son logo blanc ne se marque que sur du
  // fonce. Un conseil qu'on ne lit pas n'est pas un conseil.
  //
  // TROIS AU MAXIMUM. Au dela, le bloc cesse d'etre une reponse et redevient
  // une page. Les points sont deja produits par ordre d'importance.
  const conseils = pointsAttention(mesures, feux).slice(0, 3);
  const suite = conseils.length
    ? `<div class="fait-conseils">${conseils.map((c) =>
      `<p><b>${echapper(c.titre)}.</b> ${echapper(c.texte)}</p>`).join('')}</div>`
    : '';
  return `<div class="verdict-tete ${classe}"><p class="fait-reponse">${titre}</p>
  ${couleurs}</div>${suite}`;
}

export function rendreFeux(feux) {
  if (!feux?.length) return '';
  return `${spritePictos()}
<div class="grille-feux">${feux.map(rendreLigne).join('\n')}</div>
<p class="grille-reserve">Ces objets sont des exemples de ce que chaque technique
marque couramment, pas une liste fermée. Le dernier mot revient à votre fabricant :
les zones, les machines et les tolérances varient d'un atelier à l'autre.</p>`;
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

/**
 * LE LOGO ENTIEREMENT CLAIR, et pourquoi il merite sa propre mesure.
 *
 * TROUVE LE 24/08/2026, sur vingt cinq fichiers reels d'Alex. Trois d'entre eux
 * sont des declinaisons blanches : AWS, ASMR, un logo de t-shirt. Le site leur
 * repondait SEPT FEUX VERTS, ce qui n'est pas faux, et laissait partir le
 * visiteur sans lui dire la seule chose qui compte pour lui : un logo blanc ne
 * se marque QUE sur un support fonce.
 *
 * Le point d'attention existant se declenchait bien, mais il disait « une de
 * vos couleurs est presque blanche », ce qui est tres faible quand la reponse
 * est « votre logo est blanc ». Une nuance de rendu ne remplace pas un fait.
 *
 * LE SEUIL EST HAUT, 90 %, et il ne se negocie pas a la baisse : un logo fonce
 * avec un lettrage blanc de trente pour cent n'est pas un logo blanc, et le
 * traiter comme tel serait une fausse alerte sur un cas parfaitement ordinaire.
 */
const PART_CLAIRE = 0.90;

export function logoClair(mesures) {
  const palette = mesures?.m2Couleurs?.palette ?? [];
  if (!palette.length) return null;
  const part = palette
    .filter((c) => luminance(c.rvb) > CLAIR)
    .reduce((t, c) => t + (c.part ?? 0), 0);
  // Une palette dont les parts ne somment pas a 1 rendrait le ratio faux : on
  // rapporte a ce qui est reellement mesure, jamais a un total suppose.
  const total = palette.reduce((t, c) => t + (c.part ?? 0), 0);
  if (total <= 0) return null;
  const ratio = part / total;
  return ratio >= PART_CLAIRE ? { part: ratio, couleurs: palette.length } : null;
}

export function pointsAttention(mesures, feux = []) {
  const points = [];
  const palette = mesures?.m2Couleurs?.palette ?? [];
  const n = mesures?.m2Couleurs?.couleursReelles ?? 0;

  // 1. LE SUPPORT CLAIR. On ne signale que les couleurs qui portent vraiment du
  // dessin : une teinte claire sur un pour cent de l'encre est un liseré, pas
  // une forme, et l'avertir ferait du bruit.
  const blanc = logoClair(mesures);
  const claires = palette.filter((c) => luminance(c.rvb) > CLAIR && (c.part ?? 0) > 0.05);
  if (blanc) {
    // LE LOGO EST BLANC, ET CE N'EST PAS UN DEFAUT. C'est une declinaison,
    // faite expres pour les supports fonces, et la phrase doit le dire dans cet
    // ordre : d'abord ce que le fichier est, ensuite ce qu'il implique. Lui
    // reprocher d'etre blanc serait reprocher a un graphiste d'avoir bien
    // travaille.
    points.push({
      cle: 'support',
      titre: 'Votre logo est blanc',
      texte: 'C\'est une déclinaison pour supports foncés, et elle est faite pour ça. '
        + 'Sur un t-shirt blanc, un tote bag écru ou un mug blanc, elle ne se verra pas : '
        + 'demandez la version foncée du même logo à qui l\'a dessiné, ou choisissez des '
        + 'objets colorés.',
    });
  } else if (claires.length) {
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

  // 3. LE TON DIRECT, releve par Alex le 25/08/2026 sur un cas reel.
  //
  // CE QUI CLOCHAIT. Un logo d'une seule couleur recevait « bonne nouvelle,
  // votre logo pourrait partir sur 2 des 7 techniques », et ces deux techniques
  // etaient l'impression numerique et le transfert. C'est vrai, et c'est le
  // plus mauvais conseil qu'on puisse lui donner : ce sont les deux SEULES qui
  // n'exigent pas de fichier vectoriel, donc elles sortent gagnantes par
  // defaut, pas par merite.
  //
  // Un logo a une ou deux couleurs est le cas ideal de la serigraphie et de la
  // tampographie, qui posent la couleur en TON DIRECT : l'encre est melangee a
  // la teinte voulue avant impression. Le numerique, lui, la reconstitue par
  // superposition, et une teinte de marque y derive toujours un peu.
  //
  // LE SITE DIT CE QUI PASSE. Il doit aussi dire ce qui est BON, sinon il
  // laisse partir quelqu'un sur la technique la moins adaptee a son logo en
  // croyant l'avoir bien conseille.
  const TON_DIRECT = ['serigraphie', 'tampographie'];
  const tonDirect = feux.filter((f) => TON_DIRECT.includes(f.cle));
  if (n >= 1 && n <= 2 && tonDirect.length) {
    const ouvertes = tonDirect.filter((f) => f.feu === 'vert');
    const aFabriquer = tonDirect.filter((f) => f.feu === 'orange' && f.nuance === 'format');
    if (ouvertes.length || aFabriquer.length) {
      points.push({
        cle: 'ton_direct',
        titre: n === 1 ? 'Une seule couleur : pensez au ton direct'
                       : 'Deux couleurs : le ton direct vous va bien',
        texte: 'La sérigraphie et la tampographie posent une encre mélangée à votre '
          + 'teinte : la couleur sera exactement la vôtre, et sur une série c\'est aussi '
          + 'le moins cher. Le numérique la reconstitue par superposition, et une couleur '
          + 'de marque y dérive toujours un peu.'
          + (aFabriquer.length && !ouvertes.length
            ? ' Le fichier vectoriel vous les ouvre.' : ''),
      });
    }
  }

  // 4. LA PROPORTION, qui exclut des familles entieres. Un logo deux fois plus
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
