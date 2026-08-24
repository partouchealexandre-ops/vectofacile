/**
 * LES CONSEILS D'IMPRESSION.
 *
 * Ce module ne juge pas. Il ne dit jamais si un logo passe ou ne passe pas :
 * c'est le travail de src/verdict/, et celui-la a besoin de seuils arbitres.
 *
 * Ici on fait autre chose, et c'est la raison d'etre du fichier : croiser un
 * FAIT mesure sur le fichier du visiteur avec une MECANIQUE de procede deja
 * publiee dans les fiches du guide. Aucune des deux moities ne demande
 * d'arbitrage.
 *
 *   fait      : « votre logo est livre sur un fond blanc opaque »
 *   mecanique : « en marquage, un fond s'imprime comme le reste »
 *   conseil   : les deux mis bout a bout
 *
 * La regle qui garde ce fichier honnete : AUCUNE valeur de marquage en
 * millimetres n'entre ici. Pas un trait minimal, pas une hauteur de texte, pas
 * un nombre maximal de couleurs. Le jour ou quelqu'un ecrit « au dela de 4
 * couleurs » dans ce module, il a fabrique un seuil sans arbitrage.
 *
 * PARAMETRES D'INSTRUMENT. Les deux constantes ci-dessous disent comment on
 * LIT une mesure, jamais ce qui est marquable. Elles ont le meme statut que
 * ECART_FUSION ou PART_HORS_PALETTE_MAXIMALE, et le meme interdit : elles ne
 * doivent jamais migrer vers seuils.json.
 */

/**
 * Au dela de cette part de l'interieur qui varie, on cesse de parler d'aplats.
 * Valeur reprise TELLE QUELLE du harnais de vectorisation, qui s'en sert
 * depuis le debut pour distinguer un aplat d'un degrade. Une seule definition
 * de « aplat » dans le projet, pas deux.
 */
export const PART_INTERIEUR_VARIABLE_APLAT = 0.10;

/**
 * En dessous de cette part de la boite, le halo de compression n'est pas digne
 * d'une phrase : tout JPEG en a un peu, et le signaler a chaque fois
 * transformerait le conseil en bruit.
 */
export const HALO_NEGLIGEABLE = 0.005;

/**
 * conseiller(mesures) -> [{ cle, titre, fait, mecanique }]
 *
 * Fonction pure : pas de DOM, pas de fichier, pas de seuil de marquage. Chaque
 * conseil separe explicitement ce qui vient du FICHIER de ce qui vient du
 * PROCEDE, parce que les deux n'ont pas la meme force et que le visiteur a le
 * droit de savoir laquelle il lit.
 */
export function conseiller(mesures, fiche = null) {
  const conseils = [];
  if (!mesures) return conseils;

  // 0. LE FAUX VECTORIEL. Il passe AVANT tout le reste, parce qu'il rend le
  //    reste secondaire : mesurer finement un dessin qui n'existe pas comme
  //    dessin n'a pas de sens.
  if (fiche?.faux_vectoriel) {
    conseils.push({
      cle: 'faux_vectoriel',
      titre: 'Votre fichier porte une extension de vectoriel, mais il n\'en est pas un',
      fait: `Il ne contient aucun tracé, seulement ${fiche.images} image${fiche.images > 1 ? 's' : ''} posée${fiche.images > 1 ? 's' : ''} dedans.`,
      mecanique: 'Agrandie à la taille du marquage, cette image sera floue : c\'est le fichier d\'origine qu\'il faut retrouver.',
    });
  }

  // 0 bis. LE TEXTE NON VECTORISE. Un PDF peut appeler une police que
  //        l'atelier n'a pas, et la substitution change le dessin sans
  //        prevenir personne.
  if (fiche?.texte) {
    conseils.push({
      cle: 'texte_vivant',
      titre: 'Votre fichier contient du texte non vectorisé',
      fait: `${fiche.texte} bloc${fiche.texte > 1 ? 's' : ''} de texte ${fiche.texte > 1 ? 'sont' : 'est'} encore ${fiche.texte > 1 ? 'des textes' : 'un texte'}, pas ${fiche.texte > 1 ? 'des dessins' : 'un dessin'}.`,
      mecanique: 'Sans votre police, l\'atelier en substituera une autre, et le logo changera sans que personne ne s\'en aperçoive.',
    });
  }

  // 1. LE FOND. C'est le conseil le plus rentable de la liste : un logo livre
  //    sur un rectangle blanc marque un rectangle blanc, et le visiteur ne
  //    l'apprend qu'en recevant ses objets.
  if (mesures.fond?.type !== 'transparent') {
    const rvb = mesures.fond?.rvb;
    const teinte = rvb
      ? (rvb[0] > 245 && rvb[1] > 245 && rvb[2] > 245 ? 'blanc' : `de couleur ${rvb.join(', ')}`)
      : 'opaque';
    conseils.push({
      cle: 'fond',
      titre: 'Votre logo a un fond, et un fond se marque',
      fait: `Le fond de votre image est ${teinte}, pas transparent.`,
      mecanique: 'Aucune technique ne sait ignorer un fond : il sera marqué comme le reste du dessin.',
    });
  }

  // 2. LA TRANSPARENCE PARTIELLE. Le semi transparent n'existe sur aucune
  //    machine de marquage : il y a de l'encre, ou il n'y en a pas.
  if (mesures.m4Transparence?.aTransparencePartielle) {
    const n = mesures.m4Transparence.pixelsSemiTransparents;
    conseils.push({
      cle: 'transparence',
      titre: 'Les zones à demi transparentes n\'existent pas en marquage',
      fait: `${n.toLocaleString('fr-FR')} pixels de votre logo sont à demi transparents.`,
      mecanique: 'Une encre est déposée ou ne l\'est pas : ces pixels seront rendus pleins ou supprimés, et c\'est l\'atelier qui tranchera si vous ne le faites pas.',
    });
  }

  // 3. LE DEGRADE. Vrai sur les procedes a tons directs, faux sur les procedes
  //    numeriques : la phrase le dit au lieu de generaliser.
  const variable = mesures.m10IndicesExport?.partInterieurVariable;
  if (variable !== null && variable !== undefined && variable >= PART_INTERIEUR_VARIABLE_APLAT) {
    conseils.push({
      cle: 'degrade',
      titre: 'Votre logo contient un dégradé',
      fait: `${(100 * variable).toFixed(0)} % de l'intérieur de votre logo varie au lieu `
        + 'd\'être un aplat uniforme.',
      mecanique: 'La sérigraphie, la tampographie et la broderie ne savent le rendre qu\'en le simulant par une trame de points ; le numérique et le transfert, eux, le posent directement.',
    });
  }

  // 4. LE NOMBRE DE COULEURS A QUITTE LES CONSEILS, le 24/08/2026.
  //
  // Il se disait TROIS fois sur le meme ecran, dans les memes termes : en tete
  // de page, dans le volet des couleurs, et ici. « Chaque couleur est un ecran
  // et un passage de machine a part » suivi douze lignes plus bas de « chaque
  // couleur demande son propre ecran ou son propre cliche et son propre
  // passage » : c'est la meme phrase, et la relire donne l'impression que le
  // site meuble.
  //
  // Chacun des trois garde desormais son etage, et un seul :
  //   le FAIT, en haut de page, dans le fait principal ;
  //   le DETAIL, les codes et les parts, dans le volet des couleurs ;
  //   le COUT, quand il y a matiere a l'ecrire, dans les points d'attention.

  // 5. LE HALO DE COMPRESSION.
  const halo = mesures.m3Halo?.partBoite;
  if (halo !== null && halo !== undefined && halo > HALO_NEGLIGEABLE) {
    conseils.push({
      cle: 'halo',
      titre: 'Votre fichier porte des traces de compression',
      fait: `${(100 * halo).toFixed(2).replace('.', ',')} % de la boîte de votre logo n'est ni le fond ni `
        + 'une de ses couleurs.',
      mecanique: 'Ce sont des résidus d\'un enregistrement en JPEG : ils ne s\'impriment pas comme une couleur, ils donnent des bords sales et des contours qui tremblent.',
    });
  }

  return conseils;
}
