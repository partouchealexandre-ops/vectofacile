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
export function conseiller(mesures) {
  const conseils = [];
  if (!mesures) return conseils;

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
      mecanique: 'Aucune technique de marquage ne sait ignorer un fond : ce qui est '
        + 'dans le fichier est ce qui part sur l\'objet. Sur un objet qui n\'est pas '
        + 'de cette couleur, le rectangle se verra autour du logo. Un marqueur le '
        + 'détoure lui-même, et il le facture.',
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
      mecanique: 'Une encre est déposée ou ne l\'est pas, un fil est posé ou ne l\'est '
        + 'pas, un laser brûle ou ne brûle pas. Ces pixels seront donc rendus pleins '
        + 'ou supprimés, et c\'est l\'atelier qui tranchera si vous ne le faites pas.',
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
      mecanique: 'La sérigraphie, la tampographie et la broderie posent des couleurs '
        + 'pleines, une par une : elles ne savent pas faire un dégradé autrement qu\'en '
        + 'le simulant par une trame de points. L\'impression numérique et le transfert, '
        + 'eux, le rendent directement.',
    });
  }

  // 4. LE NOMBRE DE COULEURS. On donne la mecanique, JAMAIS un plafond.
  const couleurs = mesures.m2Couleurs?.couleursReelles;
  if (couleurs) {
    conseils.push({
      cle: 'couleurs',
      titre: couleurs === 1
        ? 'Votre logo est monochrome'
        : `Votre logo compte ${couleurs} couleurs réelles`,
      fait: couleurs === 1
        ? 'Une seule couleur réelle a été mesurée.'
        : `${couleurs} couleurs réelles ont été mesurées, sur `
          + `${mesures.m2Couleurs.couleursBrutes.toLocaleString('fr-FR')} teintes présentes `
          + 'dans le fichier.',
      mecanique: couleurs === 1
        ? 'C\'est le cas le plus simple à marquer : un seul écran en sérigraphie, un seul '
          + 'passage en tampographie, et la gravure laser ne sait de toute façon rendre '
          + 'qu\'une teinte, celle de la matière sous la surface.'
        : `En sérigraphie et en tampographie, chaque couleur demande son propre écran ou `
          + `son propre cliché et son propre passage : ${couleurs} couleurs, c'est `
          + `${couleurs} outils à fabriquer et ${couleurs} passages à caler. L'impression `
          + 'numérique et le transfert, eux, impriment toutes les couleurs en une fois.',
    });
  }

  // 5. LE HALO DE COMPRESSION.
  const halo = mesures.m3Halo?.partBoite;
  if (halo !== null && halo !== undefined && halo > HALO_NEGLIGEABLE) {
    conseils.push({
      cle: 'halo',
      titre: 'Votre fichier porte des traces de compression',
      fait: `${(100 * halo).toFixed(2).replace('.', ',')} % de la boîte de votre logo n'est ni le fond ni `
        + 'une de ses couleurs.',
      mecanique: 'Ce sont les résidus d\'un enregistrement en JPEG. Ils ne s\'impriment '
        + 'pas comme une couleur : ils se traduisent par des bords sales et des contours '
        + 'qui tremblent. Une version PNG ou vectorielle du même logo n\'en aurait pas.',
    });
  }

  return conseils;
}
