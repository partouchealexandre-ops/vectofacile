import { versLab, ecartLab, creerCacheLab, ECART_FUSION } from '../moteur/couleurs.js';

/**
 * Reglages du vectoriseur DEDUITS des mesures du moteur.
 *
 * C'est la jointure entre les deux moities du produit, et elle porte tout son
 * interet : le fichier livre est vectorise avec la palette que le diagnostic a
 * ANNONCEE. Si l'ecran dit six couleurs, l'EPS en porte six, exactement les
 * memes. Sans cette jointure, le vectoriseur requantifie de son cote et le
 * client recoit un fichier qui contredit le diagnostic qu'il vient de lire.
 *
 * Piege paye une fois, garde ici en clair. La palette du moteur est la palette
 * de l'ENCRE : le fond en est exclu, c'est sa definition. VTracer, lui, veut la
 * palette de l'IMAGE. Passer la palette d'encre telle quelle donne un
 * vectoriseur qui n'a qu'une couleur disponible et rend un rectangle plein de
 * la taille du fichier. Le harnais a montre le cas sur quatorze images sur
 * quinze, avec un recouvrement de 0,4 pour cent la ou on attendait 99.
 */

/**
 * Part des pixels d'encre hors palette au dela de laquelle le fichier n'est pas
 * un dessin a aplats.
 *
 * Mesure du 18/08 sur une image de bruit : 86 pour cent des pixels d'encre ne
 * correspondent a AUCUNE couleur retenue. Sur un logo, meme tres compresse,
 * meme sorti d'un scan de charte, cette part est nulle ou quasi nulle. Le
 * discriminant est donc franc, il n'y a pas de zone grise a arbitrer.
 *
 * Ce que le garde-fou evite n'est pas seulement une lenteur. Vectoriser cette
 * image produisait 457 260 formes en 34 secondes : l'onglet du visiteur gelait,
 * et le fichier livre aurait ete inutilisable par n'importe quel marqueur. Un
 * refus explique en une seconde vaut mieux qu'un fichier absurde en trente.
 */
export const PART_HORS_PALETTE_MAXIMALE = 0.45;

/*
 * Pourquoi 0,45 et pas la moitie de l'ecart.
 *
 * Les fichiers legitimes mesures le 18/08, logos compresses, scans de charte,
 * exports webp, sont TOUS a 0,00. Le bruit est a 0,87. N'importe quelle valeur
 * entre les deux marcherait, et c'est justement pour ca qu'il faut choisir en
 * pensant a l'erreur qu'on prefere commettre.
 *
 * Refuser a tort le logo textures d'un vrai client coute plus cher que laisser
 * passer une image lente : le plafond de formes attrape ensuite le cas absurde,
 * alors que rien ne rattrape un client a qui on a dit a tort "ce n'est pas un
 * dessin". On se place donc pres du bruit, pas au milieu.
 */

/** Au dela de ce nombre de formes, le fichier livre n'est marquable nulle part. */
export const FORMES_MAXIMALES = 4000;

/**
 * Le fichier est il un dessin a aplats, ou une photo ?
 * Rend null si c'est un dessin, sinon la raison du refus, en clair.
 */
export function refusDeVectorisation(mesures) {
  const part = mesures.m2Couleurs.partHorsPalette ?? 0;
  if (part > PART_HORS_PALETTE_MAXIMALE) {
    return {
      motif: 'photo',
      texte: `${Math.round(100 * part)} pour cent des pixels de ce fichier ne correspondent `
        + "a aucune couleur franche : c'est une photo ou une image bruitee, pas un dessin. "
        + "La vectoriser produirait des dizaines de milliers de formes, inutilisables par "
        + "un marqueur. Le diagnostic ci dessus reste valable, il decrit bien votre fichier.",
    };
  }
  return null;
}

/*
 * Plafond de surface de l'ajustement de courbes, en pixels d'image.
 *
 * Le trace pixel d'une image de 21 megapixels (6 820 x 3 123, vu sur un
 * logo client reel) fait exploser la memoire de l'onglet : le navigateur
 * ferme la page. Au dela de ce plafond, on revient au mode spline de
 * VTracer, et ce n'est pas un pis-aller : le defaut du spline est ABSOLU,
 * un affaissement d'un a deux pixels entre deux ancres, tandis que l'oeil
 * juge RELATIVEMENT a la taille du dessin. Sur une image de cette taille,
 * l'affaissement est invisible ; c'est sur les images petites et moyennes,
 * la ou il se voit, que l'ajustement travaille.
 */
export const SURFACE_MAX_AJUSTEMENT_PX = 6000000;

/*
 * Capitale en dessous de laquelle un texte sort approximatif d'un trace
 * automatique. Parametre d'instrument : fût d'une lettre = capitale sur
 * huit environ, et il faut au moins 5 px de fût pour tracer un dessin de
 * lettre, pas seulement sa silhouette. Voir l'avertissement petits textes.
 */
export const CAPITALE_NETTE_MINIMALE_PX = 40;

/**
 * La decision du mode de trace, seule et pure : le harnais la teste par la
 * table, sans fabriquer une image de 21 megapixels.
 */
export function reglagesDuTrait(traitLimite, surfacePx) {
  if (surfacePx > SURFACE_MAX_AJUSTEMENT_PX) return { mode: 'spline' };
  // UN TRAIT LIMITE N'EST PLUS LIVRE EN POLYGONES BRUTS, 26/08 au soir.
  // Le logo aux silhouettes fines partait en escaliers exacts mais creneles,
  // illisibles au premier zoom. L'ajustement s'applique aussi a lui, SERRE :
  // tolerance sous le demi-pixel et lissage minimal, pour ne rien perdre
  // d'un trait qui n'a qu'un ou deux pixels a offrir. Les planchers de
  // recouvrement du harnais (trait_01px en tete) sont les gardiens du reglage.
  if (traitLimite) {
    return { mode: 'pixel', lissage: true, lissageReglages: { tolerance: 0.55, rayonLissage: 1, pas: 0.8 } };
  }
  // Le mode pixel livre l'escalier exact ; l'ajustement (lissage.js) le
  // transforme en courbes. Le drapeau `lissage` est lu par
  // construireProgramme, VTracer ignore les cles qu'il ne connait pas.
  return { mode: 'pixel', lissage: true };
}

/**
 * @param {object} mesures  sortie de mesurer()
 * @param {object} reglages surcharges eventuelles
 */
export function optionsDepuisMesures(mesures, reglages = {}) {
  const palette = mesures.m2Couleurs.palette.map((c) => c.hex.toUpperCase());

  // Le fond, quand il est une couleur, fait partie de la palette de l'image.
  if (mesures.fond.type === 'couleur' && mesures.fond.rvb) {
    const hexFond = '#' + mesures.fond.rvb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    if (!palette.includes(hexFond)) palette.unshift(hexFond);
  }

  // Le MODE se deduit du trait le plus fin mesure, et c'est la deuxieme
  // jointure entre le moteur et le vectoriseur.
  //
  // Mesure faite le 18/08 : en mode spline, un trait de 1 px est rendu par une
  // courbe dont les deux bords se croisent, et le rendu n'en couvre plus que
  // 60 pour cent. La tolerance de lissage est alors plus large que la forme
  // elle meme, elle ne peut que la deformer. En mode polygon, le meme trait
  // sort exact.
  //
  // Sous 3 px de trait, on renonce donc aux courbes. Le fichier est un peu plus
  // anguleux, il est JUSTE, et le diagnostic dira par ailleurs que le fichier
  // d'origine est trop petit pour ce qu'il contient.
  //
  // AU DESSUS de cette limite, les courbes ne viennent plus du mode spline de
  // VTracer mais de notre propre ajustement sur son trace pixel : voir
  // lissage.js, qui dit pourquoi, chiffres a l'appui. reglagesDuTrait,
  // ci-dessus, porte la table de decision complete.
  // LA DECISION SE PREND SUR LE TRAIT COURANT, PLUS SUR LE MINIMUM, 26/08/2026.
  //
  // Mesure sur huit logos clients reels : six sur huit declenchaient cet
  // avertissement, trois recevaient le plus dur des deux. Sur le logo de la
  // Fondation de Nice, 2 008 px de large, le minimum vaut 1 px et il ne
  // represente que 0,26 pour cent des points de crete ; le dessin, lui, a une
  // mediane a 11 px et un cinquieme centile a 5. Un lisere de compression JPEG
  // decidait pour tout le fichier, et le remede conseillait alors de chercher
  // une image quatre fois plus large, soit 8 000 pixels. Un conseil
  // inapplicable est le signe d'un diagnostic qui ne s'applique pas.
  //
  // LE MINIMUM RESTE MESURE ET RESTE PRUDENT : il servira au verdict de
  // marquage, ou c'est bien le trait le plus fin qui cassera en premier sous
  // une presse. Mais la question du VECTORISEUR n'est pas « qu'est ce qui
  // cassera », c'est « est ce que je sais lire ce dessin », et celle la se pose
  // sur ce qui court partout.
  //
  // Temoin garde par la mesure : Symbol large, dont 26 pour cent des cretes
  // sont a 1 px, reste attrape. L'avertissement ne disparait pas, il cesse de
  // se declencher a tort.
  const traitBasse = mesures.m5TraitLePlusFin?.encadrementPx?.basse ?? null;
  const traitCourant = mesures.m5TraitLePlusFin?.courantPx ?? traitBasse;
  const traitLimite = traitCourant !== null && traitCourant <= 2;
  const avertissements = [];
  if (traitLimite) {
    // L'avertissement DIT CE QU'IL FAUT FAIRE, et il le chiffre.
    //
    // Reecrit le 19/08 apres le premier vrai logo passe dans la chaine : une
    // cible avec une ligne de texte, en 101 x 57 pixels. Le moteur avait
    // parfaitement mesure, trait a 1 pixel, et l'outil a quand meme livre un
    // .eps ou le texte etait fondu en une seule tache. L'avertissement existait
    // et disait vrai, mais il ne disait pas quoi faire, et il s'affichait en
    // petit gris SOUS les boutons de telechargement.
    //
    // A 1 pixel, un trait n'a pas d'interieur : sa ligne moyenne et son
    // contour sont les memes pixels, donc tout trace est une supposition. Le
    // facteur annonce est de l'arithmetique, pas un seuil : pour obtenir un
    // trait de 4 pixels a partir d'un trait de 1, il faut une image quatre
    // fois plus large.
    const facteur = Math.max(2, Math.ceil(4 / Math.max(traitCourant, 1)));
    const dimensions = mesures.m1Dimensions
      ? `${mesures.m1Dimensions.largeurPx} par ${mesures.m1Dimensions.hauteurPx} pixels`
      : 'de petite taille';
    avertissements.push({
      gravite: traitCourant <= 1 ? 'grave' : 'notable',
      // LE TITRE DIT DE QUOI ON PARLE, corrige le 25/08/2026. « Votre image
      // est trop petite pour son propre dessin » etait juste et obscur : le
      // visiteur ne savait pas si on parlait de son marquage ou de notre
      // travail. On parle de NOTRE travail, et le titre le dit.
      // LE TON, arbitrage Alex du 26/08/2026 : « il ne faut pas critiquer un
      // fichier client juste pour le critiquer ». L'ancienne redaction ouvrait
      // par un jugement, « sera decevant », et refermait sur un ordre, « cherchez
      // une version plus large », sans dire ce qu'on fait quand cette version
      // n'existe pas. Or elle n'existe presque jamais : c'est bien pour cela que
      // la personne est la.
      //
      // On enonce donc un FAIT sur notre outil, pas un verdict sur son logo, et
      // on donne les DEUX sorties reelles du metier. La seconde, le redessin,
      // est celle que les ateliers utilisent, et la taire etait la vraie
      // omission.
      titre: traitCourant <= 1
        ? 'Une vectorisation automatique ne rendra pas ce logo'
        : 'Le fichier vectoriel sera juste à la limite',
      texte: `Le trait courant de votre dessin fait ${traitCourant} pixel`
        + `${traitCourant > 1 ? 's' : ''} sur une image de ${dimensions}. À cette finesse, `
        + `un tracé automatique devine plus qu'il ne lit : il ne sait pas suivre un trait `
        + `qu'il ne distingue pas du fond, ni refermer une courbe qu'il ne voit pas. Nous `
        + `vectorisons quand même, en contours droits et sans lissage, pour ne rien inventer. `
        + `Ce n'est pas un défaut de votre logo, et cela ne dit rien des techniques qui `
        + `l'impriment directement : c'est le fichier vectoriel, et lui seul, qui restera `
        + `en dessous de votre dessin.`,
      remede: `Deux chemins, et le second est celui que les ateliers utilisent. Une version `
        + `plus grande de votre logo, au moins ${facteur} fois plus large : le PDF d'une `
        + `plaquette, l'export d'origine, le fichier de votre graphiste. Ou un redessin, `
        + `qui est un travail de graphiste sur un logiciel vectoriel, et qui vous resservira `
        + `sur toutes vos commandes. Aucun réglage automatique ne remplace des pixels absents.`,
    });
  }

  // Le reglage `simplify` qui accompagnait le mode spline etait un parametre
  // MORT : VTracer ne connait pas ce nom et l'ignorait sans un mot. Toute la
  // finesse du lissage tournait donc sur des valeurs par defaut que personne
  // n'avait choisies. Un reglage qui ne regle rien est un mensonge de
  // configuration ; il part avec le mode spline qu'il pretendait piloter.
  // LES PETITS TEXTES, arbitrage Alex du 26/08/2026 au soir. Mesure sur le
  // logo U*BREW : le mot HEINEKEN y fait 30 px de haut, ses fûts font 3 a
  // 4 px, et aucun trace automatique, le notre comme un autre, ne restitue
  // un dessin de lettre net avec 3 px d'information. Le fichier Superpictor
  // qui, lui, est net a cet endroit est un redessin humain : c'est la sortie
  // du metier, pas un reglage qui nous manque. On le DIT, plutot que de
  // laisser le client le decouvrir en zoomant.
  //
  // Le seuil est un parametre d'instrument, pas un seuil de marquage : le
  // fût d'une lettre fait environ un huitieme de sa capitale, il faut au
  // moins 5 px de fût pour qu'un trace tienne, donc 40 px de capitale.
  const petiteCapitale = mesures.m7HauteurDeCapitale?.petiteCapitalePx ?? null;
  if (!traitLimite && petiteCapitale !== null && petiteCapitale < CAPITALE_NETTE_MINIMALE_PX) {
    avertissements.push({
      gravite: 'notable',
      titre: 'Les petits textes sortiront approximatifs',
      texte: `Votre logo porte des lettres d'environ ${Math.round(petiteCapitale)} pixels de haut. `
        + `À cette taille, le trait d'une lettre fait deux à quatre pixels, et un tracé `
        + `automatique en restitue la silhouette, pas le dessin exact : des fûts qui ondulent `
        + `légèrement, des coins qui s'arrondissent. Les grandes formes de votre logo ne sont `
        + `pas concernées.`,
      remede: `Si ces textes restent lisibles à la taille de marquage prévue, le fichier `
        + `convient souvent tel quel. Pour un rendu exact des petites lettres, la sortie du `
        + `métier est un redessin, un travail de graphiste sur un logiciel vectoriel, qui `
        + `vous resservira sur toutes vos commandes.`,
    });
  }

  const reglagesTrait = reglagesDuTrait(traitLimite, mesures.m1Dimensions?.pixels ?? 0);

  return {
    ...reglagesTrait,
    hierarchical: 'cutout',
    palette,
    // filterSpeckle a ZERO, et ce n'est pas un oubli.
    //
    // Mesure faite le 18/08 sur le corpus synthetique : des la valeur 1, le
    // filtre de VTracer SUPPRIME un trait de 1 px de large, quelle que soit sa
    // longueur. Sur une image de 300 x 300, un trait de 221 pixels d'aire a
    // disparu du fichier livre sans le moindre avertissement. Le recouvrement
    // avec l'original est tombe a zero pour cent.
    //
    // Un logo perdant un filet ou un contour fin part chez le marqueur, et
    // personne ne s'en apercoit avant la presse. On coupe donc le filtre, et le
    // nettoyage se fait en amont, par nettoyerSalissures, qui lui COMPTE ce
    // qu'il retire et le dit au client.
    filterSpeckle: 0,
    ...reglages,
    _avertissements: avertissements,
  };
}

/**
 * Point d'entree unique de la preparation : les reglages du vectoriseur, les
 * pixels a lui donner, et ce qu'il faut dire au client.
 * Le navigateur et le harnais appellent CETTE fonction, jamais les deux
 * moities separement : c'est ce qui garantit qu'ils vectorisent pareil.
 */
export function preparerVectorisation(image, mesures, reglages = {}) {
  const refus = refusDeVectorisation(mesures);
  if (refus) return { refus, options: null, pixels: null, largeur: null, hauteur: null, avertissements: [] };
  const options = optionsDepuisMesures(mesures, reglages);
  const avertissements = options._avertissements;
  delete options._avertissements;
  // LA GRILLE FINE, ET SES DIMENSIONS AVEC ELLE. Le vectoriseur ne devine pas
  // la taille du tampon qu'on lui tend : l'appelant DOIT lire largeur et
  // hauteur ici, jamais celles de l'image d'origine. Les rendre obligatoires
  // plutot que facultatives est delibere : un appelant qui les oublierait
  // ferait un fichier faux en silence, alors qu'un tampon lu au mauvais
  // format echoue bruyamment.
  const pixels = pixelsPourVectorisation(image, mesures);
  const k = facteurSurEchantillon(image.largeur, image.hauteur);
  options.surEchantillon = k;
  return {
    refus: null,
    options,
    pixels: k > 1 ? surEchantillonner(pixels, image, k) : pixels,
    largeur: image.largeur * k,
    hauteur: image.hauteur * k,
    avertissements,
  };
}

/**
 * Pixels a envoyer au vectoriseur : l'image ramenee A LA PALETTE ANNONCEE.
 *
 * Chaque pixel de fond redevient le fond, chaque pixel d'encre prend la couleur
 * reelle la plus proche, les salissures deja reperees ont disparu avec le
 * masque. Le vectoriseur recoit donc une image parfaitement plate.
 *
 * Sans cette etape, avec le filtre de taches coupe, les 3 330 pixels sales du
 * cas halo_0370 devenaient 2 331 formes distinctes dans l'EPS livre, pour un
 * dessin qui en compte deux. Le fichier partait au marqueur charge de bruit de
 * compression transforme en geometrie. La quantification prealable ramene le
 * meme cas a deux formes.
 *
 * Effet de bord assume : l'antialiasing disparait. Ce n'est pas une perte, un
 * fichier de marquage n'a pas de demi teinte de bord, et VTracer lisse ensuite
 * les contours en splines.
 */
export function pixelsPourVectorisation(image, mesures) {
  const { largeur, hauteur, donnees } = image;
  const masque = mesures.masqueEncre;
  if (!masque) return donnees;

  const propre = new Uint8ClampedArray(donnees.length);

  // DEUX PASSES, ET LA SECONDE EST LA CORRECTION DU 26/08/2026.
  //
  // CE QUI N'ALLAIT PAS. Chaque pixel d'encre etait rabattu sur la couleur de
  // palette la plus proche en Lab, sans regarder ses voisins. Or un pixel de
  // BORD n'est pas une couleur : c'est un melange entre l'encre et le fond,
  // fabrique par l'antialiasing ou par la compression. Le rabattre sur la
  // palette entiere permet de lui donner une couleur qui n'existe nulle part
  // autour de lui.
  //
  // Mesure sur le logo de la Fondation de Nice, gris #48555D, cyan #2FB4DF et
  // bleu #107CBD. Le bord d'une lettre grise sur fond blanc passe par des gris
  // clairs, et en Lab ces gris clairs sont PLUS PRES DU CYAN que du gris :
  //   #E8EAEC  cyan 43,7   gris 57,6
  //   #C3C7CA  cyan 37,4   gris 45,0
  // Toutes les lettres sortaient donc bordees de bleu. C'est ce qu'Alex a vu en
  // zoomant dans le PDF livre.
  //
  // LA REGLE : un pixel de bord prend la couleur de ce qu'il BORDE. Les pixels
  // surs, ceux qui sont vraiment d'une couleur de la palette, sont poses
  // d'abord ; les autres prennent la couleur dominante parmi leurs voisins
  // surs, en elargissant la fenetre tant qu'aucun ne repond. Aucune couleur
  // n'est inventee la ou elle n'est pas.
  const fondRvb = mesures.fond.type === 'couleur' ? mesures.fond.rvb : null;
  const palette = mesures.m2Couleurs.palette.map((c) => ({ rvb: c.rvb, lab: versLab(c.rvb[0], c.rvb[1], c.rvb[2]) }));
  const lab = creerCacheLab();
  const total = largeur * hauteur;
  const choix = new Int32Array(total).fill(-1);
  const sur = new Uint8Array(total);

  for (let i = 0; i < total; i++) {
    if (!masque[i] || palette.length === 0) continue;
    const p = i * 4;
    const teinte = lab(donnees[p], donnees[p + 1], donnees[p + 2]);
    let meilleur = 0;
    let distance = Infinity;
    for (let k = 0; k < palette.length; k++) {
      const d = ecartLab(teinte, palette[k].lab);
      if (d < distance) { distance = d; meilleur = k; }
    }
    choix[i] = meilleur;
    // SUR veut dire « ce pixel EST cette couleur », pas « c'est la moins pire ».
    // Le seuil est celui qui sert deja a fusionner deux couleurs : en dessous,
    // le moteur considere que deux teintes sont la meme encre.
    if (distance <= ECART_FUSION) sur[i] = 1;
  }

  // Les bords prennent la couleur dominante de leur voisinage sur. La fenetre
  // s'elargit tant que personne ne repond : un trait fin d'un pixel a toujours
  // un voisin sur a deux ou trois pixels, sinon ce n'est pas un trait.
  for (const rayon of [1, 2, 3]) {
    for (let i = 0; i < total; i++) {
      if (!masque[i] || sur[i] || choix[i] < 0) continue;
      const x = i % largeur;
      const y = (i / largeur) | 0;
      const votes = new Int32Array(palette.length);
      let vus = 0;
      for (let dy = -rayon; dy <= rayon; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= hauteur) continue;
        for (let dx = -rayon; dx <= rayon; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= largeur) continue;
          const j = yy * largeur + xx;
          if (!sur[j]) continue;
          votes[choix[j]] += 1;
          vus += 1;
        }
      }
      if (!vus) continue;
      let gagnant = 0;
      for (let k = 1; k < palette.length; k++) if (votes[k] > votes[gagnant]) gagnant = k;
      choix[i] = gagnant;
      sur[i] = 2;
    }
  }

  // TROISIEME PASSE, 26/08/2026 au soir : LES FRANGES SE DISSOLVENT.
  //
  // Le vote de bord corrige les pixels INCERTAINS. Mais quand la palette
  // porte elle-meme des teintes intermediaires (l'arc degrade du logo UNSA a
  // plusieurs bleus), les pixels de bord entre le blanc et le bleu franc
  // sont SURS d'une de ces teintes : chaque frontiere blanc-bleu se retrouve
  // ourlee d'un lisere d'une couleur legitime ailleurs, et le fichier livre
  // dessine ces ourlets. Sur UNSA, 284 formes pour un dessin qui en compte
  // une quinzaine.
  //
  // La regle : une COMPOSANTE mince, prise en sandwich entre deux couleurs
  // dont la sienne est le melange, est un artefact d'antialiasing, pas un
  // element du dessin. Chacun de ses pixels rejoint celle des deux couleurs
  // dont il est le plus proche. Une bande epaisse (l'arc degrade) n'est pas
  // mince : elle reste. Un trait fin pose sur UNE seule couleur n'est pas un
  // sandwich : il reste aussi.
  {
    const etiquettes = new Int32Array(total).fill(-1);
    const pile = new Int32Array(total);
    for (let passe = 0; passe < 2; passe++) {
      etiquettes.fill(-1);
      let prochaine = 0;
      for (let depart = 0; depart < total; depart++) {
        if (!masque[depart] || choix[depart] < 0 || etiquettes[depart] >= 0) continue;
        const classe = choix[depart];
        const composante = [];
        let sommet = 0;
        pile[sommet++] = depart;
        etiquettes[depart] = prochaine;
        const contacts = new Map();
        let perimetre = 0;
        while (sommet > 0) {
          const i = pile[--sommet];
          composante.push(i);
          const x = i % largeur, y = (i / largeur) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= largeur || yy >= hauteur) { perimetre++; continue; }
            const j = yy * largeur + xx;
            if (masque[j] && choix[j] === classe) {
              if (etiquettes[j] < 0) { etiquettes[j] = prochaine; pile[sommet++] = j; }
              continue;
            }
            perimetre++;
            const cle = masque[j] && choix[j] >= 0 ? choix[j] : -1;
            contacts.set(cle, (contacts.get(cle) ?? 0) + 1);
          }
        }
        prochaine++;
        const aire = composante.length;
        if (aire > 1500 || perimetre === 0 || aire / perimetre >= 1.4) continue;
        // Les deux voisines dominantes. Le FOND COULEUR est une voisine
        // comme une autre : sur un JPEG a fond blanc, la frange d'un trace
        // orange est prise entre l'orange et le blanc du fond, et l'ignorer
        // laissait 839 formes au logo aux silhouettes. Le fond transparent,
        // lui, n'a pas de couleur : il ne vote pas.
        const labFond = fondRvb ? versLab(fondRvb[0], fondRvb[1], fondRvb[2]) : null;
        const voisines = [...contacts.entries()]
          .filter(([k]) => k >= 0 || labFond)
          .sort((a, b) => b[1] - a[1]);
        if (voisines.length < 2) continue;
        const [vA, vB] = voisines;
        if ((vA[1] + vB[1]) / perimetre < 0.7) continue;
        const A = vA[0] >= 0 ? palette[vA[0]].lab : labFond;
        const B = vB[0] >= 0 ? palette[vB[0]].lab : labFond;
        const M = palette[classe].lab;
        // distance de M au segment [A, B] en Lab
        const ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
        const am = [M[0] - A[0], M[1] - A[1], M[2] - A[2]];
        const nab = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
        const t = nab ? Math.max(0, Math.min(1, (am[0] * ab[0] + am[1] * ab[1] + am[2] * ab[2]) / nab)) : 0;
        const proj = [A[0] + t * ab[0], A[1] + t * ab[1], A[2] + t * ab[2]];
        const dm = Math.hypot(M[0] - proj[0], M[1] - proj[1], M[2] - proj[2]);
        if (dm > 12 || t <= 0.05 || t >= 0.95) continue;
        // dissolution : chaque pixel rejoint la plus proche de ses deux voisines
        for (const i of composante) {
          const p4 = i * 4;
          const teinte = lab(donnees[p4], donnees[p4 + 1], donnees[p4 + 2]);
          const vers = ecartLab(teinte, A) <= ecartLab(teinte, B) ? vA[0] : vB[0];
          // -2 : ce pixel redevient du FOND, il sort du dessin
          choix[i] = vers;
        }
      }
    }
  }

  for (let i = 0; i < total; i++) {
    const p = i * 4;
    if (!masque[i]) {
      if (fondRvb) {
        propre[p] = fondRvb[0]; propre[p + 1] = fondRvb[1]; propre[p + 2] = fondRvb[2]; propre[p + 3] = 255;
      } else {
        propre[p] = 0; propre[p + 1] = 0; propre[p + 2] = 0; propre[p + 3] = 0;
      }
      continue;
    }
    if (choix[i] === -1 && fondRvb) {
      // dissous dans le fond par l'absorption des franges
      propre[p] = fondRvb[0]; propre[p + 1] = fondRvb[1]; propre[p + 2] = fondRvb[2]; propre[p + 3] = 255;
      continue;
    }
    if (choix[i] < 0) {
      propre[p] = donnees[p]; propre[p + 1] = donnees[p + 1]; propre[p + 2] = donnees[p + 2]; propre[p + 3] = 255;
      continue;
    }
    const rvb = palette[choix[i]].rvb;
    propre[p] = rvb[0]; propre[p + 1] = rvb[1]; propre[p + 2] = rvb[2]; propre[p + 3] = 255;
  }

  return propre;
}

/* ------------------------------------------------- SUR ECHANTILLONNAGE */

/**
 * LE BORD SE REPLACE AU SOUS PIXEL AVANT D'ETRE TRACE, 26/08/2026.
 *
 * DEUX DEFAUTS, UNE SEULE CAUSE. Le vectoriseur recoit une image OU CHAQUE
 * PIXEL A DEJA CHOISI SON CAMP, et il trace le contour de cette grille. Deux
 * consequences, mesurees sur le logo Choose Chicago, 416 x 300 :
 *
 *   L'ESCALIER. Sur un cercle de 12 pixels de rayon, la grille impose des
 *   marches d'un pixel. L'ajustement les prend pour du dessin et les suit :
 *   les « O » du mot CHOOSE sortaient bosselees.
 *
 *   L'ENGRAISSEMENT. Le masque d'encre repond « il y a de l'encre ici » des
 *   qu'un pixel s'ecarte du fond de plus de six unites Lab, ce qui arrive des
 *   quatorze pour cent de couverture. C'est le bon seuil pour MESURER : on ne
 *   veut manquer aucun element. Ce n'est pas le bon pour TRACER : le bord se
 *   retrouve pose 0,7 pixel trop loin, tout autour de chaque forme. Surface
 *   d'encre livree sur Chicago : 46 972 pixels pour 42 283 de couverture
 *   reelle, onze pour cent de trop. Sur un fut de lettre de quatre pixels,
 *   c'est trente pour cent de graisse en plus, et le mot devient une bouillie.
 *
 * LE MASQUE DIT OU IL Y A DE L'ENCRE, IL NE DIT PAS OU PASSE LE BORD. Le bord,
 * lui, est ecrit dans l'antialiasing de la source : la rampe entre l'encre et
 * le fond porte, en clair, la position sous pixel du contour. On la lisait puis
 * on la jetait.
 *
 * LA REGLE. Sur une image assez petite pour que la grille soit le facteur
 * limitant, on fabrique une grille k fois plus fine. Chaque sous pixel garde la
 * couleur de son pixel parent tant que le voisinage est uniforme ; sur les
 * bords, il choisit, PARMI LES SEULES COULEURS DEJA PRESENTES AUTOUR, celle
 * dont il est le plus proche dans la source interpolee. Aucune couleur n'est
 * inventee, aucune region n'apparait ni ne disparait : seul le bord se deplace,
 * vers l'endroit ou la source dit qu'il est.
 *
 * Resultat sur Chicago : surface d'encre a 0,3 pour cent de la couverture
 * reelle au lieu de onze, et les « O » redeviennent rondes.
 *
 * Les coordonnees redescendent en pixels de la source dans construireProgramme,
 * AVANT la poussiere et avant l'ajustement : toutes les tolerances du metier
 * restent exprimees dans l'unite du client, et l'escalier qu'elles voient ne
 * fait plus qu'un k-ieme de pixel.
 */

/** Au dela, la grille n'est plus le facteur limitant : on ne sur echantillonne pas. */
export const SURFACE_SANS_SUR_ECHANTILLON_PX = 1500000;

/** Plafond de travail du vectoriseur, en pixels de la grille fine. */
export const BUDGET_SUR_ECHANTILLON_PX = 4000000;

/** Rayon du voisinage qui fournit les couleurs candidates d'un sous pixel. */
const RAYON_CANDIDATS = 2;

/**
 * Le facteur k. Deux au minimum quand on sur echantillonne, quatre au plus :
 * la rampe d'antialiasing fait un pixel de large, la decouper en huit ne dit
 * plus rien de neuf, et le vectoriseur travaille alors pour rien.
 */
export function facteurSurEchantillon(largeur, hauteur) {
  const surface = largeur * hauteur;
  if (!(surface > 0) || surface > SURFACE_SANS_SUR_ECHANTILLON_PX) return 1;
  return Math.max(2, Math.min(4, Math.floor(Math.sqrt(BUDGET_SUR_ECHANTILLON_PX / surface))));
}

/**
 * La grille fine. `propre` est l'image quantifiee, `image` la source d'origine.
 */
export function surEchantillonner(propre, image, k) {
  const { largeur, hauteur, donnees } = image;
  const total = largeur * hauteur;
  if (k <= 1) return propre;

  // L'etiquette d'un pixel : sa couleur quantifiee, ou -1 s'il est transparent.
  const cles = new Int32Array(total);
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    cles[i] = propre[p + 3] === 0 ? -1 : (propre[p] << 16) | (propre[p + 1] << 8) | propre[p + 2];
  }

  // Ou le voisinage est uniforme, il n'y a pas de bord a replacer : le sous
  // pixel recopie son parent. Le test se fait en deux temps, lignes puis
  // colonnes, pour ne pas relire vingt cinq voisins par pixel.
  const R = RAYON_CANDIDATS;
  const ligneUnie = new Uint8Array(total);
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const i = y * largeur + x;
      const v = cles[i];
      let unie = 1;
      for (let dx = -R; dx <= R && unie; dx++) {
        const xx = Math.max(0, Math.min(largeur - 1, x + dx));
        if (cles[y * largeur + xx] !== v) unie = 0;
      }
      ligneUnie[i] = unie;
    }
  }
  const uniforme = new Uint8Array(total);
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const i = y * largeur + x;
      const v = cles[i];
      let unie = 1;
      for (let dy = -R; dy <= R && unie; dy++) {
        const yy = Math.max(0, Math.min(hauteur - 1, y + dy));
        const j = yy * largeur + x;
        if (!ligneUnie[j] || cles[j] !== v) unie = 0;
      }
      uniforme[i] = unie;
    }
  }

  const labs = new Map();
  const labDe = (cle) => {
    let v = labs.get(cle);
    if (v === undefined) {
      v = versLab((cle >> 16) & 255, (cle >> 8) & 255, cle & 255);
      labs.set(cle, v);
    }
    return v;
  };
  // La source, echantillonnee bilineairement au centre du sous pixel.
  const source = (x, y, c) => {
    const x0 = Math.max(0, Math.min(largeur - 1, Math.floor(x)));
    const y0 = Math.max(0, Math.min(hauteur - 1, Math.floor(y)));
    const x1 = Math.min(largeur - 1, x0 + 1);
    const y1 = Math.min(hauteur - 1, y0 + 1);
    const fx = Math.max(0, Math.min(1, x - x0));
    const fy = Math.max(0, Math.min(1, y - y0));
    const a = donnees[(y0 * largeur + x0) * 4 + c];
    const b = donnees[(y0 * largeur + x1) * 4 + c];
    const d = donnees[(y1 * largeur + x0) * 4 + c];
    const e = donnees[(y1 * largeur + x1) * 4 + c];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
  };

  const L = largeur * k;
  const gros = new Uint8ClampedArray(L * hauteur * k * 4);
  const candidats = [];
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const i = y * largeur + x;
      const centre = cles[i];
      let transparentPossible = centre < 0;
      if (!uniforme[i]) {
        candidats.length = 0;
        transparentPossible = false;
        for (let dy = -R; dy <= R; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= hauteur) continue;
          for (let dx = -R; dx <= R; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= largeur) continue;
            const c = cles[yy * largeur + xx];
            if (c < 0) { transparentPossible = true; continue; }
            if (!candidats.includes(c)) candidats.push(c);
          }
        }
      }
      for (let sy = 0; sy < k; sy++) {
        for (let sx = 0; sx < k; sx++) {
          const P = ((y * k + sy) * L + (x * k + sx)) * 4;
          let cle = centre;
          if (!uniforme[i]) {
            const ux = x + (sx + 0.5) / k - 0.5;
            const uy = y + (sy + 0.5) / k - 0.5;
            if (transparentPossible && (candidats.length === 0 || source(ux, uy, 3) < 128)) {
              cle = -1;
            } else {
              const t = versLab(source(ux, uy, 0), source(ux, uy, 1), source(ux, uy, 2));
              let meilleure = Infinity;
              for (let q = 0; q < candidats.length; q++) {
                const e = ecartLab(t, labDe(candidats[q]));
                if (e < meilleure) { meilleure = e; cle = candidats[q]; }
              }
            }
          }
          if (cle < 0) {
            gros[P] = 0; gros[P + 1] = 0; gros[P + 2] = 0; gros[P + 3] = 0;
          } else {
            gros[P] = (cle >> 16) & 255; gros[P + 1] = (cle >> 8) & 255;
            gros[P + 2] = cle & 255; gros[P + 3] = 255;
          }
        }
      }
    }
  }
  return gros;
}
